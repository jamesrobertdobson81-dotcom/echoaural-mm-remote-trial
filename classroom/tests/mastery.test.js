'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { computeConceptMastery, rankConceptsForTargeting } = require('../mastery');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function adapter(id, questions) {
  return { id, getQuestions: () => questions };
}

const METER_ADAPTERS = new Map([
  ['meter-master', adapter('meter-master', [
    { id: 'Q-COMPOUND-1', metre_family: 'Compound duple', mode: '', requires_score: false, time_signature: '6/8' },
    { id: 'Q-COMPOUND-2', metre_family: 'Compound duple', mode: '', requires_score: false, time_signature: '6/8' },
    { id: 'Q-SIMPLE-1', metre_family: 'Simple triple', mode: '', requires_score: false, time_signature: '3/4' }
  ])]
]);

function row(overrides = {}) {
  return {
    source_key: 'meter-master',
    question_signature: 'Q-COMPOUND-1',
    correct: true,
    completed_at: new Date().toISOString(),
    interval_draws: 6,
    ease_factor: 2.5,
    repetitions: 2,
    ...overrides
  };
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

test('computeConceptMastery: an empty review list produces no concepts', () => {
  assert.deepEqual(computeConceptMastery([], METER_ADAPTERS, PROJECT_ROOT), {});
});

test('computeConceptMastery: a review for a PM source outside the concept-scoped modules contributes nothing', () => {
  const reviews = [row({ source_key: 'instrument-identifier', question_signature: 'II001' })];
  assert.deepEqual(computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT), {});
});

test('computeConceptMastery: a review whose signature does not match any real question in the bank contributes nothing', () => {
  const reviews = [row({ question_signature: 'NOT-A-REAL-QUESTION' })];
  assert.deepEqual(computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT), {});
});

test('computeConceptMastery: one question contributes to every concept dimension it matches (pools "6/8" and "Compound duple")', () => {
  const reviews = [row()];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.ok(mastery['meter-master::6/8']);
  assert.ok(mastery['meter-master::Compound duple']);
  assert.equal(mastery['meter-master::6/8'].masteryScore, 100);
});

test('computeConceptMastery: masteryScore weights recent reviews more heavily than old ones', () => {
  // 3 wrong long ago, then 3 right recently -> should read as mostly mastered now.
  const reviews = [
    row({ correct: false, completed_at: daysAgo(60) }),
    row({ correct: false, completed_at: daysAgo(55) }),
    row({ correct: false, completed_at: daysAgo(50) }),
    row({ correct: true, completed_at: daysAgo(3) }),
    row({ correct: true, completed_at: daysAgo(2) }),
    row({ correct: true, completed_at: daysAgo(1) })
  ];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.ok(mastery['meter-master::6/8'].masteryScore > 50, 'recent correct streak should dominate the score');
});

test('computeConceptMastery: masteryScore reflects a straight recent losing streak as low', () => {
  const reviews = [
    row({ correct: true, completed_at: daysAgo(60) }),
    row({ correct: false, completed_at: daysAgo(3) }),
    row({ correct: false, completed_at: daysAgo(2) }),
    row({ correct: false, completed_at: daysAgo(1) })
  ];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.ok(mastery['meter-master::6/8'].masteryScore < 50);
});

test('computeConceptMastery: dueScore >= 1 once elapsed days exceed the stored interval, using the most recent review per question', () => {
  const reviews = [row({ completed_at: daysAgo(10), interval_draws: 6 })];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.ok(mastery['meter-master::6/8'].dueScore >= 1, 'reviewed 10 days ago with a 6-day interval should be overdue');
});

test('computeConceptMastery: dueScore stays below 1 when well within the interval', () => {
  const reviews = [row({ completed_at: daysAgo(1), interval_draws: 6 })];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.ok(mastery['meter-master::6/8'].dueScore < 1);
});

test('computeConceptMastery: dueScore for a concept takes the MOST overdue of its constituent questions', () => {
  const reviews = [
    row({ question_signature: 'Q-COMPOUND-1', completed_at: daysAgo(1), interval_draws: 6 }),
    row({ question_signature: 'Q-COMPOUND-2', completed_at: daysAgo(30), interval_draws: 2 })
  ];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.ok(mastery['meter-master::Compound duple'].dueScore >= 15, 'the badly-overdue question should dominate the concept-level dueScore');
});

test('computeConceptMastery: reliable requires at least FEEDBACK_MIN_QUESTIONS samples', () => {
  const Feedback = require('../../modules/progress-mode/feedback.js');
  const fewReviews = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS - 1 }, () => row({ completed_at: daysAgo(1) }));
  const enoughReviews = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ completed_at: daysAgo(1) }));
  assert.equal(computeConceptMastery(fewReviews, METER_ADAPTERS, PROJECT_ROOT)['meter-master::6/8'].reliable, false);
  assert.equal(computeConceptMastery(enoughReviews, METER_ADAPTERS, PROJECT_ROOT)['meter-master::6/8'].reliable, true);
});

test('computeConceptMastery: needsWork is true for a reliable weak concept even if not overdue', () => {
  const Feedback = require('../../modules/progress-mode/feedback.js');
  const reviews = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ correct: false, completed_at: daysAgo(1), interval_draws: 999 }));
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.equal(mastery['meter-master::6/8'].dueScore < 1, true, 'sanity: not overdue by interval');
  assert.equal(mastery['meter-master::6/8'].needsWork, true, 'a reliable, weak concept should still need work regardless of due status');
});

test('computeConceptMastery: needsWork is true for an overdue concept even at 100% mastery', () => {
  const reviews = [row({ correct: true, completed_at: daysAgo(100), interval_draws: 6 })];
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.equal(mastery['meter-master::6/8'].masteryScore, 100);
  assert.equal(mastery['meter-master::6/8'].needsWork, true);
});

test('computeConceptMastery: needsWork is false for a concept that is neither weak nor overdue', () => {
  const Feedback = require('../../modules/progress-mode/feedback.js');
  const reviews = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ correct: true, completed_at: daysAgo(1), interval_draws: 6 }));
  const mastery = computeConceptMastery(reviews, METER_ADAPTERS, PROJECT_ROOT);
  assert.equal(mastery['meter-master::6/8'].needsWork, false);
});

test('rankConceptsForTargeting: only includes concepts flagged needsWork', () => {
  const Feedback = require('../../modules/progress-mode/feedback.js');
  const solidReviews = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ question_signature: 'Q-SIMPLE-1', correct: true, completed_at: daysAgo(1), interval_draws: 6 }));
  const weakReviews = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ question_signature: 'Q-COMPOUND-1', correct: false, completed_at: daysAgo(1) }));
  const mastery = computeConceptMastery([...solidReviews, ...weakReviews], METER_ADAPTERS, PROJECT_ROOT);
  const ranked = rankConceptsForTargeting(mastery);
  assert.ok(ranked.every((concept) => concept.needsWork));
  assert.ok(!ranked.some((concept) => concept.value === 'Simple triple'));
});

test('rankConceptsForTargeting: a concept that is both weak AND overdue ranks above one that is only overdue', () => {
  const Feedback = require('../../modules/progress-mode/feedback.js');
  const weakAndOverdue = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ question_signature: 'Q-COMPOUND-1', correct: false, completed_at: daysAgo(30), interval_draws: 2 }));
  const onlyOverdue = Array.from({ length: Feedback.FEEDBACK_MIN_QUESTIONS }, () => row({ question_signature: 'Q-SIMPLE-1', correct: true, completed_at: daysAgo(30), interval_draws: 2 }));
  const mastery = computeConceptMastery([...weakAndOverdue, ...onlyOverdue], METER_ADAPTERS, PROJECT_ROOT);
  const ranked = rankConceptsForTargeting(mastery);
  const weakIndex = ranked.findIndex((c) => c.value === 'Compound duple');
  const overdueOnlyIndex = ranked.findIndex((c) => c.value === 'Simple triple');
  assert.ok(weakIndex < overdueOnlyIndex, 'weak+overdue should rank ahead of overdue-only');
});
