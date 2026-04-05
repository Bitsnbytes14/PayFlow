const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Register a new merchant
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, webhookUrl } = req.body;

    const exists = await pool.query(
      'SELECT id FROM merchants WHERE email = $1', [email]
    );
    if (exists.rows.length)
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO merchants (name, email, password_hash, webhook_url)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
      [name, email, passwordHash, webhookUrl || null]
    );

    const merchant = result.rows[0];
    const token = jwt.sign(
      { id: merchant.id, email: merchant.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ merchant, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM merchants WHERE email = $1', [email]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: 'Invalid credentials' });

    const merchant = result.rows[0];
    const valid = await bcrypt.compare(password, merchant.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: merchant.id, email: merchant.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      merchant: { id: merchant.id, name: merchant.name, email: merchant.email },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update webhook URL
router.patch('/webhook', require('../middleware/auth'), async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    await pool.query(
      'UPDATE merchants SET webhook_url = $1 WHERE id = $2',
      [webhookUrl, req.merchant.id]
    );
    res.json({ success: true, webhookUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;