const { Worker } = require('bullmq');
const axios = require('axios');
const pool = require('../config/db');
const IORedis = require('ioredis');

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false, // 🔥 IMPORTANT FIX
  })
  : { host: '127.0.0.1', port: 6379 };

const worker = new Worker(
  'webhooks',
  async (job) => {
    const { webhookUrl, payload, webhookLogId } = job.data;

    // update attempt count
    await pool.query(
      `UPDATE webhook_logs
       SET attempts = attempts + 1, last_attempted_at = NOW()
       WHERE id = $1`,
      [webhookLogId]
    );

    // send webhook
    await axios.post(webhookUrl, payload, { timeout: 5000 });

    // mark delivered
    await pool.query(
      'UPDATE webhook_logs SET delivered = TRUE WHERE id = $1',
      [webhookLogId]
    );
  },
  { connection }
);

// 🔥 better error logging
worker.on('failed', (job, err) => {
  console.error(`Webhook job ${job?.id} failed:`, err.message);
});

module.exports = worker;