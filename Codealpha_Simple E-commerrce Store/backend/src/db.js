const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "data", "store.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'placed',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
}

function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const plain = process.env.ADMIN_PASSWORD || "admin123";
    const hash = bcrypt.hashSync(plain, 10);
    db.prepare(
      `INSERT INTO users (email, password_hash, name, is_admin) VALUES (?, ?, ?, 1)`
    ).run(email, hash, "Admin");
  }

  const insert = db.prepare(
    `INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)`
  );
  const samples = [
    [
      "Classic Cotton Tee",
      "Soft everyday t-shirt in organic cotton.",
      24.99,
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
      50,
    ],
    [
      "Minimal Backpack",
      "Lightweight backpack with padded laptop sleeve.",
      59.0,
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
      30,
    ],
    [
      "Ceramic Mug",
      "Matte finish mug, 12oz capacity.",
      14.5,
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80",
      100,
    ],
    [
      "Wireless Earbuds",
      "Noise-isolating earbuds with 24-hour battery life.",
      89.99,
      "https://images.unsplash.com/photo-1517263904808-5dc5b3a5fa6a?w=600&q=80",
      80,
    ],
    [
      "Travel Journal",
      "Hardcover notebook for planning trips and capturing memories.",
      19.95,
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=600&q=80",
      120,
    ],
    [
      "Stainless Steel Water Bottle",
      "Insulated 20oz bottle keeps drinks cold or hot for hours.",
      22.0,
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
      70,
    ],
    [
      "Desk Lamp",
      "Adjustable LED desk lamp with warm and cool light modes.",
      34.5,
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&q=80",
      40,
    ],
    [
      "Bluetooth Speaker",
      "Portable speaker with bass boost and water-resistant design.",
      45.0,
      "https://images.unsplash.com/photo-1518449076476-c5ebf57bfb9d?w=600&q=80",
      60,
    ],
    [
      "Yoga Mat",
      "Non-slip yoga mat with cushioned support for all workouts.",
      28.99,
      "https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?w=600&q=80",
      90,
    ],
    [
      "Travel Adapter",
      "Universal international power adapter with USB ports.",
      17.5,
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80",
      110,
    ],
    [
      "Scented Candle",
      "Soy wax candle with calming lavender aroma.",
      12.0,
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80",
      140,
    ],
    [
      "Wireless Phone Charger",
      "Fast charge pad compatible with Qi-enabled phones.",
      29.99,
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
      55,
    ],
  ];

  for (const sample of samples) {
    const existing = db
      .prepare(`SELECT id FROM products WHERE name = ?`)
      .get(String(sample[0]));
    if (!existing) insert.run(...sample);
  }
}

initSchema();
seedIfEmpty();

module.exports = db;
