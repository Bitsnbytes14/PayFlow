const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Register a new merchant
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, webhookUrl } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email and password are required"
      });
    }

    if (typeof password !== "string") {
      return res.status(400).json({
        error: "Password must be a string"
      });
    }

    // Check existing user
    const exists = await pool.query(
      'SELECT id FROM merchants WHERE email = $1',
      [email]
    );

    if (exists.rows.length) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password safely
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into DB
    const result = await pool.query(
      `INSERT INTO merchants (name, email, password_hash, webhook_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email`,
      [name, email, passwordHash, webhookUrl || null]
    );

    const merchant = result.rows[0];

    //  JWT
    const token = jwt.sign(
      { id: merchant.id, email: merchant.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ merchant, token });

  } catch (err) {
    console.error("REGISTER ERROR:", err); //  important for debugging
    res.status(500).json({
      error: "Internal server error"
    });
  }
});


// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    //  Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    //  Find user
    const result = await pool.query(
      'SELECT * FROM merchants WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const merchant = result.rows[0];

    //  Compare password
    const valid = await bcrypt.compare(password, merchant.password_hash);

    if (!valid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    //  JWT
    const token = jwt.sign(
      { id: merchant.id, email: merchant.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email
      },
      token
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      error: "Internal server error"
    });
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
    console.error("WEBHOOK UPDATE ERROR:", err);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;