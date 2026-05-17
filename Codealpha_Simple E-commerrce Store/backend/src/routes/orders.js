const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const orders = db
    .prepare(
      `SELECT id, user_id, total, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC`
    )
    .all(req.userId);
  const orderIds = orders.map((o) => o.id);
  let itemsByOrder = {};
  if (orderIds.length) {
    const placeholders = orderIds.map(() => "?").join(",");
    const lines = db
      .prepare(
        `SELECT oi.order_id, oi.product_id, oi.quantity, oi.price, p.name
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders})`
      )
      .all(...orderIds);
    for (const line of lines) {
      if (!itemsByOrder[line.order_id]) itemsByOrder[line.order_id] = [];
      itemsByOrder[line.order_id].push({
        product_id: line.product_id,
        name: line.name,
        quantity: line.quantity,
        price: line.price,
      });
    }
  }
  res.json({
    orders: orders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    })),
  });
});

router.post("/", (req, res) => {
  const cartLines = db
    .prepare(
      `SELECT c.id, c.product_id, c.quantity, p.price, p.stock, p.name
       FROM cart c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?`
    )
    .all(req.userId);
  if (!cartLines.length) {
    return res.status(400).json({ error: "Cart is empty" });
  }
  let total = 0;
  for (const line of cartLines) {
    if (line.quantity > line.stock) {
      return res.status(400).json({
        error: `Not enough stock for "${line.name}"`,
        product_id: line.product_id,
        max: line.stock,
      });
    }
    total += line.quantity * line.price;
  }

  let orderId;
  try {
    db.exec("BEGIN IMMEDIATE");
    const orderInfo = db
      .prepare(`INSERT INTO orders (user_id, total, status) VALUES (?, ?, 'placed')`)
      .run(req.userId, Math.round(total * 100) / 100);
    orderId = Number(orderInfo.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`
    );
    const updateStock = db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`);
    for (const line of cartLines) {
      insertItem.run(orderId, line.product_id, line.quantity, line.price);
      updateStock.run(line.quantity, line.product_id);
    }
    db.prepare(`DELETE FROM cart WHERE user_id = ?`).run(req.userId);
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    console.error(err);
    return res.status(500).json({ error: "Could not place order" });
  }
  const order = db
    .prepare(`SELECT id, user_id, total, status, created_at FROM orders WHERE id = ?`)
    .get(orderId);
  const items = db
    .prepare(
      `SELECT oi.product_id, oi.quantity, oi.price, p.name FROM order_items oi
       JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`
    )
    .all(orderId);
  res.status(201).json({ order: { ...order, items } });
});

module.exports = router;
