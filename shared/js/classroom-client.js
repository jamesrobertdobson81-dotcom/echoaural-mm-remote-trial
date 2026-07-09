(function () {
  'use strict';

  const DEFAULT_ONLINE_API_BASE = 'https://teacher-api.echoaural.com';
  const STORAGE_KEY = 'ea_classroom_api_base';

  function stripTrailingSlash(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function isLocalHost(hostname) {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname)
      || /^192\.168\./.test(hostname)
      || /^10\./.test(hostname)
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  }

  function readQueryApiBase() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('classroomApi') || params.get('apiBase') || params.get('server') || '';
    } catch (_error) {
      return '';
    }
  }

  function saveApiBase(value) {
    const cleaned = stripTrailingSlash(value);
    if (!cleaned) return '';
    try { window.localStorage.setItem(STORAGE_KEY, cleaned); }
    catch (_error) { /* localStorage can be unavailable in private/locked-down browsers. */ }
    return cleaned;
  }

  function getStoredApiBase() {
    try { return stripTrailingSlash(window.localStorage.getItem(STORAGE_KEY) || ''); }
    catch (_error) { return ''; }
  }

  function getApiBase() {
    const fromQuery = readQueryApiBase();
    if (fromQuery) return saveApiBase(fromQuery);

    const fromGlobal = stripTrailingSlash(window.ECHOAURAL_CLASSROOM_API_BASE || '');
    if (fromGlobal) return fromGlobal;

    const fromStorage = getStoredApiBase();
    if (fromStorage) return fromStorage;

    if (isLocalHost(window.location.hostname)) return '';

    return DEFAULT_ONLINE_API_BASE;
  }

  function buildApiUrl(path) {
    const value = String(path || '');
    if (/^https?:\/\//i.test(value)) return value;
    const cleanPath = value.startsWith('/') ? value : `/${value}`;
    const apiBase = getApiBase();
    return apiBase ? `${apiBase}${cleanPath}` : cleanPath;
  }

  function getFrontendBase() {
    const fromGlobal = stripTrailingSlash(window.ECHOAURAL_FRONTEND_BASE || '');
    if (fromGlobal) return fromGlobal;
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return stripTrailingSlash(window.location.origin);
    }
    return '';
  }

  window.EchoAuralClassroom = Object.assign({}, window.EchoAuralClassroom, {
    defaultOnlineApiBase: DEFAULT_ONLINE_API_BASE,
    getApiBase,
    buildApiUrl,
    getFrontendBase,
    saveApiBase
  });
}());
