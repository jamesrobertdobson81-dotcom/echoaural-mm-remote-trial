'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createClassEvidenceLoader } = require('../class-evidence');
const { buildCanonicalSkillEvidence } = require('../../accounts/account-server');

const VALID_CLASS_ID = '6bade9ad-0a02-439d-b475-e3d2f4f44c22';
const TEACHER = { id: 'bde1c72d-5167-409f-9782-e3978ec0be47' };

// A minimal stub pool that routes by which table a query mentions — mirrors
// the same fake-pool technique this file's sibling tests (e.g.
// classroom/tests/room-manager-plans.test.js-style DB-free fixtures) use
// elsewhere in this codebase to test SQL-issuing functions without a real
// Postgres connection.
function fakePool(responses = {}) {
  return () => ({
    query: async (sql, values = []) => {
      if (/FROM classes/.test(sql)) return (responses.classes || (() => ({ rows: [] })))(values);
      if (/FROM progress_mode_reviews/.test(sql)) return (responses.reviews || (() => ({ rows: [] })))(values);
      if (/FROM attempts/.test(sql)) return (responses.attempts || (() => ({ rows: [] })))(values);
      if (/FROM students/.test(sql)) return (responses.studentCount || (() => ({ rows: [{ count: 0 }] })))(values);
      if (/FROM progress_mode_summaries/.test(sql)) return (responses.progressMode || (() => ({ rows: [] })))(values);
      throw new Error(`Unexpected query in test: ${sql.slice(0, 80)}`);
    }
  });
}

test('resolveOwnedClass: an empty/blank classId returns null without querying', async () => {
  let queried = false;
  const { resolveOwnedClass } = createClassEvidenceLoader({
    getPool: () => { queried = true; return { query: async () => ({ rows: [] }) }; },
    buildCanonicalSkillEvidence
  });
  assert.equal(await resolveOwnedClass(TEACHER, ''), null);
  assert.equal(await resolveOwnedClass(TEACHER, undefined), null);
  assert.equal(queried, false);
});

test('resolveOwnedClass: a malformed classId throws a 400 without querying', async () => {
  let queried = false;
  const { resolveOwnedClass } = createClassEvidenceLoader({
    getPool: () => { queried = true; return { query: async () => ({ rows: [] }) }; },
    buildCanonicalSkillEvidence
  });
  await assert.rejects(
    () => resolveOwnedClass(TEACHER, 'not-a-uuid'),
    (error) => error.statusCode === 400
  );
  assert.equal(queried, false, 'a malformed id should fail validation before ever touching the database');
});

test('resolveOwnedClass: a well-formed classId that matches no row for this teacher throws a 403', async () => {
  const { resolveOwnedClass } = createClassEvidenceLoader({
    getPool: fakePool({ classes: () => ({ rows: [] }) }),
    buildCanonicalSkillEvidence
  });
  await assert.rejects(
    () => resolveOwnedClass(TEACHER, VALID_CLASS_ID),
    (error) => error.statusCode === 403
  );
});

test('resolveOwnedClass: a matching row scoped to this teacher_id is returned', async () => {
  let capturedValues = null;
  const { resolveOwnedClass } = createClassEvidenceLoader({
    getPool: fakePool({
      classes: (values) => {
        capturedValues = values;
        return { rows: [{ id: VALID_CLASS_ID, class_name: 'Year 10 IGCSE Music' }] };
      }
    }),
    buildCanonicalSkillEvidence
  });
  const result = await resolveOwnedClass(TEACHER, VALID_CLASS_ID);
  assert.deepEqual(result, { id: VALID_CLASS_ID, class_name: 'Year 10 IGCSE Music' });
  assert.deepEqual(capturedValues, [VALID_CLASS_ID, TEACHER.id]);
});

test('loadClassQuestionEvidence: no teacher returns safe empty defaults without querying', async () => {
  let queried = false;
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: () => { queried = true; return { query: async () => ({ rows: [] }) }; },
    buildCanonicalSkillEvidence
  });
  const evidence = await loadClassQuestionEvidence(null, VALID_CLASS_ID);
  assert.deepEqual(evidence, { skills: [], recentQuestionIds: [], studentCount: 0 });
  assert.equal(queried, false);
});

test('loadClassQuestionEvidence: with no classId, queries the whole teacher roster (no class clause, single bound value)', async () => {
  let attemptsValues = null;
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: fakePool({
      attempts: (values) => { attemptsValues = values; return { rows: [] }; },
      studentCount: () => ({ rows: [{ count: 4 }] })
    }),
    buildCanonicalSkillEvidence
  });
  const evidence = await loadClassQuestionEvidence(TEACHER, '');
  assert.deepEqual(attemptsValues, [TEACHER.id]);
  assert.equal(evidence.studentCount, 4);
});

test('loadClassQuestionEvidence: with a classId, resolves and scopes the query to that class (two bound values)', async () => {
  let attemptsValues = null;
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: fakePool({
      classes: () => ({ rows: [{ id: VALID_CLASS_ID, class_name: 'Year 10 IGCSE Music' }] }),
      attempts: (values) => { attemptsValues = values; return { rows: [] }; },
      studentCount: () => ({ rows: [{ count: 5 }] })
    }),
    buildCanonicalSkillEvidence
  });
  const evidence = await loadClassQuestionEvidence(TEACHER, VALID_CLASS_ID);
  assert.deepEqual(attemptsValues, [TEACHER.id, VALID_CLASS_ID]);
  assert.equal(evidence.studentCount, 5);
});

test('loadClassQuestionEvidence: an invalid classId still propagates resolveOwnedClass\'s error', async () => {
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: fakePool({}),
    buildCanonicalSkillEvidence
  });
  await assert.rejects(
    () => loadClassQuestionEvidence(TEACHER, 'not-a-uuid'),
    (error) => error.statusCode === 400
  );
});

test('loadClassQuestionEvidence: a missing progress_mode_summaries table (older DBs) degrades gracefully instead of throwing', async () => {
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: fakePool({
      progressMode: () => { const error = new Error('relation does not exist'); error.code = '42P01'; throw error; }
    }),
    buildCanonicalSkillEvidence
  });
  const evidence = await loadClassQuestionEvidence(TEACHER, '');
  assert.deepEqual(evidence.progressModeAreas, []);
  assert.equal(evidence.recommendedLevel, '');
});

test('loadClassQuestionEvidence: recentQuestionIds is deduplicated, in most-recent-first order', async () => {
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: fakePool({
      attempts: () => ({
        rows: [
          { student_id: 's1', question_id: 'Q1', answer_data: {} },
          { student_id: 's1', question_id: 'Q2', answer_data: {} },
          { student_id: 's2', question_id: 'Q1', answer_data: {} }
        ]
      })
    }),
    buildCanonicalSkillEvidence
  });
  const evidence = await loadClassQuestionEvidence(TEACHER, '');
  assert.deepEqual(evidence.recentQuestionIds, ['Q1', 'Q2']);
});

test('loadClassQuestionEvidence: recommendedLevel is the median level across real progress_mode_summaries areas', async () => {
  const { loadClassQuestionEvidence } = createClassEvidenceLoader({
    getPool: fakePool({
      progressMode: () => ({
        rows: [
          { areas: [{ level: 0 }, { level: 1 }] },
          { areas: [{ level: 3 }] }
        ]
      })
    }),
    buildCanonicalSkillEvidence
  });
  const evidence = await loadClassQuestionEvidence(TEACHER, '');
  // Sorted levels: [0, 1, 3] -> median index floor((3-1)/2)=1 -> level 1 -> "developing".
  assert.equal(evidence.recommendedLevel, 'developing');
});

// ---------- loadConceptMasteryForStudents ----------

function meterAdapter() {
  return {
    id: 'meter-master',
    getQuestions: () => [
      { id: 'Q1', metre_family: 'Compound duple', mode: '', requires_score: false, time_signature: '6/8' }
    ]
  };
}

test('loadConceptMasteryForStudents: an empty studentIds list returns an empty Map without querying', async () => {
  let queried = false;
  const { loadConceptMasteryForStudents } = createClassEvidenceLoader({
    getPool: () => { queried = true; return { query: async () => ({ rows: [] }) }; },
    buildCanonicalSkillEvidence,
    adaptersById: new Map([['meter-master', meterAdapter()]]),
    projectRoot: require('path').resolve(__dirname, '..', '..')
  });
  const result = await loadConceptMasteryForStudents(TEACHER.id, []);
  assert.deepEqual(Array.from(result.entries()), []);
  assert.equal(queried, false);
});

test('loadConceptMasteryForStudents: throws a clear error if adaptersById/projectRoot were never configured on this loader', async () => {
  const { loadConceptMasteryForStudents } = createClassEvidenceLoader({
    getPool: fakePool({}),
    buildCanonicalSkillEvidence
  });
  await assert.rejects(() => loadConceptMasteryForStudents(TEACHER.id, ['s1']), /adaptersById\/projectRoot/);
});

test('loadConceptMasteryForStudents: a student with no review rows gets an empty {} entry, not omitted', async () => {
  const { loadConceptMasteryForStudents } = createClassEvidenceLoader({
    getPool: fakePool({ reviews: () => ({ rows: [] }) }),
    buildCanonicalSkillEvidence,
    adaptersById: new Map([['meter-master', meterAdapter()]]),
    projectRoot: require('path').resolve(__dirname, '..', '..')
  });
  const result = await loadConceptMasteryForStudents(TEACHER.id, ['s1']);
  assert.deepEqual(result.get('s1'), {});
});

test('loadConceptMasteryForStudents: rows are grouped per student — each gets only their own concept mastery', async () => {
  const Feedback = require('../../modules/progress-mode/feedback.js');
  const row = (studentId) => ({
    student_id: studentId,
    source_key: 'meter-master',
    question_signature: 'Q1',
    correct: true,
    ease_factor: 2.5,
    interval_draws: 6,
    repetitions: 2,
    completed_at: new Date().toISOString()
  });
  const s1Rows = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row('s1'));
  const { loadConceptMasteryForStudents } = createClassEvidenceLoader({
    getPool: fakePool({ reviews: () => ({ rows: [...s1Rows, row('s2')] }) }),
    buildCanonicalSkillEvidence,
    adaptersById: new Map([['meter-master', meterAdapter()]]),
    projectRoot: require('path').resolve(__dirname, '..', '..')
  });
  const result = await loadConceptMasteryForStudents(TEACHER.id, ['s1', 's2']);
  assert.equal(result.get('s1')['meter-master::6/8'].reliable, true, 's1 has enough samples to be reliable');
  assert.equal(result.get('s2')['meter-master::6/8'].reliable, false, 's2 has only 1 sample — not reliable, and not mixed with s1\'s rows');
});

test('loadConceptMasteryForStudents: a missing progress_mode_reviews table degrades to empty mastery for every student, not a thrown error', async () => {
  const { loadConceptMasteryForStudents } = createClassEvidenceLoader({
    getPool: fakePool({ reviews: () => { const error = new Error('relation does not exist'); error.code = '42P01'; throw error; } }),
    buildCanonicalSkillEvidence,
    adaptersById: new Map([['meter-master', meterAdapter()]]),
    projectRoot: require('path').resolve(__dirname, '..', '..')
  });
  const result = await loadConceptMasteryForStudents(TEACHER.id, ['s1']);
  assert.deepEqual(result.get('s1'), {});
});
