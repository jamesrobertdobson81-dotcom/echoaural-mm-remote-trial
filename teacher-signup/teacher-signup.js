'use strict';

const { api, setMessage, escapeHtml } = window.EchoAuralAccounts;
const signupParams = new URLSearchParams(window.location.search);
const form = document.getElementById('teacherSignupForm');
const button = document.getElementById('signupButton');
const message = document.getElementById('signupMessage');
const success = document.getElementById('signupSuccess');
const teacherDashboardUrl = '/account/teacher-dashboard/';
let teacherActivationWatcher = null;

async function openDashboardWhenTeacherIsActive() {
  try {
    const current = await api('/api/auth/me?role=teacher');

    if (current?.role === 'teacher') {
      if (teacherActivationWatcher) {
        window.clearInterval(teacherActivationWatcher);
        teacherActivationWatcher = null;
      }

      window.location.replace(teacherDashboardUrl);
      return true;
    }
  } catch (_error) {
    // The teacher has not activated or logged in yet.
  }

  return false;
}

function watchForTeacherActivation() {
  if (teacherActivationWatcher) return;

  teacherActivationWatcher = window.setInterval(
    openDashboardWhenTeacherIsActive,
    1500
  );
}
const invitationCode = signupParams.get('code');
const signupMode = signupParams.get('mode') === 'development'
  ? 'development'
  : 'founding';

if (invitationCode && form?.pilotCode) {
  form.pilotCode.value = invitationCode;
}

if (signupMode === 'development') {
  document.body.classList.add('development-code-signup');

  const heroKicker = document.querySelector('.hero-kicker');
  const heroTitle = document.querySelector('.hero-title');
  const heroText = document.querySelector('.hero-text');
  const signupTitle = document.getElementById('signupTitle');
  const intro = document.querySelector('.onboarding-form-panel .card-intro');
  const codeLabel = document.querySelector('label[for="pilotCode"]');
  const codeHelp = document.querySelector('#pilotCode + .field-help');

  if (heroKicker) heroKicker.textContent = 'Development teacher access';
  if (heroTitle) {
    heroTitle.innerHTML =
      'Activate your EchoAural <span class="gradient">classroom.</span>';
  }
  if (heroText) {
    heroText.textContent =
      'Use the development code supplied by EchoAural to create your teacher account, classes and student access.';
  }
  if (signupTitle) signupTitle.textContent = 'Use your development code.';
  if (intro) {
    intro.textContent =
      'Enter your teacher and school details together with the development code supplied by EchoAural. We will prepare a secure one-time setup link.';
  }
  if (codeLabel) codeLabel.textContent = 'Development code';
  if (codeHelp) {
    codeHelp.textContent =
      'Enter the code supplied in your EchoAural development-access invitation.';
  }

  if (form?.pilotCode) {
    form.pilotCode.required = true;
    form.pilotCode.setAttribute('aria-required', 'true');
    form.pilotCode.placeholder = 'Enter development code';
  }

  if (button) button.textContent = 'Create teacher account';
}


openDashboardWhenTeacherIsActive();

window.addEventListener('focus', openDashboardWhenTeacherIsActive);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) openDashboardWhenTeacherIsActive();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  setMessage(message);
  success.hidden = true;
  button.disabled = true;
  button.textContent = 'Creating account…';
  try {
    const result = await api('/api/signup/teacher', {
      method: 'POST',
      body: JSON.stringify({
        displayName: form.displayName.value,
        email: form.email.value,
        schoolName: form.schoolName.value,
        country: form.country.value,
        examBoard: form.examBoard.value,
        pilotCode: form.pilotCode.value,
        signupMode,
        acceptedTerms: form.acceptedTerms.checked
      })
    });
    const delivery = result.delivery || {};
    success.innerHTML = `
      <strong>Check your email to activate EchoAural.</strong><br />
      Your EchoAural teacher account has been prepared for ${escapeHtml(form.email.value)}.
      The welcome email contains your teacher code and a secure one-time link to create your password.
      ${delivery.method === 'local_preview' ? `<br /><a class="onboarding-preview-link" href="${escapeHtml(delivery.previewUrl)}" target="_blank" rel="noopener">Open the local test email →</a>` : ''}
    `;
    success.hidden = false;
    form.querySelectorAll('input,select,button').forEach((control) => { control.disabled = true; });

    /*
      The secure email/password activation flow remains unchanged. Once the
      activation page creates the teacher session, this signup page replaces
      itself with the existing dashboard instead of remaining open.
    */
    watchForTeacherActivation();
  } catch (error) {
    setMessage(message, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Create teacher account';
  }
});
