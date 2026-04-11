# PayFlow 💳
A production-grade payment gateway simulator built to mirror real-world payment infrastructure. Implements core concepts used by payment companies like Juspay, Razorpay, and Stripe — including idempotency, state machines, async webhooks, and ACID-compliant transactions.

---

## 🏗️ Architecture
```
Client
  │
  ▼
REST API (Express.js)
  │
  ├──► Auth Middleware (JWT)
  │
  ├──► Idempotency Middleware (Redis)
  │
  ▼
Payment State Machine
  │
  ├──► PostgreSQL (ACID Transactions)
  │         orders, transactions, merchants
  │
  └──► BullMQ Job Queue (Redis)
            │
            ▼
       Webhook Worker
            │
            ▼
       Merchant Server
```

---

## ✨ Core Features

### 🔒 Idempotency
Every payment request accepts an `Idempotency-Key` header. Duplicate requests with the same key return the exact same response without re-processing — preventing double charges in retry scenarios.

### 🔄 Payment State Machine
Orders follow strict, one-way state transitions:
```
CREATED → PROCESSING → SUCCESS → REFUNDED
                    └→ FAILED
```
Invalid transitions (e.g. refunding a failed payment) are rejected at the database level with row-level locking.

### 📬 Async Webhook Delivery
Merchant notifications are delivered asynchronously via BullMQ with exponential backoff retry (up to 5 attempts: 2s → 4s → 8s → 16s → 32s). Merchants can view delivery logs and manually retry failed webhooks.

### 🏦 ACID Transactions
Every state transition runs inside a PostgreSQL transaction with `FOR UPDATE` row locking — ensuring no race conditions or partial state in concurrent payment processing.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT |
| Containerization | Docker |

---

## 📁 Project Structure
```
payflow/
├── src/
│   ├── config/
│   │   ├── db.js              # PostgreSQL connection pool
│   │   └── redis.js           # Redis client
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   └── idempotency.js     # Duplicate request prevention
│   ├── models/
│   │   └── schema.sql         # Database schema
│   ├── queues/
│   │   ├── webhookQueue.js    # BullMQ queue definition
│   │   └── webhookWorker.js   # Async webhook processor
│   ├── routes/
│   │   ├── auth.js            # Merchant register/login
│   │   ├── orders.js          # Order management
│   │   ├── payments.js        # Payment processing
│   │   └── webhooks.js        # Webhook logs & retry
│   ├── services/
│   │   ├── orderService.js    # Order business logic
│   │   ├── paymentService.js  # State machine + transactions
│   │   └── webhookService.js  # Webhook enqueueing
│   └── app.js                 # Express entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Docker Desktop

### Setup
```bash
# 1. Clone the repo
git clone https://github.com/Bitsnbytes14/PayFlow.git
cd PayFlow

# 2. Install dependencies
npm install

# 3. Start PostgreSQL and Redis via Docker
docker run --name payflow-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=payflow \
  -p 5432:5432 -d postgres

docker run --name payflow-redis \
  -p 6379:6379 -d redis

# 4. Load database schema
Get-Content src/models/schema.sql | docker exec -i payflow-postgres psql -U postgres -d payflow

# 5. Configure environment
cp .env.example .env
# Fill in your values

# 6. Start the server
node src/app.js
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a merchant |
| POST | `/api/auth/login` | Login and get JWT token |
| PATCH | `/api/auth/webhook` | Update webhook URL |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/create` | Create a payment order |
| GET | `/api/orders/:orderId` | Get order + transaction history |
| GET | `/api/orders` | List all orders (with filters) |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/process` | Process a payment |
| POST | `/api/payments/refund` | Refund a payment |
| GET | `/api/payments/:orderId` | Get payment status |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/webhooks/logs/:orderId` | View webhook delivery logs |
| POST | `/api/webhooks/retry/:id` | Manually retry failed webhook |

---

## 🔁 Example Flow
```bash
# 1. Register merchant
POST /api/auth/register
{
  "name": "My Store",
  "email": "store@example.com",
  "password": "secret",
  "webhookUrl": "https://your-server.com/webhook"
}

# 2. Create order
POST /api/orders/create
Authorization: Bearer <token>
{
  "amount": 499.00,
  "currency": "INR",
  "customerEmail": "buyer@example.com"
}

# 3. Process payment (with idempotency key)
POST /api/payments/process
Authorization: Bearer <token>
Idempotency-Key: unique-request-id-001
{
  "orderId": "<order_id>",
  "paymentMethod": "UPI"
}

# 4. Refund
POST /api/payments/refund
Authorization: Bearer <token>
{
  "orderId": "<order_id>"
}
```

---

## 🗄️ Database Schema
```
merchants
  └── orders (merchant_id)
        └── transactions (order_id)
        └── webhook_logs (order_id)
idempotency_keys (merchant_id)
```

---

## 🔮 Future Development

### Phase 1 — Payment Methods
- [ ] UPI deep link generation with real VPA validation
- [ ] Card tokenization (store card reference, never raw PAN)
- [ ] Net banking redirect flow simulation
- [ ] Wallet support (PayTM, PhonePe simulation)

### Phase 2 — Reliability & Scale
- [ ] Distributed locking with Redis Redlock for concurrent payment prevention
- [ ] Circuit breaker pattern for external gateway calls
- [ ] Dead letter queue (DLQ) for permanently failed webhooks
- [ ] Horizontal scaling with multiple worker instances
- [ ] Rate limiting per merchant (sliding window algorithm)

### Phase 3 — Reconciliation Engine
- [ ] End-of-day settlement reports per merchant
- [ ] Transaction reconciliation against mock bank statements
- [ ] Dispute and chargeback management flow
- [ ] Automated refund eligibility checks

### Phase 4 — Analytics & Observability
- [ ] Payment success rate dashboard per merchant
- [ ] Latency percentile tracking (p50, p95, p99)
- [ ] Webhook delivery rate monitoring
- [ ] Anomaly detection for unusual transaction patterns
- [ ] Prometheus metrics + Grafana dashboard

### Phase 5 — Developer Experience
- [ ] SDK generation (Node.js, Python, Java clients)
- [ ] Postman collection with all endpoints
- [ ] Webhook testing sandbox (like Stripe's dashboard)
- [ ] Merchant dashboard UI (React frontend)
- [ ] OpenAPI / Swagger documentation

### Phase 6 — Security Hardening
- [ ] HMAC webhook signature verification
- [ ] API key rotation for merchants
- [ ] PCI-DSS compliant data masking
- [ ] Audit log for all sensitive operations
- [ ] IP allowlisting per merchant

---

## 🧠 Key Engineering Concepts Demonstrated

**Idempotency** — Safe payment retries without double charges, implemented via Redis-backed request deduplication.

**State Machine** — Strict order lifecycle with database-level transition enforcement and row locking.

**Async Job Processing** — BullMQ worker with exponential backoff ensures guaranteed webhook delivery even under merchant downtime.

**ACID Transactions** — PostgreSQL transactions with `BEGIN/COMMIT/ROLLBACK` ensure atomicity across state changes and transaction records.

**Event-Driven Architecture** — Payment events trigger async webhook notifications decoupled from the main request lifecycle.

---

## 📄 License

MIT License — feel free to use this for learning and portfolio purposes.

---

## 👤 Author

**Mohammad Ahmad**
[GitHub](https://github.com/Bitsnbytes14) · [LinkedIn](https://www.linkedin.com/in/mohammad-ahmad141004/)
