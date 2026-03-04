-- Redesign OTP/auth emails to match Cyborg Habits branding

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
  _heading text;
  _subtitle text;
  _html text;
  _request_id bigint;
BEGIN
  _email := event->'user'->>'email';
  _token := event->'email_data'->>'token';
  _action_type := event->'email_data'->>'email_action_type';

  CASE _action_type
    WHEN 'signup' THEN
      _subject := 'Welcome to CCBA Ascend - Verify Your Email';
      _heading := 'Your Verification Code';
      _subtitle := 'Enter this code to verify your email:';

    WHEN 'magiclink', 'email' THEN
      _subject := 'Your CCBA Ascend Login Code';
      _heading := 'Your Verification Code';
      _subtitle := 'Enter this code to continue:';

    WHEN 'recovery' THEN
      _subject := 'Reset Your CCBA Ascend Password';
      _heading := 'Password Reset Code';
      _subtitle := 'Enter this code to reset your password:';

    WHEN 'email_change' THEN
      _subject := 'Confirm Your Email Change - CCBA Ascend';
      _heading := 'Email Change Code';
      _subtitle := 'Enter this code to confirm your email change:';

    ELSE
      _subject := 'CCBA Ascend - Verification Code';
      _heading := 'Your Verification Code';
      _subtitle := 'Enter this code to continue:';
  END CASE;

  _html := '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>' || _subject || '</title>
<!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,''Helvetica Neue'',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' || _heading || ' - ' || _subtitle || '</div>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#ffffff;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Outer wrapper with red bubbles -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">
<tr>

<!-- Left outer bubbles -->
<td width="60" valign="top" style="padding:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 2px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:24px;height:24px;border-radius:50%;background-color:rgba(255,0,0,0.08);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 30px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:10px;height:10px;border-radius:50%;background-color:rgba(255,0,0,0.14);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 10px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:44px;height:44px;border-radius:50%;background-color:rgba(255,0,0,0.06);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 38px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:8px;height:8px;border-radius:50%;background-color:rgba(255,0,0,0.16);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:30px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 4px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:16px;height:16px;border-radius:50%;background-color:rgba(255,0,0,0.10);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 22px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:32px;height:32px;border-radius:50%;background-color:rgba(255,0,0,0.05);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 6px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:12px;height:12px;border-radius:50%;background-color:rgba(255,0,0,0.12);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 34px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:20px;height:20px;border-radius:50%;background-color:rgba(255,0,0,0.07);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:0 0 0 14px;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:6px;height:6px;border-radius:50%;background-color:rgba(255,0,0,0.18);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
</table>
</td>

<!-- Main email container -->
<td valign="top" style="padding:0;">

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" style="max-width:480px;width:100%;overflow:hidden;">

<!-- RED HEADER -->
<tr><td style="background-color:#dc2626;padding:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<!-- Top padding -->
<tr><td style="height:36px;font-size:0;line-height:0;">&nbsp;</td></tr>
<!-- Cyborg Habits logo + title -->
<tr><td align="center" style="padding:0 24px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr>
<td valign="middle" style="padding-right:10px;">
<!--[if mso]><v:oval style="width:32px;height:32px;" fillcolor="#ffffff" stroked="false"><v:oval style="width:18px;height:18px;margin:7px;" fillcolor="#dc2626" stroked="false"></v:oval></v:oval><![endif]-->
<!--[if !mso]>--><div style="width:32px;height:32px;border-radius:50%;background-color:#ffffff;display:inline-block;vertical-align:middle;padding:7px;box-sizing:border-box;"><div style="width:18px;height:18px;border-radius:50%;background-color:#dc2626;"></div></div><!--<![endif]-->
</td>
<td valign="middle">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.5px;font-family:Arial,''Helvetica Neue'',sans-serif;">Cyborg Habits</h1>
</td>
</tr></table>
</td></tr>
<!-- Subtitle -->
<tr><td align="center" style="padding:6px 24px 0;">
<p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:400;font-family:Arial,''Helvetica Neue'',sans-serif;">Sign in to your account</p>
</td></tr>
<!-- Bottom padding -->
<tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>

<!-- CONTENT AREA -->
<tr><td style="background-color:#ffffff;padding:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">

<!-- Heading -->
<tr><td align="center" style="padding:40px 32px 8px;">
<h2 style="margin:0;color:#222222;font-size:22px;font-weight:800;font-family:Arial,''Helvetica Neue'',sans-serif;">' || _heading || '</h2>
</td></tr>

<!-- Subtitle -->
<tr><td align="center" style="padding:0 32px 24px;">
<p style="margin:0;color:#666666;font-size:15px;font-family:Arial,''Helvetica Neue'',sans-serif;">' || _subtitle || '</p>
</td></tr>

<!-- Token code box -->
<tr><td align="center" style="padding:0 32px 28px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center" style="border:2px solid #dc2626;border-radius:12px;background-color:#fef2f2;padding:24px 16px;">
<span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#222222;font-family:Arial,''Helvetica Neue'',sans-serif;">' || _token || '</span>
</td></tr>
</table>
</td></tr>

<!-- Warning callout -->
<tr><td style="padding:0 32px 24px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td style="border-left:3px solid #dc2626;background-color:#fffbeb;padding:14px 16px;border-radius:0 8px 8px 0;">
<p style="margin:0 0 4px;color:#222222;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">This code expires in 1 hour</p>
<p style="margin:0;color:#92400e;font-size:13px;font-family:Arial,sans-serif;">For your security, please don''t share this code with anyone.</p>
</td></tr>
</table>
</td></tr>

<!-- Instruction text -->
<tr><td align="center" style="padding:0 32px 16px;">
<p style="margin:0;color:#444444;font-size:14px;line-height:1.5;font-family:Arial,''Helvetica Neue'',sans-serif;">Go back to your app and enter the code above to continue.</p>
</td></tr>

<!-- Divider -->
<tr><td style="padding:8px 32px 16px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td style="height:1px;background-color:#e5e7eb;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
</td></tr>

<!-- Safety note -->
<tr><td align="center" style="padding:0 32px 32px;">
<p style="margin:0;color:#9ca3af;font-size:12px;font-family:Arial,''Helvetica Neue'',sans-serif;">If you didn''t request this code, you can safely ignore this email.</p>
</td></tr>

</table>
</td></tr>

<!-- FOOTER -->
<tr><td style="background-color:#000000;padding:28px 24px;text-align:center;">
<p style="margin:0 0 12px;color:#777777;font-size:11px;font-weight:600;line-height:1.6;letter-spacing:0.5px;font-family:Arial,sans-serif;">Explain It &middot; Suggest It &middot; Imagine It &middot; Plan It &middot; Critique It &middot; Guide It &middot; Improve It</p>
<p style="margin:0;color:#555555;font-size:10px;font-family:Arial,sans-serif;">&copy; 2026 StrideShift Global. All rights reserved.</p>
</td></tr>

</table>

</td>

<!-- Right outer bubbles -->
<td width="60" valign="top" style="padding:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
<tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 4px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:14px;height:14px;border-radius:50%;background-color:rgba(255,0,0,0.10);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:18px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 24px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:36px;height:36px;border-radius:50%;background-color:rgba(255,0,0,0.06);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 8px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:8px;height:8px;border-radius:50%;background-color:rgba(255,0,0,0.16);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 16px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:22px;height:22px;border-radius:50%;background-color:rgba(255,0,0,0.08);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:22px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 36px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:10px;height:10px;border-radius:50%;background-color:rgba(255,0,0,0.14);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 6px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:28px;height:28px;border-radius:50%;background-color:rgba(255,0,0,0.05);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 20px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:16px;height:16px;border-radius:50%;background-color:rgba(255,0,0,0.11);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="height:18px;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td align="right" style="padding:0 40px 0 0;line-height:0;font-size:0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="width:6px;height:6px;border-radius:50%;background-color:rgba(255,0,0,0.18);font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
</table>
</td>

</tr>
</table>

</td></tr>
</table>

</body>
</html>';

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

-- Re-grant permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_auth_send_email(jsonb) FROM authenticated;
