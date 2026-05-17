(function () {
  const { api, setSession, getToken } = window.AppApi;

  if (getToken()) {
    window.location.href = '/feed.html';
    return;
  }

  const tabs = document.querySelectorAll('.tab');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const flash = document.getElementById('flash');

  function showFlash(text, ok) {
    flash.innerHTML = '';
    if (!text) return;
    const div = document.createElement('div');
    div.className = 'msg ' + (ok ? 'msg-success' : 'msg-error');
    div.textContent = text;
    flash.appendChild(div);
  }

  function setTab(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    formLogin.classList.toggle('hidden', name !== 'login');
    formRegister.classList.toggle('hidden', name !== 'register');
    showFlash('');
  }

  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      setTab(t.dataset.tab);
    })
  );

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formLogin);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: {
          username: fd.get('username'),
          password: fd.get('password'),
        },
      });
      setSession(data.token, data.user);
      window.location.href = '/feed.html';
    } catch (err) {
      showFlash(err.message, false);
    }
  });

  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formRegister);
    const display_name = (fd.get('display_name') || '').toString().trim();
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: {
          username: fd.get('username'),
          email: fd.get('email'),
          password: fd.get('password'),
          display_name: display_name || undefined,
        },
      });
      setSession(data.token, data.user);
      showFlash('Account created. Redirecting…', true);
      setTimeout(() => {
        window.location.href = '/feed.html';
      }, 400);
    } catch (err) {
      showFlash(err.message, false);
    }
  });
})();
