/**
 * Chord Identifier — data/chords.js
 *
 * Diatonic chord tables: which scale degree each roman numeral is built on,
 * its quality, and (for minor keys) whether it uses the raised leading tone
 * of harmonic minor. These tables are the music-theory ground truth — the
 * chord engine reads them, it does not re-derive them.
 *
 * Degrees are 1-7 (scale degree the chord ROOT sits on). `raisedLeadingTone`
 * means: wherever scale-degree-7 appears among this chord's tones (root,
 * 3rd, 5th or 7th), raise it one semitone above what the key signature
 * alone implies. This reproduces standard harmonic-minor practice: V, V7,
 * vii° and vii°7 use the raised leading tone; i, ii°, III, iv and VI do not
 * (even III, which contains the natural scale-degree-7 as its own 5th).
 */
(function (root) {
  'use strict';

  // quality -> diatonic-third stack (in scale-degree steps above the root,
  // 1-based/absolute so they also encode octave-wrapping) plus the semitone
  // content used only for reference/testing, not for pitch construction
  // (pitch construction always goes through the key's own spelled scale).
  var QUALITY_DEGREE_STACK = {
    major: [1, 3, 5],
    minor: [1, 3, 5],
    diminished: [1, 3, 5],
    sus2: [1, 2, 5],
    sus4: [1, 4, 5],
    dominant7: [1, 3, 5, 7],
    major7: [1, 3, 5, 7],
    dominant9: [1, 3, 5, 7, 9],
    major9: [1, 3, 5, 7, 9],
    minor9: [1, 3, 5, 7, 9]
  };

  var MAJOR_TRIADS = [
    { degree: 1, roman: 'I', quality: 'major', category: 'primary' },
    { degree: 2, roman: 'ii', quality: 'minor', category: 'secondary' },
    { degree: 3, roman: 'iii', quality: 'minor', category: 'secondary' },
    { degree: 4, roman: 'IV', quality: 'major', category: 'primary' },
    { degree: 5, roman: 'V', quality: 'major', category: 'primary' },
    { degree: 6, roman: 'vi', quality: 'minor', category: 'secondary' },
    { degree: 7, roman: 'vii°', quality: 'diminished', category: 'secondary' }
  ];

  var MINOR_TRIADS = [
    { degree: 1, roman: 'i', quality: 'minor', category: 'primary', raisedLeadingTone: false },
    { degree: 2, roman: 'ii°', quality: 'diminished', category: 'secondary', raisedLeadingTone: false },
    { degree: 3, roman: 'III', quality: 'major', category: 'secondary', raisedLeadingTone: false },
    { degree: 4, roman: 'iv', quality: 'minor', category: 'primary', raisedLeadingTone: false },
    { degree: 5, roman: 'V', quality: 'major', category: 'primary', raisedLeadingTone: true },
    { degree: 6, roman: 'VI', quality: 'major', category: 'secondary', raisedLeadingTone: false },
    { degree: 7, roman: 'vii°', quality: 'diminished', category: 'secondary', raisedLeadingTone: true }
  ];

  // Seventh chords, gated by `minDifficulty` so Securing and Mastering pull
  // from genuinely different pools rather than just denser voicing of the
  // same chords. Trimmed to GCSE-relevant vocabulary only: half-diminished
  // and fully-diminished 7ths are advanced/jazz-theory chords rarely named
  // explicitly on a GCSE spec, so they've been removed — V7 (the dominant
  // seventh) is by far the most commonly examined 7th chord and is the only
  // one Securing needs.
  var MAJOR_SEVENTHS = [
    { degree: 5, roman: 'V7', quality: 'dominant7', category: 'seventh', minDifficulty: 'securing' }
  ];

  var MINOR_SEVENTHS = [
    { degree: 5, roman: 'V7', quality: 'dominant7', category: 'seventh', raisedLeadingTone: true, minDifficulty: 'securing' }
  ];

  // Mastering-only "extended" chords — the hardest tier, deliberately gated
  // one step beyond sevenths so a student can never meet one before they've
  // met every plain seventh first. Kept to a GCSE-relevant set: the tonic
  // major 7th, 9th chords (dominant/major/minor), and suspended 2nd/4th
  // chords — all built by stacking (or, for sus chords, substituting) one
  // more diatonic step on top of the existing triad/seventh tables, so no
  // new spelling rules are needed. Chromatically-altered dominants (♭5/♯5/
  // ♭9/♯9) were removed — that's jazz-harmony vocabulary, not GCSE content.
  var MAJOR_EXTENDED = [
    { degree: 5, roman: 'V9', quality: 'dominant9', category: 'extended', minDifficulty: 'mastering' },
    { degree: 1, roman: 'Imaj9', quality: 'major9', category: 'extended', minDifficulty: 'mastering' },
    { degree: 1, roman: 'Imaj7', quality: 'major7', category: 'extended', minDifficulty: 'mastering' },
    { degree: 1, roman: 'Isus2', quality: 'sus2', category: 'extended', minDifficulty: 'mastering' },
    { degree: 1, roman: 'Isus4', quality: 'sus4', category: 'extended', minDifficulty: 'mastering' }
  ];

  var MINOR_EXTENDED = [
    { degree: 5, roman: 'V9', quality: 'dominant9', category: 'extended', raisedLeadingTone: true, minDifficulty: 'mastering' },
    { degree: 1, roman: 'i9', quality: 'minor9', category: 'extended', raisedLeadingTone: false, minDifficulty: 'mastering' },
    { degree: 1, roman: 'isus2', quality: 'sus2', category: 'extended', minDifficulty: 'mastering' },
    { degree: 1, roman: 'isus4', quality: 'sus4', category: 'extended', minDifficulty: 'mastering' }
  ];

  function triadsForMode(mode) {
    return (mode === 'minor' ? MINOR_TRIADS : MAJOR_TRIADS).map(function (c) { return Object.assign({}, c); });
  }

  function seventhsForMode(mode) {
    return (mode === 'minor' ? MINOR_SEVENTHS : MAJOR_SEVENTHS).map(function (c) { return Object.assign({}, c); });
  }

  function extendedForMode(mode) {
    return (mode === 'minor' ? MINOR_EXTENDED : MAJOR_EXTENDED).map(function (c) { return Object.assign({}, c); });
  }

  function diatonicChordsForMode(mode, includeSevenths) {
    var chords = triadsForMode(mode);
    if (includeSevenths) chords = chords.concat(seventhsForMode(mode), extendedForMode(mode));
    return chords;
  }

  root.EAChordChords = {
    QUALITY_DEGREE_STACK: QUALITY_DEGREE_STACK,
    MAJOR_TRIADS: MAJOR_TRIADS,
    MINOR_TRIADS: MINOR_TRIADS,
    MAJOR_SEVENTHS: MAJOR_SEVENTHS,
    MINOR_SEVENTHS: MINOR_SEVENTHS,
    MAJOR_EXTENDED: MAJOR_EXTENDED,
    MINOR_EXTENDED: MINOR_EXTENDED,
    triadsForMode: triadsForMode,
    seventhsForMode: seventhsForMode,
    extendedForMode: extendedForMode,
    diatonicChordsForMode: diatonicChordsForMode
  };
})(typeof window !== 'undefined' ? window : globalThis);
