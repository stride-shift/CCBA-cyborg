-- Enable pg_net for HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the Auth Hook function that sends emails via Resend (through our Edge Function)
CREATE OR REPLACE FUNCTION public.handle_auth_send_email(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _email text;
  _token text;
  _action_type text;
  _subject text;
  _html text;
  _request_id bigint;
BEGIN
  -- Extract data from the hook event
  _email := event->'user'->>'email';
  _token := event->'email_data'->>'token';
  _action_type := event->'email_data'->>'email_action_type';

  -- Build subject and HTML based on action type
  CASE _action_type
    WHEN 'signup' THEN
      _subject := 'Welcome to CCBA Ascend - Verify Your Email';
      _html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
               '<h2 style="color: #dc2626;">Welcome to CCBA Ascend!</h2>' ||
               '<p>Your verification code is:</p>' ||
               '<div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">' || _token || '</div>' ||
               '<p style="color: #666;">This code expires in 1 hour.</p>' ||
               '</div>';

    WHEN 'magiclink', 'email' THEN
      _subject := 'Your CCBA Ascend Login Code';
      _html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
               '<h2 style="color: #dc2626;">Sign In to CCBA Ascend</h2>' ||
               '<p>Your one-time login code is:</p>' ||
               '<div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">' || _token || '</div>' ||
               '<p style="color: #666;">This code expires in 1 hour.</p>' ||
               '</div>';

    WHEN 'recovery' THEN
      _subject := 'Reset Your CCBA Ascend Password';
      _html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
               '<h2 style="color: #dc2626;">Password Reset</h2>' ||
               '<p>Your password reset code is:</p>' ||
               '<div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">' || _token || '</div>' ||
               '<p style="color: #666;">This code expires in 1 hour.</p>' ||
               '</div>';

    WHEN 'email_change' THEN
      _subject := 'Confirm Your Email Change - CCBA Ascend';
      _html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
               '<h2 style="color: #dc2626;">Email Change Confirmation</h2>' ||
               '<p>Your confirmation code is:</p>' ||
               '<div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">' || _token || '</div>' ||
               '<p style="color: #666;">This code expires in 1 hour.</p>' ||
               '</div>';

    ELSE
      _subject := 'CCBA Ascend - Verification Code';
      _html := '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">' ||
               '<h2 style="color: #dc2626;">Verification Code</h2>' ||
               '<p>Your code is:</p>' ||
               '<div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">' || _token || '</div>' ||
               '<p style="color: #666;">This code expires in 1 hour.</p>' ||
               '</div>';
  END CASE;

  -- Call the send-email Edge Function via pg_net
  SELECT INTO _request_id net.http_post(
    url := 'https://mkvczghwutluguygixhx.supabase.co/functions/v1/send-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', _email,
      'subject', _subject,
      'html', _html
    )
  );

  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin (required for auth hooks)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) TO supabase_auth_admin;

-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) FROM authenticated;
