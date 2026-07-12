'use strict';

const { api, setMessage } = window.EchoAuralAccounts;
const form = document.getElementById('studentLoginForm');
const button = document.getElementById('studentLoginButton');
const message = document.getElementById('studentLoginMessage');

(async () => {
  try {
    const current = await api('/api/auth/me?role=student');
    if (current.role === 'student') window.location.replace('/account/student-home/');
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
    await api('/api/auth/student/login', {
      method: 'POST',
      body: JSON.stringify({
        teacherCode: form.teacherCode.value,
        username: form.username.value,
        pin: form.pin.value
      })
    });
    window.location.assign('/account/student-home/');
  } catch (error) {
    setMessage(message, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Log in';
  }
});
