/**
 * Chord Identifier — pitch-utils.js
 *
 * Low-level, UI-agnostic music-theory primitives shared by every other
 * engine in this app (chord generation, notation rendering, audio).
 *
 * A "pitch" everywhere in this app is either:
 *   - a string like "C4", "F#4", "Bb3", "C##5", "Gbb2"
 *   - or a parsed object { letter, accidental, octave }
 *       letter:     'C'..'B'
 *       accidental: integer semitone offset, e.g. -1 = flat, 1 = sharp, 0 = natural
 *       octave:     scientific pitch notation octave (C4 = middle C)
 *
 * Pitch spelling is significant: F#4 and Gb4 sound identical (midi 66) but
 * are DIFFERENT pitches for notation purposes (different staff position,
 * different letter). Never collapse spelling to a single "sharps only" model.
 */
(function (root) {
  'use strict';

  // Diatonic letter order and index (used for STAFF POSITION / diatonic steps).
  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  // Chromatic semitone offset of each natural letter from C (used for MIDI/pitch).
  var LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  var ACCIDENTAL_TOKENS = {
    '#': 1, '♯': 1, 's': 1, 'x': 2, '𝄪': 2,
    'b': -1, '♭': -1, 'f': -1,
    'n': 0, '♮': 0
  };

  var ACCIDENTAL_SYMBOL = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
  var ACCIDENTAL_ASCII = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': 'x' };

  /**
   * Parse a pitch string such as "F#4" or "Bb3" into { letter, accidental, octave }.
   * Accepts unicode (♯ ♭ 𝄪 𝄫) or ASCII (# b x) accidentals.
   */
  function parsePitch(input) {
    if (input && typeof input === 'object' && 'letter' in input) return input;
    var str = String(input || '').trim();
    var m = str.match(/^([A-Ga-g])([#♯bb♭𝄪𝄫xn♮]*)(-?\d+)$/);
    if (!m) throw new Error('Cannot parse pitch: "' + input + '"');
    var letter = m[1].toUpperCase();
    var accToken = m[2] || '';
    var octave = parseInt(m[3], 10);
    var accidental = 0;
    // Support stacked single-char tokens like "##" or "bb" as well as "x"/"n".
    for (var i = 0; i < accToken.length; i++) {
      var ch = accToken[i];
      if (ACCIDENTAL_TOKENS.hasOwnProperty(ch)) accidental += ACCIDENTAL_TOKENS[ch];
    }
    return { letter: letter, accidental: accidental, octave: octave };
  }

  /** Format a parsed pitch back into a compact string, e.g. "F#4". */
  function formatPitch(pitch, options) {
    var p = parsePitch(pitch);
    var opts = options || {};
    var symbol = opts.unicode ? ACCIDENTAL_SYMBOL : ACCIDENTAL_ASCII;
    var accStr = symbol[String(p.accidental)] !== undefined ? symbol[String(p.accidental)] : '';
    return p.letter + accStr + p.octave;
  }

  /** Human label, e.g. "F sharp4" -> "F♯4" style is formatPitch; this gives "F sharp". */
  function pitchLetterLabel(pitch, unicode) {
    var p = parsePitch(pitch);
    var names = { '-2': ' double flat', '-1': ' flat', '0': '', '1': ' sharp', '2': ' double sharp' };
    if (unicode) names = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
    return p.letter + (names[String(p.accidental)] || '');
  }

  /**
   * Diatonic staff step: a single integer that increases by 1 for every
   * line/space movement (C->D->E...), independent of accidentals.
   * This is what staff notation Y-position is calibrated against — NOT MIDI.
   */
  function diatonicStep(pitch) {
    var p = parsePitch(pitch);
    return p.octave * 7 + LETTER_INDEX[p.letter];
  }

  /** MIDI note number (C4 = 60, A4 = 69), honouring accidentals and enharmonic spelling. */
  function midiNumber(pitch) {
    var p = parsePitch(pitch);
    return (p.octave + 1) * 12 + LETTER_SEMITONES[p.letter] + p.accidental;
  }

  /** Frequency in Hz using standard equal temperament, A4 = 440Hz. */
  function frequency(pitch) {
    var midi = typeof pitch === 'number' ? pitch : midiNumber(pitch);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /** Move a letter by `steps` diatonic positions (can be negative), wrapping octaves. */
  function transposeLetter(letter, steps) {
    var idx = LETTER_INDEX[letter];
    var raw = idx + steps;
    var wrapped = ((raw % 7) + 7) % 7;
    var octaveShift = Math.floor(raw / 7);
    return { letter: LETTERS[wrapped], octaveShift: octaveShift };
  }

  /**
   * Build the pitch a given diatonic interval (in letters) above a starting
   * pitch, choosing the accidental that produces the target MIDI pitch class.
   * Used when we know "the letter is a 3rd above the root" and "the chord
   * tone should sound N semitones above the root" and need the correctly
   * SPELLED pitch (not just any enharmonic equivalent).
   */
  function spellPitchForLetterAndPitchClass(letter, octave, targetPitchClass) {
    var natural = ((LETTER_SEMITONES[letter] % 12) + 12) % 12;
    var diff = ((targetPitchClass - natural + 18) % 12) - 6; // shortest signed distance, range [-6,6)
    // Prefer the smallest |accidental|; diminished/augmented contexts may need -2..2.
    return { letter: letter, accidental: diff, octave: octave };
  }

  root.EAChordPitchUtils = {
    LETTERS: LETTERS,
    LETTER_INDEX: LETTER_INDEX,
    LETTER_SEMITONES: LETTER_SEMITONES,
    parsePitch: parsePitch,
    formatPitch: formatPitch,
    pitchLetterLabel: pitchLetterLabel,
    diatonicStep: diatonicStep,
    midiNumber: midiNumber,
    frequency: frequency,
    transposeLetter: transposeLetter,
    spellPitchForLetterAndPitchClass: spellPitchForLetterAndPitchClass
  };
})(typeof window !== 'undefined' ? window : globalThis);
