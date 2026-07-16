'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool } = require('../db/pool');
const { getTeacherSession, TEACHER_COOKIE } = require('./account-server');
const { sendWelcomeEmail } = require('./email-service');

const TEACHER_SESSION_DAYS = 7;
const SETUP_TOKEN_HOURS = 24;
const requestLog = new Map();

function allowedAccountOrigin(origin) {
  const value = String(origin || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  const allowed = new Set([
    'https://echoaural.com',
    'https://www.echoaural.com',
    String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, ''),
    String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '')
  ].filter(Boolean));
  if (allowed.has(value)) return value;
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(value)) return value;
  if (/^http:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)(?::\d+)?$/i.test(value)) return value;
  return '';
}

function setAccountCorsHeaders(req, res) {
  const origin = allowedAccountOrigin(req.headers.origin);
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(body);
  return true;
}

function readJsonBody(req, maxBytes = 64_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        const error = new Error('Request body too large.');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { return resolve(JSON.parse(body)); }
      catch (_error) {
        const error = new Error('Invalid JSON.');
        error.statusCode = 400;
        return reject(error);
      }
    });
    req.on('error', reject);
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function isSecureRequest(req) {
  if (String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true') return true;
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function sessionCookie(name, token, req, maxAgeSeconds) {
  const parts = [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (isSecureRequest(req)) parts.push('Secure');
  return parts.join('; ');
}

function cleanEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 180);
}

function cleanText(value, maxLength = 100) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
}

function validPin(value) {
  return /^[0-9]{4,6}$/.test(String(value || '').trim());
}

function cleanTeacherCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validPassword(value) {
  return typeof value === 'string' && value.length >= 10 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function rateLimited(req, action, max = 8, windowMs = 15 * 60 * 1000) {
  const key = `${action}:${requestIp(req)}`;
  const now = Date.now();
  const current = requestLog.get(key);
  if (!current || now - current.startedAt > windowMs) {
    requestLog.set(key, { count: 1, startedAt: now });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

function safeCompare(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function normaliseAccessCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function developmentCodeAccepted(providedCode) {
  const supplied = normaliseAccessCode(providedCode);
  const expected = normaliseAccessCode(process.env.PILOT_SIGNUP_CODE);
  if (!supplied || !expected) return false;
  return safeCompare(supplied, expected);
}

function publicFoundingSignupEnabled() {
  return String(process.env.PUBLIC_FOUNDING_SIGNUP || 'true').trim().toLowerCase() !== 'false';
}

function invitationCodeAccepted(providedCode) {
  const supplied = normaliseAccessCode(providedCode);

  if (!supplied) return publicFoundingSignupEnabled();
  return developmentCodeAccepted(supplied);
}

function activeLicence(teacher) {
  if (!teacher || !['trial', 'active'].includes(teacher.licence_status)) return false;
  if (!teacher.expires_at) return true;
  return new Date(teacher.expires_at).getTime() > Date.now();
}

async function requireTeacher(req, res) {
  const teacher = await getTeacherSession(req);
  if (!teacher) {
    sendJson(res, 401, { ok: false, error: 'Teacher login required.' });
    return null;
  }
  if (!activeLicence(teacher)) {
    sendJson(res, 403, { ok: false, error: 'This teacher licence is not active.' });
    return null;
  }
  return teacher;
}

async function uniqueTeacherCode(client, name) {
  const base = cleanTeacherCode(name).slice(0, 8) || 'TEACHER';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const suffix = String(crypto.randomInt(10, 100));
    const code = `${base}${suffix}`.slice(0, 12);
    const exists = await client.query('SELECT 1 FROM teachers WHERE UPPER(teacher_code) = $1', [code]);
    if (!exists.rows[0]) return code;
  }
  return `EA${crypto.randomBytes(4).toString('hex').toUpperCase()}`.slice(0, 12);
}

function appBaseUrl(req) {
  const configured = String(process.env.APP_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  const protocol = isSecureRequest(req) ? 'https' : 'http';
  return `${protocol}://${req.headers.host || 'localhost:3000'}`;
}

async function createSetupDelivery({ req, projectRoot, teacher }) {
  const rawToken = makeToken();
  const expiresAt = new Date(Date.now() + SETUP_TOKEN_HOURS * 60 * 60 * 1000);
  await getPool().query('DELETE FROM teacher_setup_tokens WHERE teacher_id = $1 AND used_at IS NULL', [teacher.id]);
  await getPool().query(`
    INSERT INTO teacher_setup_tokens (teacher_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
  `, [teacher.id, hashToken(rawToken), expiresAt]);

  const setupUrl = `${appBaseUrl(req)}/account/setup/?token=${encodeURIComponent(rawToken)}`;
  const delivery = await sendWelcomeEmail({
    projectRoot,
    teacherName: teacher.display_name,
    teacherEmail: teacher.email,
    teacherCode: teacher.teacher_code,
    setupUrl
  });

  await getPool().query(`
    UPDATE teacher_setup_tokens
    SET delivery_method = $1
    WHERE teacher_id = $2 AND token_hash = $3
  `, [delivery.method, teacher.id, hashToken(rawToken)]);

  return { ...delivery, expiresAt, setupUrl: delivery.method === 'local_preview' ? setupUrl : undefined };
}

async function handleTeacherSignup(req, res, projectRoot) {
  if (rateLimited(req, 'teacher-signup', 10)) {
    return sendJson(res, 429, { ok: false, error: 'Too many signup attempts. Try again later.' });
  }

  const body = await readJsonBody(req);
  const displayName = cleanText(body.displayName, 70);
  const schoolName = cleanText(body.schoolName, 120);
  const email = cleanEmail(body.email);
  const country = cleanText(body.country, 80);
  const examBoard = cleanText(body.examBoard, 80);
  const pilotCode = cleanText(body.pilotCode, 80);
  const isDevelopmentAccess = developmentCodeAccepted(pilotCode);

  if (!displayName || !schoolName || !email || !country || !examBoard) {
    return sendJson(res, 400, { ok: false, error: 'Complete all teacher and school details.' });
  }
  if (!validEmail(email)) return sendJson(res, 400, { ok: false, error: 'Enter a valid email address.' });

  if (pilotCode && !isDevelopmentAccess) {
    return sendJson(res, 403, {
      ok: false,
      error: 'The development code is not recognised.'
    });
  }

  if (!pilotCode && !publicFoundingSignupEnabled()) {
    return sendJson(res, 403, {
      ok: false,
      error: 'Public Founding Partner signup is currently closed. Use an EchoAural development code.'
    });
  }
  if (body.acceptedTerms !== true) return sendJson(res, 400, { ok: false, error: 'Accept the terms and privacy notice to continue.' });

  const existing = await getPool().query('SELECT * FROM teachers WHERE LOWER(email) = $1 LIMIT 1', [email]);
  let teacher = existing.rows[0] || null;

  if (teacher && teacher.status === 'active') {
    return sendJson(res, 409, { ok: false, error: 'A teacher account already exists for this email. Use Teacher Login instead.' });
  }

  if (!teacher) {
    if (!isDevelopmentAccess) {
      const limit = Number(process.env.FOUNDING_SIGNUP_LIMIT || 10);
      const count = await getPool().query(`
        SELECT COUNT(*)::int AS count
        FROM teachers
        WHERE role = 'teacher' AND signup_status IN ('pending', 'active')
      `);
      if (count.rows[0].count >= limit) {
        return sendJson(res, 409, {
          ok: false,
          error: 'The current Founding Partner cohort is full. Contact EchoAural for a development code.'
        });
      }
    }

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const teacherCode = await uniqueTeacherCode(client, displayName);
      const placeholderHash = await bcrypt.hash(makeToken(), 12);
      const inserted = await client.query(`
        INSERT INTO teachers (
          email, display_name, teacher_code, password_hash,
          status, must_change_password, school_name, country,
          exam_board, signup_status
        )
        VALUES ($1, $2, $3, $4, 'pending', FALSE, $5, $6, $7, 'pending')
        RETURNING *
      `, [email, displayName, teacherCode, placeholderHash, schoolName, country, examBoard]);
      teacher = inserted.rows[0];
      await client.query(`
        INSERT INTO licences (teacher_id, plan, seat_limit, status)
        VALUES ($1, 'founding_partner', 20, 'pending')
      `, [teacher.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return sendJson(res, 409, { ok: false, error: 'That email is already registered.' });
      throw error;
    } finally {
      client.release();
    }
  } else {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`
      UPDATE teachers
      SET display_name = $1, school_name = $2, country = $3, exam_board = $4, signup_status = 'pending'
      WHERE id = $5
    `, [displayName, schoolName, country, examBoard, teacher.id]);
      await client.query(`
        INSERT INTO licences (teacher_id, plan, seat_limit, status)
        SELECT $1, 'founding_partner', 20, 'pending'
        WHERE NOT EXISTS (
          SELECT 1 FROM licences
          WHERE teacher_id = $1
            AND status IN ('pending', 'trial', 'active')
        )
      `, [teacher.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    teacher = { ...teacher, display_name: displayName, school_name: schoolName, country, exam_board: examBoard };
  }

  const delivery = await createSetupDelivery({ req, projectRoot, teacher });
  return sendJson(res, 201, {
    ok: true,
    message: 'Your EchoAural account setup email has been prepared.',
    delivery: {
      method: delivery.method,
      previewUrl: delivery.previewUrl || null,
      setupUrl: delivery.setupUrl || null
    }
  });
}

async function handleResend(req, res, projectRoot) {
  if (rateLimited(req, 'teacher-signup-resend', 6)) {
    return sendJson(res, 429, { ok: false, error: 'Too many email requests. Try again later.' });
  }
  const body = await readJsonBody(req);
  const email = cleanEmail(body.email);
  const pilotCode = cleanText(body.pilotCode, 80);
  if (!invitationCodeAccepted(pilotCode)) {
    return sendJson(res, 403, { ok: false, error: 'The invitation code is not recognised or public signup is closed.' });
  }
  const result = await getPool().query(`
    SELECT * FROM teachers
    WHERE LOWER(email) = $1 AND status = 'pending'
    LIMIT 1
  `, [email]);
  if (!result.rows[0]) {
    return sendJson(res, 200, { ok: true, message: 'If a pending account exists, a new setup email has been prepared.' });
  }
  const delivery = await createSetupDelivery({ req, projectRoot, teacher: result.rows[0] });
  return sendJson(res, 200, {
    ok: true,
    message: 'A new setup email has been prepared.',
    delivery: { method: delivery.method, previewUrl: delivery.previewUrl || null, setupUrl: delivery.setupUrl || null }
  });
}

async function handleActivation(req, res) {
  const body = await readJsonBody(req);
  const rawToken = String(body.token || '').trim();
  const password = String(body.password || '');
  if (!rawToken) return sendJson(res, 400, { ok: false, error: 'The setup link is missing or incomplete.' });
  if (!validPassword(password)) {
    return sendJson(res, 400, { ok: false, error: 'Use at least 10 characters, including a letter and a number.' });
  }

  const client = await getPool().connect();
  let teacher;
  const sessionToken = makeToken();
  const sessionExpires = new Date(Date.now() + TEACHER_SESSION_DAYS * 24 * 60 * 60 * 1000);
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(`
      SELECT st.id AS setup_token_id, st.teacher_id, t.*
      FROM teacher_setup_tokens st
      JOIN teachers t ON t.id = st.teacher_id
      WHERE st.token_hash = $1
        AND st.used_at IS NULL
        AND st.expires_at > NOW()
      FOR UPDATE
    `, [hashToken(rawToken)]);
    teacher = tokenResult.rows[0];
    if (!teacher) {
      await client.query('ROLLBACK');
      return sendJson(res, 400, { ok: false, error: 'This setup link is invalid or has expired.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(`
      UPDATE teachers
      SET password_hash = $1,
          status = 'active',
          signup_status = 'active',
          email_verified_at = NOW(),
          must_change_password = FALSE
      WHERE id = $2
    `, [passwordHash, teacher.teacher_id]);
    await client.query(`
      UPDATE licences
      SET status = 'active', starts_at = NOW(), expires_at = NOW() + INTERVAL '12 months'
      WHERE teacher_id = $1 AND status = 'pending'
    `, [teacher.teacher_id]);
    await client.query('UPDATE teacher_setup_tokens SET used_at = NOW() WHERE id = $1', [teacher.setup_token_id]);
    await client.query('DELETE FROM teacher_sessions WHERE teacher_id = $1 OR expires_at <= NOW()', [teacher.teacher_id]);
    await client.query(`
      INSERT INTO teacher_sessions (teacher_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `, [teacher.teacher_id, hashToken(sessionToken), sessionExpires]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return sendJson(res, 200, { ok: true, redirect: '/account/teacher-dashboard/' }, {
    'Set-Cookie': sessionCookie(TEACHER_COOKIE, sessionToken, req, TEACHER_SESSION_DAYS * 24 * 60 * 60)
  });
}

async function listClasses(req, res) {
  const teacher = await requireTeacher(req, res);
  if (!teacher) return true;

  const [classResult, activeStudentResult] = await Promise.all([
    getPool().query(`
      SELECT
        c.id,
        c.class_name,
        c.year_group,
        c.exam_board,
        c.active,
        c.created_at,
        COUNT(s.id) FILTER (WHERE s.active = TRUE)::int AS active_students,
        COUNT(s.id)::int AS total_students
      FROM classes c
      LEFT JOIN students s ON s.class_id = c.id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.active DESC, LOWER(c.class_name), c.created_at
    `, [teacher.id]),
    getPool().query(`
      SELECT COUNT(*)::int AS count
      FROM students
      WHERE teacher_id = $1 AND active = TRUE
    `, [teacher.id])
  ]);

  const seatLimit = Number(teacher.seat_limit || 20);
  const activeStudents = Number(activeStudentResult.rows[0]?.count || 0);
  const activeClasses = classResult.rows.filter((row) => row.active).length;

  return sendJson(res, 200, {
    ok: true,
    classLimit: 3,
    activeClasses,
    seatLimit,
    activeStudents,
    seatsRemaining: Math.max(0, seatLimit - activeStudents),
    classes: classResult.rows.map((row) => ({
      id: row.id,
      className: row.class_name,
      yearGroup: row.year_group,
      examBoard: row.exam_board,
      active: row.active,
      activeStudents: Number(row.active_students || 0),
      totalStudents: Number(row.total_students || 0),
      createdAt: row.created_at
    }))
  });
}

function validateSubmittedStudents(rawStudents) {
  if (!Array.isArray(rawStudents) || rawStudents.length < 1) {
    const error = new Error('Add at least one student before finishing the class.');
    error.statusCode = 400;
    throw error;
  }

  if (rawStudents.length > 20) {
    const error = new Error('A class can contain no more than 20 active students.');
    error.statusCode = 400;
    throw error;
  }

  const usernames = new Set();
  return rawStudents.map((rawStudent, index) => {
    const displayName = cleanText(rawStudent?.displayName, 50);
    const username = cleanUsername(rawStudent?.username);
    const pin = String(rawStudent?.pin || '').trim();

    if (!displayName) {
      const error = new Error(`Enter a name for student ${index + 1}.`);
      error.statusCode = 400;
      throw error;
    }

    if (username.length < 2) {
      const error = new Error(`Use a username of at least two characters for ${displayName}.`);
      error.statusCode = 400;
      throw error;
    }

    if (!validPin(pin)) {
      const error = new Error(`Use a four-to-six digit PIN for ${displayName}.`);
      error.statusCode = 400;
      throw error;
    }

    if (usernames.has(username)) {
      const error = new Error(`The username "${username}" appears more than once in this class.`);
      error.statusCode = 409;
      throw error;
    }

    usernames.add(username);
    return { displayName, username, pin };
  });
}

async function createClassWithStudents(req, res) {
  const teacher = await requireTeacher(req, res);
  if (!teacher) return true;

  const body = await readJsonBody(req);
  const className = cleanText(body.className, 80);
  const yearGroup = cleanText(body.yearGroup, 60);
  const examBoard = cleanText(body.examBoard, 80);

  if (!className) {
    return sendJson(res, 400, { ok: false, error: 'Enter a class name.' });
  }

  let students;
  try {
    students = validateSubmittedStudents(body.students);
  } catch (error) {
    return sendJson(res, Number(error.statusCode || 400), { ok: false, error: error.message });
  }

  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    const classRows = await client.query(`
      SELECT id
      FROM classes
      WHERE teacher_id = $1 AND active = TRUE
      FOR UPDATE
    `, [teacher.id]);

    if (classRows.rowCount >= 3) {
      await client.query('ROLLBACK');
      return sendJson(res, 409, {
        ok: false,
        error: 'This account already has the maximum of three active classes.'
      });
    }

    const licenceResult = await client.query(`
      SELECT id, seat_limit, status, expires_at
      FROM licences
      WHERE teacher_id = $1
        AND status IN ('trial', 'active')
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `, [teacher.id]);

    const licence = licenceResult.rows[0];
    if (!licence || (licence.expires_at && new Date(licence.expires_at).getTime() <= Date.now())) {
      await client.query('ROLLBACK');
      return sendJson(res, 403, { ok: false, error: 'The teacher licence is not active.' });
    }

    const activeCountResult = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM students
      WHERE teacher_id = $1 AND active = TRUE
    `, [teacher.id]);

    const seatLimit = Number(licence.seat_limit || 20);
    const activeCount = Number(activeCountResult.rows[0]?.count || 0);
    const seatsRemaining = Math.max(0, seatLimit - activeCount);

    if (students.length > seatsRemaining) {
      await client.query('ROLLBACK');
      return sendJson(res, 409, {
        ok: false,
        error: seatsRemaining
          ? `Only ${seatsRemaining} active student seat${seatsRemaining === 1 ? '' : 's'} remain.`
          : `All ${seatLimit} active student seats are already in use.`
      });
    }

    const submittedUsernames = students.map((student) => student.username);
    const usernameResult = await client.query(`
      SELECT LOWER(username) AS username
      FROM students
      WHERE teacher_id = $1
        AND LOWER(username) = ANY($2::text[])
    `, [teacher.id, submittedUsernames]);

    if (usernameResult.rows.length) {
      await client.query('ROLLBACK');
      return sendJson(res, 409, {
        ok: false,
        error: `The username "${usernameResult.rows[0].username}" is already used in this teacher account.`
      });
    }

    const classResult = await client.query(`
      INSERT INTO classes (teacher_id, class_name, year_group, exam_board)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [teacher.id, className, yearGroup || null, examBoard || null]);

    const classRow = classResult.rows[0];
    const credentials = [];

    for (const student of students) {
      const pinHash = await bcrypt.hash(student.pin, 10);
      const inserted = await client.query(`
        INSERT INTO students (teacher_id, class_id, username, display_name, pin_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, display_name
      `, [teacher.id, classRow.id, student.username, student.displayName, pinHash]);

      credentials.push({
        id: inserted.rows[0].id,
        username: inserted.rows[0].username,
        displayName: inserted.rows[0].display_name,
        pin: student.pin
      });
    }

    await client.query('COMMIT');

    return sendJson(res, 201, {
      ok: true,
      teacherCode: teacher.teacher_code,
      class: {
        id: classRow.id,
        className: classRow.class_name,
        yearGroup: classRow.year_group,
        examBoard: classRow.exam_board,
        active: classRow.active
      },
      credentials,
      seatLimit,
      seatsRemaining: Math.max(0, seatsRemaining - credentials.length),
      notice: 'PINs are shown once. Print or copy this login sheet before closing it.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return sendJson(res, 409, {
        ok: false,
        error: 'One of those usernames is already used by this teacher.'
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

async function disabledGenericGeneration(req, res) {
  const teacher = await requireTeacher(req, res);
  if (!teacher) return true;
  return sendJson(res, 410, {
    ok: false,
    error: 'Generic student generation has been removed. Create a class and enter each student name, username and PIN.'
  });
}

function createOnboardingServer({ projectRoot }) {
  async function handleOnboardingApi(req, res, parsedUrl) {
    const pathname = parsedUrl.pathname;
    const relevant = pathname.startsWith('/api/signup/') || pathname === '/api/teacher/classes' || /^\/api\/teacher\/classes\/[0-9a-f-]+\/generate-students$/i.test(pathname);
    if (!relevant) return false;
    setAccountCorsHeaders(req, res);

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Credentials': 'true',
          'Cache-Control': 'no-store'
        });
        res.end();
        return true;
      }
      if (req.method === 'POST' && pathname === '/api/signup/teacher') return handleTeacherSignup(req, res, projectRoot);
      if (req.method === 'POST' && pathname === '/api/signup/resend-email') return handleResend(req, res, projectRoot);
      if (req.method === 'POST' && pathname === '/api/signup/activate') return handleActivation(req, res);
      if (req.method === 'GET' && pathname === '/api/teacher/classes') return listClasses(req, res);
      if (req.method === 'POST' && pathname === '/api/teacher/classes') return createClassWithStudents(req, res);
      const generateMatch = pathname.match(/^\/api\/teacher\/classes\/([0-9a-f-]+)\/generate-students$/i);
      if (req.method === 'POST' && generateMatch) return disabledGenericGeneration(req, res);
      return false;
    } catch (error) {
      console.error('[EchoAural onboarding] API error:', error);
      const statusCode = Number(error.statusCode || 500);
      const message = statusCode === 500 ? 'Onboarding service error.' : error.message;
      return sendJson(res, statusCode, { ok: false, error: message });
    }
  }

  return { handleOnboardingApi };
}

module.exports = { createOnboardingServer };
