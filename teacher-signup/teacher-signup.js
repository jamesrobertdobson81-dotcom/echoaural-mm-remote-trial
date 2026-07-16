'use strict';

const { api, setMessage, escapeHtml } = window.EchoAuralAccounts;
const signupParams = new URLSearchParams(window.location.search);
const form = document.getElementById('teacherSignupForm');
const button = document.getElementById('signupButton');
const message = document.getElementById('signupMessage');
const success = document.getElementById('signupSuccess');
const countryInput = document.getElementById('country');
const pilotCodeInput = document.getElementById('pilotCode');
const pilotCodeField = pilotCodeInput?.closest('.field');
const acceptedTermsInput = document.getElementById('acceptedTerms');
const teacherDashboardUrl = '/account/teacher-dashboard/';
let teacherActivationWatcher = null;
const countryOptions = new Set(
  Array.from(document.querySelectorAll('#countryList option'))
    .map((option) => option.value.trim().toLowerCase())
    .filter(Boolean)
);

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

function validateCountryInput() {
  if (!countryInput || !countryOptions.size) return true;

  const country = countryInput.value.trim();
  countryInput.value = country;

  if (!country || countryOptions.has(country.toLowerCase())) {
    countryInput.setCustomValidity('');
    return true;
  }

  countryInput.setCustomValidity('Choose a country from the list.');
  return false;
}

countryInput?.addEventListener('input', () => {
  countryInput.setCustomValidity('');
});

countryInput?.addEventListener('change', validateCountryInput);

const invitationCode = signupParams.get('code');
const signupMode = signupParams.get('mode') === 'development' || invitationCode
  ? 'development'
  : 'founding';

if (invitationCode && pilotCodeInput) {
  pilotCodeInput.value = invitationCode;
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
  if (pilotCodeField) pilotCodeField.hidden = false;

  if (pilotCodeInput) {
    pilotCodeInput.required = true;
    pilotCodeInput.setAttribute('aria-required', 'true');
    pilotCodeInput.placeholder = 'Enter development code';
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
  validateCountryInput();
  if (!form.reportValidity()) return;
  setMessage(message);
  success.hidden = true;
  button.disabled = true;
  button.textContent = 'Creating account…';
  try {
    const formData = new FormData(form);
    const teacherEmail = formData.get('email') || '';
    const result = await api('/api/signup/teacher', {
      method: 'POST',
      body: JSON.stringify({
        displayName: formData.get('displayName') || '',
        email: teacherEmail,
        schoolName: formData.get('schoolName') || '',
        country: formData.get('country') || '',
        examBoard: formData.get('examBoard') || '',
        pilotCode: pilotCodeInput?.value || '',
        signupMode,
        acceptedTerms: Boolean(acceptedTermsInput?.checked)
      })
    });
    const delivery = result.delivery || {};
    success.innerHTML = `
      <strong>Check your email to activate EchoAural.</strong><br />
      Your EchoAural teacher account has been prepared for ${escapeHtml(teacherEmail)}.
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
