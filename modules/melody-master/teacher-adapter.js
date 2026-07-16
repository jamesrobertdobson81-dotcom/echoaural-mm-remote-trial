(function initMelodyMasterTeacherAdapter(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else {
    root.EchoAuralTeacherAdapters = root.EchoAuralTeacherAdapters || {};
    root.EchoAuralTeacherAdapters['melody-master'] = factory({ browserGlobal: root });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function createMelodyMasterAdapter(context = {}) {
  const path = context.path || (typeof require === 'function' ? require('path') : null);
  const fs = context.fs || (typeof require === 'function' ? require('fs') : null);
  const vm = context.vm || (typeof require === 'function' ? require('vm') : null);
  const projectRoot = context.projectRoot || (path ? path.resolve(__dirname, '..', '..') : '');
  const moduleDir = path ? path.join(projectRoot, 'modules', 'melody-master') : '';
  const clipsPath = path ? path.join(moduleDir, 'clips.js') : '';
  const getAudioDurationSeconds = typeof context.getAudioDurationSeconds === 'function' ? context.getAudioDurationSeconds : () => 10;
  let cachedQuestions = null;

  function fallbackQuestions() {
    return [{
      id: 'MM001',
      file: 'questions/MM001/MM001-audio.mp3',
      questionImage: 'questions/MM001/MM001-question.png',
      question: 'Complete the melody.',
      answerPitches: ['G4', 'G4', 'A4', 'B4', 'C5', 'D5'],
      noteImage: 'assets/icons/notes/semiquaver-sibelius.png',
      noteImageFallback: 'assets/icons/notes/semiquaver-sibelis.png',
      dictationLayout: {
        topLinePitch: 'E5', staffTopY: 31.5, staffStepY: 4.95, homeY: 2,
        noteWidthPercent: 3.95, noteHeightPercent: 47, noteStretchX: 1.95,
        staffPitches: ['F5','E5','D5','C5','B4','A4','G4','F4','E4'],
        noteCountLabel: '6 semiquavers',
        slots: [
          { x: 70.6, pitch: 'G4' }, { x: 73.6, pitch: 'G4' }, { x: 76.6, pitch: 'A4' },
          { x: 79.6, pitch: 'B4' }, { x: 82.6, pitch: 'C5' }, { x: 85.6, pitch: 'D5' }
        ]
      }
    }];
  }

  function loadQuestions() {
    if (cachedQuestions) return cachedQuestions;
    if (context.browserGlobal) {
      const levelledQuestions = Array.isArray(context.browserGlobal.melodyMasterLevelledClips) ? context.browserGlobal.melodyMasterLevelledClips : [];
      const sourceQuestions = Array.isArray(context.browserGlobal.melodyClips) ? context.browserGlobal.melodyClips : [];
      const legacyQuestions = Array.isArray(context.browserGlobal.clips) ? context.browserGlobal.clips : [];
      cachedQuestions = (context.useLevelledQuestions && levelledQuestions.length ? levelledQuestions : sourceQuestions.length ? sourceQuestions : legacyQuestions.length ? legacyQuestions : fallbackQuestions()).slice();
      return cachedQuestions;
    }

    try {
      const source = fs.readFileSync(clipsPath, 'utf8');
      const sandbox = {};
      const loadedQuestions = vm.runInNewContext(`${source}\n;({ sourceQuestions: typeof melodyClips !== 'undefined' && Array.isArray(melodyClips) ? melodyClips : [], levelledQuestions: typeof melodyMasterLevelledClips !== 'undefined' && Array.isArray(melodyMasterLevelledClips) ? melodyMasterLevelledClips : [], legacyQuestions: typeof clips !== 'undefined' && Array.isArray(clips) ? clips : [] });`, sandbox, {
        filename: clipsPath,
        timeout: 1000
      });
      const questions = context.useLevelledQuestions && loadedQuestions.levelledQuestions.length
        ? loadedQuestions.levelledQuestions
        : loadedQuestions.sourceQuestions.length
          ? loadedQuestions.sourceQuestions
          : loadedQuestions.legacyQuestions;
      if (!Array.isArray(questions) || !questions.length) throw new Error('No melodyClips array found.');
      cachedQuestions = questions.slice();
    } catch (error) {
      console.error('[Melody Master adapter] Could not load clips.js:', error.message);
      cachedQuestions = fallbackQuestions();
    }
    return cachedQuestions;
  }

  function normalisePitch(value) {
    return String(value || '').trim().toUpperCase();
  }

  function normaliseLayout(question = {}) {
    const layout = question.dictationLayout || {};
    const slots = Array.isArray(layout.slots) && layout.slots.length
      ? layout.slots
      : Array.isArray(question.answerPitches)
        ? question.answerPitches.map((pitch, index) => ({ x: 70 + (index * 3), pitch }))
        : [];

    return {
      topLinePitch: layout.topLinePitch || 'E5',
      staffTopY: Number.isFinite(Number(layout.staffTopY)) ? Number(layout.staffTopY) : 31.5,
      staffStepY: Number.isFinite(Number(layout.staffStepY)) ? Number(layout.staffStepY) : 4.95,
      homeY: Number.isFinite(Number(layout.homeY)) ? Number(layout.homeY) : 2,
      snapToleranceY: Number.isFinite(Number(layout.snapToleranceY)) ? Number(layout.snapToleranceY) : 10,
      noteWidthPercent: Number.isFinite(Number(layout.noteWidthPercent)) ? Number(layout.noteWidthPercent) : 3.95,
      noteHeightPercent: Number.isFinite(Number(layout.noteHeightPercent)) ? Number(layout.noteHeightPercent) : 47,
      noteStretchX: Number.isFinite(Number(layout.noteStretchX)) ? Number(layout.noteStretchX) : 1.95,
      visualAnchorY: Number.isFinite(Number(layout.visualAnchorY)) ? Number(layout.visualAnchorY) : undefined,
      noteCountLabel: layout.noteCountLabel || `${slots.length} notes`,
      staffPitches: Array.isArray(layout.staffPitches) && layout.staffPitches.length
        ? layout.staffPitches
        : ['F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4'],
      slots
    };
  }

  function getCorrectSlots(question = {}) {
    const layout = normaliseLayout(question);
    return layout.slots.map((slot, index) => {
      const fallbackPitch = Array.isArray(question.answerPitches) ? question.answerPitches[index] : '';
      const pitch = slot.pitch || fallbackPitch;
      return {
        pitch: normalisePitch(pitch),
        acceptedPitches: Array.isArray(slot.acceptedPitches) && slot.acceptedPitches.length
          ? slot.acceptedPitches.map(normalisePitch)
          : [normalisePitch(pitch)]
      };
    });
  }

  function normaliseGuidedPlayback(question = {}, audioDurationSeconds = 10) {
    const guide = question.guidedPlayback && typeof question.guidedPlayback === 'object' ? question.guidedPlayback : {};
    const visibleScoreRatio = Number(guide.visibleScoreRatio || 0.44);
    const visualStartSeconds = Math.max(0, Number(guide.visualStartSeconds || 0));
    const rawVisualEnd = Number(guide.visualEndSeconds);
    const useFullAudioDuration = guide.useFullAudioDuration === true || !Number.isFinite(rawVisualEnd) || rawVisualEnd <= 0;
    const visualEndSeconds = useFullAudioDuration
      ? Math.max(1, Number(audioDurationSeconds || 10))
      : Math.max(visualStartSeconds + 1, rawVisualEnd);

    return {
      mode: 'guided-thirds',
      scoreCoverage: useFullAudioDuration ? 'full-audio' : 'partial-audio',
      useFullAudioDuration,
      visualStartSeconds,
      visualEndSeconds,
      visualDurationSeconds: Math.max(1, visualEndSeconds - visualStartSeconds),
      visibleScoreRatio: Math.max(0.33, Math.min(0.72, Number.isFinite(visibleScoreRatio) ? visibleScoreRatio : 0.44)),
      leadInSeconds: Math.max(0, Number(guide.leadInSeconds || 2))
    };
  }

  function prepareQuestion(question = {}, options = {}) {
    const index = Number(options.index || 0);
    const layout = normaliseLayout(question);
    const audioPath = question.file || question.audio || '';
    const fullAudioPath = path && audioPath && !/^(https?:)?\/\//i.test(audioPath) && !audioPath.startsWith('/')
      ? path.join(moduleDir, audioPath)
      : audioPath;
    const audioDurationSeconds = Number(question.audioDurationSeconds || getAudioDurationSeconds(fullAudioPath) || 10);
    const guidedPlayback = normaliseGuidedPlayback(question, audioDurationSeconds);
    const correctSlots = getCorrectSlots(question);

    return {
      moduleId: 'melody-master',
      moduleTitle: 'Melody Master',
      answerType: 'melody-dictation',
      index,
      id: question.id || `MM${String(index + 1).padStart(3, '0')}`,
      title: question.title || question.id || `Question ${index + 1}`,
      composer: question.composer || '',
      work: question.work || '',
      movement: question.movement || '',
      question: question.question || question.task || 'Complete the melody.',
      prompt: question.question || question.task || 'Complete the melody.',
      audio: audioPath,
      audioDurationSeconds,
      guidedPlayback,
      questionImage: question.questionImage || '',
      noteImage: question.noteImage || layout.slots.find((slot) => slot.icon)?.icon || 'assets/icons/notes/semiquaver-sibelius.png',
      noteImageFallback: question.noteImageFallback || 'assets/icons/notes/semiquaver-sibelis.png',
      maxMarks: correctSlots.length,
      totalNotes: correctSlots.length,
      correctSlots,
      dictationLayout: {
        topLinePitch: layout.topLinePitch,
        staffTopY: layout.staffTopY,
        staffStepY: layout.staffStepY,
        homeY: layout.homeY,
        snapToleranceY: layout.snapToleranceY,
        noteWidthPercent: layout.noteWidthPercent,
        noteHeightPercent: layout.noteHeightPercent,
        noteStretchX: layout.noteStretchX,
        visualAnchorY: layout.visualAnchorY,
        noteCountLabel: layout.noteCountLabel,
        staffPitches: layout.staffPitches,
        slots: layout.slots.map((slot, slotIndex) => ({
          index: slotIndex,
          x: Number(slot.x),
          icon: slot.icon || question.noteImage || 'assets/icons/notes/semiquaver-sibelius.png',
          iconFallback: slot.iconFallback || question.noteImageFallback || 'assets/icons/notes/semiquaver-sibelis.png',
          rhythm: slot.rhythm || '',
          homeY: slot.homeY,
          visualAnchorY: slot.visualAnchorY,
          snapYOffset: slot.snapYOffset
        }))
      }
    };
  }

  function scorePitchList(question = {}, answers = []) {
    const correctSlots = getCorrectSlots(question);
    let score = 0;
    correctSlots.forEach((slot, index) => {
      const answer = normalisePitch(answers[index]);
      if (answer && slot.acceptedPitches.includes(answer)) score += 1;
    });
    return { score, total: correctSlots.length };
  }

  function checkAnswer(question = {}, studentAnswer = [], context = {}) {
    const answers = Array.isArray(studentAnswer) ? studentAnswer : Array.isArray(context.answers) ? context.answers : [];
    const fallback = scorePitchList(question, answers);
    const clientScoring = context.scoring && typeof context.scoring === 'object' ? context.scoring : {};
    return {
      ...clientScoring,
      score: Number(clientScoring.awardedMarks ?? clientScoring.score ?? fallback.score),
      total: Number(clientScoring.maxMarks ?? clientScoring.total ?? fallback.total),
      pitchMarksAwarded: Number(clientScoring.pitchMarksAwarded ?? fallback.score),
      pitchMarksAvailable: Number(clientScoring.pitchMarksAvailable ?? fallback.total),
      shortComment: clientScoring.shortComment || '',
      correct: Number(clientScoring.awardedMarks ?? fallback.score) >= Number(clientScoring.maxMarks ?? fallback.total),
      matchType: 'melody-dictation'
    };
  }

  return {
    id: 'melody-master',
    title: 'Melody Master',
    description: 'Melodic dictation with the existing draggable-note Melody Master engine.',
    studentMode: 'melody-master',
    getQuestions: loadQuestions,
    prepareQuestion,
    checkAnswer
  };
});
