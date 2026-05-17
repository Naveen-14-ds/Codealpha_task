(function () {
  const { api, getToken, getUser, clearSession } = window.AppApi;

  if (!getToken()) {
    window.location.href = '/index.html';
    return;
  }

  const me = getUser();
  const feedList = document.getElementById('feed-list');
  const feedFlash = document.getElementById('feed-flash');
  const formNew = document.getElementById('form-new-post');
  const postContent = document.getElementById('post-content');
  const btnLogout = document.getElementById('btn-logout');
  const linkProfile = document.getElementById('link-profile');
  const searchInput = document.getElementById('search-q');
  const searchResults = document.getElementById('search-results');

  linkProfile.href = '/profile.html?user=' + encodeURIComponent(me && me.id ? me.id : '');

  function flash(msg, ok) {
    feedFlash.innerHTML = '';
    if (!msg) return;
    const d = document.createElement('div');
    d.className = 'msg ' + (ok ? 'msg-success' : 'msg-error');
    d.textContent = msg;
    feedFlash.appendChild(d);
  }

  btnLogout.addEventListener('click', () => {
    clearSession();
    window.location.href = '/index.html';
  });

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

  async function loadFeed() {
    feedList.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const { posts } = await api('/api/posts/');
      feedList.innerHTML = '';
      if (!posts.length) {
        feedList.innerHTML = '<p class="muted">No posts yet. Follow someone or create your first post.</p>';
        return;
      }
      posts.forEach((p) => feedList.appendChild(renderPost(p)));
    } catch (e) {
      feedList.innerHTML = '';
      flash(e.message, false);
    }
  }

  function renderPost(p) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.postId = String(p.id);

    const isMine = me && Number(p.user_id) === Number(me.id);
    let liked = p.liked_by_me;

    card.innerHTML = `
      <div class="post-header">
        <div>
          <a class="post-author" href="/profile.html?user=${p.user_id}">${esc(p.display_name || p.username)}</a>
          <div class="post-meta">@${esc(p.username)} · ${esc(formatTime(p.created_at))}</div>
        </div>
        ${
          isMine
            ? `<div class="flex">
            <button type="button" class="btn btn-ghost btn-sm btn-edit">Edit</button>
            <button type="button" class="btn btn-danger btn-sm btn-delete">Delete</button>
          </div>`
            : ''
        }
      </div>
      <div class="post-body post-text">${esc(p.content)}</div>
      <div class="edit-area hidden" style="margin-top:0.75rem">
        <textarea class="edit-input" maxlength="2000"></textarea>
        <div class="flex" style="margin-top:0.5rem">
          <button type="button" class="btn btn-primary btn-sm btn-save-edit">Save</button>
          <button type="button" class="btn btn-ghost btn-sm btn-cancel-edit">Cancel</button>
        </div>
      </div>
      <div class="post-actions">
        <button type="button" class="btn btn-ghost btn-sm btn-like">${liked ? '♥ Liked' : '♡ Like'} <span class="like-count">(${Number(p.like_count)})</span></button>
        <button type="button" class="btn btn-ghost btn-sm btn-toggle-comments">Comments (${p.comment_count})</button>
        <span class="spacer"></span>
        <span class="badge">#${p.id}</span>
      </div>
      <div class="comments-wrap hidden"></div>
    `;

    const textEl = card.querySelector('.post-text');
    const editArea = card.querySelector('.edit-area');
    const editInput = card.querySelector('.edit-input');

    if (isMine) {
      card.querySelector('.btn-edit').addEventListener('click', () => {
        editInput.value = p.content;
        textEl.classList.add('hidden');
        editArea.classList.remove('hidden');
      });
      card.querySelector('.btn-cancel-edit').addEventListener('click', () => {
        editArea.classList.add('hidden');
        textEl.classList.remove('hidden');
      });
      card.querySelector('.btn-save-edit').addEventListener('click', async () => {
        const content = editInput.value.trim();
        if (!content) return flash('Post cannot be empty', false);
        try {
          const { post } = await api('/api/posts/' + p.id, { method: 'PUT', body: { content } });
          p.content = post.content;
          p.updated_at = post.updated_at;
          textEl.textContent = post.content;
          editArea.classList.add('hidden');
          textEl.classList.remove('hidden');
          flash('Post updated', true);
        } catch (e) {
          flash(e.message, false);
        }
      });
      card.querySelector('.btn-delete').addEventListener('click', async () => {
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

    const btnLike = card.querySelector('.btn-like');
    btnLike.addEventListener('click', async () => {
      try {
        let data;
        if (liked) {
          data = await api('/api/posts/' + p.id + '/like', { method: 'DELETE' });
          liked = false;
          p.liked_by_me = false;
        } else {
          data = await api('/api/posts/' + p.id + '/like', { method: 'POST' });
          liked = true;
          p.liked_by_me = true;
        }
        const label = liked ? '♥ Liked' : '♡ Like';
        btnLike.innerHTML = `${label} <span class="like-count">(${data.like_count})</span>`;
      } catch (e) {
        flash(e.message, false);
      }
    });

    const wrap = card.querySelector('.comments-wrap');
    const btnComments = card.querySelector('.btn-toggle-comments');
    let loaded = false;

    async function loadComments() {
      const { comments } = await api('/api/posts/' + p.id + '/comments');
      wrap.innerHTML = `
        <div class="comments">
          <h3 style="font-size:0.95rem;margin:0 0 0.5rem">Comments</h3>
          <div class="comment-list"></div>
          <form class="form-comment" style="margin-top:0.75rem">
            <div class="field" style="margin-bottom:0.5rem">
              <label class="sr-only">Your comment</label>
              <textarea maxlength="1000" placeholder="Write a comment…" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Add comment</button>
          </form>
        </div>
      `;
      const list = wrap.querySelector('.comment-list');
      comments.forEach((c) => list.appendChild(renderComment(c)));
      wrap.querySelector('.form-comment').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const ta = wrap.querySelector('.form-comment textarea');
        const content = ta.value.trim();
        if (!content) return;
        try {
          const { comment } = await api('/api/posts/' + p.id + '/comments', {
            method: 'POST',
            body: { content },
          });
          list.appendChild(renderComment(comment));
          ta.value = '';
          comments.push(comment);
          btnComments.textContent = 'Comments (' + comments.length + ')';
        } catch (e) {
          flash(e.message, false);
        }
      });
    }

    function renderComment(c) {
      const row = document.createElement('div');
      row.className = 'comment';
      row.dataset.commentId = String(c.id);
      const canDel = me && Number(c.user_id) === Number(me.id);
      row.innerHTML = `
        <div class="flex" style="justify-content:space-between;align-items:flex-start">
          <div>
            <strong>${esc(c.display_name || c.username)}</strong>
            <span class="muted">@${esc(c.username)} · ${esc(formatTime(c.created_at))}</span>
            <div style="margin-top:0.25rem">${esc(c.content)}</div>
          </div>
          ${canDel ? '<button type="button" class="btn btn-danger btn-sm btn-del-comment">Delete</button>' : ''}
        </div>
      `;
      if (canDel) {
        row.querySelector('.btn-del-comment').addEventListener('click', async () => {
          if (!confirm('Delete this comment?')) return;
          try {
            await api('/api/posts/comments/' + c.id, { method: 'DELETE' });
            row.remove();
            flash('Comment deleted', true);
          } catch (e) {
            flash(e.message, false);
          }
        });
      }
      return row;
    }

    btnComments.addEventListener('click', async () => {
      wrap.classList.toggle('hidden');
      if (!wrap.classList.contains('hidden') && !loaded) {
        wrap.innerHTML = '<p class="muted">Loading comments…</p>';
        try {
          await loadComments();
          loaded = true;
        } catch (e) {
          wrap.innerHTML = '<p class="muted">Could not load comments.</p>';
          flash(e.message, false);
        }
      }
    });

    return card;
  }

  formNew.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = postContent.value.trim();
    if (!content) return;
    try {
      await api('/api/posts/', { method: 'POST', body: { content } });
      postContent.value = '';
      flash('Post published', true);
      await loadFeed();
    } catch (err) {
      flash(err.message, false);
    }
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (q.length < 2) {
      searchResults.classList.add('hidden');
      searchResults.innerHTML = '';
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const { users } = await api('/api/users/search?q=' + encodeURIComponent(q));
        searchResults.innerHTML = '';
        if (!users.length) {
          searchResults.innerHTML = '<div class="muted" style="padding:0.65rem 0.85rem">No matches</div>';
        } else {
          users.forEach((u) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = `<strong>${esc(u.display_name)}</strong> <span class="muted">@${esc(u.username)}</span>`;
            b.addEventListener('click', () => {
              window.location.href = '/profile.html?user=' + encodeURIComponent(u.id);
            });
            searchResults.appendChild(b);
          });
        }
        searchResults.classList.remove('hidden');
      } catch (e) {
        flash(e.message, false);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
      searchResults.classList.add('hidden');
    }
  });

  loadFeed();
})();
