'use strict';

require('dotenv').config();

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL is not configured. Start the EchoAural database and check .env.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });

    pool.on('error', (error) => {
      console.error('[EchoAural database] Unexpected idle client error:', error.message);
    });
  }

  return pool;
}

async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

module.exports = {
  getPool,
  closePool
};
