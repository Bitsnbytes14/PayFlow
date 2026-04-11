# 🚀 PayFlow Backend

A scalable backend system for a **payment processing platform** built using Node.js, PostgreSQL, and Redis.
Designed to simulate real-world payment workflows including orders, transactions, and webhook delivery.

---

## 🏗️ Tech Stack

* **Node.js + Express**
* **PostgreSQL (Neon DB)**
* **Redis (Upstash) + BullMQ**
* **JWT Authentication**
* **Docker (for local DB setup)**

---

## ✨ Features

* 🔐 Merchant Authentication (JWT-based)
* 📦 Order Creation & Management
* 💳 Payment Processing Simulation
* 🔁 Idempotency Handling (duplicate request safety)
* 📡 Webhook System with Retry Mechanism
* ⚡ Background Job Processing using BullMQ

---

## 📁 Project Structure

```bash
src/
 ├── config/         # DB & Redis configuration
 │    ├── db.js
 │    └── redis.js
 │
 ├── middleware/     # Auth & idempotency logic
 │    ├── auth.js
 │    └── idempotency.js
 │
 ├── models/         # Database schema
 │    └── schema.sql
 │
 ├── queues/         # Background job queues
 │    ├── webhookQueue.js
 │    └── webhookWorker.js
 │
 ├── routes/         # API routes
 │    ├── auth.js
 │    ├── orders.js
 │    ├── payments.js
 │    └── webhooks.js
 │
 ├── services/       # Business logic layer
 │    ├── orderService.js
 │    ├── paymentService.js
 │    └── webhookService.js
 │
 └── app.js          # Entry point
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL=your_neon_database_url
REDIS_URL=your_upstash_redis_url
JWT_SECRET=your_secret_key
PORT=3000
```

---

## 🗄️ Database Setup (IMPORTANT)

Open **Neon SQL Editor** and run:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Then run the schema:

```bash
src/models/schema.sql
```

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Server will start at:

```bash
http://localhost:3000
```

---

## 🌐 API Base URL

```bash
http://localhost:3000/api
```

---

## 📌 Key API Endpoints

### 🔐 Authentication

* `POST /api/auth/register`
* `POST /api/auth/login`
* `PATCH /api/auth/webhook`

---

### 📦 Orders

* `POST /api/orders/create`
* `GET /api/orders`
* `GET /api/orders/:orderId`

---

### 💳 Payments

* `POST /api/payments/process`
* `POST /api/payments/refund`
* `GET /api/payments/:orderId`

---

### 📡 Webhooks

* `GET /api/webhooks/logs/:orderId`
* `POST /api/webhooks/retry/:webhookLogId`

---

## ⚡ Background Jobs

* Uses **BullMQ + Redis**
* Handles:

  * Webhook delivery
  * Retry logic with exponential backoff

---

## 🚀 Deployment

* **Backend** → Render
* **Database** → Neon
* **Redis** → Upstash

---

## 📈 Future Improvements

* Real payment gateway integration (Stripe/Razorpay)
* Rate limiting & security enhancements
* Monitoring (Prometheus/Grafana)
* API key system for merchants

---

## 👨‍💻 Author

Built by **[Your Name]**

---
