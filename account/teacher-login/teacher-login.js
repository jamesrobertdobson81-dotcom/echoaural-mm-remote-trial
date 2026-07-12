'use strict';

const { api, setMessage } = window.EchoAuralAccounts;
const form = document.getElementById('teacherLoginForm');
const button = document.getElementById('loginButton');
const message = document.getElementById('loginMessage');

(async () => {
  try {
    const current = await api('/api/auth/me?role=teacher');
    if (current.role === 'teacher') window.location.replace('/account/teacher-dashboard/');
  } catch (_error) {
    // Not logged in yet.
  }
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(message);
  button.disabled = true;
  button.textContent = 'Logging in…';

  try {
    await api('/api/auth/teacher/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.email.value,
        password: form.password.value
      })
    });
    window.location.assign('/account/teacher-dashboard/');
  } catch (error) {
    setMessage(message, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Log in';
  }
});
