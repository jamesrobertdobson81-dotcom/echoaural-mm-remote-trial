'use strict';

window.EchoAuralAccounts = (() => {
  function isLocalAccountHost(hostname) {
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local') ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
  }

  function accountApiBase() {
    const params = new URLSearchParams(window.location.search);
    const override = params.get('accountApi') || window.ECHOAURAL_ACCOUNT_API || '';
    const cleanOverride = String(override).trim().replace(/\/+$/, '');
    if (/^https?:\/\//i.test(cleanOverride)) return cleanOverride;

    if (isLocalAccountHost(window.location.hostname)) return '';
    if (window.location.hostname === 'teacher-api.echoaural.com') return '';
    return 'https://teacher-api.echoaural.com';
  }

  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    const base = accountApiBase();
    if (!base || !String(path).startsWith('/api/')) return path;
    return `${base}${path}`;
  }

  async function api(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_error) { throw new Error('The account server returned an unreadable response.'); }

    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || `Request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function setMessage(element, message = '', type = '') {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${type}`.trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  return { api, setMessage, escapeHtml, formatDate, accountApiBase };
})();
