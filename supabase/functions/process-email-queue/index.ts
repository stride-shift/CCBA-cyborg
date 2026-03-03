import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'CCBA Ascend <noreply@mail.ccba-ascend.d-lab.co.za>'

async function sendViaResend(to: string, subject: string, html: string, text?: string) {
  const payload: Record<string, unknown> = {
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
  }
  if (text) payload.text = text

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || `Resend API error: ${res.status}`)
  }
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Optional: allow specifying which queue to process and batch size
    let queue_table = 'simple_email_queue'
    let log_table = 'simple_email_logs'
    let batch_size = 50

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body.queue_table === 'email_auto_queue') {
          queue_table = 'email_auto_queue'
          log_table = 'email_auto_logs'
        }
        if (body.batch_size) batch_size = Math.min(body.batch_size, 100)
      } catch {
        // No body or invalid JSON — use defaults
      }
    }

    // Fetch pending emails that are scheduled for now or earlier
    const now = new Date().toISOString()
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from(queue_table)
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(batch_size)

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`)
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending emails' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sent = 0
    let failed = 0
    const results: Array<{ id: string; status: string; error?: string }> = []

    for (const email of pendingEmails) {
      try {
        // Send via Resend
        const resendResult = await sendViaResend(
          email.recipient_email,
          email.subject,
          email.html_content,
          email.text_content || undefined
        )

        // Mark as sent in the queue
        await supabaseAdmin
          .from(queue_table)
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            resend_id: resendResult.id,
            attempts: email.attempts + 1,
          })
          .eq('id', email.id)

        // Log the send
        const logEntry: Record<string, unknown> = {
          recipient_email: email.recipient_email,
          subject: email.subject,
          email_type: email.email_type,
          day_number: email.day_number,
          sent_at: new Date().toISOString(),
          resend_id: resendResult.id,
          delivery_status: 'sent',
        }

        if (queue_table === 'email_auto_queue') {
          logEntry.queue_id = email.id
          logEntry.user_id = email.user_id
          logEntry.cohort_id = email.cohort_id
        } else {
          logEntry.cohort_id = email.cohort_id
          logEntry.user_id = email.user_id
        }

        await supabaseAdmin.from(log_table).insert(logEntry)

        sent++
        results.push({ id: email.id, status: 'sent' })

      } catch (sendError) {
        // Mark as failed (or increment attempts)
        const newAttempts = email.attempts + 1
        const newStatus = newAttempts >= (email.max_attempts || 3) ? 'failed' : 'pending'

        await supabaseAdmin
          .from(queue_table)
          .update({
            status: newStatus,
            attempts: newAttempts,
            error_message: sendError.message,
          })
          .eq('id', email.id)

        failed++
        results.push({ id: email.id, status: 'failed', error: sendError.message })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingEmails.length,
        sent,
        failed,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('process-email-queue error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
