(function initMelodicIntervalsData(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EchoAuralMelodicIntervals = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMelodicIntervalsData() {
  const AUDIO_BASE = 'audio/piano/';

  const NOTE_LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
  const SHARP_ORDER = ['F', 'C', 'G', 'D'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D'];

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

  const NATURAL_NOTES = NOTES.filter((note) => !note.accidental);

  const INTERVALS = [
    { id: '2nd', label: '2nd', diatonicSteps: 1, baseSemitones: 2, family: 'major' },
    { id: '3rd', label: '3rd', diatonicSteps: 2, baseSemitones: 4, family: 'major' },
    { id: '4th', label: '4th', diatonicSteps: 3, baseSemitones: 5, family: 'perfect' },
    { id: '5th', label: '5th', diatonicSteps: 4, baseSemitones: 7, family: 'perfect' },
    { id: 'octave', label: 'Octave', diatonicSteps: 7, baseSemitones: 12, family: 'perfect' }
  ];

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
    width: 666,
    height: 210,
    // Scanned from modules/melodic-intervals/assets/blank-treble-bar.png.
    // Treble staff lines sit at y = 63, 84, 105, 126, 147.
    topLineY: 63,
    bottomLineY: 147,
    lineSpace: 21,
    halfSpace: 10.5
  };

  function noteStep(note = {}) {
    return Number(note.octave || 0) * 7 + Number(NOTE_LETTER_INDEX[note.letter] || 0);
  }

  function findNote(id) {
    return NOTES.find((note) => note.id === id) || null;
  }

  function findNoteByMidi(midi) {
    return NOTES.find((note) => note.midi === Number(midi)) || null;
  }

  function findKeySignature(id) {
    return KEY_SIGNATURES.find((item) => item.id === id) || KEY_SIGNATURES[0];
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

  function getTargetForInterval(startNote, interval) {
    const startIndex = NATURAL_NOTES.findIndex((note) => note.id === startNote.id);
    if (startIndex < 0) return null;
    return NATURAL_NOTES[startIndex + interval.diatonicSteps] || null;
  }

  function applyKeySignatureToWrittenNote(noteOrId, keySignatureOrId) {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    const keySignature = typeof keySignatureOrId === 'string' ? findKeySignature(keySignatureOrId) : keySignatureOrId;
    if (!note || !keySignature) return null;
    const offset = Number((keySignature.accidentalMap || {})[note.letter] || 0);
    return findNoteByMidi(note.midi + offset);
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

  function buildNumberChoices(includeOctave = false) {
    return INTERVALS
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
    const answerMode = options.answerMode === 'quality' ? 'quality' : 'number';
    const includeOctave = Boolean(options.includeOctave);
    return answerMode === 'quality'
      ? buildQualityChoices(includeOctave)
      : buildNumberChoices(includeOctave);
  }

  function buildQuestions(options = {}) {
    const clef = options.clef || 'treble';
    const maxQuestions = Number(options.maxQuestions || 999);
    const questions = [];
    let serial = 1;

    KEY_SIGNATURES.forEach((keySignature) => {
      NATURAL_NOTES.forEach((startWrittenNote) => {
        INTERVALS.forEach((interval) => {
          const targetWrittenNote = getTargetForInterval(startWrittenNote, interval);
          if (!targetWrittenNote) return;

          const startSoundingNote = applyKeySignatureToWrittenNote(startWrittenNote, keySignature);
          const targetSoundingNote = applyKeySignatureToWrittenNote(targetWrittenNote, keySignature);
          if (!startSoundingNote || !targetSoundingNote) return;

          const semitoneDistance = targetSoundingNote.midi - startSoundingNote.midi;
          const intervalQuality = getIntervalQuality(interval, semitoneDistance);
          if (!intervalQuality) return;

          const fullLabel = `${intervalQuality} ${interval.label}`;
          questions.push({
            id: `MI${String(serial).padStart(3, '0')}`,
            moduleId: 'melodic-intervals',
            moduleTitle: 'Melodic Intervals',
            title: 'Melodic Interval',
            prompt: 'Listen to the two piano notes and identify the interval.',
            clef,
            direction: 'ascending',
            keySignatureId: keySignature.id,
            keySignatureLabel: keySignature.label,
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
            sequenceGapMs: 380,
            intervalId: interval.id,
            intervalLabel: interval.label,
            intervalNumberLabel: interval.label,
            intervalQuality,
            intervalFullLabel: fullLabel,
            intervalSteps: interval.diatonicSteps,
            answerNumber: interval.label,
            answerQuality: fullLabel,
            answerType: 'choice',
            mode: 'recognition',
            maxMarks: 1,
            totalNotes: 1,
            audioDurationSeconds: 2.4,
            semitoneDistance
          });
          serial += 1;
        });
      });
    });

    return questions.slice(0, maxQuestions);
  }

  function normaliseIntervalAnswer(value) {
    return String(value || '')
      .toLowerCase()
      .replaceAll('♭', 'b')
      .replaceAll('♯', '#')
      .replace(/\bperf\.?/g, 'perfect')
      .replace(/\bmaj\.?/g, 'major')
      .replace(/\bmin\.?/g, 'minor')
      .replace(/\baug\.?/g, 'augmented')
      .replace(/\bdim\.?/g, 'diminished')
      .replace(/^8th$/, 'octave')
      .replace(/[^a-z0-9#]+/g, '');
  }

  function sameInterval(left, right) {
    return normaliseIntervalAnswer(left) === normaliseIntervalAnswer(right);
  }

  return {
    AUDIO_BASE,
    NOTES,
    NATURAL_NOTES,
    INTERVALS,
    KEY_SIGNATURES,
    SHARP_ORDER,
    FLAT_ORDER,
    STAVE_IMAGE_METRICS,
    applyKeySignatureToWrittenNote,
    buildChoices,
    buildQuestions,
    findKeySignature,
    findNote,
    findNoteByMidi,
    getAudioPath,
    getIntervalQuality,
    getLedgerLines,
    getStaffY,
    getTargetForInterval,
    noteStep,
    sameInterval,
    normaliseIntervalAnswer
  };
});
