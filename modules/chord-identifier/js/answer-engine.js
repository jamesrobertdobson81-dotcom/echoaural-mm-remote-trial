/**
 * Chord Identifier — js/answer-engine.js
 *
 * Everything to do with checking an answer against a question object, and
 * generating musically-plausible multiple-choice distractors (section 19-21).
 * Depends on pitch-utils.js, data/keys.js, data/chords.js and chord-engine.js.
 */
(function (root) {
  'use strict';

  var PU = root.EAChordPitchUtils;
  var KeysData = root.EAChordKeys;
  var ChordsData = root.EAChordChords;
  var Engine = root.EAChordEngine;

  /**
   * Parse a typed chord-name answer into { letter, accidental, quality }.
   * Accepts "C minor", "C min", "Cm", "F sharp minor", "F-sharp minor",
   * "F# minor", "F#m", "B flat major", "Bb major", "B♭ major", etc.
   * Returns null if it cannot be parsed at all.
   */
  function parseTypedChordName(text) {
    var s = String(text || '').toLowerCase().trim()
      .replace(/♯/g, '#').replace(/♭/g, 'b').replace(/°/g, ' dim')
      .replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;

    // Suspended chords (Mastering): "C sus 2", "Csus2", "C suspended fourth".
    var sus = s.match(/^([a-g])\s*(sharp|flat|#|b)?\s*sus(?:pended)?\s*(2|second|4|fourth)$/);
    if (sus) {
      var susLetter = sus[1].toUpperCase();
      var susRootAcc = sus[2] === 'sharp' || sus[2] === '#' ? 1 : sus[2] === 'flat' || sus[2] === 'b' ? -1 : 0;
      var susDegree = /^(2|second)$/.test(sus[3]) ? '2' : '4';
      return { letter: susLetter, accidental: susRootAcc, quality: 'sus' + susDegree };
    }

    // Extended (9th) chords (Mastering): "G9", "G dominant ninth",
    // "G major ninth" / "Gmaj9", "G minor ninth" / "Gm9". Bare "G9"
    // defaults to dominant ninth (standard jazz-chord-symbol convention).
    var extended = s.match(/^([a-g])\s*(sharp|flat|#|b)?\s*(dominant|major|maj|minor|min|m)?\s*(ninth|9th|9)$/);
    if (extended) {
      var extLetter = extended[1].toUpperCase();
      var extRootAcc = extended[2] === 'sharp' || extended[2] === '#' ? 1 : extended[2] === 'flat' || extended[2] === 'b' ? -1 : 0;
      var extQualWord = extended[3] || '';
      var extQuality = /^maj/.test(extQualWord) ? 'major9' : (/^min/.test(extQualWord) || extQualWord === 'm') ? 'minor9' : 'dominant9';
      return { letter: extLetter, accidental: extRootAcc, quality: extQuality };
    }

    var spaced = /^([a-g])\s*(sharp|flat|#|b)?\s*(dominant|dom7|diminished|dim|major|minor|maj|min|m)?\s*(7th?|seventh)?$/;
    var m = s.match(spaced);
    if (!m) {
      var compact = s.replace(/\s+/g, '');
      m = compact.match(/^([a-g])(sharp|flat|#|b)?(dom7|dim|maj|min|m)?(7)?$/);
    }
    if (!m) return null;

    var letter = m[1].toUpperCase();
    var accWord = m[2];
    var qualWord = (m[3] || '').replace(/\s+/g, '');
    var seventh = Boolean(m[4]);

    var accidental = 0;
    if (accWord === 'sharp' || accWord === '#') accidental = 1;
    else if (accWord === 'flat' || accWord === 'b') accidental = -1;

    var quality = 'major';
    if (/^dom/.test(qualWord)) quality = 'dominant7';
    else if (/^dim/.test(qualWord)) quality = 'diminished';
    else if (/^min/.test(qualWord) || qualWord === 'm') quality = 'minor';
    else if (/^maj/.test(qualWord) || qualWord === '') quality = 'major';

    // Bare "C7" is the jazz-convention dominant seventh; an EXPLICIT "major"
    // (spelled out or "maj7") means the actual major-seventh chord instead.
    if (seventh && quality === 'major') quality = qualWord === '' ? 'dominant7' : 'major7';

    return { letter: letter, accidental: accidental, quality: quality };
  }

  /**
   * Check a typed chord-name answer. Enharmonic respellings are rejected —
   * the letter must match, not just the sounding pitch class (section 20).
   */
  function checkChordNameAnswer(typed, question) {
    var parsed = parseTypedChordName(typed);
    if (!parsed) return false;
    var rootPitch = PU.parsePitch(question.root + '4');
    return parsed.letter === rootPitch.letter
      && parsed.accidental === rootPitch.accidental
      && parsed.quality === question.quality;
  }

  /** Roman-numeral answers are case-sensitive (I vs i is meaningful). */
  function normalizeRoman(text) {
    return String(text || '').trim().replace(/0/g, '°').replace(/dim/i, '°');
  }

  function checkRomanNumeralAnswer(typed, question) {
    return normalizeRoman(typed) === question.romanNumeral;
  }

  function checkInversionAnswer(selectedIndex, question) {
    return Number(selectedIndex) === question.inversion;
  }

  /** All diatonic chords (triads, + sevenths/extended/altered if requested) available in a key. */
  function diatonicChoicesForKey(keyData, includeSeventh) {
    return ChordsData.diatonicChordsForMode(keyData.mode, includeSeventh);
  }

  /** Seventh, extended (9th) and altered chords all pull from the "advanced" diatonic pool. */
  function isAdvancedCategory(category) {
    return category === 'seventh' || category === 'extended';
  }

  function labelForChoice(keyData, chordDef) {
    var tones = Engine.buildChordSpelling(keyData, chordDef);
    var rootPitch = { letter: tones[0].letter, accidental: tones[0].accidental, octave: 4 };
    return Engine.chordLabel(rootPitch, chordDef.quality);
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Chord-name MC distractors (section 19): correct root/wrong quality,
   * bass-note confusion when inverted, a neighbouring diatonic chord, and
   * (as filler) other diatonic chords from the same key.
   */
  function chordNameDistractors(question, keyData, count) {
    var target = count || 3;
    var seen = new Set([question.chordLabel]);
    var out = [];

    function tryAdd(label) {
      if (label && !seen.has(label) && out.length < target) { seen.add(label); out.push(label); }
    }

    // 1) Correct root, opposite (parallel) quality.
    var rootPitch = PU.parsePitch(question.root + '4');
    var oppositeQuality = question.quality === 'major' ? 'minor' : question.quality === 'minor' ? 'major' : null;
    if (oppositeQuality) tryAdd(PU.pitchLetterLabel(rootPitch) + ' ' + oppositeQuality);

    // 2) Bass-note confusion: mistaking the sounding bass for the root (inverted chords only).
    if (question.inversion > 0) {
      var bassPitch = PU.parsePitch(question.displayPitches[0]);
      tryAdd(PU.pitchLetterLabel(bassPitch) + ' ' + question.quality);
    }

    // 3) A neighbouring diatonic chord from the same key (adjacent scale degree).
    var diatonic = diatonicChoicesForKey(keyData, isAdvancedCategory(question.category));
    var currentIndex = diatonic.findIndex(function (c) { return c.roman === question.romanNumeral; });
    if (currentIndex >= 0) {
      [1, -1, 2, -2].some(function (offset) {
        var neighbour = diatonic[((currentIndex + offset) % diatonic.length + diatonic.length) % diatonic.length];
        tryAdd(labelForChoice(keyData, neighbour));
        return out.length >= target;
      });
    }

    // 4) Fill any remaining slots with other diatonic chords from this key.
    shuffle(diatonic).some(function (c) {
      tryAdd(labelForChoice(keyData, c));
      return out.length >= target;
    });

    return out.slice(0, target);
  }

  /** Roman-numeral MC distractors: other diatonic numerals from the same key. */
  function romanNumeralDistractors(question, keyData, count) {
    var diatonic = diatonicChoicesForKey(keyData, isAdvancedCategory(question.category))
      .filter(function (c) { return c.roman !== question.romanNumeral; });
    return shuffle(diatonic).slice(0, count || 3).map(function (c) { return c.roman; });
  }

  function buildMultipleChoice(question, keyData, recognitionType, distractorCount) {
    var correct = recognitionType === 'roman' ? question.romanNumeral : question.chordLabel;
    var distractors = recognitionType === 'roman'
      ? romanNumeralDistractors(question, keyData, distractorCount)
      : chordNameDistractors(question, keyData, distractorCount);
    return shuffle([correct].concat(distractors));
  }

  root.EAChordAnswers = {
    parseTypedChordName: parseTypedChordName,
    checkChordNameAnswer: checkChordNameAnswer,
    checkRomanNumeralAnswer: checkRomanNumeralAnswer,
    checkInversionAnswer: checkInversionAnswer,
    chordNameDistractors: chordNameDistractors,
    romanNumeralDistractors: romanNumeralDistractors,
    buildMultipleChoice: buildMultipleChoice
  };
})(typeof window !== 'undefined' ? window : globalThis);
