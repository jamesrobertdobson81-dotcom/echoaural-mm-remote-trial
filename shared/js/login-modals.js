'use strict';

(() => {
  const accounts = window.EchoAuralAccounts;

  async function api(path, options = {}) {
    if (accounts?.api) return accounts.api(path, options);

    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();
    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch (_error) {
      throw new Error('The account server returned an unreadable response.');
    }

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Request failed (${response.status}).`);
    }

    return data;
  }

  const roleConfig = {
    teacher: {
      eyebrow: 'Teacher access',
      title: 'Welcome back.',
      accent: 'Teach, track and improve.',
      intro: 'Enter your EchoAural teacher account details to open your dashboard.',
      description: 'Create classes, run live quizzes and view individual and whole-class listening progress.',
      icon: '/assets/icons/navigation/teacher-mode.svg',
      endpoint: '/api/auth/teacher/login',
      currentEndpoint: '/api/auth/me?role=teacher',
      destination: '/account/teacher-dashboard/',
      button: 'Open teacher dashboard',
      loading: 'Logging in…',
      fields: [
        {
          name: 'email',
          label: 'Teacher email',
          type: 'email',
          autocomplete: 'email',
          required: true
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          autocomplete: 'current-password',
          required: true
        }
      ],
      body(form) {
        return {
          email: form.elements.email.value,
          password: form.elements.password.value
        };
      },
      help: `
        <span class="ea-login-access-label">New to EchoAural?</span>
        <a class="ea-login-access-button ea-login-access-button-primary" href="/founding/">
          Become a Founding Partner
        </a>
        <a class="ea-login-access-button ea-login-access-button-secondary" href="/teacher-signup/?mode=development">
          Enter development code
        </a>
      `
    },
    student: {
      eyebrow: 'Student access',
      title: 'Ready to listen?',
      accent: 'Practise and improve.',
      intro: 'Use the login details supplied by your teacher to open your student dashboard.',
      description: 'Complete independent practice, join live class quizzes and follow your progress across EchoAural.',
      icon: '/assets/icons/modules/melody-master.svg',
      endpoint: '/api/auth/student/login',
      currentEndpoint: '/api/auth/me?role=student',
      destination: '/account/student-home/',
      button: 'Open student dashboard',
      loading: 'Logging in…',
      fields: [
        {
          name: 'teacherCode',
          label: 'Teacher code',
          type: 'text',
          autocomplete: 'off',
          autocapitalize: 'characters',
          required: true
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          autocomplete: 'username',
          autocapitalize: 'none',
          required: true
        },
        {
          name: 'pin',
          label: 'PIN',
          type: 'password',
          autocomplete: 'current-password',
          inputmode: 'numeric',
          pattern: '[0-9]{4,6}',
          maxlength: '6',
          required: true
        }
      ],
      body(form) {
        return {
          teacherCode: form.elements.teacherCode.value,
          username: form.elements.username.value,
          pin: form.elements.pin.value
        };
      },
      help: 'You do not need an email address. Ask your teacher if you have lost your code, username or PIN.'
    }
  };

  function fieldMarkup(field) {
    const attributes = [
      `id="ea-login-${field.name}"`,
      `name="${field.name}"`,
      `type="${field.type}"`,
      field.autocomplete ? `autocomplete="${field.autocomplete}"` : '',
      field.autocapitalize ? `autocapitalize="${field.autocapitalize}"` : '',
      field.inputmode ? `inputmode="${field.inputmode}"` : '',
      field.pattern ? `pattern="${field.pattern}"` : '',
      field.maxlength ? `maxlength="${field.maxlength}"` : '',
      field.required ? 'required' : ''
    ].filter(Boolean).join(' ');

    return `
      <div class="ea-login-field">
        <label for="ea-login-${field.name}">${field.label}</label>
        <input ${attributes} />
      </div>
    `;
  }

  function buildDialog(role) {
    const config = roleConfig[role];
    const dialog = document.createElement('dialog');

    dialog.className = 'ea-login-dialog';
    dialog.dataset.role = role;
    dialog.setAttribute('aria-labelledby', `ea-login-${role}-title`);

    dialog.innerHTML = `
      <section class="ea-login-tile">
        <button class="ea-login-close" type="button" aria-label="Close login">×</button>

        <aside class="ea-login-brand-panel">
          <div class="ea-login-brand-top">
            <a class="ea-login-logo" href="/" aria-label="EchoAural home">
              <span class="ea-login-wave" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span>
              </span>
              <strong class="ea-login-wordmark">
                <span>Echo</span><span>Aural</span>
              </strong>
            </a>
          </div>

          <div class="ea-login-brand-copy">
            <span class="ea-login-role-icon" aria-hidden="true">
              <img src="${config.icon}" alt="" />
            </span>
            <p class="ea-login-eyebrow">${config.eyebrow}</p>
            <h2>${config.title}<br><span>${config.accent}</span></h2>
            <p>${config.description}</p>
          </div>

          <p class="ea-login-brand-foot">Listen. Identify. Improve.</p>
        </aside>

        <div class="ea-login-form-panel">
          <p class="ea-login-form-eyebrow">${config.eyebrow}</p>
          <h2 id="ea-login-${role}-title">${role === 'teacher' ? 'Teacher login' : 'Student login'}</h2>
          <p class="ea-login-intro">${config.intro}</p>

          <form class="ea-login-form" novalidate>
            ${config.fields.map(fieldMarkup).join('')}
            <button class="ea-login-submit" type="submit">${config.button}</button>
            <p class="ea-login-message" aria-live="polite"></p>
          </form>

          <div class="ea-login-help">${config.help}</div>
        </div>
      </section>
    `;

    document.body.appendChild(dialog);

    const closeButton = dialog.querySelector('.ea-login-close');
    const form = dialog.querySelector('.ea-login-form');
    const submitButton = dialog.querySelector('.ea-login-submit');
    const message = dialog.querySelector('.ea-login-message');

    function setMessage(text = '', type = '') {
      message.textContent = text;
      message.className = `ea-login-message ${type}`.trim();
    }

    closeButton.addEventListener('click', () => dialog.close());

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener('close', () => {
      document.body.classList.remove('ea-login-modal-open');
      setMessage();
      const url = new URL(window.location.href);
      if (url.searchParams.has('login')) {
        url.searchParams.delete('login');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      setMessage();
      submitButton.disabled = true;
      submitButton.textContent = config.loading;

      try {
        await api(config.endpoint, {
          method: 'POST',
          body: JSON.stringify(config.body(form))
        });

        setMessage('Login successful. Opening your dashboard…', 'success');
        window.location.assign(config.destination);
      } catch (error) {
        setMessage(error.message, 'error');
        submitButton.disabled = false;
        submitButton.textContent = config.button;
      }
    });

    return {
      dialog,
      form,
      setMessage,
      async open() {
        try {
          const current = await api(config.currentEndpoint);
          if (current?.role === role) {
            window.location.assign(config.destination);
            return;
          }
        } catch (_error) {
          // No active session for this role.
        }

        setMessage();
        submitButton.disabled = false;
        submitButton.textContent = config.button;

        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }

        document.body.classList.add('ea-login-modal-open');
        window.setTimeout(() => {
          form.querySelector('input')?.focus();
        }, 50);
      }
    };
  }

  const dialogs = {
    teacher: buildDialog('teacher'),
    student: buildDialog('student')
  };

  function openRole(role) {
    const selected = dialogs[role];
    if (!selected) return;
    selected.open();
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-ea-login]');
    if (!trigger) return;

    const role = trigger.dataset.eaLogin;
    if (!dialogs[role]) return;

    const modified =
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0;

    if (modified) return;

    event.preventDefault();
    openRole(role);
  });

  const requestedRole = new URL(window.location.href).searchParams.get('login');
  if (requestedRole && dialogs[requestedRole]) {
    window.setTimeout(() => openRole(requestedRole), 80);
  }

  window.EchoAuralLoginModals = {
    openTeacher: () => openRole('teacher'),
    openStudent: () => openRole('student')
  };
})();
