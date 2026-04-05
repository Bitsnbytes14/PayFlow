const { Queue } = require('bullmq');

const connection = {
  host: '127.0.0.1',
  port: 6379
};

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