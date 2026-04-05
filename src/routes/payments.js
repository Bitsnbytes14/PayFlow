const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const { processPayment, refundPayment } = require('../services/paymentService');
const pool = require('../config/db');

// Process a payment
router.post('/process', auth, idempotency, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    // Verify order belongs to this merchant
    const order = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
      [orderId, req.merchant.id]
    );
    if (!order.rows.length)
      return res.status(404).json({ error: 'Order not found' });

    const result = await processPayment(
      orderId, paymentMethod, req.merchant.id
    );

    const response = { success: true, orderId, ...result };

    // Store idempotency key so duplicate requests return same response
    if (req.idempotencyKey) {
      await pool.query(
        `INSERT INTO idempotency_keys (key, merchant_id, response)
         VALUES ($1, $2, $3)`,
        [req.idempotencyKey, req.merchant.id, response]
      );
    }

    res.json(response);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Refund a payment
router.post('/refund', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const result = await refundPayment(orderId, req.merchant.id);
    res.json({ success: true, orderId, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get payment status
router.get('/:orderId', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, json_agg(t.*) as transactions
     FROM orders o
     LEFT JOIN transactions t ON o.id = t.order_id
     WHERE o.id = $1 AND o.merchant_id = $2
     GROUP BY o.id`,
    [req.params.orderId, req.merchant.id]
  );

  if (!result.rows.length)
    return res.status(404).json({ error: 'Order not found' });

  res.json(result.rows[0]);
});

module.exports = router;