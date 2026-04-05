const pool = require('../config/db');
const webhookQueue = require('../queues/webhookQueue');

const enqueueWebhook = async (orderId, merchantId, eventType) => {
  // Get merchant webhook URL + order details
  const result = await pool.query(
    `SELECT o.*, m.webhook_url
     FROM orders o
     JOIN merchants m ON o.merchant_id = m.id
     WHERE o.id = $1`,
    [orderId]
  );

  const order = result.rows[0];
  if (!order.webhook_url) return; // merchant hasn't set webhook URL

  const payload = {
    event: eventType,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    timestamp: new Date().toISOString()
  };

  // Log webhook attempt
  const log = await pool.query(
    `INSERT INTO webhook_logs
      (order_id, merchant_id, event_type, payload)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [orderId, merchantId, eventType, payload]
  );

  // Add to BullMQ queue
  await webhookQueue.add('fire', {
    webhookUrl: order.webhook_url,
    payload,
    webhookLogId: log.rows[0].id
  });
};

module.exports = { enqueueWebhook };