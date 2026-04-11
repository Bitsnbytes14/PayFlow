require('dotenv').config();
require('./queues/webhookWorker');

const express = require('express');
const cors    = require('cors');
const app     = express();

// ✅ CORS — allow frontend dev server and production URL
const allowedOrigins = [
  'http://localhost:5173',           // Vite dev server
  'http://localhost:5174',           // Vite dev server (alt port)
  'http://localhost:4173',           // Vite preview
  process.env.FRONTEND_URL,         // production frontend URL (set in .env)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,                // needed because axios sends withCredentials: true
}));

app.use(express.json());

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/webhooks', require('./routes/webhooks'));

app.get('/health', (_, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString()
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`PayFlow running on port ${process.env.PORT || 3000}`);
});