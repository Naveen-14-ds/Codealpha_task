(function () {
  const { api, getToken, getUser, clearSession, setSession } = window.AppApi;

  const params = new URLSearchParams(window.location.search);
  let userId = params.get('user');
  const me = getUser();
  const token = getToken();

  if (!userId && me) userId = String(me.id);
  if (!userId) {
    window.location.href = '/index.html';
    return;
  }

  const profileView = document.getElementById('profile-view');
  const profilePosts = document.getElementById('profile-posts');
  const profileFlash = document.getElementById('profile-flash');
  const btnLogout = document.getElementById('btn-logout');

  function flash(msg, ok) {
    profileFlash.innerHTML = '';
    if (!msg) return;
    const d = document.createElement('div');
    d.className = 'msg ' + (ok ? 'msg-success' : 'msg-error');
    d.textContent = msg;
    profileFlash.appendChild(d);
  }

  function esc(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      clearSession();
      window.location.href = '/index.html';
    });
    if (!token) btnLogout.classList.add('hidden');
  }

  async function load() {
    profileView.innerHTML = '<p class="muted">Loading profile…</p>';
    profilePosts.innerHTML = '';
    try {
      const headers = {};
      if (token) headers.Authorization = 'Bearer ' + token;
      const res = await fetch((window.APP_API_BASE || '') + '/api/users/' + encodeURIComponent(userId), {
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load profile');

      const u = data.user;
      const isOwn = me && Number(me.id) === Number(u.id);
      const canFollow = token && me && Number(me.id) !== Number(u.id);

      profileView.innerHTML = `
        <div class="card profile-head">
          <div>
            <h1>${esc(u.display_name)}</h1>
            <p class="muted" style="margin:0">@${esc(u.username)}</p>
            <p style="margin:0.75rem 0 0">${esc(u.bio || '')}</p>
            <div class="stats" style="margin-top:0.75rem">
              <span><strong>${data.posts}</strong> posts</span>
              <span><strong>${data.followers}</strong> followers</span>
              <span><strong>${data.following}</strong> following</span>
            </div>
          </div>
          <div class="flex" style="flex-direction:column;align-items:stretch">
            ${
              canFollow
                ? `<button type="button" class="btn btn-primary btn-follow">${
                    data.is_following ? 'Following' : 'Follow'
                  }</button>`
                : ''
            }
            ${
              isOwn && token
                ? `<button type="button" class="btn btn-ghost btn-edit-profile">Edit profile</button>`
                : ''
            }
          </div>
        </div>
        <div class="card edit-profile hidden" style="margin-top:1rem">
          <h2>Edit profile</h2>
          <form id="form-profile">
            <div class="field">
              <label for="pf-name">Display name</label>
              <input id="pf-name" name="display_name" required maxlength="64" />
            </div>
            <div class="field">
              <label for="pf-bio">Bio</label>
              <textarea id="pf-bio" name="bio" maxlength="500"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Save</button>
          </form>
        </div>
      `;

      if (canFollow) {
        const btn = profileView.querySelector('.btn-follow');
        btn.addEventListener('click', async () => {
          try {
            if (data.is_following) {
              await api('/api/users/' + u.id + '/follow', { method: 'DELETE' });
              data.is_following = false;
              btn.textContent = 'Follow';
              btn.classList.remove('btn-ghost');
              btn.classList.add('btn-primary');
            } else {
              await api('/api/users/' + u.id + '/follow', { method: 'POST' });
              data.is_following = true;
              btn.textContent = 'Following';
              btn.classList.remove('btn-primary');
              btn.classList.add('btn-ghost');
            }
            const fresh = await api('/api/users/' + u.id);
            const stats = profileView.querySelector('.stats');
            if (stats) {
              stats.innerHTML = `
                <span><strong>${fresh.posts}</strong> posts</span>
                <span><strong>${fresh.followers}</strong> followers</span>
                <span><strong>${fresh.following}</strong> following</span>
              `;
            }
          } catch (e) {
            flash(e.message, false);
          }
        });
        if (data.is_following) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-ghost');
        }
      }

        if (isOwn && token) {
          const editCard = profileView.querySelector('.edit-profile');
          const nameInput = profileView.querySelector('#pf-name');
          const bioInput = profileView.querySelector('#pf-bio');
          nameInput.value = u.display_name || '';
          bioInput.value = u.bio || '';

          profileView.querySelector('.btn-edit-profile').addEventListener('click', () => {
          editCard.classList.toggle('hidden');
        });
        profileView.querySelector('#form-profile').addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          try {
            const out = await api('/api/users/me', {
              method: 'PUT',
              body: {
                display_name: fd.get('display_name'),
                bio: fd.get('bio'),
              },
            });
            setSession(token, out.user);
            flash('Profile saved', true);
            await load();
          } catch (e) {
            flash(e.message, false);
          }
        });
      }

      profilePosts.innerHTML = '<h2 class="muted" style="font-size:1rem;margin:1.25rem 0 0.5rem">Posts</h2>';
      const postsRes = await fetch(
        (window.APP_API_BASE || '') + '/api/posts/user/' + encodeURIComponent(userId),
        { headers: token ? { Authorization: 'Bearer ' + token } : {} }
      );
      const postsData = await postsRes.json();
      if (!postsRes.ok) throw new Error(postsData.error || 'Could not load posts');
      if (!postsData.posts.length) {
        profilePosts.innerHTML += '<p class="muted">No posts yet.</p>';
        return;
      }
      postsData.posts.forEach((p) => {
        profilePosts.appendChild(renderPostCard(p, isOwn));
      });
    } catch (e) {
      profileView.innerHTML = '<p class="muted">Could not load this profile.</p>';
      flash(e.message, false);
    }
  }

  function renderPostCard(p, isOwn) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="post-meta">${esc(formatTime(p.created_at))}</div>
      <div class="post-body" style="margin-top:0.5rem">${esc(p.content)}</div>
      <div class="post-actions">
        <span class="muted">♥ ${Number(p.like_count)} · 💬 ${Number(p.comment_count)}</span>
        ${
          isOwn && token
            ? `<span class="spacer"></span>
            <button type="button" class="btn btn-ghost btn-sm btn-pe">Edit</button>
            <button type="button" class="btn btn-danger btn-sm btn-pd">Delete</button>`
            : ''
        }
      </div>
      <div class="edit-inline hidden" style="margin-top:0.75rem">
        <textarea class="pe-ta" maxlength="2000"></textarea>
        <div class="flex" style="margin-top:0.5rem">
          <button type="button" class="btn btn-primary btn-sm btn-ps">Save</button>
          <button type="button" class="btn btn-ghost btn-sm btn-pc">Cancel</button>
        </div>
      </div>
    `;
    const body = card.querySelector('.post-body');
    const edit = card.querySelector('.edit-inline');
    const ta = card.querySelector('.pe-ta');

    if (isOwn && token) {
      card.querySelector('.btn-pe').addEventListener('click', () => {
        ta.value = p.content;
        body.classList.add('hidden');
        edit.classList.remove('hidden');
      });
      card.querySelector('.btn-pc').addEventListener('click', () => {
        edit.classList.add('hidden');
        body.classList.remove('hidden');
      });
      card.querySelector('.btn-ps').addEventListener('click', async () => {
        const content = ta.value.trim();
        if (!content) return flash('Post cannot be empty', false);
        try {
          const { post } = await api('/api/posts/' + p.id, { method: 'PUT', body: { content } });
          p.content = post.content;
          body.textContent = post.content;
          edit.classList.add('hidden');
          body.classList.remove('hidden');
          flash('Post updated', true);
        } catch (e) {
          flash(e.message, false);
        }
      });
      card.querySelector('.btn-pd').addEventListener('click', async () => {
        if (!confirm('Delete this post?')) return;
        try {
          await api('/api/posts/' + p.id, { method: 'DELETE' });
          card.remove();
          flash('Post deleted', true);
        } catch (e) {
          flash(e.message, false);
        }
      });
    }
    return card;
  }

  load();
})();
