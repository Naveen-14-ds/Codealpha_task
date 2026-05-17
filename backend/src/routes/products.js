const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, name, description, price, image_url, stock, created_at FROM products ORDER BY id DESC`
    )
    .all();
  res.json({ products: rows });
});

router.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT id, name, description, price, image_url, stock, created_at FROM products WHERE id = ?`
    )
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: "Product not found" });
  res.json({ product: row });
});

router.post("/", requireAuth, requireAdmin, (req, res) => {
  const { name, description, price, image_url, stock } = req.body || {};
  if (!name || price == null) {
    return res.status(400).json({ error: "name and price are required" });
  }
  const info = db
    .prepare(
      `INSERT INTO products (name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      String(name),
      description != null ? String(description) : "",
      Number(price),
      image_url != null ? String(image_url) : "",
      stock != null ? Number(stock) : 0
    );
  const product = db
    .prepare(
      `SELECT id, name, description, price, image_url, stock, created_at FROM products WHERE id = ?`
    )
    .get(Number(info.lastInsertRowid));
  res.status(201).json({ product });
});

router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare(`SELECT id FROM products WHERE id = ?`).get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });
  const { name, description, price, image_url, stock } = req.body || {};
  const row = db
    .prepare(`SELECT * FROM products WHERE id = ?`)
    .get(req.params.id);
  db.prepare(
    `UPDATE products SET name = ?, description = ?, price = ?, image_url = ?, stock = ? WHERE id = ?`
  ).run(
    name != null ? String(name) : row.name,
    description != null ? String(description) : row.description,
    price != null ? Number(price) : row.price,
    image_url != null ? String(image_url) : row.image_url,
    stock != null ? Number(stock) : row.stock,
    req.params.id
  );
  const product = db
    .prepare(
      `SELECT id, name, description, price, image_url, stock, created_at FROM products WHERE id = ?`
    )
    .get(req.params.id);
  res.json({ product });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
  const info = db.prepare(`DELETE FROM products WHERE id = ?`).run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: "Product not found" });
  res.json({ ok: true });
});

module.exports = router;
