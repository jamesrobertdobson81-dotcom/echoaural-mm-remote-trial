'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_EMAIL_FROM = 'EchoAural <welcome@echoaural.com>';
const DEFAULT_REPLY_TO = 'hello@echoaural.com';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function welcomeEmail({ teacherName, teacherEmail, teacherCode, setupUrl }) {
  const safeName = escapeHtml(teacherName);
  const safeEmail = escapeHtml(teacherEmail);
  const safeCode = escapeHtml(teacherCode);
  const safeUrl = escapeHtml(setupUrl);

  const subject = 'Welcome to EchoAural — set up your teacher account';
  const text = [
    `Hi ${teacherName},`,
    '',
    'Welcome to EchoAural.',
    '',
    `Teacher email: ${teacherEmail}`,
    `Teacher code: ${teacherCode}`,
    '',
    'Your pilot access includes one teacher account, up to 20 active student accounts, independent practice, live quizzes and progress feedback.',
    '',
    `Set up your password: ${setupUrl}`,
    '',
    'This one-time setup link expires after 24 hours.',
    '',
    'EchoAural is currently optimised for laptops, desktop computers and Chromebooks.',
    '',
    'Listen. Identify. Improve.',
    'EchoAural'
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
  <style>
    @keyframes eaEmailWave {
      0%, 100% { transform: scaleY(.72); opacity: .74; }
      45% { transform: scaleY(1.08); opacity: 1; }
    }
    .ea-email-wave-bar {
      transform-origin: center bottom;
      animation: eaEmailWave 1.45s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .ea-email-wave-bar { animation: none !important; }
    }
    @media screen and (max-width: 520px) {
      .ea-shell { border-radius: 20px !important; }
      .ea-banner { padding: 28px 24px !important; }
      .ea-body { padding: 30px 24px !important; }
      .ea-wordmark { font-size: 31px !important; }
    }
  </style>
</head>
<body style="margin:0;background:#edf5ff;font-family:Inter,Arial,sans-serif;color:#10233f">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#edf5ff;background-image:radial-gradient(circle at 15% 0%, rgba(56,189,248,.12), transparent 30%),radial-gradient(circle at 85% 12%, rgba(139,92,246,.12), transparent 28%);padding:28px 14px">
    <tr><td align="center">
      <table class="ea-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 22px 64px rgba(7,17,31,.14)">
        <tr><td class="ea-banner" style="background:#07111f;background-image:radial-gradient(circle at 78% 18%, rgba(56,189,248,.30), transparent 31%),radial-gradient(circle at 16% 82%, rgba(168,85,247,.24), transparent 36%),linear-gradient(135deg,#050b16,#07111f 48%,#101f3d);padding:34px 38px 32px;color:#fff">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%">
            <tr>
              <td style="vertical-align:middle;width:78px">
                <span aria-hidden="true" style="display:inline-block;height:52px;white-space:nowrap">
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:14px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#38bdf8,#4a90e2);animation-delay:0s"></span>
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:27px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#38bdf8,#4a90e2);animation-delay:.08s"></span>
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:39px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#60a5fa,#4a90e2 48%,#8b5cf6);animation-delay:.16s"></span>
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:48px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#7dd3fc,#4a90e2 38%,#8b5cf6 76%,#a855f7);animation-delay:.24s"></span>
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:35px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#a78bfa,#8b5cf6 52%,#c084fc);animation-delay:.32s"></span>
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:23px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#c084fc,#a855f7 58%,#fb7185);animation-delay:.4s"></span>
                  <span class="ea-email-wave-bar" style="display:inline-block;width:5px;height:15px;margin:0 2px;border-radius:999px;vertical-align:middle;background:linear-gradient(180deg,#d946ef,#fb7185);animation-delay:.48s"></span>
                </span>
              </td>
              <td style="vertical-align:middle">
                <div class="ea-wordmark" style="font-size:36px;font-weight:900;letter-spacing:-.06em;line-height:.92"><span style="color:#fff">Echo</span><span style="color:#38bdf8;background:linear-gradient(135deg,#38bdf8 0%,#4a90e2 34%,#8b5cf6 72%,#fb7185 100%);background-clip:text">Aural</span></div>
                <div style="margin-top:10px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9edbff;font-weight:800">Listen. Identify. Improve.</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td class="ea-body" style="padding:38px">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#4a90e2;font-weight:900">Teacher access</div>
          <h1 style="font-size:30px;line-height:1.1;margin:10px 0 14px">Welcome, ${safeName}.</h1>
          <p style="font-size:16px;line-height:1.65;margin:0 0 20px;color:#53657f">Your EchoAural pilot account is ready to activate.</p>
          <div style="background:#f8fbff;background-image:radial-gradient(circle at 92% 8%, rgba(139,92,246,.08), transparent 38%),linear-gradient(145deg,#fbfcfe,#f8f7ff);border:1px solid #dfe7f0;border-radius:18px;padding:18px 20px;margin:0 0 22px">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#657da0;font-weight:850">Account details</div>
            <p style="margin:10px 0 4px"><strong>Email:</strong> ${safeEmail}</p>
            <p style="margin:4px 0"><strong>Teacher code:</strong> ${safeCode}</p>
            <p style="margin:4px 0"><strong>Student seats:</strong> 20</p>
          </div>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px"><tr><td style="background:#1589ff;background-image:linear-gradient(135deg,#38bdf8 0%,#4a90e2 34%,#8b5cf6 72%,#fb7185 100%);border-radius:999px">
            <a href="${safeUrl}" style="display:inline-block;color:#fff;text-decoration:none;font-weight:800;padding:15px 24px;border-radius:999px">Set up my EchoAural account</a>
          </td></tr></table>
          <p style="font-size:13px;line-height:1.55;color:#7a8ba2;margin:0 0 20px">If the button is not visible, copy and paste this secure setup link into your browser:<br /><a href="${safeUrl}" style="color:#1589ff;word-break:break-all">${safeUrl}</a></p>
          <p style="font-size:13px;line-height:1.55;color:#7a8ba2;margin:0">This secure one-time link expires after 24 hours. EchoAural is currently optimised for laptops, desktops and Chromebooks.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function unquoteEnvValue(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed.at(0);
  const last = trimmed.at(-1);
  if (
    (first === '"' && last === '"') ||
    (first === "'" && last === "'") ||
    (first === '“' && last === '”') ||
    (first === '‘' && last === '’')
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function validEmailAddress(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(String(value || '').trim());
}

function validFromAddress(value) {
  const trimmed = String(value || '').trim();
  if (validEmailAddress(trimmed)) return true;
  const match = trimmed.match(/^([^<>]+)<([^<>]+)>$/);
  return Boolean(match && match[1].trim() && validEmailAddress(match[2]));
}

function emailFromAddress() {
  const configured = unquoteEnvValue(process.env.EMAIL_FROM);
  if (validFromAddress(configured)) return configured;
  if (configured) {
    console.warn('[EchoAural email] Ignoring invalid EMAIL_FROM value; using default sender.');
  }
  return DEFAULT_EMAIL_FROM;
}

function replyToAddress() {
  const configured = unquoteEnvValue(process.env.EMAIL_REPLY_TO);
  if (validEmailAddress(configured)) return configured;
  if (configured) {
    console.warn('[EchoAural email] Ignoring invalid EMAIL_REPLY_TO value; using default reply-to.');
  }
  return DEFAULT_REPLY_TO;
}

async function sendWithResend({ to, subject, html, text }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [to],
        reply_to: replyToAddress(),
        subject,
        html,
        text
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Resend returned ${response.status}.`);
    return { method: 'resend', id: payload.id || null };
  } finally {
    clearTimeout(timeout);
  }
}

function saveDevelopmentEmail({ projectRoot, recipient, html, text }) {
  const outbox = path.join(projectRoot, 'dev-mail');
  fs.mkdirSync(outbox, { recursive: true });
  const safeRecipient = String(recipient).replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${stamp}-${safeRecipient}.html`;
  const filepath = path.join(outbox, filename);
  fs.writeFileSync(filepath, html, 'utf8');
  fs.writeFileSync(path.join(outbox, `${filename}.txt`), text, 'utf8');
  fs.writeFileSync(path.join(outbox, 'latest.html'), html, 'utf8');
  return { method: 'local_preview', previewUrl: '/dev-mail/latest.html', filename };
}

async function sendWelcomeEmail({ projectRoot, teacherName, teacherEmail, teacherCode, setupUrl }) {
  const message = welcomeEmail({ teacherName, teacherEmail, teacherCode, setupUrl });
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendWithResend({ to: teacherEmail, ...message });
    } catch (error) {
      if (String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production') throw error;
      console.warn('[EchoAural email] Resend failed; using local preview email:', error.message || error);
    }
  }
  return saveDevelopmentEmail({ projectRoot, recipient: teacherEmail, html: message.html, text: message.text });
}

module.exports = { sendWelcomeEmail };
