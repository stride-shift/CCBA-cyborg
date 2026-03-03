import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const DELAY_MS = 2000;          // 2s between sends (safe for Resend free tier)
const MAX_BATCH_SIZE = 50;      // Max emails per cron invocation
const MAX_RETRY_ATTEMPTS = 3;   // After this many failures, mark as 'failed'
const FROM_EMAIL = "CCBA Ascend <noreply@mail.ccba-ascend.d-lab.co.za>";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(resendApiKey);

    const now = new Date().toISOString();

    // Fetch pending emails that are due
    const { data: pendingEmails, error: queryError } = await supabase
      .from("simple_email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(MAX_BATCH_SIZE);

    if (queryError) throw queryError;

    const batchSize = pendingEmails?.length || 0;
    console.log(`Found ${batchSize} pending emails`);

    if (batchSize === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No pending emails", sent: 0, failed: 0
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const results = { sent: 0, failed: 0, errors: [] as Array<{ email: string; error: string }> };

    for (let i = 0; i < pendingEmails!.length; i++) {
      const email = pendingEmails![i];

      try {
        console.log(`[${i + 1}/${batchSize}] Sending to ${email.recipient_email}...`);

        const { data: resendData, error: sendError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: email.recipient_email,
          subject: email.subject,
          html: email.html_content,
        });

        if (sendError) throw new Error(sendError.message || "Resend API error");

        const resendId = resendData?.id || null;
        const sentAt = new Date().toISOString();

        console.log(`Sent: ${resendId}`);

        // Mark as sent in queue
        await supabase
          .from("simple_email_queue")
          .update({ status: "sent", sent_at: sentAt, resend_id: resendId, attempts: (email.attempts || 0) + 1 })
          .eq("id", email.id);

        // Write to immutable audit log
        await supabase
          .from("simple_email_logs")
          .insert({
            cohort_id: email.cohort_id,
            user_id: email.user_id,
            recipient_email: email.recipient_email,
            subject: email.subject,
            email_type: email.email_type,
            day_number: email.day_number,
            sent_at: sentAt,
            delivery_status: "delivered",
            resend_id: resendId,
          });

        results.sent++;

        // Rate limiting delay (skip after last email)
        if (i < pendingEmails!.length - 1) {
          await delay(DELAY_MS);
        }

      } catch (emailError) {
        const errorMessage = emailError instanceof Error
          ? emailError.message
          : String(emailError);

        console.error(`Failed:`, errorMessage);

        const isRateLimit = errorMessage.toLowerCase().includes("429") ||
                            errorMessage.toLowerCase().includes("rate limit");

        const newAttempts = (email.attempts || 0) + 1;
        const newStatus = newAttempts >= MAX_RETRY_ATTEMPTS ? "failed" : "pending";

        await supabase
          .from("simple_email_queue")
          .update({
            attempts: newAttempts,
            error_message: errorMessage.substring(0, 500),
            status: newStatus,
          })
          .eq("id", email.id);

        results.failed++;
        results.errors.push({ email: email.recipient_email, error: errorMessage });

        // Aggressive back-off on rate limit
        if (isRateLimit) {
          console.log("Rate limited - backing off 5s");
          await delay(5000);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      batch_size: batchSize,
      sent: results.sent,
      failed: results.failed,
      duration_ms: Date.now() - startTime,
      errors: results.errors.length > 0 ? results.errors : undefined,
    }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Function error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
