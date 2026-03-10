import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { user_id, new_email } = await req.json()

    // Validate required fields
    if (!user_id || !new_email) {
      return new Response(
        JSON.stringify({ error: 'User ID and new email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(new_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's current email before updating
    const { data: currentUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (getUserError || !currentUser?.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const oldEmail = currentUser.user.email

    // Update the user's email in auth.users
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { email: new_email, email_confirm: true }
    )

    if (error) {
      console.error('Error changing email:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update any pending emails in the queue to use the new email
    const { error: queueError } = await supabaseAdmin
      .from('simple_email_queue')
      .update({ recipient_email: new_email })
      .eq('user_id', user_id)
      .eq('status', 'pending')

    if (queueError) {
      console.warn('Warning: Could not update pending email queue:', queueError.message)
      // Don't fail the whole operation - the email was already changed
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email changed from ${oldEmail} to ${new_email}`,
        old_email: oldEmail,
        new_email: new_email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
