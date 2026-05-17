# Social Mini

A small full-stack social network for a college mini project: **HTML, CSS, and JavaScript** on the frontend and **Express.js (Node.js) + SQLite** on the backend. One server serves both the REST API and the static frontend.

## Features

- Register and log in (passwords hashed with **bcrypt**; sessions use **JWT** in `localStorage`)
- Profile page with bio, stats, edit profile (owner), follow / unfollow
- Create, edit, and delete posts (owner only)
- Comments on posts; delete your own comments
- Likes on posts
- Home feed: your posts and posts from people you follow
- User search (from the feed page)

## Project layout

```text
├── backend/           # Node.js API
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js
│       ├── db.js
│       ├── middleware/
│       └── routes/
├── frontend/          # Static site
│   ├── index.html
│   ├── feed.html
│   ├── profile.html
│   ├── css/
│   └── js/
└── README.md
```

## Requirements

- [Node.js](https://nodejs.org/) **18+** (includes `npm`)

## Setup

1. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Environment file**

   ```bash
   copy .env.example .env
   ```

   On macOS or Linux use `cp .env.example .env`.

   Edit `.env` and set **`JWT_SECRET`** to a long random string (at least 16 characters) before any real deployment.

3. **Start the server** (from the `backend` folder)

   ```bash
   npm start
   ```

   Or with auto-reload on file changes (Node 18+):

   ```bash
   npm run dev
   ```

4. **Open the app**

   In your browser go to:

   - **http://localhost:3040/index.html** — register or log in (default port is **3040** to avoid clashes with other apps on 3000)  
   - After login you are redirected to **http://localhost:3040/feed.html**  
   - Profiles: **http://localhost:3040/profile.html?user=1** (replace `1` with a user id)

   You can change the port in `backend/.env` (`PORT=...`).

The SQLite database file is created automatically at **`backend/data/app.db`**.

## REST API (summary)

| Method | Path | Auth | Description |
|--------|------|------|---------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Log in |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/users/search?q=` | Yes | Search users |
| PUT | `/api/users/me` | Yes | Update display name / bio |
| GET | `/api/users/:id` | Optional | Profile + counts + `is_following` if logged in |
| POST / DELETE | `/api/users/:id/follow` | Yes | Follow / unfollow |
| GET | `/api/users/:id/followers` | No | List followers |
| GET | `/api/users/:id/following` | No | List following |
| GET | `/api/posts/` | Yes | Home feed |
| GET | `/api/posts/user/:userId` | Optional | User’s posts |
| GET | `/api/posts/:id` | Optional | One post |
| POST | `/api/posts/` | Yes | Create post |
| PUT / DELETE | `/api/posts/:id` | Yes | Edit / delete own post |
| POST / DELETE | `/api/posts/:id/like` | Yes | Like / unlike |
| GET / POST | `/api/posts/:id/comments` | Mixed | List / add comments |
| DELETE | `/api/posts/comments/:commentId` | Yes | Delete own comment |

Send `Authorization: Bearer <token>` for protected routes.

## Security notes (for reports / demos)

- Passwords are never stored in plain text (**bcrypt**).
- API uses **JWT**; changing `JWT_SECRET` invalidates old tokens.
- CORS is configurable via `FRONTEND_ORIGIN` in `.env`.
- This is a **learning project**: use HTTPS and stricter hardening in production.

## License

Use and modify freely for coursework.
