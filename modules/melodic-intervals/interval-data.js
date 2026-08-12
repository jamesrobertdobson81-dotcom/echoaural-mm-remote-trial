(function initMelodicIntervalsData(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EchoAuralMelodicIntervals = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMelodicIntervalsData() {
  const AUDIO_BASE = 'audio/piano/';

  const NOTE_LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const SHARP_ORDER = ['F', 'C', 'G', 'D'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D'];

  const INTERVALS = [
    { id: 'unison', label: 'Unison', diatonicSteps: 0, baseSemitones: 0, family: 'perfect' },
    { id: '2nd', label: '2nd', diatonicSteps: 1, baseSemitones: 2, family: 'major' },
    { id: '3rd', label: '3rd', diatonicSteps: 2, baseSemitones: 4, family: 'major' },
    { id: '4th', label: '4th', diatonicSteps: 3, baseSemitones: 5, family: 'perfect' },
    { id: '5th', label: '5th', diatonicSteps: 4, baseSemitones: 7, family: 'perfect' },
    { id: '6th', label: '6th', diatonicSteps: 5, baseSemitones: 9, family: 'major' },
    { id: '7th', label: '7th', diatonicSteps: 6, baseSemitones: 11, family: 'major' },
    { id: 'octave', label: 'Octave', diatonicSteps: 7, baseSemitones: 12, family: 'perfect' }
  ];

  const LEGACY_INTERVAL_IDS = new Set(['2nd', '3rd', '4th', '5th', 'octave']);
  const NUMBER_LABELS = ['Unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave'];
  const SECURING_QUALITY_LABELS = [
    'Perfect unison',
    'Minor 2nd',
    'Major 2nd',
    'Minor 3rd',
    'Major 3rd',
    'Perfect 4th',
    'Perfect 5th',
    'Minor 6th',
    'Major 6th',
    'Minor 7th',
    'Major 7th',
    'Perfect octave'
  ];
  const MASTERING_QUALITY_LABELS = [
    ...SECURING_QUALITY_LABELS,
    'Augmented 4th',
    'Diminished 5th'
  ];

  const LEVEL_DEFINITIONS = {
    foundation: {
      id: 0,
      key: 'foundation',
      code: 'F',
      name: 'Foundation',
      inputMode: 'choice',
      answerMode: 'number',
      directions: ['ascending'],
      intervalIds: ['unison', '2nd', '3rd', '4th', '5th', 'octave'],
      qualities: ['Perfect', 'Minor', 'Major'],
      choices: ['Unison', '2nd', '3rd', '4th', '5th', 'Octave'],
      keySignatureIds: ['c-major'],
      maxKeyAccidentals: 0,
      noteMode: 'natural',
      chromatic: false,
      description: 'ascending natural-note interval numbers from unison to octave, excluding 6ths and 7ths'
    },
    developing: {
      id: 1,
      key: 'developing',
      code: 'D',
      name: 'Developing',
      inputMode: 'choice',
      answerMode: 'number',
      directions: ['ascending', 'descending'],
      intervalIds: ['unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'],
      choices: NUMBER_LABELS,
      keySignatureIds: ['c-major', 'g-major', 'd-major', 'f-major', 'bb-major'],
      maxKeyAccidentals: 2,
      noteMode: 'natural',
      chromatic: false,
      description: 'ascending and descending diatonic interval numbers from unison to octave'
    },
    securing: {
      id: 2,
      key: 'securing',
      code: 'S',
      name: 'Securing',
      inputMode: 'mixed',
      answerMode: 'quality',
      directions: ['ascending', 'descending'],
      intervalIds: ['unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'],
      qualities: ['Perfect', 'Minor', 'Major'],
      choices: SECURING_QUALITY_LABELS,
      keySignatureIds: ['c-major', 'g-major', 'd-major', 'a-major', 'e-major', 'f-major', 'bb-major', 'eb-major', 'ab-major'],
      maxKeyAccidentals: 4,
      noteMode: 'natural',
      chromatic: false,
      description: 'major, minor and perfect diatonic intervals in both directions'
    },
    mastering: {
      id: 3,
      key: 'mastering',
      code: 'M',
      name: 'Mastering',
      inputMode: 'written',
      answerMode: 'quality',
      directions: ['ascending', 'descending'],
      intervalIds: ['unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'octave'],
      qualities: ['Perfect', 'Minor', 'Major', 'Augmented', 'Diminished'],
      choices: MASTERING_QUALITY_LABELS,
      keySignatureIds: ['c-major', 'g-major', 'd-major', 'a-major', 'e-major', 'f-major', 'bb-major', 'eb-major', 'ab-major'],
      maxKeyAccidentals: 4,
      noteMode: 'natural',
      chromatic: false,
      description: 'complete diatonic interval names in the written key, including the diatonic augmented 4th and diminished 5th'
    }
  };

  const NOTES = [
    // These files were originally exported/named C3-E4, but the rendered samples
    // sound as treble-clef C4-E5: one ledger line below the stave to the top space.
    // Keep the filenames unchanged so the existing MP3 assets still load.
    { id: 'C4', label: 'C4', letter: 'C', octave: 4, midi: 60, file: 'C3.mp3', accidental: '' },
    { id: 'Cs4', label: 'C♯4', letter: 'C', octave: 4, midi: 61, file: 'Cs3.mp3', accidental: '♯' },
    { id: 'D4', label: 'D4', letter: 'D', octave: 4, midi: 62, file: 'D3.mp3', accidental: '' },
    { id: 'Ds4', label: 'D♯4', letter: 'D', octave: 4, midi: 63, file: 'Ds3.mp3', accidental: '♯' },
    { id: 'E4', label: 'E4', letter: 'E', octave: 4, midi: 64, file: 'E3.mp3', accidental: '' },
    { id: 'F4', label: 'F4', letter: 'F', octave: 4, midi: 65, file: 'F3.mp3', accidental: '' },
    { id: 'Fs4', label: 'F♯4', letter: 'F', octave: 4, midi: 66, file: 'Fs3.mp3', accidental: '♯' },
    { id: 'G4', label: 'G4', letter: 'G', octave: 4, midi: 67, file: 'G3.mp3', accidental: '' },
    { id: 'Gs4', label: 'G♯4', letter: 'G', octave: 4, midi: 68, file: 'Gs3.mp3', accidental: '♯' },
    { id: 'A4', label: 'A4', letter: 'A', octave: 4, midi: 69, file: 'A3.mp3', accidental: '' },
    { id: 'As4', label: 'A♯4', letter: 'A', octave: 4, midi: 70, file: 'As3.mp3', accidental: '♯' },
    { id: 'B4', label: 'B4', letter: 'B', octave: 4, midi: 71, file: 'B3.mp3', accidental: '' },
    { id: 'C5', label: 'C5', letter: 'C', octave: 5, midi: 72, file: 'C4.mp3', accidental: '' },
    { id: 'Cs5', label: 'C♯5', letter: 'C', octave: 5, midi: 73, file: 'Cs4.mp3', accidental: '♯' },
    { id: 'D5', label: 'D5', letter: 'D', octave: 5, midi: 74, file: 'D4.mp3', accidental: '' },
    { id: 'Ds5', label: 'D♯5', letter: 'D', octave: 5, midi: 75, file: 'Ds4.mp3', accidental: '♯' },
    { id: 'E5', label: 'E5', letter: 'E', octave: 5, midi: 76, file: 'E4.mp3', accidental: '' }
  ];

  const AUDIO_NOTE_BY_MIDI = new Map(NOTES.map((note) => [note.midi, note]));
  const ADDITIONAL_WRITTEN_NOTES = [
    { id: 'Df4', label: 'D♭4', letter: 'D', octave: 4, midi: 61, accidental: '♭' },
    { id: 'Ef4', label: 'E♭4', letter: 'E', octave: 4, midi: 63, accidental: '♭' },
    { id: 'Es4', label: 'E♯4', letter: 'E', octave: 4, midi: 65, accidental: '♯' },
    { id: 'Ff4', label: 'F♭4', letter: 'F', octave: 4, midi: 64, accidental: '♭' },
    { id: 'Gf4', label: 'G♭4', letter: 'G', octave: 4, midi: 66, accidental: '♭' },
    { id: 'Af4', label: 'A♭4', letter: 'A', octave: 4, midi: 68, accidental: '♭' },
    { id: 'Bf4', label: 'B♭4', letter: 'B', octave: 4, midi: 70, accidental: '♭' },
    { id: 'Bs4', label: 'B♯4', letter: 'B', octave: 4, midi: 72, accidental: '♯' },
    { id: 'Cf5', label: 'C♭5', letter: 'C', octave: 5, midi: 71, accidental: '♭' },
    { id: 'Df5', label: 'D♭5', letter: 'D', octave: 5, midi: 73, accidental: '♭' },
    { id: 'Ef5', label: 'E♭5', letter: 'E', octave: 5, midi: 75, accidental: '♭' },
    { id: 'Ff5', label: 'F♭5', letter: 'F', octave: 5, midi: 76, accidental: '♭' },
    { id: 'Cn4', label: 'C♮4', letter: 'C', octave: 4, midi: 60, accidental: '♮' },
    { id: 'Dn4', label: 'D♮4', letter: 'D', octave: 4, midi: 62, accidental: '♮' },
    { id: 'En4', label: 'E♮4', letter: 'E', octave: 4, midi: 64, accidental: '♮' },
    { id: 'Fn4', label: 'F♮4', letter: 'F', octave: 4, midi: 65, accidental: '♮' },
    { id: 'Gn4', label: 'G♮4', letter: 'G', octave: 4, midi: 67, accidental: '♮' },
    { id: 'An4', label: 'A♮4', letter: 'A', octave: 4, midi: 69, accidental: '♮' },
    { id: 'Bn4', label: 'B♮4', letter: 'B', octave: 4, midi: 71, accidental: '♮' },
    { id: 'Cn5', label: 'C♮5', letter: 'C', octave: 5, midi: 72, accidental: '♮' },
    { id: 'Dn5', label: 'D♮5', letter: 'D', octave: 5, midi: 74, accidental: '♮' },
    { id: 'En5', label: 'E♮5', letter: 'E', octave: 5, midi: 76, accidental: '♮' }
  ];

  ADDITIONAL_WRITTEN_NOTES.forEach((note) => {
    const audioNote = AUDIO_NOTE_BY_MIDI.get(note.midi);
    if (audioNote && !NOTES.some((item) => item.id === note.id)) {
      NOTES.push({ ...note, file: audioNote.file, explicitAccidental: true });
    }
  });

  NOTES.forEach((note) => {
    if (note.accidental) note.explicitAccidental = true;
  });

  const NATURAL_NOTES = NOTES.filter((note) => !note.accidental);
  const CHROMATIC_WRITTEN_NOTES = NOTES.filter((note) => note.midi >= 60 && note.midi <= 76);

  const KEY_SIGNATURES = [
    {
      id: 'c-major',
      label: 'C major',
      staffAsset: 'assets/blank-treble-bar.png',
      accidentalMap: {}
    },
    {
      id: 'g-major',
      label: 'G major',
      staffAsset: 'assets/treble-key-1-sharp.png',
      accidentalMap: { F: 1 }
    },
    {
      id: 'd-major',
      label: 'D major',
      staffAsset: 'assets/treble-key-2-sharp.png',
      accidentalMap: { F: 1, C: 1 }
    },
    {
      id: 'a-major',
      label: 'A major',
      staffAsset: 'assets/treble-key-3-sharp.png',
      accidentalMap: { F: 1, C: 1, G: 1 }
    },
    {
      id: 'e-major',
      label: 'E major',
      staffAsset: 'assets/treble-key-4-sharp.png',
      accidentalMap: { F: 1, C: 1, G: 1, D: 1 }
    },
    {
      id: 'f-major',
      label: 'F major',
      staffAsset: 'assets/treble-key-1-flat.png',
      accidentalMap: { B: -1 }
    },
    {
      id: 'bb-major',
      label: 'B♭ major',
      staffAsset: 'assets/treble-key-2-flat.png',
      accidentalMap: { B: -1, E: -1 }
    },
    {
      id: 'eb-major',
      label: 'E♭ major',
      staffAsset: 'assets/treble-key-3-flat.png',
      accidentalMap: { B: -1, E: -1, A: -1 }
    },
    {
      id: 'ab-major',
      label: 'A♭ major',
      staffAsset: 'assets/treble-key-4-flat.png',
      accidentalMap: { B: -1, E: -1, A: -1, D: -1 }
    }
  ];

  const STAVE_IMAGE_METRICS = {
    // Standard display width: clef + up to 4 sharps/flats + two crotchets + bar line.
    width: 420,
    height: 210,
    // Scanned from modules/melodic-intervals/assets/blank-treble-bar.png.
    // Treble staff lines sit at y = 63, 84, 105, 126, 147.
    topLineY: 63,
    bottomLineY: 147,
    lineSpace: 21,
    halfSpace: 10.5,
    // Horizontal note placement on the PNG staff backgrounds (1:1 with the visible
    // left portion when the stave stage is 420px wide). Measured from the assets.
    clefEndX: 70,
    accidentalStepX: 29,
    noteAfterPrefixGap: 28,
    noteGap: 120,
    // C major (0 accidentals) baseline: positions that previously matched D major
    // (2 sharps). Keys with n accidentals shift right by n * accidentalStepX.
    baseStartX: 126,
    baseTargetX: 246
  };

  function noteStep(note = {}) {
    return Number(note.octave || 0) * 7 + Number(NOTE_LETTER_INDEX[note.letter] || 0);
  }

  function findNote(id) {
    return NOTES.find((note) => note.id === id) || null;
  }

  function findNoteByMidi(midi) {
    return NOTES.find((note) => !note.explicitAccidental && note.midi === Number(midi))
      || NOTES.find((note) => note.midi === Number(midi))
      || null;
  }

  function findNoteByStep(step) {
    return NATURAL_NOTES.find((note) => noteStep(note) === Number(step)) || null;
  }

  function findKeySignature(id) {
    return KEY_SIGNATURES.find((item) => item.id === id) || KEY_SIGNATURES[0];
  }

  function getKeySignatureAccidentalCount(keySignatureOrId) {
    const keySignature = typeof keySignatureOrId === 'string' ? findKeySignature(keySignatureOrId) : keySignatureOrId;
    return Object.keys((keySignature || {}).accidentalMap || {}).length;
  }

  function getNotePositions(keySignatureAccidentals = 0) {
    const count = Math.max(0, Math.min(4, Number(keySignatureAccidentals) || 0));
    const startX = STAVE_IMAGE_METRICS.baseStartX + (count * STAVE_IMAGE_METRICS.accidentalStepX);
    return {
      startX,
      targetX: startX + STAVE_IMAGE_METRICS.noteGap
    };
  }

  function getAudioPath(noteOrId) {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    return note ? `${AUDIO_BASE}${note.file}` : '';
  }

  function getStaffY(noteOrId, clef = 'treble') {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    if (!note) return 105;

    // Treble clef top line is F5. Every diatonic step moves by half a
    // staff space. Current samples cover C4-E5: middle C ledger line to top space.
    const topLineStep = clef === 'treble'
      ? (5 * 7 + NOTE_LETTER_INDEX.F)
      : (3 * 7 + NOTE_LETTER_INDEX.A);
    return STAVE_IMAGE_METRICS.topLineY - ((noteStep(note) - topLineStep) * STAVE_IMAGE_METRICS.halfSpace);
  }

  function getStemDirection(noteOrId, clef = 'treble') {
    const y = getStaffY(noteOrId, clef);
    const middleLineY = (STAVE_IMAGE_METRICS.topLineY + STAVE_IMAGE_METRICS.bottomLineY) / 2;
    // On or above the middle line → stem down; below → stem up.
    return y <= middleLineY ? 'down' : 'up';
  }

  function getLedgerLines(noteOrId, clef = 'treble') {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    if (!note) return [];
    const y = getStaffY(note, clef);
    const lines = [];
    const { topLineY, bottomLineY, lineSpace } = STAVE_IMAGE_METRICS;

    if (y < topLineY) {
      for (let lineY = topLineY - lineSpace; lineY >= y - 1; lineY -= lineSpace) lines.push(lineY);
    }
    if (y > bottomLineY) {
      for (let lineY = bottomLineY + lineSpace; lineY <= y + 1; lineY += lineSpace) lines.push(lineY);
    }
    return lines;
  }

  function getTargetForInterval(startNote, interval, direction = 'ascending') {
    const targetStep = noteStep(startNote) + (direction === 'descending' ? -interval.diatonicSteps : interval.diatonicSteps);
    return findNoteByStep(targetStep);
  }

  function getSoundingMidi(noteOrId, keySignatureOrId) {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    const keySignature = typeof keySignatureOrId === 'string' ? findKeySignature(keySignatureOrId) : keySignatureOrId;
    if (!note) return null;
    if (note.explicitAccidental || note.accidental) return Number(note.midi);
    const offset = Number((keySignature?.accidentalMap || {})[note.letter] || 0);
    return Number(note.midi) + offset;
  }

  function applyKeySignatureToWrittenNote(noteOrId, keySignatureOrId) {
    const midi = getSoundingMidi(noteOrId, keySignatureOrId);
    return midi === null ? null : findNoteByMidi(midi);
  }

  function getIntervalByDiatonicSteps(steps) {
    return INTERVALS.find((interval) => interval.diatonicSteps === Number(steps)) || null;
  }

  function formatIntervalFullLabel(quality, intervalLabel) {
    if (!quality || !intervalLabel) return '';
    const label = intervalLabel === 'Unison' || intervalLabel === 'Octave'
      ? intervalLabel.toLowerCase()
      : intervalLabel;
    return `${quality} ${label}`;
  }

  function getIntervalQuality(interval, semitoneDistance) {
    if (!interval) return '';
    const diff = Number(semitoneDistance) - Number(interval.baseSemitones || 0);
    if (interval.family === 'major') {
      if (diff === 0) return 'Major';
      if (diff === -1) return 'Minor';
      if (diff === 1) return 'Augmented';
      if (diff === -2) return 'Diminished';
    }
    if (interval.family === 'perfect') {
      if (diff === 0) return 'Perfect';
      if (diff === 1) return 'Augmented';
      if (diff === -1) return 'Diminished';
    }
    if (diff > 0) return 'Augmented';
    if (diff < 0) return 'Diminished';
    return '';
  }

  function calculateInterval(startNoteOrId, targetNoteOrId, keySignatureOrId = 'c-major') {
    const startNote = typeof startNoteOrId === 'string' ? findNote(startNoteOrId) : startNoteOrId;
    const targetNote = typeof targetNoteOrId === 'string' ? findNote(targetNoteOrId) : targetNoteOrId;
    const keySignature = typeof keySignatureOrId === 'string' ? findKeySignature(keySignatureOrId) : keySignatureOrId;
    if (!startNote || !targetNote || !keySignature) return null;

    const diatonicSteps = Math.abs(noteStep(targetNote) - noteStep(startNote));
    const interval = getIntervalByDiatonicSteps(diatonicSteps);
    if (!interval) return null;

    const startMidi = getSoundingMidi(startNote, keySignature);
    const targetMidi = getSoundingMidi(targetNote, keySignature);
    if (startMidi === null || targetMidi === null) return null;

    const semitoneDistance = Math.abs(targetMidi - startMidi);
    if (semitoneDistance > 12) return null;

    const intervalQuality = getIntervalQuality(interval, semitoneDistance);
    if (!intervalQuality) return null;

    return {
      interval,
      intervalId: interval.id,
      intervalLabel: interval.label,
      intervalNumberLabel: interval.label,
      intervalQuality,
      intervalFullLabel: formatIntervalFullLabel(intervalQuality, interval.label),
      intervalSteps: interval.diatonicSteps,
      semitoneDistance,
      signedSemitoneDistance: targetMidi - startMidi,
      startMidi,
      targetMidi
    };
  }

  function normaliseLevelKey(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === 'legacy') return '';
    if (raw === 'all' || raw === 'all-levels' || raw === 'all levels') return 'all';
    const byKey = LEVEL_DEFINITIONS[raw];
    if (byKey) return byKey.key;
    const byLabel = Object.values(LEVEL_DEFINITIONS).find((level) => level.name.toLowerCase() === raw || level.code.toLowerCase() === raw);
    if (byLabel) return byLabel.key;
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      const byId = Object.values(LEVEL_DEFINITIONS).find((level) => level.id === numeric);
      if (byId) return byId.key;
    }
    return '';
  }

  function resolveInputMode(level, serial = 0) {
    if (!level) return 'choice';
    const configured = level.inputMode || 'choice';
    if (configured === 'choice' || configured === 'written') return configured;
    if (configured === 'mixed') {
      return Number(serial) % 4 === 0 ? 'choice' : 'written';
    }
    return 'choice';
  }

  function buildNumberChoices(includeOctave = false) {
    return INTERVALS
      .filter((interval) => LEGACY_INTERVAL_IDS.has(interval.id))
      .filter((interval) => includeOctave || interval.label !== 'Octave')
      .map((interval) => interval.label);
  }

  function buildQualityChoices(includeOctave = false) {
    const choices = [
      'Minor 2nd',
      'Major 2nd',
      'Minor 3rd',
      'Major 3rd',
      'Perfect 4th',
      'Augmented 4th',
      'Diminished 5th',
      'Perfect 5th'
    ];
    if (includeOctave) choices.push('Perfect Octave');
    return choices;
  }

  function buildChoices(options = {}) {
    const levelKey = normaliseLevelKey(options.level || options.questionLevel);
    if (levelKey && levelKey !== 'all') return (LEVEL_DEFINITIONS[levelKey]?.choices || []).slice();

    const answerMode = options.answerMode === 'quality' ? 'quality' : 'number';
    const includeOctave = Boolean(options.includeOctave);
    return answerMode === 'quality'
      ? buildQualityChoices(includeOctave)
      : buildNumberChoices(includeOctave);
  }

  function levelDefinitionsList() {
    return ['foundation', 'developing', 'securing', 'mastering'].map((key) => LEVEL_DEFINITIONS[key]);
  }

  function getLevelDefinition(value) {
    const key = normaliseLevelKey(value);
    return key && key !== 'all' ? LEVEL_DEFINITIONS[key] : null;
  }

  function getKeysForLevel(level) {
    return KEY_SIGNATURES.filter((keySignature) => level.keySignatureIds.includes(keySignature.id));
  }

  function getCandidateNotesForLevel(level) {
    if (level.key === 'foundation') {
      return NATURAL_NOTES.filter((note) => note.midi >= 60 && note.midi <= 72);
    }
    if (level.noteMode === 'chromatic') return CHROMATIC_WRITTEN_NOTES.slice();
    return NATURAL_NOTES.slice();
  }

  function questionSignature(question) {
    return [
      question.levelKey || 'legacy',
      question.direction,
      question.keySignatureId,
      question.startNoteId,
      question.targetNoteId,
      question.correctAnswer
    ].join('|');
  }

  function isAllowedForLevel(question, level) {
    if (!question || !level) return false;
    if (!level.intervalIds.includes(question.intervalId)) return false;
    if (!level.directions.includes(question.direction)) return false;
    if (level.keySignatureIds && !level.keySignatureIds.includes(question.keySignatureId)) return false;
    if (Array.isArray(level.qualities) && level.qualities.length && !level.qualities.includes(question.intervalQuality)) return false;
    if (level.answerMode === 'number') return level.choices.includes(question.intervalLabel);
    return level.choices.some((choice) => sameInterval(choice, question.intervalFullLabel));
  }

  function makeQuestion({
    serial,
    clef,
    keySignature,
    startWrittenNote,
    targetWrittenNote,
    direction,
    level = null
  }) {
    const intervalInfo = calculateInterval(startWrittenNote, targetWrittenNote, keySignature);
    if (!intervalInfo) return null;

    const startSoundingNote = findNoteByMidi(intervalInfo.startMidi);
    const targetSoundingNote = findNoteByMidi(intervalInfo.targetMidi);
    if (!startSoundingNote || !targetSoundingNote) return null;

    if (direction === 'ascending' && intervalInfo.signedSemitoneDistance < 0) return null;
    if (direction === 'descending' && intervalInfo.signedSemitoneDistance > 0) return null;

    const answerMode = level?.answerMode || 'number';
    const inputMode = level ? resolveInputMode(level, serial) : 'choice';
    const correctAnswer = answerMode === 'quality' ? intervalInfo.intervalFullLabel : intervalInfo.intervalLabel;
    const questionId = level
      ? `MI-${level.code}-${String(serial).padStart(3, '0')}`
      : `MI${String(serial).padStart(3, '0')}`;

    const question = {
      id: questionId,
      moduleId: 'melodic-intervals',
      moduleTitle: 'Melodic Intervals',
      title: 'Melodic Interval',
      prompt: answerMode === 'quality'
        ? 'Listen to the two piano notes and identify the complete interval name.'
        : 'Listen to the two piano notes and identify the interval number.',
      clef,
      direction,
      keySignatureId: keySignature.id,
      keySignatureLabel: keySignature.label,
      keySignatureAccidentals: getKeySignatureAccidentalCount(keySignature),
      staffAsset: keySignature.staffAsset,
      startNoteId: startWrittenNote.id,
      targetNoteId: targetWrittenNote.id,
      startNoteLabel: startWrittenNote.label,
      targetNoteLabel: targetWrittenNote.label,
      startAudioNoteId: startSoundingNote.id,
      targetAudioNoteId: targetSoundingNote.id,
      startAudio: getAudioPath(startSoundingNote),
      targetAudio: getAudioPath(targetSoundingNote),
      audioSequence: [getAudioPath(startSoundingNote), getAudioPath(targetSoundingNote)],
      sequenceGapMs: 280,
      intervalId: intervalInfo.intervalId,
      intervalLabel: intervalInfo.intervalLabel,
      intervalNumberLabel: intervalInfo.intervalNumberLabel,
      intervalQuality: intervalInfo.intervalQuality,
      intervalFullLabel: intervalInfo.intervalFullLabel,
      intervalSteps: intervalInfo.intervalSteps,
      answerNumber: intervalInfo.intervalLabel,
      answerQuality: intervalInfo.intervalFullLabel,
      correctAnswer,
      answerMode,
      inputMode,
      answerType: inputMode === 'written' ? 'text' : 'choice',
      mode: 'recognition',
      maxMarks: 1,
      totalNotes: 1,
      audioDurationSeconds: 2.4,
      semitoneDistance: intervalInfo.semitoneDistance,
      signedSemitoneDistance: intervalInfo.signedSemitoneDistance,
      hasAccidentals: Boolean(startWrittenNote.accidental || targetWrittenNote.accidental),
      chromatic: Boolean(level?.chromatic && (startWrittenNote.accidental || targetWrittenNote.accidental))
    };

    if (level) {
      question.level = level.name;
      question.levelKey = level.key;
      question.levelIndex = level.id;
      question.choices = inputMode === 'choice'
        ? buildMcChoices({
          correctAnswer,
          answerMode,
          pool: buildChoices({ level: level.key })
        })
        : [];
      question.resourceMetadata = {
        app: 'Melodic Intervals',
        module: 'melodic-intervals',
        level: level.name,
        allowedIntervalNumbers: level.intervalIds.map((id) => INTERVALS.find((interval) => interval.id === id)?.label).filter(Boolean),
        allowedIntervalQualities: level.answerMode === 'quality' ? level.qualities.slice() : [],
        directions: level.directions.slice(),
        keySignatureLimit: level.maxKeyAccidentals,
        accidentalsAllowed: level.noteMode === 'chromatic',
        chromaticIntervalsAllowed: Boolean(level.chromatic),
        answerMode: level.answerMode,
        inputMode
      };
    }

    return question;
  }

  function buildLegacyQuestions(options = {}) {
    const clef = options.clef || 'treble';
    const maxQuestions = Number(options.maxQuestions || 999);
    const questions = [];
    let serial = 1;
    const intervals = INTERVALS.filter((interval) => LEGACY_INTERVAL_IDS.has(interval.id));

    KEY_SIGNATURES.forEach((keySignature) => {
      NATURAL_NOTES.forEach((startWrittenNote) => {
        intervals.forEach((interval) => {
          const targetWrittenNote = getTargetForInterval(startWrittenNote, interval, 'ascending');
          if (!targetWrittenNote) return;
          const question = makeQuestion({
            serial,
            clef,
            keySignature,
            startWrittenNote,
            targetWrittenNote,
            direction: 'ascending'
          });
          if (!question) return;
          questions.push(question);
          serial += 1;
        });
      });
    });

    return questions.slice(0, maxQuestions);
  }

  function shouldUseChromaticPair(startWrittenNote, targetWrittenNote, intervalInfo, level) {
    if (!level.chromatic) return false;
    const fullLabel = intervalInfo.intervalFullLabel;
    if (SECURING_QUALITY_LABELS.some((choice) => sameInterval(choice, fullLabel))) return true;
    if (sameInterval(fullLabel, 'Augmented 4th') || sameInterval(fullLabel, 'Diminished 5th')) return true;
    if (sameInterval(fullLabel, 'Augmented 2nd')) return true;
    if (sameInterval(fullLabel, 'Augmented 5th')) return true;
    if (sameInterval(fullLabel, 'Diminished 7th')) return true;
    return Boolean(startWrittenNote.accidental || targetWrittenNote.accidental) && level.choices.some((choice) => sameInterval(choice, fullLabel));
  }

  function buildQuestionsForLevel(level, options = {}) {
    const clef = options.clef || 'treble';
    const questions = [];
    const used = new Set();
    const keys = getKeysForLevel(level);
    const candidates = getCandidateNotesForLevel(level);
    let serial = 1;

    keys.forEach((keySignature) => {
      level.directions.forEach((direction) => {
        candidates.forEach((startWrittenNote) => {
          level.intervalIds.forEach((intervalId) => {
            const interval = INTERVALS.find((item) => item.id === intervalId);
            if (!interval) return;

            const targetPool = level.noteMode === 'chromatic' ? candidates : [getTargetForInterval(startWrittenNote, interval, direction)].filter(Boolean);
            targetPool.forEach((targetWrittenNote) => {
              if (!targetWrittenNote) return;
              const stepDistance = Math.abs(noteStep(targetWrittenNote) - noteStep(startWrittenNote));
              if (stepDistance !== interval.diatonicSteps) return;

              const intervalInfo = calculateInterval(startWrittenNote, targetWrittenNote, keySignature);
              if (!intervalInfo) return;
              if (intervalInfo.semitoneDistance > 12) return;
              if (direction === 'ascending' && intervalInfo.signedSemitoneDistance < 0) return;
              if (direction === 'descending' && intervalInfo.signedSemitoneDistance > 0) return;

              if (level.noteMode !== 'chromatic') {
                if (startWrittenNote.accidental || targetWrittenNote.accidental) return;
              } else if (!shouldUseChromaticPair(startWrittenNote, targetWrittenNote, intervalInfo, level)) {
                return;
              }

              const question = makeQuestion({
                serial,
                clef,
                keySignature,
                startWrittenNote,
                targetWrittenNote,
                direction,
                level
              });
              if (!isAllowedForLevel(question, level)) return;

              const signature = questionSignature(question);
              if (used.has(signature)) return;
              used.add(signature);
              questions.push(question);
              serial += 1;
            });
          });
        });
      });
    });

    const maxQuestions = Number(options.maxQuestions || 0);
    return maxQuestions > 0 ? questions.slice(0, maxQuestions) : questions;
  }

  function buildQuestions(options = {}) {
    const levelKey = normaliseLevelKey(options.level || options.questionLevel);
    if (!levelKey) return buildLegacyQuestions(options);

    const questions = levelKey === 'all'
      ? levelDefinitionsList().flatMap((level) => buildQuestionsForLevel(level, options))
      : buildQuestionsForLevel(LEVEL_DEFINITIONS[levelKey], options);

    const maxQuestions = Number(options.maxQuestions || 0);
    return maxQuestions > 0 ? questions.slice(0, maxQuestions) : questions;
  }

  const INTERVAL_ORDINALS = {
    1: 'unison',
    2: '2nd',
    3: '3rd',
    4: '4th',
    5: '5th',
    6: '6th',
    7: '7th',
    8: 'octave'
  };

  function expandIntervalAbbreviation(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const abbrevMatch = raw.match(/^([PpMmAaDd])\s*(\d)$/);
    if (abbrevMatch) {
      const qualityMap = { p: 'perfect', P: 'perfect', m: 'minor', M: 'major', a: 'augmented', A: 'augmented', d: 'diminished', D: 'diminished' };
      const quality = qualityMap[abbrevMatch[1]];
      const numberLabel = INTERVAL_ORDINALS[Number(abbrevMatch[2])];
      if (quality && numberLabel) {
        return numberLabel === 'unison' || numberLabel === 'octave'
          ? `${quality} ${numberLabel}`
          : `${quality} ${numberLabel}`;
      }
    }

    return raw;
  }

  function normaliseIntervalAnswer(value) {
    let text = expandIntervalAbbreviation(value)
      .toLowerCase()
      .replaceAll('♭', 'b')
      .replaceAll('♯', '#')
      .replaceAll('♮', 'n')
      .replace(/\bperf\.?\b/g, 'perfect')
      .replace(/\bmaj\.?\b/g, 'major')
      .replace(/\bmin\.?\b/g, 'minor')
      .replace(/\baug\.?\b/g, 'augmented')
      .replace(/\bdim\.?\b/g, 'diminished')
      .replace(/\b(1|1st|first|unison)\b/g, 'unison')
      .replace(/\b(2|2nd|second)\b/g, '2nd')
      .replace(/\b(3|3rd|third)\b/g, '3rd')
      .replace(/\b(4|4th|fourth)\b/g, '4th')
      .replace(/\b(5|5th|fifth)\b/g, '5th')
      .replace(/\b(6|6th|sixth)\b/g, '6th')
      .replace(/\b(7|7th|seventh)\b/g, '7th')
      .replace(/\b(8|8th|eighth|octave)\b/g, 'octave')
      .replace(/\b(major|minor|perfect|augmented|diminished)\s+(\d)\b/g, (_, quality, number) => `${quality} ${INTERVAL_ORDINALS[Number(number)] || number}`)
      .replace(/^8th$/, 'octave')
      .replace(/[^a-z0-9#]+/g, '');
    return text;
  }

  function sameInterval(left, right) {
    return normaliseIntervalAnswer(left) === normaliseIntervalAnswer(right);
  }

  const MC_CHOICE_COUNT = 4;

  function shuffleArray(items, random = Math.random) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Number(random()) * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function findPoolChoice(pool, label) {
    return pool.find((choice) => sameInterval(choice, label)) || null;
  }

  function parseIntervalFullLabel(label) {
    const text = String(label || '').trim();
    if (!text) return null;

    if (sameInterval(text, 'Perfect unison') || sameInterval(text, 'Unison')) {
      return { quality: 'Perfect', intervalLabel: 'Unison', diatonicSteps: 0, interval: INTERVALS[0] };
    }
    if (sameInterval(text, 'Perfect octave') || sameInterval(text, 'Octave')) {
      return { quality: 'Perfect', intervalLabel: 'Octave', diatonicSteps: 7, interval: INTERVALS[7] };
    }

    const match = text.match(/^(Perfect|Major|Minor|Augmented|Diminished)\s+(.+)$/i);
    if (!match) return null;

    const quality = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const interval = INTERVALS.find((item) => sameInterval(item.label, match[2].trim()));
    if (!interval) return null;

    return {
      quality,
      intervalLabel: interval.label,
      diatonicSteps: interval.diatonicSteps,
      interval
    };
  }

  function getCloseDistractors(correctAnswer, answerMode, pool) {
    const close = [];
    const add = (label) => {
      if (!label || sameInterval(label, correctAnswer)) return;
      const match = findPoolChoice(pool, label);
      if (match && !close.some((choice) => sameInterval(choice, match))) close.push(match);
    };

    if (answerMode === 'number') {
      const interval = INTERVALS.find((item) => sameInterval(item.label, correctAnswer));
      if (!interval) return close;

      if (sameInterval(correctAnswer, 'Unison')) add('Octave');
      if (sameInterval(correctAnswer, 'Octave')) add('Unison');

      const previous = getIntervalByDiatonicSteps(interval.diatonicSteps - 1);
      const next = getIntervalByDiatonicSteps(interval.diatonicSteps + 1);
      if (previous) add(previous.label);
      if (next) add(next.label);
      return close;
    }

    const parsed = parseIntervalFullLabel(correctAnswer);
    if (!parsed) return close;

    const { quality, diatonicSteps, interval } = parsed;
    if (!interval) return close;

    if (interval.family === 'major') {
      if (quality === 'Major') add(formatIntervalFullLabel('Minor', interval.label));
      else if (quality === 'Minor') add(formatIntervalFullLabel('Major', interval.label));

      const previous = getIntervalByDiatonicSteps(diatonicSteps - 1);
      const next = getIntervalByDiatonicSteps(diatonicSteps + 1);
      if (previous && previous.family === 'major') add(formatIntervalFullLabel(quality, previous.label));
      if (next && next.family === 'major') add(formatIntervalFullLabel(quality, next.label));
      return close;
    }

    if (interval.family === 'perfect') {
      if (quality === 'Perfect') {
        if (diatonicSteps === 0) add('Perfect octave');
        if (diatonicSteps === 7) add('Perfect unison');

        const previous = getIntervalByDiatonicSteps(diatonicSteps - 1);
        const next = getIntervalByDiatonicSteps(diatonicSteps + 1);
        if (previous) add(formatIntervalFullLabel('Perfect', previous.label));
        if (next) add(formatIntervalFullLabel('Perfect', next.label));

        if (diatonicSteps === 0) {
          add(formatIntervalFullLabel('Major', '2nd'));
          add(formatIntervalFullLabel('Minor', '2nd'));
        }
        if (diatonicSteps === 7) {
          add(formatIntervalFullLabel('Major', '7th'));
          add(formatIntervalFullLabel('Minor', '7th'));
        }
      }
      if (diatonicSteps === 3) {
        add('Augmented 4th');
        add('Diminished 5th');
      }
      if (diatonicSteps === 4) {
        add('Diminished 5th');
        add('Augmented 4th');
      }
    }

    return close;
  }

  function buildMcChoices(options = {}) {
    const correctAnswer = String(options.correctAnswer || '').trim();
    const answerMode = options.answerMode === 'quality' ? 'quality' : 'number';
    const pool = Array.isArray(options.pool) && options.pool.length
      ? options.pool.slice()
      : buildChoices(options);
    const random = typeof options.random === 'function' ? options.random : Math.random;

    const correctChoice = findPoolChoice(pool, correctAnswer) || correctAnswer;
    const closeDistractors = getCloseDistractors(correctChoice, answerMode, pool);
    const selected = [correctChoice];

    if (closeDistractors.length) {
      selected.push(closeDistractors[0]);
    } else {
      const fallback = pool.find((choice) => !sameInterval(choice, correctChoice));
      if (fallback) selected.push(fallback);
    }

    closeDistractors.slice(1).forEach((distractor) => {
      if (selected.length >= MC_CHOICE_COUNT) return;
      if (!selected.some((choice) => sameInterval(choice, distractor))) selected.push(distractor);
    });

    const remaining = shuffleArray(
      pool.filter((choice) => !selected.some((item) => sameInterval(item, choice))),
      random
    );
    while (selected.length < MC_CHOICE_COUNT && remaining.length) {
      selected.push(remaining.shift());
    }

    return shuffleArray(selected.slice(0, MC_CHOICE_COUNT), random);
  }

  return {
    AUDIO_BASE,
    NOTES,
    NATURAL_NOTES,
    CHROMATIC_WRITTEN_NOTES,
    INTERVALS,
    KEY_SIGNATURES,
    LEVEL_DEFINITIONS,
    SHARP_ORDER,
    FLAT_ORDER,
    STAVE_IMAGE_METRICS,
    applyKeySignatureToWrittenNote,
    buildChoices,
    buildMcChoices,
    buildQuestions,
    getCloseDistractors,
    buildQuestionsForLevel,
    calculateInterval,
    findKeySignature,
    findNote,
    findNoteByMidi,
    getAudioPath,
    getIntervalQuality,
    getKeySignatureAccidentalCount,
    getLedgerLines,
    getNotePositions,
    getStaffY,
    getStemDirection,
    getTargetForInterval,
    getLevelDefinition,
    levelDefinitionsList,
    noteStep,
    resolveInputMode,
    sameInterval,
    normaliseIntervalAnswer
  };
});
