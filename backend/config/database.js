const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 10 // Max connections per serverless instance
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  // Don't process.exit in serverless, let it fail gracefully
});

module.exports = pool;
