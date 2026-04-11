const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.NODE_ENV === 'production' ? {
    ssl: { rejectUnauthorized: false }
  } : {})
});

module.exports = pool;