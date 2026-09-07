'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  CONCEPT_SCOPED_MODULE_IDS,
  conceptFieldsFor,
  getConceptCatalogue,
  questionIdsForConcepts
} = require('../concept-catalogue');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function adapter(id, questions) {
  return { id, getQuestions: () => questions };
}

test('CONCEPT_SCOPED_MODULE_IDS lists exactly the 3 modules this pass wires up', () => {
  assert.deepEqual(CONCEPT_SCOPED_MODULE_IDS, ['melody-master', 'texture-trainer', 'meter-master']);
});

test('conceptFieldsFor: meter-master maps snake_case raw fields to the camelCase names concept-extractors expects', () => {
  const fields = conceptFieldsFor('meter-master', {
    metre_family: 'Compound duple',
    mode: 'Aural classification',
    requires_score: true,
    time_signature: '6/8'
  }, PROJECT_ROOT);
  assert.deepEqual(fields, {
    metreFamily: 'Compound duple',
    mode: 'Aural classification',
    requiresScore: true,
    timeSignature: '6/8'
  });
});

test('conceptFieldsFor: texture-trainer passes its already-camelCase fields through unchanged', () => {
  const fields = conceptFieldsFor('texture-trainer', {
    textureFocus: 'Fugal imitation',
    specificTextureTerm: 'Fugal imitation',
    target: '',
    responseType: 'short-text'
  }, PROJECT_ROOT);
  assert.deepEqual(fields, {
    textureFocus: 'Fugal imitation',
    specificTextureTerm: 'Fugal imitation',
    target: '',
    responseType: 'short-text'
  });
});

test('conceptFieldsFor: melody-master joins aosCode from the real question-aos-map.json by question id', () => {
  // MMX001 is a real, stable devices question in the checked-in AoS map
  // (shared/data/question-aos-map.json), tagged AoS3 there.
  const fields = conceptFieldsFor('melody-master', {
    id: 'MMX001',
    category: 'Melodic device',
    difficulty: undefined,
    correctAnswer: 'A repeated short riff (ostinato)'
  }, PROJECT_ROOT);
  assert.equal(fields.category, 'Melodic device');
  assert.equal(fields.correctAnswer, 'A repeated short riff (ostinato)');
  assert.equal(fields.aosCode, 'AoS3');
});

test('conceptFieldsFor: melody-master leaves aosCode undefined for an unknown question id', () => {
  const fields = conceptFieldsFor('melody-master', { id: 'NOT-A-REAL-ID', category: 'Melodic device' }, PROJECT_ROOT);
  assert.equal(fields.aosCode, undefined);
});

test('getConceptCatalogue: meter-master — only concepts with real display copy and 1+ matching question are returned, with correct counts', () => {
  const meterAdapter = adapter('meter-master', [
    { id: 'Q1', metre_family: 'Compound duple', mode: 'Aural classification', requires_score: false, time_signature: '6/8' },
    { id: 'Q2', metre_family: 'Compound duple', mode: 'Aural classification', requires_score: false, time_signature: '6/8' },
    { id: 'Q3', metre_family: 'Simple triple', mode: 'Pulse analysis', requires_score: true, time_signature: '3/4' },
    // Unknown metreFamily value — must not produce a concept with no display copy.
    { id: 'Q4', metre_family: 'Nonexistent family', mode: 'Nonexistent mode', requires_score: false, time_signature: '9/8' }
  ]);
  const catalogue = getConceptCatalogue(meterAdapter, 'meter-master', PROJECT_ROOT);
  const byValue = Object.fromEntries(catalogue.map((item) => [item.value, item]));

  assert.equal(byValue['Compound duple'].count, 2);
  assert.equal(byValue['Compound duple'].label, 'compound duple metre');
  assert.equal(byValue['Simple triple'].count, 1);
  assert.equal(byValue['6/8'].count, 2);
  assert.equal(byValue['3/4'].count, 1);
  assert.ok(!byValue['Nonexistent family'], 'a value with no CONCEPT_PHRASES entry must not appear');
  assert.ok(!byValue['9/8'], 'an unwhitelisted time signature must not appear');
});

test('getConceptCatalogue: a question can contribute to more than one concept dimension at once', () => {
  // metreFamily contributes both its own whitelisted value AND the
  // simple/compound bucket derived from it — same flat-pool convention
  // documented in shared/js/concept-extractors.js.
  const meterAdapter = adapter('meter-master', [
    { id: 'Q1', metre_family: 'Simple triple', mode: '', requires_score: false, time_signature: '' }
  ]);
  const catalogue = getConceptCatalogue(meterAdapter, 'meter-master', PROJECT_ROOT);
  const values = catalogue.map((item) => item.value);
  assert.ok(values.includes('Simple triple'));
  assert.ok(values.includes('Simple time'), 'simpleCompoundTier should also fire for the same question');
});

test('getConceptCatalogue: texture-trainer', () => {
  const textureAdapter = adapter('texture-trainer', [
    { id: 'TT1', textureFocus: 'Fugal imitation', specificTextureTerm: 'Fugal imitation', target: '', responseType: 'short-text' },
    { id: 'TT2', textureFocus: '', specificTextureTerm: 'Monophonic', target: '', responseType: 'multiple-choice' },
    // A multi-stage "texture change" question is excluded from the texture
    // dimension (see shared/js/concept-extractors.js's hasArrow), but still
    // contributes its responseType.
    { id: 'TT3', textureFocus: 'Monophonic → fugal polyphony', specificTextureTerm: '', target: '', responseType: 'short-text' }
  ]);
  const catalogue = getConceptCatalogue(textureAdapter, 'texture-trainer', PROJECT_ROOT);
  const byValue = Object.fromEntries(catalogue.map((item) => [item.value, item]));

  assert.equal(byValue['Fugal imitation'].count, 1);
  assert.equal(byValue['Monophonic'].count, 1);
  assert.equal(byValue['short-text'].count, 2);
  assert.equal(byValue['multiple-choice'].count, 1);
});

test('getConceptCatalogue: melody-master pools devices (category/correctAnswer/aosCode) and dictation (difficulty) dimensions together', () => {
  const melodyAdapter = adapter('melody-master', [
    { id: 'FAKE-DEV-1', category: 'Melodic device', correctAnswer: 'It uses a repeated short riff (ostinato) throughout.' },
    { id: 'FAKE-DEV-2', category: 'Melodic device', correctAnswer: 'It uses a repeated short riff (ostinato) throughout.' },
    // MMX001 is a real id in the checked-in AoS map (AoS3 -> Western
    // classical tradition) — proves the aosCode join reaches this level.
    { id: 'MMX001', category: 'Ornament', correctAnswer: 'A grace note ornament.' },
    // Dictation questions carry no category/correctAnswer, only difficulty.
    { id: 'FAKE-DICT-1', difficulty: 'easy' }
  ]);
  const catalogue = getConceptCatalogue(melodyAdapter, 'melody-master', PROJECT_ROOT);
  const byValue = Object.fromEntries(catalogue.map((item) => [item.value, item]));

  assert.equal(byValue['Melodic device'].count, 2);
  assert.equal(byValue['Ostinato'].count, 2);
  assert.equal(byValue['Ornament'].count, 1);
  assert.equal(byValue['Western classical tradition'].count, 1);
  assert.equal(byValue['easy'].count, 1);
});

test('getConceptCatalogue: returns an empty array for an adapter with no getQuestions()', () => {
  assert.deepEqual(getConceptCatalogue({}, 'meter-master', PROJECT_ROOT), []);
});

test('questionIdsForConcepts: resolves real question ids whose concept values intersect the requested set', () => {
  const meterAdapter = adapter('meter-master', [
    { id: 'Q1', metre_family: 'Compound duple', mode: '', requires_score: false, time_signature: '6/8' },
    { id: 'Q2', metre_family: 'Simple triple', mode: '', requires_score: false, time_signature: '3/4' },
    { id: 'Q3', metre_family: 'Compound duple', mode: '', requires_score: false, time_signature: '6/8' }
  ]);
  const ids = questionIdsForConcepts(meterAdapter, 'meter-master', ['6/8'], PROJECT_ROOT);
  assert.deepEqual(ids.sort(), ['Q1', 'Q3']);
});

test('questionIdsForConcepts: a question matching ANY requested concept is included once, not duplicated', () => {
  const meterAdapter = adapter('meter-master', [
    // Matches both "Compound duple" and "6/8" — must appear only once.
    { id: 'Q1', metre_family: 'Compound duple', mode: '', requires_score: false, time_signature: '6/8' }
  ]);
  const ids = questionIdsForConcepts(meterAdapter, 'meter-master', ['Compound duple', '6/8'], PROJECT_ROOT);
  assert.deepEqual(ids, ['Q1']);
});

test('questionIdsForConcepts: returns an empty array when no concept values are given', () => {
  const meterAdapter = adapter('meter-master', [{ id: 'Q1', metre_family: 'Compound duple' }]);
  assert.deepEqual(questionIdsForConcepts(meterAdapter, 'meter-master', [], PROJECT_ROOT), []);
});

test('questionIdsForConcepts: returns an empty array when nothing matches', () => {
  const meterAdapter = adapter('meter-master', [{ id: 'Q1', metre_family: 'Compound duple' }]);
  assert.deepEqual(questionIdsForConcepts(meterAdapter, 'meter-master', ['Simple triple'], PROJECT_ROOT), []);
});

// Real-adapter integration smoke test — catches drift between this module's
// field mapping and the live teacher-adapters' actual raw question shapes
// (the same class of bug the manual live-verification pass this feature
// shipped with found: real getQuestions() output not matching the assumed
// camelCase/snake_case field names).
test('integration: real meter-master/texture-trainer/melody-master adapters produce a non-empty concept catalogue', () => {
  const { createAdapters } = require('../adapters');
  const adapters = createAdapters(PROJECT_ROOT);
  const byId = new Map(adapters.map((item) => [item.id, item]));

  CONCEPT_SCOPED_MODULE_IDS.forEach((moduleId) => {
    const realAdapter = byId.get(moduleId);
    assert.ok(realAdapter, `no registered adapter for ${moduleId}`);
    const catalogue = getConceptCatalogue(realAdapter, moduleId, PROJECT_ROOT);
    assert.ok(catalogue.length > 0, `${moduleId} produced no concepts from its real question bank`);
    catalogue.forEach((item) => {
      assert.ok(item.count > 0, `${moduleId}'s "${item.value}" concept has a non-positive count`);
      assert.ok(item.label, `${moduleId}'s "${item.value}" concept has no display label`);
    });
  });
});
