(function () {
  const TOKEN_KEY = 'token';
  const USER_KEY = 'user';

  function base() {
    return window.APP_API_BASE || '';
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearSession() {
    setSession(null, null);
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!headers['Content-Type'] && options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
    }
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    const init = { ...options, headers };
    if (init.body && typeof init.body === 'object' && headers['Content-Type'] === 'application/json') {
      init.body = JSON.stringify(init.body);
    }

    const res = await fetch(base() + path, init);
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : {};
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.AppApi = { api, getToken, setSession, getUser, clearSession };
})();
