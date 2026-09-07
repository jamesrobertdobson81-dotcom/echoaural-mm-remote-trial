'use strict';

const registry = require('../shared/js/pm-registry.js');

// True only when every PM source under this moduleId is a fixed-bank,
// id-selected source (shared/js/pm-registry.js's questionSelectionMode)
// — the procedurally-generated sources (chord-identifier, key-signature-
// sprint, era-explorer's 2 ContextCoach sources) mint an effectively
// unique question id per seed draw, so a per-question difficulty rating
// would never accumulate more than one observation there. Module-level
// (not per-source) since callers (saveRoundPayload) don't always have a
// sourceKey on hand — every real module's sources share one
// questionSelectionMode in practice (verified: melody-master and musical-
// language, the only modules with >1 PM source among the id-mode set,
// are 'id' across all their sources).
function isRatableModule(moduleId) {
  const sources = registry.byModule(moduleId);
  return sources.length > 0 && sources.every((source) => source.questionSelectionMode === 'id');
}

// Lightweight Elo rating engine for adaptive question targeting — chosen
// over a full Item Response Theory or Bayesian/Deep Knowledge Tracing model
// because it self-calibrates from real attempts with no training data or
// expert-authored difficulty labels needed, and is shown in the adaptive
// ed-tech research literature to outperform simple proportion-correct
// difficulty estimates especially at small sample sizes (Pelánek,
// "Applications of the Elo rating system in adaptive educational
// systems") — the right tradeoff at EchoAural's data scale, where a
// Duolingo-style trained model (millions of learning traces) or a
// hand-built ALEKS-style prerequisite graph would be disproportionate.
//
// Two ratings, same 1200-centred scale as question_elo_ratings/
// student_skill_ratings (db/elo-ratings-schema.sql):
//   - a question's difficulty_rating (global, shared across every teacher)
//   - a student's ability_rating per skillCode (scoped to one teacher)
// After every scored attempt, both update via the standard chess-Elo
// formula, generalised to accept a fractional actualScore (0-1) rather
// than strictly 0/1, so partial-credit questions (e.g. a 2-mark melodic
// dictation slot) contribute a proportional update instead of needing to
// be forced into a binary win/loss.

const DEFAULT_RATING = 1200;
// Smaller K for questions than for students: a question's difficulty is
// shared evidence pooled across every student who ever answers it, so it
// should move slowly and stably; a student's own ability estimate can
// adapt a bit faster to reflect where they actually are right now.
const K_QUESTION = 12;
const K_STUDENT = 20;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Generic two-party Elo update — actualScoreA is the student's fractional
// score (1 = fully correct, 0 = fully incorrect, in between for partial
// credit); the question's own "actual score" is always the complement,
// same as one side's win being the other's loss.
function updateElo({ ratingA, ratingB, actualScoreA, kA = K_STUDENT, kB = K_QUESTION }) {
  const expectedA = expectedScore(ratingA, ratingB);
  const actualB = 1 - actualScoreA;
  const expectedB = 1 - expectedA;
  return {
    ratingA: ratingA + kA * (actualScoreA - expectedA),
    ratingB: ratingB + kB * (actualB - expectedB)
  };
}

async function lockOrCreateQuestionRating(client, moduleId, questionId) {
  const existing = await client.query(`
    SELECT difficulty_rating, attempts_count FROM question_elo_ratings
    WHERE module_id = $1 AND question_id = $2
    FOR UPDATE
  `, [moduleId, questionId]);
  if (existing.rows[0]) return { rating: Number(existing.rows[0].difficulty_rating), attemptsCount: existing.rows[0].attempts_count };
  return { rating: DEFAULT_RATING, attemptsCount: 0 };
}

async function lockOrCreateSkillRating(client, teacherId, studentId, skillCode) {
  const existing = await client.query(`
    SELECT ability_rating, attempts_count FROM student_skill_ratings
    WHERE student_id = $1 AND skill_code = $2
    FOR UPDATE
  `, [studentId, skillCode]);
  if (existing.rows[0]) return { rating: Number(existing.rows[0].ability_rating), attemptsCount: existing.rows[0].attempts_count };
  return { rating: DEFAULT_RATING, attemptsCount: 0 };
}

// Applies one attempt's Elo update to both the question's difficulty
// rating and the student's per-skill ability rating, inside an
// ALREADY-OPEN transaction (`client`) — callers (classroom/progress-
// recorder.js's saveRoundPayload, accounts/account-server.js's Progress
// Mode reviews route) each run their own BEGIN/COMMIT already; this
// composes into that instead of opening a second, nested one. No-ops
// (returns null) when moduleId/questionId/skillCode aren't all present —
// e.g. procedurally-generated PM sources (chord-identifier, key-signature-
// sprint, ContextCoach) mint an effectively-unique id per seed draw, so
// they're deliberately never rated here (see the schema file's own
// comment) — this function doesn't gate on questionSelectionMode itself,
// callers pass a questionId only when it's real and stable.
async function recordEloOutcome(client, { moduleId, questionId, teacherId, studentId, skillCode, actualScore }) {
  if (!moduleId || !questionId || !teacherId || !studentId || !skillCode) return null;
  const clampedScore = Math.max(0, Math.min(1, Number(actualScore)));
  if (!Number.isFinite(clampedScore)) return null;

  const question = await lockOrCreateQuestionRating(client, moduleId, questionId);
  const skill = await lockOrCreateSkillRating(client, teacherId, studentId, skillCode);
  const updated = updateElo({
    ratingA: skill.rating,
    ratingB: question.rating,
    actualScoreA: clampedScore,
    kA: K_STUDENT,
    kB: K_QUESTION
  });

  await client.query(`
    INSERT INTO question_elo_ratings (module_id, question_id, difficulty_rating, attempts_count, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (module_id, question_id)
    DO UPDATE SET difficulty_rating = $3, attempts_count = $4, updated_at = NOW()
  `, [moduleId, questionId, updated.ratingB, question.attemptsCount + 1]);

  await client.query(`
    INSERT INTO student_skill_ratings (teacher_id, student_id, skill_code, ability_rating, attempts_count, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (student_id, skill_code)
    DO UPDATE SET ability_rating = $4, attempts_count = $5, updated_at = NOW()
  `, [teacherId, studentId, skillCode, updated.ratingA, skill.attemptsCount + 1]);

  return { questionRating: updated.ratingB, studentRating: updated.ratingA };
}

// All current question difficulty ratings, as a Map<"moduleId:questionId",
// rating> — global (see the schema file's own comment), so this is a
// single unscoped read, cheap at this app's scale (one row per real
// fixed-bank question ever attempted, not per attempt). Used by
// accounts/account-server.js's per-student "Targeted" homework builder to
// feed classroom/question-set-builder.js's adaptive-per-student strategy.
async function loadQuestionRatings(getPool) {
  try {
    const result = await getPool().query(`SELECT module_id, question_id, difficulty_rating FROM question_elo_ratings`);
    return new Map(result.rows.map((row) => [`${row.module_id}:${row.question_id}`, Number(row.difficulty_rating)]));
  } catch (error) {
    // Older classroom databases may not have received the additive Elo
    // ratings migration yet — degrade to "no rating signal" (every
    // question treated as DEFAULT_RATING) rather than failing targeting.
    if (error?.code === '42P01') return new Map();
    throw error;
  }
}

// This teacher's students' own skill ratings, as
// Map<studentId, Map<skillCode, rating>> — a student with no rated
// attempts yet for a skill simply has no entry, and callers should treat
// that as DEFAULT_RATING (matches question-set-builder.js's own fallback).
async function loadStudentSkillRatings(getPool, studentIds = []) {
  const ids = Array.from(new Set(studentIds.map((id) => String(id || '')).filter(Boolean)));
  const byStudent = new Map(ids.map((id) => [id, new Map()]));
  if (!ids.length) return byStudent;
  let result;
  try {
    result = await getPool().query(`
      SELECT student_id, skill_code, ability_rating FROM student_skill_ratings WHERE student_id = ANY($1::uuid[])
    `, [ids]);
  } catch (error) {
    if (error?.code === '42P01') return byStudent;
    throw error;
  }
  result.rows.forEach((row) => {
    const studentId = String(row.student_id);
    if (!byStudent.has(studentId)) byStudent.set(studentId, new Map());
    byStudent.get(studentId).set(row.skill_code, Number(row.ability_rating));
  });
  return byStudent;
}

module.exports = {
  DEFAULT_RATING,
  K_QUESTION,
  K_STUDENT,
  isRatableModule,
  expectedScore,
  updateElo,
  recordEloOutcome,
  loadQuestionRatings,
  loadStudentSkillRatings
};
