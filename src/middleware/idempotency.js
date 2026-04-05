// This is the most important middleware — prevents double charging
const pool = require('../config/db');

const idempotency = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next(); // optional for non-payment routes

  const merchantId = req.merchant.id;

  // Check if this exact request was already processed
  const existing = await pool.query(
    'SELECT response FROM idempotency_keys WHERE key = $1 AND merchant_id = $2',
    [key, merchantId]
  );

  if (existing.rows.length > 0) {
    // Return the exact same response as before — don't process again
    return res.status(200).json({
      ...existing.rows[0].response,
      idempotent: true   // flag so client knows this was a replay
    });
  }

  // Attach key to request so service layer can store it after processing
  req.idempotencyKey = key;
  next();
};

module.exports = idempotency;