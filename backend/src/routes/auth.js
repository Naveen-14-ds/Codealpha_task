const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authRequired } = require('../middleware/auth');

function createAuthRouter(getDb) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { username, email, password, display_name } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const name = (display_name && String(display_name).trim()) || String(username).trim();
    const db = await getDb();
    try {
      const hash = await bcrypt.hash(String(password), 10);
      const result = await db.run(
        `INSERT INTO users (username, email, password_hash, display_name)
         VALUES (?, ?, ?, ?)`,
        [String(username).trim().toLowerCase(), String(email).trim().toLowerCase(), hash, name]
      );
      const user = await db.get('SELECT id, username, email, display_name, bio, created_at FROM users WHERE id = ?', [
        result.lastID,
      ]);
      const token = signToken(user);
      return res.status(201).json({ user, token });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Username or email already taken' });
      }
      console.error(e);
      return res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const db = await getDb();
    const user = await db.get(
      `SELECT id, username, email, password_hash, display_name, bio, created_at
       FROM users WHERE username = ? OR email = ?`,
      [String(username).trim().toLowerCase(), String(username).trim().toLowerCase()]
    );
    if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    delete user.password_hash;
    const token = signToken(user);
    return res.json({ user, token });
  });

  router.get('/me', authRequired, async (req, res) => {
    const db = await getDb();
    const user = await db.get(
      'SELECT id, username, email, display_name, bio, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  });

  return router;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { createAuthRouter };
