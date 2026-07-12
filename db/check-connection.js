'use strict';

require('dotenv').config();

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing from .env.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const connection = await pool.query(`
    SELECT
      current_database() AS database,
      current_user AS connected_as,
      NOW() AS server_time
  `);

  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  console.log('');
  console.log('EchoAural PostgreSQL connection successful.');
  console.log(connection.rows[0]);
  console.log('');
  console.log('Tables:');

  for (const row of tables.rows) {
    console.log(`  - ${row.table_name}`);
  }

  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error('EchoAural database check failed.');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
