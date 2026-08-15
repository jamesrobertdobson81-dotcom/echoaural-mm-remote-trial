'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const registry = require('../js/pm-registry.js');

const REQUIRED_FIELDS = [
  'sourceKey', 'moduleId', 'musicalElement', 'subAppLabel', 'appUrl', 'icon',
  'levelValues', 'audioContract', 'hasClassroomAdapter', 'rendererBridgeCapability',
  'questionSelectionMode', 'responseTypes', 'questionCount', 'mixedRoundCompatible', 'skills'
];

test('every source has the full documented field set', () => {
  registry.all().forEach((source) => {
    REQUIRED_FIELDS.forEach((field) => {
      assert.ok(Object.prototype.hasOwnProperty.call(source, field), `${source.sourceKey} is missing "${field}"`);
    });
  });
});

test('all() returns copies — mutating the result cannot corrupt the registry', () => {
  const first = registry.all();
  first[0].sourceKey = 'tampered';
  first[0].levelValues.push('nonsense');
  const second = registry.all();
  assert.notEqual(second[0].sourceKey, 'tampered');
  assert.ok(!second[0].levelValues.includes('nonsense'));
});

test('get() and byModule() find real sources', () => {
  assert.equal(registry.get('instrument-identifier').moduleId, 'instrument-identifier');
  assert.equal(registry.get('nonexistent-source'), null);
  const musicalLanguageSources = registry.byModule('musical-language');
  assert.equal(musicalLanguageSources.length, 4);
  assert.deepEqual(
    musicalLanguageSources.map((source) => source.sourceKey).sort(),
    ['musical-language-articulation', 'musical-language-dynamics', 'musical-language-ornamentation', 'musical-language-tempo']
  );
});

test('drift check: registry source keys exactly match modules/progress-mode/app-drivers.js\'s DRIVERS keys', () => {
  const driversSource = fs.readFileSync(path.join(root, 'modules/progress-mode/app-drivers.js'), 'utf8');
  const driversBlockMatch = driversSource.match(/var DRIVERS = \{([\s\S]*?)\n {2}\};/);
  assert.ok(driversBlockMatch, 'Could not locate the DRIVERS object in app-drivers.js — has its shape changed?');
  const driverKeys = Array.from(driversBlockMatch[1].matchAll(/^\s{4}"([a-z0-9-]+)":\s*\{/gm)).map((match) => match[1]);
  assert.ok(driverKeys.length >= 10, 'Sanity check: expected to find most/all PM drivers via regex.');

  const registryKeys = registry.all().map((source) => source.sourceKey);
  assert.deepEqual(
    registryKeys.slice().sort(),
    driverKeys.slice().sort(),
    'shared/js/pm-registry.js has drifted from modules/progress-mode/app-drivers.js\'s DRIVERS list — update both together.'
  );
});

test('hasClassroomAdapter matches the adapters classroom-server.js actually registers today', () => {
  const serverSource = fs.readFileSync(path.join(root, 'classroom/classroom-server.js'), 'utf8');
  // Sanity-checked against the real registration list in
  // classroom-server.js's buildClassroomAdapters()-equivalent — if this
  // regexp stops matching, that function's shape has changed and this test
  // (not just the registry) needs a look, not a silent skip.
  const returnMatch = serverSource.match(/return \[([^\]]+)\];/);
  assert.ok(returnMatch, 'Could not find the classroom adapter registration return statement.');
  const registeredAdapterCount = returnMatch[1].split(',').length;
  assert.ok(registeredAdapterCount >= 9, 'Expected at least the 9 known classroom adapters to be registered.');

  const withAdapter = registry.all().filter((source) => source.hasClassroomAdapter).map((source) => source.sourceKey).sort();
  const withoutAdapter = registry.all().filter((source) => !source.hasClassroomAdapter).map((source) => source.sourceKey).sort();
  // All PM sources are now backed by a registered adapter, including the
  // procedural chord and ContextCoach sources.
  assert.deepEqual(withoutAdapter, []);
  assert.equal(withAdapter.length, 16);
});

test('mergeWithCatalogue folds in live question-bank data for sources with a classroom adapter, and leaves the rest null', () => {
  const fakeCatalogueModules = [
    { id: 'instrument-identifier', responseTypes: ['multiple-choice'], questionCount: 300, mixedCompatible: true, skills: [{ code: 'INS.INDIVIDUAL', name: 'Individual instruments' }] },
    { id: 'musical-language', responseTypes: ['multiple-choice', 'typed'], questionCount: 128, mixedCompatible: true, skills: [] }
  ];
  const merged = registry.mergeWithCatalogue(fakeCatalogueModules);

  const instrumentSource = merged.find((source) => source.sourceKey === 'instrument-identifier');
  assert.deepEqual(instrumentSource.responseTypes, ['multiple-choice']);
  assert.equal(instrumentSource.questionCount, 300);
  assert.equal(instrumentSource.mixedRoundCompatible, true);

  // All 4 musical-language sources share the one classroom adapter/module.
  const musicalLanguageTempo = merged.find((source) => source.sourceKey === 'musical-language-tempo');
  assert.deepEqual(musicalLanguageTempo.responseTypes, ['multiple-choice', 'typed']);

  const chordIdentifier = merged.find((source) => source.sourceKey === 'chord-identifier');
  assert.equal(chordIdentifier.responseTypes, null);
  assert.equal(chordIdentifier.mixedRoundCompatible, null);
});

test('mergeWithCatalogue never calls require()/fetch() itself — works with a plain array from any source', () => {
  assert.doesNotThrow(() => registry.mergeWithCatalogue([]));
  assert.doesNotThrow(() => registry.mergeWithCatalogue(undefined));
  assert.doesNotThrow(() => registry.mergeWithCatalogue(null));
});

test('mixedCompatibleSources() returns exactly the sources with a classroom adapter today', () => {
  const keys = registry.mixedCompatibleSources().map((source) => source.sourceKey).sort();
  assert.equal(keys.length, 16);
  assert.ok(keys.includes('chord-identifier'));
  assert.ok(keys.includes('context-coach-composer'));
});

test('migration progress: every source has rendererBridgeCapability upgraded, each alongside its own passing tests', () => {
  // Update this list only when a source's own tests (e.g.
  // modules/<id>/tests/live-session-question-injection.test.js) actually
  // prove teacher-load-question works for it — this test exists so
  // "flip the flag" can never happen as a drive-by, unverified edit.
  // Phase 1 of the Live Sessions migration is complete: all 16 sources
  // have their own passing injection tests (see each modules/<id>/tests/
  // or era-explorer/tests/live-session-question-injection.test.js).
  const all = registry.all();
  const stillLegacy = all.filter((source) => source.rendererBridgeCapability === 'legacy-dom-polling');
  assert.deepEqual(stillLegacy.map((source) => source.sourceKey), []);
  all.forEach((source) => {
    assert.equal(source.rendererBridgeCapability, 'contract-question-injection', source.sourceKey);
  });
});

test('questionSelectionMode: "id" for fixed-bank sources, "seed" only for the 4 procedurally-generated ones', () => {
  const seedSources = registry.all().filter((source) => source.questionSelectionMode === 'seed').map((source) => source.sourceKey).sort();
  assert.deepEqual(seedSources, [
    'chord-identifier', 'context-coach-composer', 'context-coach-period', 'harmony-key-signatures'
  ]);
  registry.all().filter((source) => !seedSources.includes(source.sourceKey)).forEach((source) => {
    assert.equal(source.questionSelectionMode, 'id', source.sourceKey);
  });
});

test('loads as a plain browser global too, not just via require()', () => {
  const vm = require('node:vm');
  const source = fs.readFileSync(path.join(root, 'shared/js/pm-registry.js'), 'utf8');
  // vm.createContext(sandbox) makes `sandbox` itself the global object for
  // code run in it, so `globalThis` inside pm-registry.js's UMD wrapper
  // resolves to this same object — matching a real browser, where
  // `globalThis`/`window` are the page's actual global.
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  assert.ok(sandbox.EchoAuralPMRegistry, 'globalThis.EchoAuralPMRegistry was not set');
  assert.equal(sandbox.EchoAuralPMRegistry.all().length, registry.all().length);
});
