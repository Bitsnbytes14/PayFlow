const pool = require('../config/db');

// Verify order exists, belongs to merchant, and is in expected state
const validateOrder = async (orderId, merchantId, expectedStatus = null) => {
  const result = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
    [orderId, merchantId]
  );

  if (!result.rows.length)
    throw new Error('Order not found');

  const order = result.rows[0];

  if (expectedStatus && order.status !== expectedStatus)
    throw new Error(
      `Order is ${order.status}, expected ${expectedStatus}`
    );

  return order;
};

// Get full order summary including all transactions
const getOrderSummary = async (orderId) => {
  const result = await pool.query(
    `SELECT
       o.*,
       m.name AS merchant_name,
       m.email AS merchant_email,
       COALESCE(
         json_agg(t.* ORDER BY t.processed_at DESC)
         FILTER (WHERE t.id IS NOT NULL), '[]'
       ) AS transactions
     FROM orders o
     JOIN merchants m ON o.merchant_id = m.id
     LEFT JOIN transactions t ON o.id = t.order_id
     WHERE o.id = $1
     GROUP BY o.id, m.id`,
    [orderId]
  );

  return result.rows[0] || null;
};

module.exports = { validateOrder, getOrderSummary };