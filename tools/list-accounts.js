'use strict';

require('dotenv').config();
const { getPool, closePool } = require('../db/pool');

async function main() {
  const result = await getPool().query(`
    SELECT
      t.display_name,
      t.email,
      t.teacher_code,
      t.status,
      l.plan,
      l.seat_limit,
      l.expires_at,
      COUNT(s.id) FILTER (WHERE s.active = TRUE)::int AS active_students
    FROM teachers t
    LEFT JOIN licences l ON l.teacher_id = t.id AND l.status IN ('trial', 'active')
    LEFT JOIN students s ON s.teacher_id = t.id
    GROUP BY t.id, l.id
    ORDER BY LOWER(t.display_name)
  `);

  if (!result.rows.length) {
    console.log('No teacher accounts have been created.');
    return;
  }

  console.table(result.rows.map((row) => ({
    name: row.display_name,
    email: row.email,
    code: row.teacher_code,
    status: row.status,
    students: `${row.active_students}/${row.seat_limit}`,
    expires: row.expires_at ? new Date(row.expires_at).toISOString().slice(0, 10) : ''
  })));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
