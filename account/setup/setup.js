'use strict';

const { api, setMessage } = window.EchoAuralAccounts;
const form = document.getElementById('setupForm');
const button = document.getElementById('setupButton');
const message = document.getElementById('setupMessage');
const token = new URLSearchParams(window.location.search).get('token') || '';

if (!token) {
  setMessage(message, 'This setup link is missing its secure token. Return to the welcome email and open the full link.', 'error');
  button.disabled = true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = form.password.value;
  if (password !== form.confirmPassword.value) {
    setMessage(message, 'The passwords do not match.', 'error');
    return;
  }
  setMessage(message);
  button.disabled = true;
  button.textContent = 'Activating…';
  try {
    const result = await api('/api/signup/activate', { method: 'POST', body: JSON.stringify({ token, password }) });
    setMessage(message, 'Account activated. Opening your teacher dashboard…', 'success');
    window.setTimeout(() => window.location.replace(result.redirect || '/account/teacher-dashboard/'), 550);
  } catch (error) {
    setMessage(message, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Activate my account';
  }
});
