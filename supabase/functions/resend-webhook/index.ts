import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json();
    const eventType = payload.type;
    console.log(`Resend webhook: ${eventType}`);

    if (eventType === "email.bounced") {
      const emailId = payload.data?.email_id;
      if (!emailId) {
        return new Response(JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Get current attempts
      const { data: current } = await supabase
        .from("simple_email_queue")
        .select("attempts")
        .eq("resend_id", emailId)
        .single();

      const attempts = (current?.attempts || 0) + 1;

      // Reset to pending for automatic retry
      await supabase
        .from("simple_email_queue")
        .update({
          status: "pending",
          resend_id: null,
          sent_at: null,
          attempts,
          error_message: `Bounced at ${new Date().toISOString()} (attempt ${attempts})`,
        })
        .eq("resend_id", emailId);

      console.log(`Email ${emailId} bounced - reset to pending (attempt ${attempts})`);
    }

    return new Response(JSON.stringify({ success: true, event: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
