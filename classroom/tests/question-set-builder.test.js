'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { QuestionCatalogue } = require('../question-catalogue');
const { buildQuestionSet, normaliseSpec } = require('../question-set-builder');

function adapter(id, questions, options = {}) {
  return {
    id,
    title: options.title || id,
    studentMode: options.studentMode || 'generic',
    mixedCompatible: options.mixedCompatible,
    getQuestions: () => questions
  };
}

const catalogue = new QuestionCatalogue([
  adapter('instrument-identifier', [
    { id: 'TEST-II001', difficulty: 'easy', type: 'solo' },
    { id: 'TEST-II002', difficulty: 'medium', type: 'ensemble' },
    { id: 'TEST-II003', difficulty: 'hard', type: 'ensemble' }
  ], { title: 'Instrument Identifier' }),
  adapter('melodic-intervals', [
    { id: 'MI001', levelKey: 'foundation' },
    { id: 'MI002', levelKey: 'developing' },
    { id: 'MI003', levelKey: 'securing' }
  ], { title: 'Melodic Intervals' }),
  adapter('melody-master', [
    { id: 'MM001' },
    { id: 'MM002' }
  ], { title: 'Melody Master', mixedCompatible: false })
]);

test('normalises the legacy-compatible planning defaults', () => {
  const spec = normaliseSpec({ purpose: 'starter', seed: 'starter-seed' });
  assert.deepEqual(spec, {
    version: 1,
    purpose: 'starter',
    strategy: 'balanced',
    classId: '',
    questionCount: 5,
    maxListens: 4,
    moduleIds: [],
    sourceKeys: [],
    musicalElements: [],
    skillCodes: [],
    levels: [],
    responseTypes: [],
    excludeQuestionIds: [],
    recentQuestionIds: [],
    selectedQuestions: [],
    avoidRecent: true,
    seed: 'starter-seed',
    leaderboard: true
  });
});

test('builds reproducible random sets from stable question IDs', () => {
  const spec = { strategy: 'random', moduleIds: ['instrument-identifier'], questionCount: 3, seed: 'class-7' };
  const first = buildQuestionSet(catalogue, spec);
  const second = buildQuestionSet(catalogue, spec);
  assert.deepEqual(first.questionPlan, second.questionPlan);
  assert.equal(new Set(first.questionPlan.map((item) => item.questionId)).size, 3);
});

test('keeps non-compatible specialist renderers out of mixed sets', () => {
  const result = buildQuestionSet(catalogue, {
    strategy: 'balanced',
    moduleIds: ['instrument-identifier', 'melodic-intervals', 'melody-master'],
    questionCount: 8,
    seed: 'mixed'
  });
  assert.ok(result.questionPlan.length > 0);
  assert.ok(result.questionPlan.every((item) => item.moduleId !== 'melody-master'));
});

test('applies level filters without silently excluding unclassified questions', () => {
  const result = buildQuestionSet(catalogue, {
    strategy: 'random',
    moduleIds: ['instrument-identifier'],
    levels: ['foundation'],
    questionCount: 5,
    seed: 'foundation'
  });
  assert.deepEqual(result.questionPlan.map((item) => item.questionId), ['TEST-II001']);
});

test('falls back safely when recent-question avoidance exhausts the pool', () => {
  const result = buildQuestionSet(catalogue, {
    strategy: 'random',
    moduleIds: ['melodic-intervals'],
    recentQuestionIds: ['MI001', 'MI002', 'MI003'],
    questionCount: 2,
    seed: 'recent'
  });
  assert.equal(result.questionPlan.length, 2);
  assert.match(result.preview.warnings[0], /Recently used/);
});

test('class-priority sets use reliable weak skills around the class level', () => {
  const adaptiveCatalogue = new QuestionCatalogue([
    adapter('texture-trainer', [
      { id: 'AD-1', level: 'foundation', skillCode: 'WEAK', skillName: 'Weak skill', musicalElement: 'Texture' },
      { id: 'AD-2', level: 'developing', skillCode: 'WEAK', skillName: 'Weak skill', musicalElement: 'Texture' },
      { id: 'AD-3', level: 'securing', skillCode: 'WEAK', skillName: 'Weak skill', musicalElement: 'Texture' },
      { id: 'AD-4', level: 'developing', skillCode: 'STRONG', skillName: 'Strong skill', musicalElement: 'Texture' },
      { id: 'AD-5', level: 'securing', skillCode: 'STRONG', skillName: 'Strong skill', musicalElement: 'Texture' }
    ])
  ]);
  const result = buildQuestionSet(adaptiveCatalogue, {
    strategy: 'class-priorities', questionCount: 3, seed: 'adaptive'
  }, {
    recommendedLevel: 'developing',
    skills: [
      { skillCode: 'WEAK', percentage: 35, questions: 10, reliable: true },
      { skillCode: 'STRONG', percentage: 90, questions: 10, reliable: true }
    ]
  });
  assert.equal(result.questionPlan[0].questionId, 'AD-2');
  assert.match(result.preview.rationale, /developing level/);
});

test('every plan entry carries a reproducible seed, needed for PM sources with no fixed question bank to select by id (chord-identifier, key-signature-sprint, ContextCoach)', () => {
  const spec = { strategy: 'random', moduleIds: ['instrument-identifier'], questionCount: 3, seed: 'seed-field-check' };
  const first = buildQuestionSet(catalogue, spec);
  const second = buildQuestionSet(catalogue, spec);

  first.questionPlan.forEach((item) => {
    assert.equal(typeof item.seed, 'string');
    assert.ok(item.seed.length > 0);
  });
  // Reproducible: the same spec (same overall seed) produces the same
  // per-question seeds, not just the same question selection.
  assert.deepEqual(first.questionPlan.map((item) => item.seed), second.questionPlan.map((item) => item.seed));
  // Distinct within one round: no two questions in the same plan share a seed.
  const seeds = first.questionPlan.map((item) => item.seed);
  assert.equal(new Set(seeds).size, seeds.length);
});

// ---------- adaptive-per-student strategy (real per-student targeting) ----------

const adaptivePerStudentCatalogue = new QuestionCatalogue([
  adapter('meter-master', [
    { id: 'AP-PRIORITY-EASY', skillCode: 'RHY.METRE', skillName: 'Metre', musicalElement: 'Meter and rhythm' },
    { id: 'AP-PRIORITY-HARD', skillCode: 'RHY.METRE', skillName: 'Metre', musicalElement: 'Meter and rhythm' },
    { id: 'AP-OTHER', skillCode: 'RHY.METRE', skillName: 'Metre', musicalElement: 'Meter and rhythm' }
  ])
]);

test('adaptive-per-student: priority-matched questions (from this student\'s own concept mastery) are preferred over non-priority ones', () => {
  const result = buildQuestionSet(adaptivePerStudentCatalogue, {
    strategy: 'adaptive-per-student', questionCount: 1, seed: 'adaptive-per-student-priority'
  }, {
    priorityQuestionKeys: new Set(['meter-master:AP-PRIORITY-EASY', 'meter-master:AP-PRIORITY-HARD']),
    questionRatings: new Map(),
    skillRatings: new Map()
  });
  assert.ok(['AP-PRIORITY-EASY', 'AP-PRIORITY-HARD'].includes(result.questionPlan[0].questionId));
});

test('adaptive-per-student: within a priority tier, the question closest to the student\'s own skill rating is preferred', () => {
  const result = buildQuestionSet(adaptivePerStudentCatalogue, {
    strategy: 'adaptive-per-student', questionCount: 1, seed: 'adaptive-per-student-gap'
  }, {
    priorityQuestionKeys: new Set(['meter-master:AP-PRIORITY-EASY', 'meter-master:AP-PRIORITY-HARD']),
    questionRatings: new Map([
      ['meter-master:AP-PRIORITY-EASY', 1000],
      ['meter-master:AP-PRIORITY-HARD', 1900]
    ]),
    skillRatings: new Map([['RHY.METRE', 1200]])
  });
  // |1200-1000|=200 vs |1200-1900|=700 -> the easy one is the closer match.
  assert.equal(result.questionPlan[0].questionId, 'AP-PRIORITY-EASY');
});

test('adaptive-per-student: with no priority/rating signal at all, it still returns a full, valid set (cold-start degrades to a fair shuffle, not an empty result)', () => {
  const result = buildQuestionSet(adaptivePerStudentCatalogue, {
    strategy: 'adaptive-per-student', questionCount: 3, seed: 'adaptive-per-student-cold-start'
  }, {});
  assert.equal(result.questionPlan.length, 3);
  assert.equal(new Set(result.questionPlan.map((item) => item.questionId)).size, 3);
});

test('adaptive-per-student: an unrated question is not always excluded in favour of rated ones (gets a fair neutral gap)', () => {
  const result = buildQuestionSet(adaptivePerStudentCatalogue, {
    strategy: 'adaptive-per-student', questionCount: 3, seed: 'adaptive-per-student-unrated'
  }, {
    questionRatings: new Map([['meter-master:AP-PRIORITY-EASY', 1200]]),
    skillRatings: new Map([['RHY.METRE', 1200]])
  });
  // All 3 candidates should still be selectable across repeated seeds — spot check this seed returns all 3.
  assert.equal(result.questionPlan.length, 3);
});
