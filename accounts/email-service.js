'use strict';

const fs = require('fs');
const path = require('path');

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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#eef3f8;font-family:Inter,Arial,sans-serif;color:#10233f">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f8;padding:28px 14px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 20px 60px rgba(7,17,31,.12)">
        <tr><td style="background:#07111f;padding:32px 38px;color:#fff">
          <div style="font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#91a5c1;margin-bottom:10px">Listen. Identify. Improve.</div>
          <div style="font-size:30px;font-weight:800"><span style="color:#fff">Echo</span><span style="color:#38bdf8">Aural</span></div>
        </td></tr>
        <tr><td style="padding:38px">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b7d96;font-weight:800">Teacher access</div>
          <h1 style="font-size:30px;line-height:1.1;margin:10px 0 14px">Welcome, ${safeName}.</h1>
          <p style="font-size:16px;line-height:1.65;margin:0 0 20px;color:#53657f">Your EchoAural pilot account is ready to activate.</p>
          <div style="background:#f5f8fc;border:1px solid #dfe7f0;border-radius:18px;padding:18px 20px;margin:0 0 22px">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#7789a2;font-weight:800">Account details</div>
            <p style="margin:10px 0 4px"><strong>Email:</strong> ${safeEmail}</p>
            <p style="margin:4px 0"><strong>Teacher code:</strong> ${safeCode}</p>
            <p style="margin:4px 0"><strong>Student seats:</strong> 20</p>
          </div>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px"><tr><td style="background:#1589ff;border-radius:999px">
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
        from: process.env.EMAIL_FROM || 'EchoAural <welcome@echoaural.com>',
        to: [to],
        reply_to: process.env.EMAIL_REPLY_TO || 'hello@echoaural.com',
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
