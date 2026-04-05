const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Create a new order
router.post('/create', auth, async (req, res) => {
  try {
    const { amount, currency = 'INR', customerEmail, metadata } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ error: 'Invalid amount' });

    const result = await pool.query(
      `INSERT INTO orders
        (merchant_id, amount, currency, customer_email, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.merchant.id, amount, currency, customerEmail, metadata || {}]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single order with full transaction history
router.get('/:orderId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         o.*,
         COALESCE(json_agg(t.* ORDER BY t.processed_at DESC)
           FILTER (WHERE t.id IS NOT NULL), '[]') AS transactions
       FROM orders o
       LEFT JOIN transactions t ON o.id = t.order_id
       WHERE o.id = $1 AND o.merchant_id = $2
       GROUP BY o.id`,
      [req.params.orderId, req.merchant.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ error: 'Order not found' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all orders for a merchant with optional status filter
router.get('/', auth, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT o.*,
        COUNT(t.id) AS transaction_count
      FROM orders o
      LEFT JOIN transactions t ON o.id = t.order_id
      WHERE o.merchant_id = $1
    `;
    const params = [req.merchant.id];

    if (status) {
      params.push(status.toUpperCase());
      query += ` AND o.status = $${params.length}`;
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Also return total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE merchant_id = $1
       ${status ? 'AND status = $2' : ''}`,
      status ? [req.merchant.id, status.toUpperCase()] : [req.merchant.id]
    );

    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;