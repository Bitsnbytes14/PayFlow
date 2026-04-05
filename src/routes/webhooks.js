// Webhook delivery logs — lets merchants debug failed webhooks
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// Get webhook logs for a specific order
router.get('/logs/:orderId', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wl.*
       FROM webhook_logs wl
       JOIN orders o ON wl.order_id = o.id
       WHERE wl.order_id = $1 AND o.merchant_id = $2
       ORDER BY wl.created_at DESC`,
      [req.params.orderId, req.merchant.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually retry a failed webhook
router.post('/retry/:webhookLogId', auth, async (req, res) => {
  try {
    const log = await pool.query(
      `SELECT wl.*, o.merchant_id
       FROM webhook_logs wl
       JOIN orders o ON wl.order_id = o.id
       WHERE wl.id = $1`,
      [req.params.webhookLogId]
    );

    if (!log.rows.length)
      return res.status(404).json({ error: 'Webhook log not found' });

    if (log.rows[0].merchant_id !== req.merchant.id)
      return res.status(403).json({ error: 'Unauthorized' });

    if (log.rows[0].delivered)
      return res.status(400).json({ error: 'Webhook already delivered' });

    const { enqueueWebhook } = require('../services/webhookService');
    await enqueueWebhook(
      log.rows[0].order_id,
      req.merchant.id,
      log.rows[0].event_type
    );

    res.json({ success: true, message: 'Webhook re-queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;