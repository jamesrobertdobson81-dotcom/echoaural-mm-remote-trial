'use strict';

require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('../db/pool');

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

function makeTeacherCode(name, email) {
  const source = String(name || email || 'TEACHER').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${source.slice(0, 6) || 'TEACH'}${crypto.randomInt(10, 99)}`.slice(0, 12);
}

function makePassword() {
  return `${crypto.randomBytes(8).toString('base64url')}!Ea7`;
}

async function uniqueCode(pool, requested, name, email) {
  const base = String(requested || makeTeacherCode(name, email)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (!base) throw new Error('Teacher code must contain letters or numbers.');
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base.slice(0, 9)}${crypto.randomInt(100, 999)}`.slice(0, 12);
    const exists = await pool.query('SELECT 1 FROM teachers WHERE UPPER(teacher_code) = $1', [candidate]);
    if (!exists.rows[0]) return candidate;
  }
  throw new Error('Could not generate a unique teacher code.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.email || '').trim().toLowerCase();
  const displayName = String(args.name || '').trim();
  const role = args.admin ? 'admin' : 'teacher';
  const seatLimit = Math.max(1, Math.min(Number(args.seats || 20), 500));
  const months = Math.max(1, Math.min(Number(args.months || 12), 60));
  const password = String(args.password || makePassword());

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Use --email with a valid email address.');
  if (!displayName) throw new Error('Use --name with the teacher display name.');
  if (password.length < 10) throw new Error('The password must contain at least 10 characters.');

  const pool = getPool();
  const code = await uniqueCode(pool, args.code, displayName, email);
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const teacherResult = await client.query(`
      INSERT INTO teachers (email, display_name, teacher_code, password_hash, role, status, must_change_password)
      VALUES ($1, $2, $3, $4, $5, 'active', TRUE)
      RETURNING id
    `, [email, displayName, code, passwordHash, role]);

    await client.query(`
      INSERT INTO licences (teacher_id, plan, seat_limit, status, starts_at, expires_at)
      VALUES ($1, 'founding_partner', $2, 'active', NOW(), NOW() + make_interval(months => $3::int))
    `, [teacherResult.rows[0].id, seatLimit, String(months)]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw new Error('A teacher with that email address or code already exists.');
    throw error;
  } finally {
    client.release();
  }

  console.log('');
  console.log('EchoAural teacher account created.');
  console.log(`Name: ${displayName}`);
  console.log(`Email: ${email}`);
  console.log(`Teacher code: ${code}`);
  console.log(`Temporary password: ${password}`);
  console.log(`Student seats: ${seatLimit}`);
  console.log(`Licence length: ${months} months`);
  console.log('');
  console.log('The teacher must change the temporary password after first login.');
  console.log('Teacher login: http://localhost:3000/account/teacher-login/');
  console.log('');
}

main()
  .catch((error) => {
    console.error('');
    console.error(`Could not create teacher account: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closePool);
