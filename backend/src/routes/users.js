const express = require('express');
const { authRequired, optionalAuth } = require('../middleware/auth');

function createUsersRouter(getDb) {
  const router = express.Router();

  router.get('/search', authRequired, async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ users: [] });
    }
    const db = await getDb();
    const pattern = `%${q}%`;
    const users = await db.all(
      `SELECT id, username, display_name, bio, created_at
       FROM users
       WHERE username LIKE ? OR display_name LIKE ?
       ORDER BY username ASC
       LIMIT 20`,
      [pattern, pattern]
    );
    return res.json({ users });
  });

  router.put('/me', authRequired, async (req, res) => {
    const { display_name, bio } = req.body || {};
    const db = await getDb();
    const updates = [];
    const params = [];
    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(String(display_name).trim() || 'User');
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(String(bio));
    }
    if (!updates.length) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    params.push(req.user.id);
    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    const user = await db.get(
      'SELECT id, username, email, display_name, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    return res.json({ user });
  });

  router.get('/:id', optionalAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, display_name, bio, created_at FROM users WHERE id = ?',
      [id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const counts = await db.get(
      `SELECT
         (SELECT COUNT(*) FROM follows WHERE following_id = ?) AS followers,
         (SELECT COUNT(*) FROM follows WHERE follower_id = ?) AS following,
         (SELECT COUNT(*) FROM posts WHERE user_id = ?) AS posts
       `,
      [id, id, id]
    );

    let is_following = false;
    if (req.user && req.user.id !== id) {
      const row = await db.get(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
        [req.user.id, id]
      );
      is_following = Boolean(row);
    }

    return res.json({ user, ...counts, is_following });
  });

  router.post('/:id/follow', authRequired, async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    const db = await getDb();
    const exists = await db.get('SELECT id FROM users WHERE id = ?', [targetId]);
    if (!exists) return res.status(404).json({ error: 'User not found' });
    try {
      await db.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [
        req.user.id,
        targetId,
      ]);
    } catch {
      /* already following */
    }
    return res.json({ ok: true });
  });

  router.delete('/:id/follow', authRequired, async (req, res) => {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const db = await getDb();
    await db.run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [
      req.user.id,
      targetId,
    ]);
    return res.json({ ok: true });
  });

  router.get('/:id/followers', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const db = await getDb();
    const users = await db.all(
      `SELECT u.id, u.username, u.display_name, u.bio
       FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ?
       ORDER BY u.username`,
      [id]
    );
    return res.json({ users });
  });

  router.get('/:id/following', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const db = await getDb();
    const users = await db.all(
      `SELECT u.id, u.username, u.display_name, u.bio
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ?
       ORDER BY u.username`,
      [id]
    );
    return res.json({ users });
  });

  return router;
}

module.exports = { createUsersRouter };
