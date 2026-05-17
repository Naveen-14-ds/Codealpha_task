const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, admin: !!user.is_admin },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "7d" }
  );
}

router.post("/register", (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name are required" });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  try {
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, is_admin) VALUES (?, ?, ?, 0)`
      )
      .run(String(email).toLowerCase().trim(), hash, String(name).trim());
    const user = db
      .prepare(`SELECT id, email, name, is_admin FROM users WHERE id = ?`)
      .get(Number(info.lastInsertRowid));
    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Could not register" });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  const user = db
    .prepare(`SELECT id, email, name, is_admin, password_hash FROM users WHERE email = ?`)
    .get(String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const safe = { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin };
  const token = signToken(safe);
  return res.json({ token, user: safe });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare(`SELECT id, email, name, is_admin FROM users WHERE id = ?`)
    .get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

module.exports = router;
