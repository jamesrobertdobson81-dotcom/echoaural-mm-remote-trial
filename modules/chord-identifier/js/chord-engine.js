/**
 * Chord Identifier — js/chord-engine.js
 *
 * Generates question objects. This is the single source of truth: notation,
 * audio and answer-checking all read from the SAME generated object, so they
 * can never disagree (section 7 of the spec).
 *
 * Does not know about the DOM, CSS, or Web Audio — pure data in, data out.
 * Depends only on pitch-utils.js, data/keys.js and data/chords.js.
 */
(function (root) {
  'use strict';

  var PU = root.EAChordPitchUtils;
  var KeysData = root.EAChordKeys;
  var ChordsData = root.EAChordChords;

  var QUALITY_LABEL = {
    major: 'major',
    minor: 'minor',
    diminished: 'diminished',
    sus2: 'suspended second',
    sus4: 'suspended fourth',
    dominant7: 'dominant seventh',
    major7: 'major seventh',
    dominant9: 'dominant ninth',
    major9: 'major ninth',
    minor9: 'minor ninth'
  };

  var INVERSION_LABEL = ['root position', 'first inversion', 'second inversion', 'third inversion'];

  var DIFFICULTY_RANK = { foundation: 0, developing: 1, securing: 2, mastering: 3 };

  /** Resolve a key's scale degree (1-based, can exceed 7) to a spelled pitch class + octave wrap. */
  function degreeInfo(key, absoluteDegree) {
    var zeroBased = absoluteDegree - 1;
    var wrap = Math.floor(zeroBased / 7);
    var degreeInOctave = ((zeroBased % 7) + 7) % 7;
    var letter = key.scaleLetters[degreeInOctave];
    var accidental = key.accidentalMap[letter] || 0;
    return { letter: letter, accidental: accidental, wrap: wrap, scaleDegree: degreeInOctave + 1, isLeadingTone: degreeInOctave === 6 };
  }

  /**
   * Build the (letter/accidental) spelling of every chord tone, root
   * position, no octaves yet. `chordDef.alterations` (optional) maps a
   * chord-tone index (0=root, 1=third, 2=fifth, 3=seventh) to an extra
   * semitone offset beyond what the key signature implies — used for
   * "borrowed" chords such as the major-key vii°7, whose seventh needs a
   * flat/natural sign the key signature doesn't otherwise call for.
   */
  function buildChordSpelling(key, chordDef) {
    var stack = ChordsData.QUALITY_DEGREE_STACK[chordDef.quality] || [1, 3, 5];
    var offsets = stack.map(function (degreeStep) { return degreeStep - 1; });
    return offsets.map(function (offset, toneIndex) {
      var info = degreeInfo(key, chordDef.degree + offset);
      var accidental = info.accidental;
      if (chordDef.raisedLeadingTone && info.isLeadingTone) accidental += 1;
      if (chordDef.alterations && chordDef.alterations[toneIndex] != null) accidental += chordDef.alterations[toneIndex];
      return { letter: info.letter, accidental: accidental, scaleDegree: info.scaleDegree };
    });
  }

  /**
   * Assign octaves in strict close-position ascending order, starting from
   * `bassOctave`, with `tones` already rotated so tones[0] is the bass.
   */
  function voiceClosePosition(tones, bassOctave) {
    var result = [];
    var prevMidi = -Infinity;
    var octave = bassOctave;
    for (var i = 0; i < tones.length; i++) {
      var t = tones[i];
      var candidateOctave = octave;
      var candidateMidi = PU.midiNumber({ letter: t.letter, accidental: t.accidental, octave: candidateOctave });
      while (candidateMidi <= prevMidi) {
        candidateOctave += 1;
        candidateMidi = PU.midiNumber({ letter: t.letter, accidental: t.accidental, octave: candidateOctave });
      }
      result.push({ letter: t.letter, accidental: t.accidental, octave: candidateOctave, scaleDegree: t.scaleDegree });
      prevMidi = candidateMidi;
      octave = candidateOctave;
    }
    return result;
  }

  function sortByPitch(tones) {
    return tones.slice().sort(function (a, b) { return PU.midiNumber(a) - PU.midiNumber(b); });
  }

  // Hard ceiling so no note (base chord tone OR doubled extra) ever lands
  // above the visible stave: the canvas is a fixed-size image with
  // overflow:hidden, and a notehead is drawn CENTERED on its pitch's y
  // position, 22px tall out of the 401px canvas. C6 (2 ledger lines above
  // the treble staff) puts the notehead's CENTER just barely inside the
  // canvas, but its top half is already cut off — B5 (1 ledger line) is the
  // highest note whose entire notehead glyph stays fully on-canvas with
  // real clearance. Expressed as a diatonic step (independent of letter/
  // accidental spelling) so it's a real guarantee, not a guess.
  var MAX_SAFE_DIATONIC_STEP = PU.diatonicStep('B5');

  // The highest a note can sit and still read in the BASS clef (matches
  // notation-engine.js's CLEF_SPLIT_STEP, which puts middle C and above in
  // the treble clef) — used to keep the second bass note below, below.
  var BASS_CLEF_CEILING_STEP = PU.diatonicStep('B3');

  // Chance that a given non-bottom tone gets pushed an extra octave up
  // during voicing (see `openVoice` below) instead of sitting in strict
  // close position.
  var OPEN_VOICING_PROBABILITY = 0.5;

  /**
   * Close-position stacking (each tone the smallest possible interval above
   * the last) makes a tertian chord LOOK like a stack of thirds — every
   * notehead sitting on the next line/space up is itself a visual clue to
   * the answer. For every tone after the first, this randomly (about half
   * the time) pushes it an extra octave higher instead, breaking that
   * "obvious ladder" shape while keeping the exact same pitch classes. Only
   * applied when the jump stays under `ceilingStep`, so it never fights the
   * off-canvas safety checks that run after this.
   */
  function openVoice(voiced, ceilingStep) {
    for (var i = 1; i < voiced.length; i++) {
      if (Math.random() < OPEN_VOICING_PROBABILITY) {
        var candidate = { letter: voiced[i].letter, accidental: voiced[i].accidental, octave: voiced[i].octave + 1, scaleDegree: voiced[i].scaleDegree };
        if (PU.diatonicStep(candidate) <= ceilingStep) voiced[i] = candidate;
      }
    }
    return voiced;
  }

  /**
   * Securing/Mastering voicing: up to `maxNotes` notes total (6 for
   * Securing, 8 for Mastering), SHARED EVENLY across the two staves (e.g.
   * 3+3 for a Securing triad, 4+4 for a Mastering seventh or 5-tone
   * extended/altered chord). The bass clef's lowest note is always the
   * actual bass/inversion tone (`rotated[0]`: root for root position, 3rd
   * for 1st inversion, 5th for 2nd, 7th/9th for 3rd+), so it still signals
   * the inversion, classic figured-bass style. Both staves are then
   * open-voiced (see above) so neither one just visually reads as a plain
   * stack of thirds.
   *
   * Every unique chord tone is guaranteed to appear at least once SOMEWHERE
   * across the two staves — bass fills its slots by cycling through the
   * inverted tone order (covering distinct tones first), then treble fills
   * its slots with whatever tones bass didn't reach, followed by doubles
   * (root-position order) to use up any remaining budget. That matters most
   * for 5-tone extended/altered chords, where 4 bass + 4 treble slots can't
   * both independently repeat the full chord — this way the 5th tone still
   * shows up rather than silently vanishing.
   */
  function voiceBalanced(rootPositionTones, rotated, bassOctave, maxNotes) {
    var toneCount = rootPositionTones.length;
    var total = Math.min(maxNotes, toneCount * 2);
    var bassSlots = Math.ceil(total / 2);
    var trebleSlots = total - bassSlots;

    var bassSource = [];
    for (var i = 0; i < bassSlots; i++) bassSource.push(rotated[i % toneCount]);

    var coveredLetters = {};
    bassSource.forEach(function (t) { coveredLetters[t.letter] = true; });
    var trebleSource = rootPositionTones.filter(function (t) { return !coveredLetters[t.letter]; }).slice(0, trebleSlots);
    var j = 0;
    while (trebleSource.length < trebleSlots) {
      trebleSource.push(rootPositionTones[j % toneCount]);
      j++;
    }

    var bass = voiceClosePosition(bassSource, bassOctave);
    openVoice(bass, BASS_CLEF_CEILING_STEP);
    bass = sortByPitch(bass);
    while (PU.diatonicStep(bass[bass.length - 1]) > BASS_CLEF_CEILING_STEP) {
      bass.forEach(function (t) { t.octave -= 1; });
    }

    var treble = voiceClosePosition(trebleSource, bass[bass.length - 1].octave + 1);
    while (PU.midiNumber(treble[0]) <= PU.midiNumber(bass[bass.length - 1])) {
      treble.forEach(function (t) { t.octave += 1; });
    }
    openVoice(treble, MAX_SAFE_DIATONIC_STEP);
    treble = sortByPitch(treble);
    // A wide chord or high inversion can still push the top treble note
    // above the safe ceiling even with no doubling involved — shift the
    // whole treble stack down an octave when there's room to do so.
    while (PU.diatonicStep(treble[treble.length - 1]) > MAX_SAFE_DIATONIC_STEP
      && PU.midiNumber(treble[0]) > PU.midiNumber(bass[bass.length - 1]) + 12) {
      treble.forEach(function (t) { t.octave -= 1; });
    }

    return sortByPitch(bass.concat(treble));
  }

  /**
   * Per-difficulty note count/spread (section 15/31 revision — linear
   * progression from a plain triad up to a dense 7+ note "wall of notes"):
   *   foundation: always 4 notes — root-position treble triad + root note
   *     down in the bass clef.
   *   developing: 5 notes, root position only, DELIBERATELY split bass/treble
   *     (root+fifth in the bass clef, root/third/fifth an octave up in treble).
   *   securing: up to 6 notes, any inversion, SHARED EVENLY across both
   *     staves (3+3 for a triad, still capped at 6 for a seventh — 8 is
   *     Mastering's ceiling, not Securing's).
   *   mastering: up to 8 notes, SHARED EVENLY (3+3 for a triad, 4+4 for a
   *     seventh or an extended chord) — denser than Securing at every chord
   *     size. Both levels: the bass clef's lowest note is always the actual
   *     inversion tone, every unique chord tone is guaranteed to appear
   *     somewhere across the two staves, and both staves are open-voiced so
   *     neither one just reads as a plain stack of thirds.
   */
  function voiceForDifficulty(rootPositionTones, inversionIndex, difficulty, bassOctave) {
    var isTriad = rootPositionTones.length === 3;
    var rotated = rootPositionTones.slice(inversionIndex).concat(rootPositionTones.slice(0, inversionIndex));

    if (difficulty === 'foundation' && inversionIndex === 0 && isTriad) {
      // Anchored at octave 4 so the whole triad reads comfortably in the
      // treble clef (easiest for a beginner) — NOT the shared bassOctave,
      // which is why this used to land mostly/entirely in the bass clef.
      var treble = voiceClosePosition(rootPositionTones.slice(), 4);
      // Foundation is ALWAYS a root-position treble triad plus a single root
      // note down in the bass clef (per the level spec) — not probabilistic.
      var bassRoot = { letter: rootPositionTones[0].letter, accidental: rootPositionTones[0].accidental, octave: 3, scaleDegree: rootPositionTones[0].scaleDegree };
      return sortByPitch([bassRoot].concat(treble)); // 4 notes: 1 bass root + treble triad
    }

    if (difficulty === 'developing' && inversionIndex === 0 && isTriad) {
      var dRoot = rootPositionTones[0], dThird = rootPositionTones[1], dFifth = rootPositionTones[2];
      var bass = voiceClosePosition([dRoot, dFifth], bassOctave);
      var trebleOctave = bass[bass.length - 1].octave + 1;
      var treble = [
        { letter: dRoot.letter, accidental: dRoot.accidental, octave: trebleOctave, scaleDegree: dRoot.scaleDegree },
        { letter: dThird.letter, accidental: dThird.accidental, octave: trebleOctave, scaleDegree: dThird.scaleDegree },
        { letter: dFifth.letter, accidental: dFifth.accidental, octave: trebleOctave, scaleDegree: dFifth.scaleDegree }
      ];
      for (var i = 1; i < treble.length; i++) {
        while (PU.midiNumber(treble[i]) <= PU.midiNumber(treble[i - 1])) treble[i].octave += 1;
      }
      while (PU.midiNumber(treble[0]) <= PU.midiNumber(bass[bass.length - 1])) {
        treble.forEach(function (t) { t.octave += 1; });
      }
      // A high-spelled root (e.g. B major) can otherwise push the fifth
      // above the safe ceiling even in this modest 5-note voicing.
      while (PU.diatonicStep(treble[treble.length - 1]) > MAX_SAFE_DIATONIC_STEP
        && PU.midiNumber(treble[0]) > PU.midiNumber(bass[bass.length - 1]) + 12) {
        treble.forEach(function (t) { t.octave -= 1; });
      }
      return bass.concat(treble); // 5 notes, deliberately spread bass/treble
    }

    if (difficulty === 'securing') {
      return voiceBalanced(rootPositionTones, rotated, bassOctave, 6); // Mastering's 8 is its own ceiling, not Securing's
    }

    if (difficulty === 'mastering') {
      return voiceBalanced(rootPositionTones, rotated, bassOctave, 8);
    }

    return voiceClosePosition(rotated, bassOctave);
  }

  /**
   * Simple engraving rule (section 11): if two voiced notes are a diatonic
   * second apart, they'd collide as noteheads — offset the upper one right.
   * Returns a boolean array (same length/order as displayPitches).
   */
  function findSecondCollisions(displayPitches) {
    var steps = displayPitches.map(function (p) { return PU.diatonicStep(p); });
    var offsetRight = new Array(displayPitches.length).fill(false);
    for (var i = 1; i < steps.length; i++) {
      if (steps[i] - steps[i - 1] === 1) offsetRight[i] = true;
    }
    return offsetRight;
  }

  function chordLabel(rootPitch, quality) {
    return PU.pitchLetterLabel(rootPitch) + ' ' + QUALITY_LABEL[quality];
  }

  // Developing/Securing "favour" 2+-accidental keys without excluding the
  // easier ones outright — most of the time pick from the favoured subset,
  // occasionally fall back to the full candidate pool.
  var FAVOUR_PROBABILITY = 0.75;

  function pickKeyId(candidateKeyIds, favouredKeyIds) {
    var favoured = favouredKeyIds ? candidateKeyIds.filter(function (id) { return favouredKeyIds.indexOf(id) !== -1; }) : [];
    var pool = (favoured.length && Math.random() < FAVOUR_PROBABILITY) ? favoured : candidateKeyIds;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Securing/Mastering "favour" richer chord types over plain triads — a
  // densely-voiced/inverted triad is still only 3 unique pitch classes, so
  // without this a student could go a whole round without meeting a real
  // 4-5 tone chord (a seventh, or one of Mastering's extended chords).
  // Most of the time pick from the favoured subset, occasionally fall back
  // to the full pool so plain triads still turn up sometimes too.
  var CHORD_FAVOUR_PROBABILITY = 0.65;
  var CHORD_FAVOURED_CATEGORIES = {
    securing: ['seventh'],
    mastering: ['seventh', 'extended']
  };

  function pickChordDef(chordChoices, favouredCategories) {
    var favoured = favouredCategories ? chordChoices.filter(function (c) { return favouredCategories.indexOf(c.category) !== -1; }) : [];
    var pool = (favoured.length && Math.random() < CHORD_FAVOUR_PROBABILITY) ? favoured : chordChoices;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Generate one question. `options`:
   *   difficulty: 'foundation' | 'developing' | 'securing' | 'mastering'
   *   keyId: force a specific key (else chosen from the difficulty's pool)
   *   allowSeventh, allowInversions, tonality ('major'|'minor'|'mixed')
   *   chordDef: force a specific chord definition (used by tests)
   */
  function generateQuestion(options) {
    var opts = options || {};
    var difficulty = opts.difficulty || 'foundation';
    var pool = KeysData.KEY_POOLS[difficulty] || KeysData.KEY_POOLS.foundation;

    var tonality = opts.tonality || 'major';
    var candidateKeyIds = pool.filter(function (id) {
      if (tonality === 'mixed') return true;
      return KeysData.KEYS[id].mode === tonality;
    });
    if (!candidateKeyIds.length) candidateKeyIds = pool;

    var favouredKeyIds = KeysData.FAVOURED_KEY_POOLS && KeysData.FAVOURED_KEY_POOLS[difficulty];
    var keyId = opts.keyId || pickKeyId(candidateKeyIds, favouredKeyIds);
    var key = KeysData.findKey(keyId);

    var allowSeventh = Boolean(opts.allowSeventh);
    var chordChoices = ChordsData.diatonicChordsForMode(key.mode, allowSeventh);

    // Seventh-chord defs may carry a `minDifficulty` (e.g. the borrowed
    // vii°7 is Mastering-only even though sevenths in general start at
    // Securing) — keep Securing and Mastering pulling from different pools.
    var difficultyRank = DIFFICULTY_RANK[difficulty] || 0;
    chordChoices = chordChoices.filter(function (c) {
      return !c.minDifficulty || difficultyRank >= DIFFICULTY_RANK[c.minDifficulty];
    });

    if (difficulty === 'foundation') {
      chordChoices = chordChoices.filter(function (c) { return c.category === 'primary' && !/7/.test(c.quality); });
    } else if (difficulty === 'developing') {
      chordChoices = chordChoices.filter(function (c) { return allowSeventh || !/7/.test(c.quality); });
    }

    var chordDef = opts.chordDef || pickChordDef(chordChoices, CHORD_FAVOURED_CATEGORIES[difficulty]);

    var rootPositionTones = buildChordSpelling(key, chordDef);
    var toneCount = rootPositionTones.length;

    // Extended chords (9ths, maj7, sus2/sus4) stay root position — GCSE-level
    // sus/9th chords aren't taught in terms of inversions, and this also
    // keeps INVERSION_LABEL (root/1st/2nd/3rd only) from ever needing a
    // 4th-inversion index for the 5-tone 9th chords.
    var isInvertibleCategory = chordDef.category !== 'extended';
    var allowInversions = Boolean(opts.allowInversions) && isInvertibleCategory && (difficulty === 'securing' || difficulty === 'mastering');
    var inversionIndex = 0;
    if (allowInversions) inversionIndex = Math.floor(Math.random() * toneCount);

    var bassOctave = 3;
    var voiced = voiceForDifficulty(rootPositionTones, inversionIndex, difficulty, bassOctave);

    var displayPitches = voiced.map(function (t) { return PU.formatPitch(t); });
    var rootTone = rootPositionTones[0];
    var rootPitchForLabel = { letter: rootTone.letter, accidental: rootTone.accidental, octave: 4 };

    var question = {
      key: {
        id: key.id,
        tonic: key.tonicLabel,
        mode: key.mode,
        accidentals: key.accidentalCount,
        label: key.label
      },
      // Compact, re-parseable pitch-class spellings (e.g. "F#", "Bb", "C") —
      // matches the spec's own chordTones example format exactly, and is
      // safe to feed straight back into PU.parsePitch() elsewhere.
      root: PU.formatPitch(rootPitchForLabel).replace(/\d+$/, ''),
      rootLabel: PU.pitchLetterLabel(rootPitchForLabel),
      quality: chordDef.quality,
      romanNumeral: chordDef.roman,
      inversion: inversionIndex,
      inversionLabel: INVERSION_LABEL[inversionIndex],
      chordTones: rootPositionTones.map(function (t) { return PU.formatPitch({ letter: t.letter, accidental: t.accidental, octave: 4 }).replace(/\d+$/, ''); }),
      displayPitches: displayPitches,
      chordLabel: chordLabel(rootPitchForLabel, chordDef.quality),
      category: chordDef.category,
      difficulty: difficulty,
      secondCollisions: findSecondCollisions(displayPitches)
    };

    return question;
  }

  root.EAChordEngine = {
    QUALITY_LABEL: QUALITY_LABEL,
    INVERSION_LABEL: INVERSION_LABEL,
    buildChordSpelling: buildChordSpelling,
    voiceClosePosition: voiceClosePosition,
    voiceForDifficulty: voiceForDifficulty,
    findSecondCollisions: findSecondCollisions,
    chordLabel: chordLabel,
    generateQuestion: generateQuestion
  };
})(typeof window !== 'undefined' ? window : globalThis);
