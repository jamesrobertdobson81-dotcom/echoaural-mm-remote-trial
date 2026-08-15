'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../era-explorer-core.js');
const catalogue = require('../../shared/data/clip-catalogue.json');
const curation = require('../data/context-coach-curation.json');
const { seededRandom } = require('../../classroom/question-set-builder.js');
const createAdapter = require('../teacher-adapter.js');

const projectRoot = path.resolve(__dirname, '..', '..');
const adapter = createAdapter({ path, fs, projectRoot, getAudioDurationSeconds: () => 10 });
const questions = adapter.getQuestions();

const CURATION_LEVELS = {
  foundation: 'Foundation',
  developing: 'Developing',
  securing: 'Securing',
  mastering: 'Mastering'
};

function directCoreQuestion(template, seed) {
  const random = seededRandom(seed);
  const pool = core.auditEraExplorerClips(catalogue, curation).valid;
  const build = (level) => {
    try {
      return core.buildRoundQuestions(pool, 1, random, {
        questionType: template.questionType,
        curation,
        level
      });
    } catch (_error) {
      return null;
    }
  };
  let built = build(CURATION_LEVELS[template.level] || null);
  if (!built && template.level) built = build(null);
  return built[0];
}

test('exposes every curated buildable composer/period descriptor with exact current counts', () => {
  assert.equal(adapter.id, 'era-explorer');
  assert.equal(adapter.mixedCompatible, true);
  assert.equal(questions.length, 316);
  assert.equal(new Set(questions.map((question) => question.id)).size, 316);

  const counts = questions.reduce((result, question) => {
    const key = `${question.sourceKey}:${question.level}`;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, {
    'context-coach-composer:foundation': 11,
    'context-coach-period:foundation': 28,
    'context-coach-composer:developing': 32,
    'context-coach-period:developing': 64,
    'context-coach-composer:securing': 63,
    'context-coach-period:securing': 51,
    'context-coach-composer:mastering': 65,
    'context-coach-period:mastering': 2
  });
  assert.equal(questions.filter((question) => question.sourceKey === 'context-coach-composer').length, 171);
  assert.equal(questions.filter((question) => question.sourceKey === 'context-coach-period').length, 145);
});

test('adapter generation is exactly the shared core driven by classroom seededRandom', () => {
  const templates = [
    questions.find((question) => question.sourceKey === 'context-coach-composer' && question.level === 'securing'),
    questions.find((question) => question.sourceKey === 'context-coach-period' && question.level === 'developing'),
    // Period/Mastering currently has only two curated clips spanning too few
    // periods, so this also locks the real app's same-RNG unrestricted
    // fallback sequence rather than only testing the happy path.
    questions.find((question) => question.sourceKey === 'context-coach-period' && question.level === 'mastering')
  ];

  templates.forEach((template, index) => {
    const seed = `context-live-parity:${index}:2026`;
    const expected = directCoreQuestion(template, seed);
    const actual = adapter.buildQuestionForSeed(template, seed);
    assert.deepEqual(actual, expected);
  });
});

test('prepareQuestion returns the exact seeded question and keeps scoring data private', () => {
  const template = questions.find((question) => question.sourceKey === 'context-coach-composer' && question.level === 'foundation');
  const seed = 'ROOM-ABCDE:0:context-composer';
  const generated = adapter.buildQuestionForSeed(template, seed);
  const prepared = adapter.prepareQuestion(template, { index: 7, seed });

  assert.equal(prepared.moduleId, 'era-explorer');
  assert.equal(prepared.sourceKey, 'context-coach-composer');
  assert.equal(prepared.questionType, 'composer');
  assert.equal(prepared.seed, seed);
  assert.equal(prepared.id, generated.id);
  assert.equal(prepared.templateId, template.id);
  assert.equal(prepared.index, 7);
  assert.deepEqual(prepared.choices, generated.options);
  assert.equal(prepared.audio, generated.clip.audioPath);
  assert.equal(prepared.answerType, 'choice');
  assert.equal(prepared.responseType, 'multiple-choice');
  assert.equal(Object.hasOwn(prepared, 'correctAnswer'), false);
  assert.equal(Object.hasOwn(prepared, 'modelAnswer'), false);
});

test('prepare and checkAnswer resolve the same plan seed from the real RoomManager option shapes', () => {
  const template = questions.find((question) => question.sourceKey === 'context-coach-period' && question.level === 'securing');
  const seed = 'teacher-round-4:2:period';
  const room = {
    questionOrderPosition: 0,
    questionOrder: [{ moduleId: 'era-explorer', questionId: template.id, seed }]
  };
  const prepared = adapter.prepareQuestion(template, { index: 2, room });
  const generated = adapter.buildQuestionForSeed(template, seed);
  assert.equal(prepared.seed, seed);
  assert.equal(prepared.id, generated.id);

  const accepted = adapter.checkAnswer(template, generated.correctAnswer, { activeQuestion: prepared });
  assert.equal(accepted.correct, true);
  assert.equal(accepted.score, 1);
  assert.equal(accepted.total, 1);
  assert.equal(accepted.modelAnswer, generated.correctAnswer);
  assert.equal(accepted.answerData.clipId, generated.clip.id);

  const wrongChoice = generated.options.find((choice) => choice !== generated.correctAnswer);
  const rejected = adapter.checkAnswer(template, wrongChoice, { activeQuestion: prepared });
  assert.equal(rejected.correct, false);
  assert.equal(rejected.score, 0);
  assert.equal(rejected.modelAnswer, generated.correctAnswer);
});

test('same seed is stable while different seeds exercise more than one real question', () => {
  const template = questions.find((question) => question.sourceKey === 'context-coach-composer' && question.level === 'developing');
  const seed = 'stable-context-seed';
  assert.deepEqual(
    adapter.buildQuestionForSeed(template, seed),
    adapter.buildQuestionForSeed(template, seed)
  );

  const generatedIds = new Set(Array.from({ length: 16 }, (_item, index) => (
    adapter.buildQuestionForSeed(template, `context-variety-${index}`).id
  )));
  assert.ok(generatedIds.size > 1, `expected seeded procedural variety, found ${generatedIds.size} question id`);
});
