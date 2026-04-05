// State machine — the heart of the system
const pool = require('../config/db');
const { enqueueWebhook } = require('./webhookService');

// Valid state transitions — payments can only move forward
const VALID_TRANSITIONS = {
  CREATED:    ['PROCESSING'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  SUCCESS:    ['REFUNDED'],
  FAILED:     [],       // terminal state
  REFUNDED:   []        // terminal state
};

const transitionState = async (orderId, newStatus, client) => {
  const result = await client.query(
    'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
    [orderId]
  );

  const currentStatus = result.rows[0].status;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}`
    );
  }

  await client.query(
    'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
    [newStatus, orderId]
  );

  return currentStatus;
};

const processPayment = async (orderId, paymentMethod, merchantId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Move to PROCESSING
    await transitionState(orderId, 'PROCESSING', client);

    // Mock bank/UPI response — 80% success rate
    const isSuccess = Math.random() < 0.8;
    const finalStatus = isSuccess ? 'SUCCESS' : 'FAILED';
    const gatewayRef = `GW_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Move to SUCCESS or FAILED
    await transitionState(orderId, finalStatus, client);

    // Record the transaction
    await client.query(
      `INSERT INTO transactions
        (order_id, status, payment_method, gateway_ref, failure_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        finalStatus,
        paymentMethod,
        gatewayRef,
        isSuccess ? null : 'BANK_DECLINED'
      ]
    );

    await client.query('COMMIT');

    // Fire webhook asynchronously — don't make merchant wait
    const eventType = isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED';
    await enqueueWebhook(orderId, merchantId, eventType);

    return { status: finalStatus, gatewayRef };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const refundPayment = async (orderId, merchantId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await transitionState(orderId, 'REFUNDED', client);

    await client.query(
      `INSERT INTO transactions (order_id, status, payment_method, gateway_ref)
       VALUES ($1, 'REFUNDED', 'REFUND', $2)`,
      [orderId, `REF_${Date.now()}`]
    );

    await client.query('COMMIT');
    await enqueueWebhook(orderId, merchantId, 'PAYMENT_REFUNDED');

    return { status: 'REFUNDED' };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { processPayment, refundPayment };