-- schema.sql

CREATE TYPE payment_status AS ENUM (
  'CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'
);

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  webhook_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status payment_status DEFAULT 'CREATED',
  customer_email VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  status payment_status NOT NULL,
  payment_method VARCHAR(50),   -- 'UPI', 'CARD', 'NETBANKING'
  gateway_ref VARCHAR(100),     -- mock bank reference ID
  failure_reason TEXT,
  processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  merchant_id UUID REFERENCES merchants(id),
  response JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  merchant_id UUID REFERENCES merchants(id),
  event_type VARCHAR(50),       -- 'PAYMENT_SUCCESS', 'PAYMENT_FAILED' etc
  payload JSONB,
  attempts INT DEFAULT 0,
  delivered BOOLEAN DEFAULT FALSE,
  last_attempted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);