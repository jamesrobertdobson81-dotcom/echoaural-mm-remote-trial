'use strict';

// Zero-new-dependency production error alerting: emails whoever's set as
// ALERT_EMAIL (falling back to EMAIL_REPLY_TO, the address already
// configured for real replies) via the same Resend integration already
// used for account emails, the moment an unexpected server error happens.
// Deliberately does NOT reach for a full APM/error-tracking SaaS — this
// app keeps its dependency footprint intentionally small (see README), and
// this covers the actual gap (nobody finds out something broke until a
// teacher emails) without adding one.
//
// Two things route here:
//   - server.js's top-level request-handler catch — every route that can
//     fail in an *expected* way already sends its own JSON error response
//     from inside account-server.js/classroom-server.js, so anything that
//     reaches that catch is by construction unexpected and worth knowing
//     about.
//   - process-level uncaughtException/unhandledRejection, registered
//     below, for failures outside any request at all (a timer callback, a
//     background interval).

const { sendWithResend } = require('./email-service');

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const lastAlertBySignature = new Map();

function alertDestination() {
  const configured = String(process.env.ALERT_EMAIL || '').trim();
  if (configured) return configured;
  const replyTo = String(process.env.EMAIL_REPLY_TO || '').trim();
  return replyTo || null;
}

function signatureFor(error) {
  const message = error && error.message ? String(error.message) : String(error);
  // First line only — a stack trace's later lines (line numbers, async
  // frames) are exactly the kind of incidental variation that would
  // otherwise defeat the cooldown for what's really the same recurring
  // fault.
  return message.split('\n')[0].slice(0, 200);
}

// Best-effort, deliberately: a failure to send the alert itself must never
// throw back into the caller (server.js's own catch block, or a process
// exit handler) and must never delay the response the request is already
// trying to send.
function alertOnError(error, context = {}) {
  console.error(`[EchoAural alert] ${context.label || 'Unexpected server error'}:`, error);

  if (String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'production') return;
  if (!process.env.RESEND_API_KEY) return;
  const to = alertDestination();
  if (!to) return;

  const signature = signatureFor(error);
  const now = Date.now();
  const last = lastAlertBySignature.get(signature) || 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  lastAlertBySignature.set(signature, now);

  const stack = error && error.stack ? String(error.stack) : String(error);
  const contextLines = Object.entries(context)
    .filter(([key]) => key !== 'label')
    .map(([key, value]) => `${key}: ${value}`);
  const text = [
    `${context.label || 'Unexpected server error'} at ${new Date(now).toISOString()}`,
    '',
    ...contextLines,
    '',
    stack
  ].join('\n');

  sendWithResend({
    to,
    subject: `[EchoAural] ${context.label || 'Server error'}: ${signature}`.slice(0, 200),
    html: `<pre style="white-space:pre-wrap;font-family:monospace;font-size:13px;">${escapeHtml(text)}</pre>`,
    text
  }).catch((sendError) => {
    console.error('[EchoAural alert] Could not send the alert email itself:', sendError.message || sendError);
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function installProcessHandlers() {
  process.on('uncaughtException', (error) => {
    alertOnError(error, { label: 'Uncaught exception' });
    // Node's own guidance: the process is in an undefined state after this
    // and should not keep serving requests. Render restarts a crashed
    // process automatically, and now that the web service isn't on the
    // free tier that restart is fast, not a cold-start-from-idle.
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    alertOnError(reason instanceof Error ? reason : new Error(String(reason)), { label: 'Unhandled promise rejection' });
  });
}

module.exports = { alertOnError, installProcessHandlers };
