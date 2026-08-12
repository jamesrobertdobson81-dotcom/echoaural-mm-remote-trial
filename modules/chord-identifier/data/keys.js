/**
 * Chord Identifier — data/keys.js
 *
 * Key-signature data for every supported major key (0-4 sharps/flats) and
 * its relative minor. Built programmatically from the standard sharp/flat
 * accidental orders so there is exactly one place that can get this wrong.
 *
 * Each key's `staveAsset` points at the grand-stave PNG (treble + bass +
 * brace + key signature already engraved) that the notation engine draws
 * as the background for every question in that key.
 */
(function (root) {
  'use strict';

  var SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  var FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  function buildAccidentalMap(count, type) {
    var order = type === 'sharp' ? SHARP_ORDER : FLAT_ORDER;
    var map = {};
    for (var i = 0; i < count; i++) map[order[i]] = type === 'sharp' ? 1 : -1;
    return map;
  }

  function scaleLettersFrom(tonicLetter) {
    var startIndex = LETTERS.indexOf(tonicLetter);
    var out = [];
    for (var i = 0; i < 7; i++) out.push(LETTERS[(startIndex + i) % 7]);
    return out;
  }

  // The 9 major keys this app supports (matches the 9 supplied grand-stave PNGs).
  var MAJOR_DEFS = [
    { tonicLetter: 'C', accidentalCount: 0, accidentalType: null, staveAsset: 'c-major.png' },
    { tonicLetter: 'G', accidentalCount: 1, accidentalType: 'sharp', staveAsset: 'g-major.png' },
    { tonicLetter: 'D', accidentalCount: 2, accidentalType: 'sharp', staveAsset: 'd-major.png' },
    { tonicLetter: 'A', accidentalCount: 3, accidentalType: 'sharp', staveAsset: 'a-major.png' },
    { tonicLetter: 'E', accidentalCount: 4, accidentalType: 'sharp', staveAsset: 'e-major.png' },
    { tonicLetter: 'F', accidentalCount: 1, accidentalType: 'flat', staveAsset: 'f-major.png' },
    { tonicLetter: 'B', accidentalCount: 2, accidentalType: 'flat', staveAsset: 'b-flat-major.png' },
    { tonicLetter: 'E', accidentalCount: 3, accidentalType: 'flat', staveAsset: 'e-flat-major.png' },
    { tonicLetter: 'A', accidentalCount: 4, accidentalType: 'flat', staveAsset: 'a-flat-major.png' }
  ];

  var KEYS = {};
  var MAJOR_KEY_IDS = [];
  var MINOR_KEY_IDS = [];

  MAJOR_DEFS.forEach(function (def) {
    var accidentalMap = buildAccidentalMap(def.accidentalCount, def.accidentalType);
    var scaleLetters = scaleLettersFrom(def.tonicLetter);
    var tonicAccidental = accidentalMap[def.tonicLetter] || 0;
    var tonicLabel = def.tonicLetter + (tonicAccidental > 0 ? '♯' : tonicAccidental < 0 ? '♭' : '');
    var majorId = (tonicLabel.replace('♯', 's').replace('♭', 'b') + '-major').toLowerCase();

    // Relative minor: scale degree 6 of the major scale, same key signature.
    var minorTonicLetter = scaleLetters[5];
    var minorAccidental = accidentalMap[minorTonicLetter] || 0;
    var minorTonicLabel = minorTonicLetter + (minorAccidental > 0 ? '♯' : minorAccidental < 0 ? '♭' : '');
    var minorId = (minorTonicLabel.replace('♯', 's').replace('♭', 'b') + '-minor').toLowerCase();

    KEYS[majorId] = {
      id: majorId,
      tonic: def.tonicLetter,
      tonicAccidental: tonicAccidental,
      tonicLabel: tonicLabel,
      mode: 'major',
      accidentalCount: def.accidentalCount,
      accidentalType: def.accidentalType,
      accidentalMap: accidentalMap,
      scaleLetters: scaleLetters,
      staveAsset: def.staveAsset,
      relativeKeyId: minorId,
      label: tonicLabel + ' major'
    };

    KEYS[minorId] = {
      id: minorId,
      tonic: minorTonicLetter,
      tonicAccidental: minorAccidental,
      tonicLabel: minorTonicLabel,
      mode: 'minor',
      accidentalCount: def.accidentalCount,
      accidentalType: def.accidentalType,
      accidentalMap: accidentalMap,
      scaleLetters: scaleLettersFrom(minorTonicLetter),
      staveAsset: def.staveAsset,
      relativeKeyId: majorId,
      label: minorTonicLabel + ' minor'
    };

    MAJOR_KEY_IDS.push(majorId);
    MINOR_KEY_IDS.push(minorId);
  });

  /**
   * Difficulty pools — which key ids are in play at each level.
   * Foundation deliberately stays inside 2 sharps/flats (section 15).
   * Securing and Mastering must NOT share an identical pool — each step up
   * drops the easiest key(s) so a plain 0-accidental (C major/A minor) chord
   * can never appear once a student is working at Securing or above, and a
   * 1-accidental (G major/E minor) chord can never appear at Mastering.
   */
  var EASIEST_MAJOR_MINOR_PAIRS = [
    ['c-major', 'a-minor'], // 0 accidentals
    ['g-major', 'e-minor']  // 1 accidental
  ];

  function poolExcluding(pairIndexesToDrop) {
    var dropIds = pairIndexesToDrop.reduce(function (ids, i) { return ids.concat(EASIEST_MAJOR_MINOR_PAIRS[i]); }, []);
    return MAJOR_KEY_IDS.concat(MINOR_KEY_IDS).filter(function (id) { return dropIds.indexOf(id) === -1; });
  }

  var KEY_POOLS = {
    foundation: ['c-major', 'g-major', 'd-major', 'f-major', 'bb-major'],
    developing: MAJOR_KEY_IDS.slice(),
    securing: poolExcluding([0]),    // drop C major/A minor — 1+ accidentals only
    mastering: poolExcluding([0, 1]) // drop C/G major, A/E minor — 2+ accidentals only
  };

  /**
   * "Favoured" sub-pools for Developing and Securing: keys with 2+
   * accidentals, so the engine can weight selection toward them without
   * excluding the easier keys outright (the user asked to "favour", not
   * forbid, so a 1-accidental key can still turn up occasionally).
   */
  var FAVOURED_KEY_POOLS = {
    developing: MAJOR_KEY_IDS.filter(function (id) { return KEYS[id].accidentalCount >= 2; }),
    securing: KEY_POOLS.securing.filter(function (id) { return KEYS[id].accidentalCount >= 2; })
  };

  function findKey(id) {
    var key = KEYS[id];
    if (!key) throw new Error('Unknown key id: ' + id);
    return key;
  }

  root.EAChordKeys = {
    KEYS: KEYS,
    MAJOR_KEY_IDS: MAJOR_KEY_IDS,
    MINOR_KEY_IDS: MINOR_KEY_IDS,
    FAVOURED_KEY_POOLS: FAVOURED_KEY_POOLS,
    KEY_POOLS: KEY_POOLS,
    findKey: findKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
