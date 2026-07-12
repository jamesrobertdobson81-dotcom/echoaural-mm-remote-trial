'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing from .env.');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql);
    console.log('EchoAural account schema applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Could not apply the EchoAural account schema.');
  console.error(error.message);
  process.exitCode = 1;
});
