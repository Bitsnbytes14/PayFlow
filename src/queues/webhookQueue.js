const { Queue } = require('bullmq');

const IORedis = require('ioredis');

const connection = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : { host: '127.0.0.1', port: 6379 };

const webhookQueue = new Queue('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

module.exports = webhookQueue;