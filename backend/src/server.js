require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const { createAuthRouter } = require('./routes/auth');
const { createUsersRouter } = require('./routes/users');
const { createPostsRouter } = require('./routes/posts');

const PORT = Number(process.env.PORT) || 3040;
const frontendDir = path.join(__dirname, '..', '..', 'frontend');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.warn(
    '[warn] Set a strong JWT_SECRET in backend/.env (copy from .env.example). Using dev default.'
  );
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'dev-only-secret-change-me-please-12345';
}

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const dbReady = getDb();

app.use('/api/auth', createAuthRouter(() => dbReady));
app.use('/api/users', createUsersRouter(() => dbReady));
app.use('/api/posts', createPostsRouter(() => dbReady));

app.use(express.static(frontendDir));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).send('Not found');
});

dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Open http://localhost:${PORT}/index.html (or /feed.html after login)`);
    });
  })
  .catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
