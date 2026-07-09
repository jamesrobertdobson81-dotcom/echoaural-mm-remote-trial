(function initMelodicIntervalsData(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EchoAuralMelodicIntervals = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMelodicIntervalsData() {
  const AUDIO_BASE = 'audio/piano/';

  const NOTE_LETTER_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

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
    { id: '2nd', label: '2nd', diatonicSteps: 1, GCSELabel: '2nd' },
    { id: '3rd', label: '3rd', diatonicSteps: 2, GCSELabel: '3rd' },
    { id: '4th', label: '4th', diatonicSteps: 3, GCSELabel: '4th' },
    { id: '5th', label: '5th', diatonicSteps: 4, GCSELabel: '5th' },
    { id: 'octave', label: 'Octave', diatonicSteps: 7, GCSELabel: 'Octave' }
  ];

  function noteStep(note = {}) {
    return Number(note.octave || 0) * 7 + Number(NOTE_LETTER_INDEX[note.letter] || 0);
  }

  function findNote(id) {
    return NOTES.find((note) => note.id === id) || null;
  }

  function getAudioPath(noteOrId) {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    return note ? `${AUDIO_BASE}${note.file}` : '';
  }

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

  function getStaffY(noteOrId, clef = 'treble') {
    const note = typeof noteOrId === 'string' ? findNote(noteOrId) : noteOrId;
    if (!note) return 105;

    // Treble clef top line is F5. Every diatonic step moves by half a
    // staff space. Current samples cover C4-E5: middle C ledger line to top space.
    const topLineStep = clef === 'treble'
      ? (5 * 7 + NOTE_LETTER_INDEX.F) // F5
      : (3 * 7 + NOTE_LETTER_INDEX.A); // A3 fallback
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

  function buildChoices() {
    return INTERVALS.map((interval) => interval.label);
  }

  function buildQuestions(options = {}) {
    const clef = options.clef || 'treble';
    const maxQuestions = Number(options.maxQuestions || 120);
    const questions = [];
    let serial = 1;

    NATURAL_NOTES.forEach((startNote) => {
      INTERVALS.forEach((interval) => {
        const targetNote = getTargetForInterval(startNote, interval);
        if (!targetNote) return;
        questions.push({
          id: `MI${String(serial).padStart(3, '0')}`,
          moduleId: 'melodic-intervals',
          moduleTitle: 'Melodic Intervals',
          title: 'Melodic Interval',
          prompt: 'Listen to the two piano notes and identify the interval.',
          clef,
          direction: 'ascending',
          startNoteId: startNote.id,
          targetNoteId: targetNote.id,
          startNoteLabel: startNote.label,
          targetNoteLabel: targetNote.label,
          startAudio: getAudioPath(startNote),
          targetAudio: getAudioPath(targetNote),
          audioSequence: [getAudioPath(startNote), getAudioPath(targetNote)],
          sequenceGapMs: 380,
          intervalId: interval.id,
          intervalLabel: interval.label,
          intervalSteps: interval.diatonicSteps,
          answer: interval.label,
          choices: buildChoices(),
          answerType: 'choice',
          mode: 'recognition',
          maxMarks: 1,
          totalNotes: 1,
          audioDurationSeconds: 2.4
        });
        serial += 1;
      });
    });

    return questions.slice(0, maxQuestions);
  }

  function normaliseIntervalAnswer(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/perfect|major|minor/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .replace(/^8th$/, 'octave')
      .trim();
  }

  function sameInterval(left, right) {
    return normaliseIntervalAnswer(left) === normaliseIntervalAnswer(right);
  }

  return {
    AUDIO_BASE,
    NOTES,
    NATURAL_NOTES,
    INTERVALS,
    STAVE_IMAGE_METRICS,
    buildChoices,
    buildQuestions,
    findNote,
    getAudioPath,
    getStaffY,
    getLedgerLines,
    noteStep,
    sameInterval,
    normaliseIntervalAnswer
  };
});
