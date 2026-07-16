const path = require('path');
require('dotenv').config();

const { sendWelcomeEmail } = require('../accounts/email-service');

const projectRoot = path.resolve(__dirname, '..');

function usage() {
  console.log([
    'Usage: npm run email:test -- recipient@example.com',
    '',
    'Required for real email:',
    '  RESEND_API_KEY=re_xxxxxxxxx',
    '  EMAIL_FROM=EchoAural <welcome@echoaural.com>',
    '  EMAIL_REPLY_TO=james@echoaural.com',
    '',
    'The recipient can also be set with EMAIL_TEST_TO.'
  ].join('\n'));
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function main() {
  const recipient = cleanEmail(process.argv[2] || process.env.EMAIL_TEST_TO);
  if (!recipient || !recipient.includes('@')) {
    usage();
    process.exitCode = 1;
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing, so this would only create a local preview email.');
    console.error('Add your Resend API key to .env, restart the server, then run this again.');
    process.exitCode = 1;
    return;
  }

  const delivery = await sendWelcomeEmail({
    projectRoot,
    teacherName: 'EchoAural Test Teacher',
    teacherEmail: recipient,
    teacherCode: 'TEST01',
    setupUrl: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/account/setup/?token=test-email-preview`
  });

  if (delivery.method !== 'resend') {
    console.error('Resend did not send the email. Check the warning above for the reason.');
    console.error('Local preview:', delivery.previewUrl || delivery.filename || 'created');
    process.exitCode = 1;
    return;
  }

  console.log(`Sent real EchoAural test email to ${recipient}.`);
  console.log(`Resend id: ${delivery.id || 'not returned'}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
