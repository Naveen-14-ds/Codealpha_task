 # ShopLite — Simple E‑Commerce (HTML/CSS/JS + Express)

 A beginner-friendly demo store: **vanilla frontend** in `frontend/`, **Express.js + SQLite** REST API in `backend/`. The server stores **users**, **products**, **cart** rows, and **orders** (with **order line items** so each purchase is recorded correctly).

 ## Features

 - User **registration** and **login** (JWT stored in `localStorage`)
 - **Product listing** and **product detail** pages
 - **Shopping cart** (quantity updates, remove line)
 - **Place order** (creates an order, copies lines, reduces stock, clears cart)
 - **Admin**: add / edit / delete products (protected API routes)
 - **Responsive** layout and simple, readable UI

 ## Project layout

 ```
 frontend/          # Static HTML, CSS, JavaScript (served by Express)
 backend/           # Node.js API + SQLite database file
 backend/data/      # Created on first run: store.db
 ```

 ## Prerequisites

 - [Node.js](https://nodejs.org/) **22.13+** (the API uses the built-in [`node:sqlite`](https://nodejs.org/api/sqlite.html) module — no native database driver to compile)

 ## Setup

 1. **Clone or copy** this project folder.

 2. **Install backend dependencies**

    ```bash
    cd backend
    npm install
    ```

 3. **Environment file**

    ```bash
    copy .env.example .env
    ```

    On macOS/Linux use `cp .env.example .env`.

    Edit `.env` and set a long random `JWT_SECRET` for anything beyond local play.

 4. **Start the server** (from `backend/`)

    ```bash
    npm start
    ```

    Or with auto-restart on file changes (Node 18+):

    ```bash
    npm run dev
    ```

 5. **Open the site** in a browser: [http://localhost:3000](http://localhost:3000)

    You may see `ExperimentalWarning: SQLite is an experimental feature` in the terminal on some Node versions. It is safe to ignore for local learning; the API still runs normally.

    Pages: `index.html`, `product.html?id=1`, `login.html`, `register.html`, `cart.html`, `orders.html`, `admin.html`.

 ## Default admin (first run)

 If the database has **no users**, one admin is created from `.env`:

 | Field    | Default in `.env.example` |
 | -------- | ------------------------- |
 | Email    | `admin@example.com`       |
 | Password | `admin123`                |

 Sample products are inserted if the **products** table is empty.

 > Change the admin password in `.env` **before** first run if you deploy anywhere public. After the DB exists, change password by updating the DB or adding a small script—this demo keeps things minimal.

 ## REST API (summary)

 | Method | Path | Auth | Description |
 | ------ | ---- | ---- | ----------- |
 | POST | `/api/auth/register` | — | Register |
 | POST | `/api/auth/login` | — | Login → `{ token, user }` |
 | GET | `/api/auth/me` | User | Current user |
 | GET | `/api/products` | — | List products |
 | GET | `/api/products/:id` | — | Product detail |
 | POST | `/api/products` | Admin | Create product |
 | PUT | `/api/products/:id` | Admin | Update product |
 | DELETE | `/api/products/:id` | Admin | Delete product |
 | GET | `/api/cart` | User | Cart lines |
 | POST | `/api/cart` | User | Body: `{ product_id, quantity }` |
 | PUT | `/api/cart/:cartId` | User | Body: `{ quantity }` |
 | DELETE | `/api/cart/:cartId` | User | Remove line |
 | GET | `/api/orders` | User | List my orders |
 | POST | `/api/orders` | User | Place order from cart |

 Send `Authorization: Bearer <token>` for protected routes.

 ## Database tables

 - **users** — `email`, `password_hash`, `name`, `is_admin`
 - **products** — catalog fields + `stock`
 - **cart** — `user_id`, `product_id`, `quantity` (one row per user+product)
 - **orders** — `user_id`, `total`, `status`, `created_at`
 - **order_items** — `order_id`, `product_id`, `quantity`, `price` (snapshot at purchase)

 SQLite file: `backend/data/store.db` (delete it to reset the demo).

 ## Why Express + SQLite (built-in)?

 One language (JavaScript) for browser and server keeps the learning curve gentle. This project uses **Node’s built-in `node:sqlite`** so you get a real SQLite file database **without** installing Visual Studio build tools for native addons.

 ---

 MIT — use freely for learning.