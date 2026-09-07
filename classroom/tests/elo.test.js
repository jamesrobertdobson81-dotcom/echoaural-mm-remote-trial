'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_RATING, expectedScore, updateElo, recordEloOutcome } = require('../elo');

test('expectedScore: equal ratings give a 50/50 expectation', () => {
  assert.equal(expectedScore(1200, 1200), 0.5);
});

test('expectedScore: a much higher-rated player has a high expected score', () => {
  // Classic Elo reference point: a 400-point gap gives ~0.909/0.091.
  assert.ok(Math.abs(expectedScore(1600, 1200) - 0.909) < 0.005);
  assert.ok(Math.abs(expectedScore(1200, 1600) - 0.091) < 0.005);
});

test('expectedScore: expectations for both sides always sum to 1', () => {
  const a = expectedScore(1350, 1180);
  const b = expectedScore(1180, 1350);
  assert.ok(Math.abs(a + b - 1) < 1e-9);
});

test('updateElo: a correct answer against an evenly-matched question raises both the student and (inversely) the question ratings as expected', () => {
  const result = updateElo({ ratingA: 1200, ratingB: 1200, actualScoreA: 1, kA: 20, kB: 12 });
  // Student "won" (correct) -> student rating rises, question rating falls
  // (it was "beaten").
  assert.equal(result.ratingA, 1200 + 20 * 0.5);
  assert.equal(result.ratingB, 1200 - 12 * 0.5);
});

test('updateElo: an incorrect answer lowers the student rating and raises the question\'s difficulty rating', () => {
  const result = updateElo({ ratingA: 1200, ratingB: 1200, actualScoreA: 0, kA: 20, kB: 12 });
  assert.equal(result.ratingA, 1200 - 20 * 0.5);
  assert.equal(result.ratingB, 1200 + 12 * 0.5);
});

test('updateElo: a correct answer against a much harder question moves ratings more than against an easy one', () => {
  const vsHard = updateElo({ ratingA: 1200, ratingB: 1600, actualScoreA: 1, kA: 20, kB: 12 });
  const vsEasy = updateElo({ ratingA: 1200, ratingB: 800, actualScoreA: 1, kA: 20, kB: 12 });
  assert.ok((vsHard.ratingA - 1200) > (vsEasy.ratingA - 1200), 'beating a harder question should be a bigger surprise (bigger gain)');
});

test('updateElo: partial credit (a fractional actualScore) produces a proportionally smaller update than a full correct', () => {
  const full = updateElo({ ratingA: 1200, ratingB: 1200, actualScoreA: 1, kA: 20, kB: 12 });
  const half = updateElo({ ratingA: 1200, ratingB: 1200, actualScoreA: 0.5, kA: 20, kB: 12 });
  assert.ok((full.ratingA - 1200) > (half.ratingA - 1200));
  assert.equal(half.ratingA, 1200, 'exactly 0.5 actual against an exactly 0.5 expected outcome should not move the rating at all');
});

// ---------- recordEloOutcome (DB-facing, fake transactional client) ----------

function fakeClient(initial = {}) {
  const state = {
    question: initial.question || null,
    skill: initial.skill || null
  };
  const calls = [];
  return {
    state,
    calls,
    query: async (sql, values) => {
      calls.push({ sql: sql.trim().slice(0, 40), values });
      if (/SELECT difficulty_rating/.test(sql)) {
        return { rows: state.question ? [{ difficulty_rating: state.question.rating, attempts_count: state.question.attemptsCount }] : [] };
      }
      if (/SELECT ability_rating/.test(sql)) {
        return { rows: state.skill ? [{ ability_rating: state.skill.rating, attempts_count: state.skill.attemptsCount }] : [] };
      }
      if (/INSERT INTO question_elo_ratings/.test(sql)) {
        state.question = { rating: values[2], attemptsCount: values[3] };
        return { rows: [] };
      }
      if (/INSERT INTO student_skill_ratings/.test(sql)) {
        state.skill = { rating: values[3], attemptsCount: values[4] };
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql.slice(0, 60)}`);
    }
  };
}

test('recordEloOutcome: missing required fields no-ops without touching the database', async () => {
  const client = fakeClient();
  const result = await recordEloOutcome(client, { moduleId: 'meter-master', questionId: '', teacherId: 't1', studentId: 's1', skillCode: 'RHY.METRE', actualScore: 1 });
  assert.equal(result, null);
  assert.equal(client.calls.length, 0);
});

test('recordEloOutcome: first-ever attempt starts both ratings from DEFAULT_RATING and writes new rows', async () => {
  const client = fakeClient();
  const result = await recordEloOutcome(client, {
    moduleId: 'meter-master', questionId: 'MMX001', teacherId: 't1', studentId: 's1', skillCode: 'RHY.METRE', actualScore: 1
  });
  assert.ok(result.studentRating > DEFAULT_RATING, 'a correct first attempt should raise the student rating above default');
  assert.ok(result.questionRating < DEFAULT_RATING, 'a correct first attempt should lower the question difficulty rating below default');
  assert.equal(client.state.question.attemptsCount, 1);
  assert.equal(client.state.skill.attemptsCount, 1);
});

test('recordEloOutcome: a subsequent attempt reads and updates the existing stored ratings, not fresh defaults', async () => {
  const client = fakeClient({ question: { rating: 1400, attemptsCount: 3 }, skill: { rating: 1100, attemptsCount: 5 } });
  const result = await recordEloOutcome(client, {
    moduleId: 'meter-master', questionId: 'MMX001', teacherId: 't1', studentId: 's1', skillCode: 'RHY.METRE', actualScore: 0
  });
  const expected = updateElo({ ratingA: 1100, ratingB: 1400, actualScoreA: 0 });
  assert.ok(Math.abs(result.studentRating - expected.ratingA) < 1e-9, 'must compute from the stored 1100 rating, not a fresh 1200 default');
  assert.ok(Math.abs(result.questionRating - expected.ratingB) < 1e-9);
  assert.equal(client.state.question.attemptsCount, 4);
  assert.equal(client.state.skill.attemptsCount, 6);
});

test('recordEloOutcome: clamps an out-of-range actualScore into [0,1] rather than corrupting ratings', async () => {
  const client = fakeClient();
  const result = await recordEloOutcome(client, {
    moduleId: 'meter-master', questionId: 'MMX001', teacherId: 't1', studentId: 's1', skillCode: 'RHY.METRE', actualScore: 5
  });
  // actualScore=5 clamps to 1 (full credit) — same result as actualScore: 1.
  const expected = updateElo({ ratingA: DEFAULT_RATING, ratingB: DEFAULT_RATING, actualScoreA: 1 });
  assert.ok(Math.abs(result.studentRating - expected.ratingA) < 1e-9);
});
