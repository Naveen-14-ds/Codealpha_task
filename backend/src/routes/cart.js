const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.id AS cart_id, c.quantity, p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?`
    )
    .all(req.userId);
  res.json({ items: rows });
});

router.post("/", (req, res) => {
  const { product_id, quantity } = req.body || {};
  if (product_id == null) {
    return res.status(400).json({ error: "product_id is required" });
  }
  const qty = Math.max(1, Number(quantity) || 1);
  const product = db.prepare(`SELECT id, stock FROM products WHERE id = ?`).get(product_id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const existing = db
    .prepare(`SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?`)
    .get(req.userId, product_id);
  const newQty = existing ? existing.quantity + qty : qty;
  if (newQty > product.stock) {
    return res.status(400).json({ error: "Not enough stock", max: product.stock });
  }
  if (existing) {
    db.prepare(`UPDATE cart SET quantity = ? WHERE id = ?`).run(newQty, existing.id);
  } else {
    db.prepare(`INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)`).run(
      req.userId,
      product_id,
      qty
    );
  }
  const items = db
    .prepare(
      `SELECT c.id AS cart_id, c.quantity, p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`
    )
    .all(req.userId);
  res.json({ items });
});

router.put("/:cartId", (req, res) => {
  const row = db
    .prepare(`SELECT c.id, c.product_id, c.quantity FROM cart c WHERE c.id = ? AND c.user_id = ?`)
    .get(req.params.cartId, req.userId);
  if (!row) return res.status(404).json({ error: "Cart line not found" });
  const quantity = Number(req.body?.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return res.status(400).json({ error: "quantity must be at least 1" });
  }
  const product = db.prepare(`SELECT stock FROM products WHERE id = ?`).get(row.product_id);
  if (quantity > product.stock) {
    return res.status(400).json({ error: "Not enough stock", max: product.stock });
  }
  db.prepare(`UPDATE cart SET quantity = ? WHERE id = ?`).run(quantity, row.id);
  const items = db
    .prepare(
      `SELECT c.id AS cart_id, c.quantity, p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`
    )
    .all(req.userId);
  res.json({ items });
});

router.delete("/:cartId", (req, res) => {
  const info = db
    .prepare(`DELETE FROM cart WHERE id = ? AND user_id = ?`)
    .run(req.params.cartId, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: "Cart line not found" });
  res.json({ ok: true });
});

module.exports = router;
