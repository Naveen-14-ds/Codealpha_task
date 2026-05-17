const express = require('express');
const { authRequired, optionalAuth } = require('../middleware/auth');

function createPostsRouter(getDb) {
  const router = express.Router();

  /** Home feed: your posts + posts from people you follow */
  router.get('/', authRequired, async (req, res) => {
    const db = await getDb();
    const rows = await db.all(
      `SELECT p.*, u.username, u.display_name,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
          OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
       ORDER BY datetime(p.created_at) DESC
       LIMIT 100`,
      [req.user.id, req.user.id, req.user.id]
    );
    return res.json({ posts: rows.map(normalizePost) });
  });

  router.get('/user/:userId', optionalAuth, async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const db = await getDb();
    const uid = req.user ? req.user.id : null;
    const rows = await db.all(
      `SELECT p.*, u.username, u.display_name,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        ${
          uid
            ? 'EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me'
            : '0 AS liked_by_me'
        }
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?
       ORDER BY datetime(p.created_at) DESC`,
      uid ? [uid, userId] : [userId]
    );
    return res.json({ posts: rows.map(normalizePost) });
  });

  router.get('/:id', optionalAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const db = await getDb();
    const uid = req.user ? req.user.id : null;
    const row = await db.get(
      `SELECT p.*, u.username, u.display_name,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        ${
          uid
            ? 'EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me'
            : '0 AS liked_by_me'
        }
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      uid ? [uid, id] : [id]
    );
    if (!row) return res.status(404).json({ error: 'Post not found' });
    return res.json({ post: normalizePost(row) });
  });

  router.post('/', authRequired, async (req, res) => {
    const { content } = req.body || {};
    const text = (content && String(content).trim()) || '';
    if (!text) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Post is too long (max 2000 characters)' });
    }
    const db = await getDb();
    const result = await db.run('INSERT INTO posts (user_id, content) VALUES (?, ?)', [
      req.user.id,
      text,
    ]);
    const post = await db.get(
      `SELECT p.*, u.username, u.display_name,
        0 AS like_count, 0 AS comment_count, 0 AS liked_by_me
       FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [result.lastID]
    );
    return res.status(201).json({ post: normalizePost(post) });
  });

  router.put('/:id', authRequired, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const { content } = req.body || {};
    const text = (content && String(content).trim()) || '';
    if (!text) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Post is too long (max 2000 characters)' });
    }
    const db = await getDb();
    const existing = await db.get('SELECT user_id FROM posts WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }
    await db.run(
      `UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?`,
      [text, id]
    );
    const row = await db.get(
      `SELECT p.*, u.username, u.display_name,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me
       FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [req.user.id, id]
    );
    return res.json({ post: normalizePost(row) });
  });

  router.delete('/:id', authRequired, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const db = await getDb();
    const existing = await db.get('SELECT user_id FROM posts WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }
    await db.run('DELETE FROM posts WHERE id = ?', [id]);
    return res.json({ ok: true });
  });

  router.post('/:id/like', authRequired, async (req, res) => {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const db = await getDb();
    const post = await db.get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    try {
      await db.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id]);
    } catch {
      /* already liked */
    }
    const count = await db.get('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?', [postId]);
    return res.json({ like_count: count.c, liked: true });
  });

  router.delete('/:id/like', authRequired, async (req, res) => {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const db = await getDb();
    await db.run('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id]);
    const count = await db.get('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?', [postId]);
    return res.json({ like_count: count.c, liked: false });
  });

  router.get('/:id/comments', async (req, res) => {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const db = await getDb();
    const post = await db.get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comments = await db.all(
      `SELECT c.*, u.username, u.display_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ?
       ORDER BY datetime(c.created_at) ASC`,
      [postId]
    );
    return res.json({ comments });
  });

  router.post('/:id/comments', authRequired, async (req, res) => {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId < 1) {
      return res.status(400).json({ error: 'Invalid post id' });
    }
    const { content } = req.body || {};
    const text = (content && String(content).trim()) || '';
    if (!text) {
      return res.status(400).json({ error: 'content is required' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }
    const db = await getDb();
    const post = await db.get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const result = await db.run('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [
      postId,
      req.user.id,
      text,
    ]);
    const comment = await db.get(
      `SELECT c.*, u.username, u.display_name
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
      [result.lastID]
    );
    return res.status(201).json({ comment });
  });

  router.delete('/comments/:commentId', authRequired, async (req, res) => {
    const commentId = Number(req.params.commentId);
    if (!Number.isInteger(commentId) || commentId < 1) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }
    const db = await getDb();
    const row = await db.get('SELECT user_id FROM comments WHERE id = ?', [commentId]);
    if (!row) return res.status(404).json({ error: 'Comment not found' });
    if (row.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    await db.run('DELETE FROM comments WHERE id = ?', [commentId]);
    return res.json({ ok: true });
  });

  return router;
}

function normalizePost(row) {
  return {
    ...row,
    like_count: Number(row.like_count) || 0,
    comment_count: Number(row.comment_count) || 0,
    liked_by_me: Boolean(row.liked_by_me),
  };
}

module.exports = { createPostsRouter };
