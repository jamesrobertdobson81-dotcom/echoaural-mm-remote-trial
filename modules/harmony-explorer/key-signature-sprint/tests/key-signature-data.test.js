const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../key-signature-data.js');

test('covers zero through seven sharps and flats with both clefs', () => {
  assert.equal(data.SIGNATURES.length, 15);
  assert.equal(data.SIGNATURES.find((item) => item.id === 'sharp-7').major, 'C♯');
  assert.equal(data.SIGNATURES.find((item) => item.id === 'flat-7').minor, 'A♭');
  assert.deepEqual(data.SIGNATURES[0].supportedClefs, ['treble', 'bass']);
});

test('normalises conventional sharp and flat answer forms', () => {
  assert.equal(data.acceptable('f# maj', 'F♯ major', 'major'), true);
  assert.equal(data.acceptable('B-flat minor', 'B♭ minor', 'minor'), true);
  assert.equal(data.acceptable('g flat major', 'F♯ major', 'major'), false);
  assert.equal(data.acceptable('E major / C# minor', 'E major|C♯ minor', 'pair'), true);
});

test('difficulty pools honour accidental limits', () => {
  assert.ok(data.pool(2, 'all').every((item) => item.count <= 2));
  assert.ok(data.pool(7, 'sharp').every((item) => item.type === 'sharp' || item.type === 'natural'));
});
