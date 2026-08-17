'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const CE = require('../js/concept-extractors.js');

test('extractConceptValues: chord-identifier pools inversion and extension tier from one answer', () => {
  const values = CE.extractConceptValues('chord-identifier', { inversionLabel: 'first inversion', quality: 'dominant9' });
  assert.deepEqual(values, ['first inversion', 'Extended chords']);
});

test('extractConceptValues: chord-identifier pools recognitionType, category and keyMode alongside the existing dimensions', () => {
  const values = CE.extractConceptValues('chord-identifier', {
    inversionLabel: 'root position', quality: 'major',
    recognitionType: 'roman', category: 'primary', keyMode: 'major'
  });
  assert.deepEqual(values, ['root position', 'Triads', 'Roman numeral analysis', 'Primary chords', 'Major keys']);
});

test('extractConceptValues: chord-identifier recognitionType only fires for roman — name/inversion add nothing (avoids duplicating inversionLabel)', () => {
  assert.deepEqual(CE.extractConceptValues('chord-identifier', { recognitionType: 'name' }), []);
  assert.deepEqual(CE.extractConceptValues('chord-identifier', { recognitionType: 'inversion' }), []);
});

test('extractConceptValues: chord-identifier category only fires for primary/secondary — seventh/extended are deliberately left to the quality-tier bucket', () => {
  assert.deepEqual(CE.extractConceptValues('chord-identifier', { category: 'seventh' }), []);
  assert.deepEqual(CE.extractConceptValues('chord-identifier', { category: 'extended' }), []);
  // Confirms no double-count risk: a real major7 chord (quality-tier ->
  // "Seventh chords") tagged category:'extended' still only ever produces
  // ONE "Seventh chords" value, never both "Seventh chords" and "Extended
  // chords" for the same answer.
  assert.deepEqual(CE.extractConceptValues('chord-identifier', { quality: 'major7', category: 'extended' }), ['Seventh chords']);
});

test('extractConceptValues: instrument-identifier matches family case-insensitively and remaps display casing', () => {
  const values = CE.extractConceptValues('instrument-identifier', { family: 'BRASS', type: 'Solo' });
  // `responseType` is absent here, which itself is meaningful (no missing-
  // field ambiguity) — an undefined/empty responseType always means
  // standard multiple-choice, so this dimension fires on every answer,
  // unlike the whitelist-based family/type/instrument dimensions above it.
  assert.deepEqual(values, ['Brass', 'Solo', 'Standard multiple-choice instrument answers']);
});

test('extractConceptValues: instrument-identifier family and type never collide on the shared World/Ensemble value', () => {
  const values = CE.extractConceptValues('instrument-identifier', { family: 'World/Ensemble', type: 'World/Ensemble' });
  // `type`'s whitelist deliberately excludes "World/Ensemble" (see the
  // constant's own comment) — only `family` can ever contribute it, so a
  // single answer never double-counts the same string into one flat pool.
  assert.deepEqual(values, ['World/Ensemble', 'Standard multiple-choice instrument answers']);
});

test('extractConceptValues: instrument-identifier drops genre/context noise not in the whitelist', () => {
  const values = CE.extractConceptValues('instrument-identifier', { family: 'Deep House', type: 'Boss Battle' });
  assert.deepEqual(values, ['Standard multiple-choice instrument answers']);
});

test('extractConceptValues: instrument-identifier matches instrument case-insensitively and remaps display casing', () => {
  const values = CE.extractConceptValues('instrument-identifier', { instrument: 'VIOLIN', responseType: 'typed' });
  assert.deepEqual(values, ['Violin', 'Typed instrument answers']);
});

test('extractConceptValues: instrument-identifier drops "Tenor" (a voice-range answer, not a real instrument) and other non-instrument text', () => {
  assert.deepEqual(CE.extractConceptValues('instrument-identifier', { instrument: 'Tenor' }), ['Standard multiple-choice instrument answers']);
  assert.deepEqual(CE.extractConceptValues('instrument-identifier', { instrument: 'Congas and timbales (accept bongos, cowbell, güiro, maracas, claves)' }), ['Standard multiple-choice instrument answers']);
});

test('extractConceptValues: instrument-identifier excludes harpsichord from the instrument whitelist to avoid double-counting the existing type:"Harpsichord" dimension', () => {
  // All real harpsichord clips carry both instrument:"HARPSICHORD" and
  // type:"Harpsichord" — including "harpsichord" in both whitelists would
  // push the identical concept-value string into the pool twice for one
  // answer, double-counting that answer's `.questions` tally.
  const values = CE.extractConceptValues('instrument-identifier', { instrument: 'HARPSICHORD', type: 'Harpsichord' });
  assert.deepEqual(values, ['Harpsichord', 'Standard multiple-choice instrument answers']);
});

test('extractConceptValues: instrument-identifier responseType covers mc-custom and always fires (empty means standard MC)', () => {
  assert.deepEqual(CE.extractConceptValues('instrument-identifier', { responseType: 'mc-custom' }), ['Custom-choice instrument answers']);
  assert.deepEqual(CE.extractConceptValues('instrument-identifier', {}), ['Standard multiple-choice instrument answers']);
});

test('extractConceptValues: key-signature-sprint buckets accidentalCount alongside accidentalType', () => {
  const values = CE.extractConceptValues('key-signature-sprint', { accidentalType: 'sharp', accidentalCount: 5 });
  assert.deepEqual(values, ['sharp', 'Many accidentals (5-7)']);
});

test('extractConceptValues: key-signature-sprint pools type and clef alongside the existing dimensions', () => {
  const values = CE.extractConceptValues('key-signature-sprint', {
    accidentalType: 'flat', accidentalCount: 2, type: 'relative', clef: 'bass'
  });
  assert.deepEqual(values, ['flat', 'Few accidentals (0-2)', 'relative', 'bass']);
});

test('extractConceptValues: key-signature-sprint drops an unrecognized type/clef value', () => {
  assert.deepEqual(CE.extractConceptValues('key-signature-sprint', { type: 'harmonic', clef: 'alto' }), []);
});

test('extractConceptValues: meter-master whitelist drops junk values and derives simple/compound tier', () => {
  const clean = CE.extractConceptValues('meter-master', { metreFamily: 'Compound duple' });
  assert.deepEqual(clean, ['Compound duple', 'Compound time']);
  const junk = CE.extractConceptValues('meter-master', { metreFamily: 'Not confirmed' });
  assert.deepEqual(junk, []);
});

test('extractConceptValues: meter-master now recognises "Compound triple" (previously a whitelist gap despite the bucket function already handling it)', () => {
  assert.deepEqual(CE.extractConceptValues('meter-master', { metreFamily: 'Compound triple' }), ['Compound triple', 'Compound time']);
});

test('extractConceptValues: meter-master pools mode, requiresScore and timeSignature alongside the existing dimensions', () => {
  const values = CE.extractConceptValues('meter-master', {
    metreFamily: 'Simple triple', mode: 'Aural classification', requiresScore: true, timeSignature: '6/8'
  });
  assert.deepEqual(values, ['Simple triple', 'Simple time', 'Aural classification', 'Score-reading questions', '6/8']);
});

test('extractConceptValues: meter-master only whitelists the 5 well-sampled question modes, not the sparse long tail', () => {
  assert.deepEqual(CE.extractConceptValues('meter-master', { mode: 'Regularity' }), []);
  assert.deepEqual(CE.extractConceptValues('meter-master', { mode: 'Notation vocabulary' }), []);
});

test('extractConceptValues: meter-master requiresScore accepts both real booleans and their string form', () => {
  assert.deepEqual(CE.extractConceptValues('meter-master', { requiresScore: false }), ['Listening-only questions']);
  assert.deepEqual(CE.extractConceptValues('meter-master', { requiresScore: 'true' }), ['Score-reading questions']);
});

test('extractConceptValues: texture-trainer excludes transition/compound textureFocus values', () => {
  const clean = CE.extractConceptValues('texture-trainer', { textureFocus: 'Polyphonic' });
  assert.deepEqual(clean, ['Polyphonic']);
  const transition = CE.extractConceptValues('texture-trainer', { textureFocus: 'Monophonic → fugal polyphony' });
  assert.deepEqual(transition, []);
});

test('extractConceptValues: texture-trainer prefers a whitelisted textureFocus over specificTextureTerm when both are present', () => {
  const values = CE.extractConceptValues('texture-trainer', { textureFocus: 'Fugal polyphony', specificTextureTerm: 'Polyphonic' });
  assert.deepEqual(values, ['Fugal polyphony']);
});

test('extractConceptValues: texture-trainer falls back to specificTextureTerm when textureFocus is present but not whitelistable', () => {
  // Real data: "Homophonic texture" (and similar author-supplied variants)
  // are non-empty but don't match the whitelist — a naive `||` fallback
  // would stop here and never reach the reliable field.
  const values = CE.extractConceptValues('texture-trainer', { textureFocus: 'Homophonic texture', specificTextureTerm: 'Chordal homophony' });
  assert.deepEqual(values, ['Chordal homophony']);
});

test('extractConceptValues: texture-trainer produces nothing for a multi-stage "texture change" question, even when only `target` (not textureFocus) carries the arrow', () => {
  // Regression case for a real leak found during implementation: a
  // multi-stage question can omit `textureFocus` entirely, relying only on
  // `target`. specificTextureTerm's own inference reads `target` as part
  // of its keyword-matching fallback and can silently resolve to ONE side
  // of the transition (e.g. "Fugal imitation" for a real
  // "Monophonic → fugal polyphony" question) — checking `target` for the
  // arrow closes that leak.
  const values = CE.extractConceptValues('texture-trainer', {
    target: 'Monophonic → fugal polyphony',
    textureFocus: undefined,
    specificTextureTerm: 'Fugal imitation'
  });
  assert.deepEqual(values, []);
});

test('extractConceptValues: texture-trainer new specificTextureTerm-only vocabulary is recognised', () => {
  const values = CE.extractConceptValues('texture-trainer', { specificTextureTerm: 'Antiphonal', responseType: 'short-text' });
  assert.deepEqual(values, ['Antiphonal', 'short-text']);
});

test('extractConceptValues: modules with no extractor configured produce no values', () => {
  assert.deepEqual(CE.extractConceptValues('melody-master', { anything: 'here' }), []);
});

test('extractConceptValues: missing/empty fields object yields no values, never throws', () => {
  assert.deepEqual(CE.extractConceptValues('chord-identifier', {}), []);
  assert.deepEqual(CE.extractConceptValues('chord-identifier', null), []);
  assert.deepEqual(CE.extractConceptValues('chord-identifier', undefined), []);
});

test('loads as a plain browser global too, not just via require()', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const path = require('node:path');
  // Matches the UMD wrapper's own globalThis-first resolution (see
  // shared/tests/pm-registry.test.js's identical test for the same reason):
  // vm.createContext(sandbox) makes `sandbox` itself the global object for
  // code run in it, so `globalThis` inside the wrapper resolves to it.
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'concept-extractors.js'), 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  assert.ok(sandbox.EchoAuralConceptExtractors, 'globalThis.EchoAuralConceptExtractors was not set');
  // A vm-sandboxed Array isn't reference-equal (different realm) to a
  // same-process Array even with identical contents — same cross-realm
  // quirk pm-registry.test.js's equivalent test avoids by only comparing a
  // primitive. JSON round-tripping here sidesteps it for an array of
  // strings.
  const values = sandbox.EchoAuralConceptExtractors.extractConceptValues('chord-identifier', { inversionLabel: 'root position' });
  assert.deepEqual(JSON.parse(JSON.stringify(values)), ['root position']);
});
