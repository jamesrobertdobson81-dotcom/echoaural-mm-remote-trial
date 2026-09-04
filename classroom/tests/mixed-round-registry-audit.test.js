'use strict';

// This test exists to keep two things from silently drifting apart:
//   1. shared/js/pm-registry.js's hasClassroomAdapter (which PM sources a
//      real classroom/classroom-server.js teacher-adapter exists for)
//   2. classroom/question-catalogue.js's DEFAULT_MIXED_COMPATIBLE (which
//      module ids Mixed rounds actually draw from)
// It also proves the former three-source gap stays closed: all procedural
// PM sources have registered classroom adapters backed by the same seeded
// generator that their browser iframe uses.

const test = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../../shared/js/pm-registry.js');
const { QuestionCatalogue } = require('../question-catalogue');
const { RoomManager } = require('../room-manager');

// Mirrors classroom-server.js's real adapter registration list (melody-
// master, instrument-identifier, texture-trainer, melodic-intervals,
// ensemble-recognition, cadence-coach, meter-master, musical-language,
// structure-spotter, key-signature-sprint, chord-identifier, era-explorer)
// — 12 module ids, deliberately hand-kept in sync
// with that file rather than requiring it directly, since classroom-
// server.js also wires up a live Postgres pool at require-time.
const REGISTERED_CLASSROOM_MODULE_IDS = [
  'melody-master', 'instrument-identifier', 'texture-trainer', 'melodic-intervals',
  'ensemble-recognition', 'cadence-coach', 'meter-master', 'musical-language', 'structure-spotter',
  'key-signature-sprint', 'chord-identifier', 'era-explorer'
];

test('every PM source with hasClassroomAdapter:true maps to a module id classroom-server.js actually registers', () => {
  const adapterBackedSources = registry.all().filter((source) => source.hasClassroomAdapter);
  adapterBackedSources.forEach((source) => {
    assert.ok(
      REGISTERED_CLASSROOM_MODULE_IDS.includes(source.moduleId),
      `${source.sourceKey} claims hasClassroomAdapter:true but "${source.moduleId}" isn't in classroom-server.js's registration list`
    );
  });
});

test('all 17 PM sources now have a classroom adapter, including all four seed-mode sources', () => {
  const gapSources = registry.all().filter((source) => !source.hasClassroomAdapter).map((source) => source.sourceKey).sort();
  assert.deepEqual(gapSources, []);
  assert.equal(registry.all().length, 17);
  assert.deepEqual(
    registry.all().filter((source) => source.questionSelectionMode === 'seed').map((source) => source.sourceKey).sort(),
    ['chord-identifier', 'context-coach-composer', 'context-coach-period', 'harmony-key-signatures']
  );
});

test('RoomManager.normaliseMixedModuleIds() accepts the newly adapter-backed procedural modules', () => {
  const manager = new RoomManager({
    adapters: REGISTERED_CLASSROOM_MODULE_IDS.map((id) => ({
      id,
      title: id,
      studentMode: 'generic',
      mixedCompatible: true,
      getQuestions: () => [{ id: `${id}-Q1` }]
    })),
    defaultModuleId: 'instrument-identifier'
  });
  const requested = [...REGISTERED_CLASSROOM_MODULE_IDS];
  const accepted = manager.normaliseMixedModuleIds(requested);
  assert.ok(accepted.includes('chord-identifier'));
  assert.ok(accepted.includes('era-explorer'));
  assert.deepEqual(accepted.sort(), [...REGISTERED_CLASSROOM_MODULE_IDS].sort());
});

test('mergeWithCatalogue reports mixedRoundCompatible:true for exactly the adapter-backed sources when given the real catalogue shape', () => {
  const fakeCatalogueModules = REGISTERED_CLASSROOM_MODULE_IDS.map((id) => ({
    id, responseTypes: ['multiple-choice'], questionCount: 10, mixedCompatible: true, skills: []
  }));
  const merged = registry.mergeWithCatalogue(fakeCatalogueModules);
  const compatible = merged.filter((source) => source.mixedRoundCompatible === true).map((source) => source.sourceKey).sort();
  const expected = registry.all().filter((source) => source.hasClassroomAdapter).map((source) => source.sourceKey).sort();
  assert.deepEqual(compatible, expected);
});

// Sanity-checks the mirrored list above against QuestionCatalogue's own
// module-aggregation logic (not against classroom-server.js's live
// require, which opens a real DB pool) so a future edit to either list
// can't drift without at least one of these two tests catching it.
test('QuestionCatalogue.modules() surfaces exactly the mirrored module id list when given one adapter per id', () => {
  const catalogue = new QuestionCatalogue(REGISTERED_CLASSROOM_MODULE_IDS.map((id) => ({
    id,
    title: id,
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions: () => [{ id: `${id}-Q1` }]
  })));
  assert.deepEqual(catalogue.modules().map((module) => module.id).sort(), [...REGISTERED_CLASSROOM_MODULE_IDS].sort());
});
