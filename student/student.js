(() => {
  const els = {
    roomPill: document.getElementById('roomPill'),
    waitingPanel: document.getElementById('waitingPanel'),
    waitingTitle: document.getElementById('waitingTitle'),
    waitingMessage: document.getElementById('waitingMessage'),
    moduleEyebrow: document.getElementById('moduleEyebrow'),
    questionPanel: document.getElementById('questionPanel'),
    questionModuleEyebrow: document.getElementById('questionModuleEyebrow'),
    questionTitle: document.getElementById('questionTitle'),
    questionPrompt: document.getElementById('questionPrompt'),
    studentAudio: document.getElementById('studentAudio'),
    manualPlayButton: document.getElementById('manualPlayButton'),
    enableAudioButton: document.getElementById('enableAudioButton'),
    audioStatus: document.getElementById('audioStatus'),
    answerArea: document.getElementById('answerArea'),
    submitButton: document.getElementById('submitButton'),
    feedbackPanel: document.getElementById('feedbackPanel')
  };

  const mixedEls = {
    sideRoomCode: document.getElementById('sideRoomCode'),
    sideStudentName: document.getElementById('sideStudentName'),
    sideStatus: document.getElementById('sideStatus'),
    roundText: document.getElementById('roundText'),
    progressInner: document.getElementById('progressInner'),
    scoreText: document.getElementById('scoreText'),
    streakText: document.getElementById('streakText'),
    xpText: document.getElementById('xpText'),
    classroomStudentLine: document.getElementById('classroomStudentLine'),
    answerHint: document.getElementById('answerHint'),
    topbarModuleIcon: document.getElementById('topbarModuleIcon'),
    topbarModuleMain: document.getElementById('topbarModuleMain'),
    topbarModuleGradient: document.getElementById('topbarModuleGradient'),
    sideModuleIcon: document.getElementById('sideModuleIcon'),
    sideModuleMain: document.getElementById('sideModuleMain'),
    sideModuleGradient: document.getElementById('sideModuleGradient'),
    waitingModuleIcon: document.getElementById('waitingModuleIcon'),
    centreModuleIcon: document.getElementById('centreModuleIcon'),
    centreModuleMain: document.getElementById('centreModuleMain'),
    centreModuleGradient: document.getElementById('centreModuleGradient'),
    answerModuleIcon: document.getElementById('answerModuleIcon'),
    answerModuleMain: document.getElementById('answerModuleMain'),
    answerModuleGradient: document.getElementById('answerModuleGradient')
  };

  const examEls = {
    genericLayout: document.getElementById('genericClassroomLayout'),
    layout: document.getElementById('examLabLiveLayout'),
    roomCode: document.getElementById('examLabRoomCode'),
    studentName: document.getElementById('examLabStudentName'),
    studentStatus: document.getElementById('examLabStudentStatus'),
    playState: document.getElementById('examLabPlayState'),
    waiting: document.getElementById('examLabWaiting'),
    scoreScroll: document.getElementById('examLabScoreScroll'),
    scoreCanvas: document.getElementById('examLabScoreCanvas'),
    scoreImage: document.getElementById('examLabScoreImage'),
    scoreMasks: document.getElementById('examLabScoreMasks'),
    noScore: document.getElementById('examLabNoScore'),
    zoomOut: document.getElementById('examLabZoomOut'),
    zoomIn: document.getElementById('examLabZoomIn'),
    zoomLabel: document.getElementById('examLabZoomLabel'),
    fitScore: document.getElementById('examLabFitScore'),
    form: document.getElementById('examLabAnswerForm'),
    questionList: document.getElementById('examLabQuestionList'),
    answerProgress: document.getElementById('examLabAnswerProgress'),
    formMessage: document.getElementById('examLabFormMessage'),
    submitButton: document.getElementById('examLabSubmitButton'),
    feedback: document.getElementById('examLabPrivateFeedback')
  };

  const params = new URLSearchParams(window.location.search);
  let roomCode = normaliseRoomCode(params.get('room') || window.localStorage.getItem('ea_classroom_last_room'));
  let studentId = String(params.get('student') || window.sessionStorage.getItem('ea_classroom_student_tab_id') || '').trim();
  let studentName = String(params.get('name') || window.localStorage.getItem('ea_classroom_student_name') || '').trim();
  let pollTimer = null;
  let currentState = null;
  let currentQuestionRunId = null;
  let lastPlaybackId = '';
  let lastStudentAudioPlaybackId = '';
  let selectedAnswer = '';
  let submitted = false;
  let studentAudioUnlocked = false;
  let studentAudioTimer = null;
  let examLabAccessToken = roomCode ? (window.sessionStorage.getItem(`ea_classroom_access_${roomCode}`) || '') : '';
  let examLabRenderedRunId = null;
  let examLabZoom = 1;
  let examLabFeedbackKey = '';

  const SILENT_AUDIO_DATA_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const MI_NOTE_ASSET = '/modules/melody-master/assets/icons/notes/crotchet-sibelius.png';
  const MI_SCORE_ASSET = '/modules/melodic-intervals/assets/blank-treble-bar.png';
  const MI_STAVE_WIDTH = 666;
  const MI_STAVE_HEIGHT = 210;
  const MI_NOTE_START_X = 240;
  const MI_NOTE_TARGET_X = 360;
  const MI_NOTE_LEDGER_WIDTH = 48;
  const INTERVAL_QUALITY_ORDER = ['Major', 'Minor', 'Perfect', 'Augmented', 'Diminished'];
  const INTERVAL_NUMBER_ORDER = ['Unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave'];
  const INSTRUMENT_ICON_BASE_PATH = '/assets/icons/instruments/';
  const INSTRUMENT_ICON_MAP = {
    accordion: 'accordion.svg',
    violin: 'violin.svg',
    viola: 'viola.svg',
    cello: 'cello.svg',
    violoncello: 'cello.svg',
    'double bass': 'double-bass.svg',
    contrabass: 'double-bass.svg',
    flute: 'flute.svg',
    piccolo: 'piccolo.svg',
    recorder: 'recorder.svg',
    oboe: 'oboe.svg',
    clarinet: 'clarinet.svg',
    'bass clarinet': 'bass-clarinet.svg',
    bassoon: 'bassoon.svg',
    saxophone: 'saxophone.svg',
    'alto saxophone': 'saxophone.svg',
    'tenor saxophone': 'saxophone.svg',
    trumpet: 'trumpet.svg',
    horn: 'french-horn.svg',
    'french horn': 'french-horn.svg',
    trombone: 'trombone.svg',
    tuba: 'tuba.svg',
    piano: 'piano.svg',
    organ: 'organ.svg',
    harpsichord: 'harpsichord.svg',
    guitar: 'guitar.svg',
    'acoustic guitar': 'acoustic-guitar.svg',
    'classical guitar': 'guitar.svg',
    'electric guitar': 'electric-guitar.svg',
    'bass guitar': 'bass-guitar.svg',
    harp: 'harp.svg',
    timpani: 'timpani.svg',
    'kettle drums': 'timpani.svg',
    'bass drum': 'bass-drum.svg',
    'snare drum': 'snare-drum.svg',
    'side drum': 'snare-drum.svg',
    triangle: 'triangle.svg',
    cymbals: 'cymbals.svg',
    xylophone: 'xylophone.svg',
    glockenspiel: 'glockenspiel.svg',
    marimba: 'marimba.svg',
    vibraphone: 'vibraphone.svg',
    voice: 'voice.svg',
    soprano: 'voice.svg',
    alto: 'voice.svg',
    tenor: 'voice.svg',
    bass: 'voice.svg',
    choir: 'choir.svg'
  };

  function escapeHTML(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normaliseRoomCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function cleanInstrumentText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normaliseInstrumentIconKey(value) {
    return cleanInstrumentText(value)
      .replaceAll('&', 'and')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function slugifyInstrument(value) {
    return normaliseInstrumentIconKey(value).replace(/\s+/g, '-');
  }

  function getInstrumentIconFileName(instrument) {
    const key = normaliseInstrumentIconKey(instrument);
    return INSTRUMENT_ICON_MAP[key] || `${slugifyInstrument(instrument)}.svg`;
  }

  function getInstrumentIconMarkup(instrument) {
    const safeInstrument = String(instrument || '').trim() || 'Instrument';
    const src = `${INSTRUMENT_ICON_BASE_PATH}${getInstrumentIconFileName(safeInstrument)}`;
    return `
      <span class="instrument-icon-shell" aria-hidden="true">
        <img
          class="instrument-icon-img"
          src="${escapeHTML(src)}"
          alt=""
          loading="lazy"
          decoding="async"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
        />
        <span class="icon-fallback">♪</span>
      </span>
    `;
  }

  function ensureStudentId() {
    if (!studentId) studentId = `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
    return studentId;
  }

  function getModulePresentation(moduleId = 'mixed') {
    if (moduleId === 'instrument-identifier') {
      return {
        id: 'instrument-identifier',
        title: 'Instrument Identifier',
        main: 'Instrument',
        gradient: 'Identifier',
        icon: '/assets/icons/modules/instrument-identifier.png?v=8',
        hint: 'Choose the instrument you can hear, then submit your answer.'
      };
    }
    if (moduleId === 'melodic-intervals') {
      return {
        id: 'melodic-intervals',
        title: 'Melodic Intervals',
        main: 'Melodic',
        gradient: 'Intervals',
        icon: '/assets/icons/modules/melodic-intervals.png',
        hint: 'Read the stave, listen to the two notes, then choose the interval.'
      };
    }
    if (moduleId === 'exam-lab') {
      return {
        id: 'exam-lab',
        title: 'Exam Lab',
        main: 'Exam',
        gradient: 'Lab',
        icon: '/assets/icons/modules/exam-lab.png',
        hint: 'Complete the private answer sheet, then submit when ready.'
      };
    }
    return {
      id: 'mixed',
      title: 'Mixed Apps',
      main: 'Mixed',
      gradient: 'Apps',
      icon: '/assets/icons/dashboard/progress-mode.png',
      hint: 'Your answer panel will update for each app question.'
    };
  }

  function setImage(el, src) {
    if (!el || !src || el.getAttribute('src') === src) return;
    el.setAttribute('src', src);
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function setModulePresentation(moduleId = 'mixed') {
    const presentation = getModulePresentation(moduleId);
    document.body.dataset.module = presentation.id;

    [mixedEls.topbarModuleIcon, mixedEls.sideModuleIcon, mixedEls.waitingModuleIcon, mixedEls.centreModuleIcon, mixedEls.answerModuleIcon]
      .forEach((icon) => setImage(icon, presentation.icon));

    [
      [mixedEls.topbarModuleMain, mixedEls.topbarModuleGradient],
      [mixedEls.sideModuleMain, mixedEls.sideModuleGradient],
      [mixedEls.centreModuleMain, mixedEls.centreModuleGradient],
      [mixedEls.answerModuleMain, mixedEls.answerModuleGradient]
    ].forEach(([mainEl, gradientEl]) => {
      setText(mainEl, presentation.main);
      setText(gradientEl, presentation.gradient);
    });

    setText(mixedEls.answerHint, presentation.hint);
    return presentation;
  }

  function updateMixedSummary(state = currentState || {}) {
    const quiz = state.quiz || {};
    const current = Number(quiz.currentQuestionNumber || (state.question ? 1 : 0));
    const totalQuestions = Number(quiz.totalQuestions || 0);
    const student = (state.students || []).find((item) => item.id === studentId) || {};
    const score = Number(student.cumulativeScore || 0);
    const total = Number(student.cumulativeTotal || 0);
    const submitted = Number(student.questionsSubmitted || 0);
    const accuracy = total ? `${Math.round((score / total) * 100)}%` : '—';

    setText(mixedEls.sideRoomCode, state.roomCode || roomCode || '—');
    setText(mixedEls.sideStudentName, studentName || 'Student');
    setText(mixedEls.sideStatus, state.question ? (state.student?.submitted ? 'Submitted' : 'Answering') : 'Waiting');
    setText(mixedEls.classroomStudentLine, `${studentName || 'You'} are connected to the mixed live quiz.`);
    setText(mixedEls.roundText, totalQuestions ? `Question ${Math.max(current, 0)} of ${totalQuestions}` : 'Waiting for teacher');
    setText(mixedEls.scoreText, `Score: ${score} / ${total}`);
    setText(mixedEls.streakText, `Submitted: ${submitted}`);
    setText(mixedEls.xpText, `Accuracy: ${accuracy}`);
    if (mixedEls.progressInner) {
      const progress = totalQuestions ? Math.max(0, Math.min(100, ((current - (state.student?.submitted ? 0 : 1)) / totalQuestions) * 100)) : 0;
      mixedEls.progressInner.style.width = `${progress}%`;
    }
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function setAudioStatus(message = '', state = '') {
    els.audioStatus.textContent = message;
    els.audioStatus.className = `status-message ${state ? `is-${state}` : ''}`.trim();
  }

  async function api(path, body = null, method = body ? 'POST' : 'GET') {
    const options = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(window.EchoAuralClassroom.buildApiUrl(path), options);
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_error) { throw new Error('The classroom server returned an unreadable response.'); }
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function resolveModuleAudioPath(rawValue = '', moduleIdValue = '') {
    const raw = String(rawValue || '').trim();
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    const moduleId = moduleIdValue || currentState?.questionModuleId || currentState?.moduleId || '';
    if (moduleId === 'instrument-identifier') return `/modules/instrument-identifier/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'texture-trainer') return `/modules/texture-trainer/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'melody-master') return `/modules/melody-master/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'melodic-intervals') return `/modules/melodic-intervals/${raw.replace(/^\.\//, '')}`;
    return raw;
  }

  function resolveAudioPath(question = {}) {
    return resolveModuleAudioPath(question.audio, question.moduleId || currentState?.questionModuleId || currentState?.moduleId);
  }

  function resolveAudioSequence(question = {}) {
    const moduleId = question.moduleId || currentState?.questionModuleId || currentState?.moduleId || '';
    const sequence = Array.isArray(question.audioSequence) && question.audioSequence.length
      ? question.audioSequence
      : [question.audio, question.targetAudio].filter(Boolean);
    return sequence.map((item) => resolveModuleAudioPath(item, moduleId)).filter(Boolean);
  }

  function resolveStaffAsset(raw = '') {
    const clean = String(raw || '').trim();
    if (!clean) return MI_SCORE_ASSET;
    if (/^(https?:)?\/\//i.test(clean) || clean.startsWith('/')) return clean;
    return `/modules/melodic-intervals/${clean.replace(/^\.\//, '')}`;
  }

  function setWaiting(message = '') {
    setModulePresentation('mixed');
    updateMixedSummary(currentState || {});
    els.waitingPanel.classList.remove('hidden');
    els.questionPanel.classList.add('hidden');
    els.waitingTitle.textContent = 'Waiting…';
    els.waitingMessage.textContent = message || 'Wait for your teacher to start the question.';
  }

  function showQuestionPanel() {
    els.waitingPanel.classList.add('hidden');
    els.questionPanel.classList.remove('hidden');
  }

  async function unlockStudentAudio() {
    try {
      els.studentAudio.pause();
      els.studentAudio.src = SILENT_AUDIO_DATA_URI;
      els.studentAudio.currentTime = 0;
      els.studentAudio.muted = true;
      await els.studentAudio.play();
      els.studentAudio.pause();
      els.studentAudio.currentTime = 0;
      els.studentAudio.muted = false;
      studentAudioUnlocked = true;
      els.enableAudioButton.disabled = true;
      els.enableAudioButton.textContent = 'Audio enabled';
      setAudioStatus('Audio enabled. The excerpt will play from this computer when your teacher presses Play.', 'good');
    } catch (_error) {
      studentAudioUnlocked = false;
      setAudioStatus('Audio was blocked. Click Enable Audio again, then keep this tab open.', 'bad');
    }
  }

  function playAudioFile(url) {
    return new Promise((resolve, reject) => {
      els.studentAudio.pause();
      els.studentAudio.currentTime = 0;
      els.studentAudio.onended = () => resolve();
      els.studentAudio.onerror = () => reject(new Error('The audio file could not be loaded.'));
      els.studentAudio.src = url;
      const attempt = els.studentAudio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(reject);
    });
  }

  async function playStudentQuestionAudio(question = currentState?.question || {}) {
    const sequence = resolveAudioSequence(question);
    const urls = sequence.length > 1 ? sequence : [resolveAudioPath(question)].filter(Boolean);
    if (!urls.length) return;

    try {
      for (let index = 0; index < urls.length; index += 1) {
        await playAudioFile(urls[index]);
        if (index < urls.length - 1) await delay(question.sequenceGapMs || 380);
      }
    } catch (_error) {
      studentAudioUnlocked = false;
      els.enableAudioButton.disabled = false;
      els.enableAudioButton.textContent = 'Enable audio for remote play';
      setAudioStatus('Your browser blocked the excerpt. Click Enable Audio, then ask the teacher to play again.', 'bad');
    }
  }

  function scheduleStudentAudio(state, isNewPlayback = false) {
    const playback = state && state.playback ? state.playback : null;
    const playbackId = playback && playback.id ? String(playback.id) : '';
    const question = state && state.question ? state.question : {};
    const audioPath = resolveAudioPath(question);

    if (!playbackId || !audioPath || !isNewPlayback || playbackId === lastStudentAudioPlaybackId) return;
    lastStudentAudioPlaybackId = playbackId;

    if (studentAudioTimer) {
      window.clearTimeout(studentAudioTimer);
      studentAudioTimer = null;
    }

    const serverNow = Number(state.serverNow || Date.now());
    const audioStartAt = Number(playback.audioStartAt || serverNow);
    const msUntilAudio = Math.max(0, audioStartAt - serverNow);

    els.studentAudio.pause();
    els.studentAudio.src = audioPath;
    els.studentAudio.currentTime = 0;
    els.studentAudio.muted = false;
    els.studentAudio.volume = 1;
    els.studentAudio.load();

    setAudioStatus(studentAudioUnlocked
      ? 'Get ready — the excerpt will play from this computer.'
      : 'Click Enable Audio if you do not hear the excerpt.', studentAudioUnlocked ? 'good' : '');

    studentAudioTimer = window.setTimeout(() => playStudentQuestionAudio(question), msUntilAudio);
  }

  function pct(value, total) {
    return `${((Number(value) || 0) / total) * 100}%`;
  }

  function positionStyle(x, y) {
    return `left:${pct(x, MI_STAVE_WIDTH)};top:${pct(y, MI_STAVE_HEIGHT)};`;
  }

  function normaliseIntervalNumberLabel(value = '') {
    const clean = String(value || '').trim();
    if (/^unison$/i.test(clean)) return 'Unison';
    if (/^octave$/i.test(clean)) return 'Octave';
    return clean;
  }

  function parseQualityIntervalChoice(choice = '') {
    const match = String(choice || '').trim().match(/^(Perfect|Major|Minor|Augmented|Diminished)\s+(.+)$/i);
    if (!match) return null;
    const quality = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const number = normaliseIntervalNumberLabel(match[2]);
    if (!INTERVAL_QUALITY_ORDER.includes(quality) || !INTERVAL_NUMBER_ORDER.includes(number)) return null;
    return { label: String(choice || '').trim(), quality, number };
  }

  function getSplitIntervalChoiceData(choices = []) {
    const options = choices.map(parseQualityIntervalChoice).filter(Boolean);
    const qualities = INTERVAL_QUALITY_ORDER.filter((quality) => options.some((option) => option.quality === quality));
    const numbers = INTERVAL_NUMBER_ORDER.filter((number) => options.some((option) => option.number === number));
    return { options, qualities, numbers };
  }

  function getSplitIntervalAnswer(options = [], quality = '', number = '') {
    if (!quality || !number) return '';
    const matchingOption = options.find((option) => option.quality === quality && option.number === number);
    return matchingOption ? matchingOption.label : `${quality} ${number}`;
  }

  function getIntervalData() {
    return window.EchoAuralMelodicIntervals || null;
  }

  function intervalLedgerMarkup(data, note, x, clef) {
    if (!data || typeof data.getLedgerLines !== 'function') return '';
    return data.getLedgerLines(note, clef).map((lineY) => {
      const left = x - (MI_NOTE_LEDGER_WIDTH / 2);
      return `<span class="mixed-mi-note-ledger" aria-hidden="true" style="left:${pct(left, MI_STAVE_WIDTH)};top:${pct(lineY - 1.5, MI_STAVE_HEIGHT)};width:${pct(MI_NOTE_LEDGER_WIDTH, MI_STAVE_WIDTH)};height:${pct(3, MI_STAVE_HEIGHT)};"></span>`;
    }).join('');
  }

  function intervalAccidentalMarkup(note, x, y) {
    if (!note || !note.accidental) return '';
    return `<span class="mixed-mi-accidental" aria-hidden="true" style="${positionStyle(x - 32, y + 1)}">${escapeHTML(note.accidental)}</span>`;
  }

  function intervalNoteMarkup(data, note, x, clef) {
    if (!data || !note || typeof data.getStaffY !== 'function') return '';
    const y = data.getStaffY(note, clef);
    return `
      ${intervalLedgerMarkup(data, note, x, clef)}
      ${intervalAccidentalMarkup(note, x, y)}
      <img class="mixed-mi-crotchet-note" src="${MI_NOTE_ASSET}" alt="" aria-hidden="true" draggable="false" style="${positionStyle(x, y)}" />
    `;
  }

  function renderQuestionVisual(question = {}) {
    if (question.moduleId !== 'melodic-intervals') return '';
    const data = getIntervalData();
    const startNote = data && typeof data.findNote === 'function' ? data.findNote(question.startNoteId) : null;
    const targetNote = data && typeof data.findNote === 'function' ? data.findNote(question.targetNoteId) : null;
    if (!data || !startNote || !targetNote) return '';
    const clef = question.clef || 'treble';
    return `
      <div class="mixed-mi-stave-card" aria-label="Interval stave">
        <div class="mixed-mi-stave-stage">
          <img class="mixed-mi-score-bg" src="${escapeHTML(resolveStaffAsset(question.staffAsset))}" alt="" aria-hidden="true" draggable="false" />
          ${intervalNoteMarkup(data, startNote, MI_NOTE_START_X, clef)}
          ${intervalNoteMarkup(data, targetNote, MI_NOTE_TARGET_X, clef)}
        </div>
        <p class="mixed-mi-note-hint">${escapeHTML(question.keySignatureLabel || 'Listen to the two notes, then choose the interval.')}</p>
      </div>
    `;
  }

  function renderAnswerControls(question = {}) {
    submitted = Boolean(currentState?.student?.submitted);
    selectedAnswer = '';
    els.feedbackPanel.classList.add('hidden');
    els.feedbackPanel.innerHTML = '';
    els.feedbackPanel.classList.remove('is-correct', 'is-incorrect');
    els.submitButton.disabled = submitted;
    els.submitButton.textContent = submitted ? 'Submitted' : 'Submit answer';

    if (submitted && currentState?.student?.submission) {
      renderSubmissionFeedback(currentState.student.submission);
      els.submitButton.disabled = true;
    }

    if (question.answerType === 'choice') {
      const choices = Array.isArray(question.choices) ? question.choices : [];
      els.answerArea.className = `mixed-answer-area ${question.moduleId === 'melodic-intervals' ? 'is-interval-question' : 'is-ii-question'}`;
      const splitIntervalChoices = question.moduleId === 'melodic-intervals' && question.answerMode === 'quality'
        ? getSplitIntervalChoiceData(choices)
        : null;
      if (question.moduleId === 'instrument-identifier') {
        const submission = currentState?.student?.submission || null;
        if (submitted && submission && !selectedAnswer) selectedAnswer = submission.answer || '';
        const modelAnswer = submission?.modelAnswer ? cleanInstrumentText(submission.modelAnswer) : '';
        els.answerArea.innerHTML = `
          <div class="answer-grid mixed-ii-answer-grid" role="group" aria-label="Instrument choices">
            ${choices.map((choice) => {
              const isSelected = cleanInstrumentText(choice) === cleanInstrumentText(selectedAnswer);
              const isCorrect = submitted && modelAnswer && cleanInstrumentText(choice) === modelAnswer;
              const isWrong = submitted && isSelected && !isCorrect;
              const classes = ['answer-option'];
              if (isSelected) classes.push('is-selected');
              if (submitted) classes.push('is-submitted');
              if (isCorrect) classes.push('correct');
              if (isWrong) classes.push('wrong');
              return `
                <button
                  class="${classes.join(' ')}"
                  type="button"
                  data-answer="${escapeHTML(choice)}"
                  data-instrument="${escapeHTML(choice)}"
                  aria-label="Choose ${escapeHTML(choice)}"
                  ${submitted ? 'disabled' : ''}
                >
                  <span class="option-icon">${getInstrumentIconMarkup(choice)}</span>
                  <span class="option-label">${escapeHTML(choice)}</span>
                </button>
              `;
            }).join('')}
          </div>
        `;
        els.answerArea.querySelectorAll('.answer-option').forEach((button) => {
          button.addEventListener('click', () => {
            if (submitted) return;
            selectedAnswer = button.dataset.answer || '';
            els.answerArea.querySelectorAll('.answer-option').forEach((item) => item.classList.toggle('is-selected', item === button));
            els.submitButton.disabled = !selectedAnswer;
          });
        });
        return;
      }

      if (splitIntervalChoices?.options.length) {
        let selectedQuality = '';
        let selectedNumber = '';
        const hasOption = (quality, number) => splitIntervalChoices.options.some((option) => option.quality === quality && option.number === number);
        els.answerArea.classList.add('is-split-interval-question');
        els.answerArea.innerHTML = `
          ${renderQuestionVisual(question)}
          <div class="split-interval-answer" aria-label="Interval answer">
            <div class="split-interval-column">
              <p>Quality</p>
              <div class="split-choice-list" role="group" aria-label="Interval quality">
                ${splitIntervalChoices.qualities.map((quality) => `<button class="choice-button split-choice-button" type="button" data-quality="${escapeHTML(quality)}">${escapeHTML(quality)}</button>`).join('')}
              </div>
            </div>
            <div class="split-interval-column">
              <p>Interval</p>
              <div class="split-choice-list split-choice-list-numbers" role="group" aria-label="Interval number">
                ${splitIntervalChoices.numbers.map((number) => `<button class="choice-button split-choice-button" type="button" data-number="${escapeHTML(number)}">${escapeHTML(number)}</button>`).join('')}
              </div>
            </div>
          </div>
          <p class="split-interval-status">Choose one quality and one interval number.</p>
        `;
        const status = els.answerArea.querySelector('.split-interval-status');
        const updateSplitAnswer = () => {
          selectedAnswer = getSplitIntervalAnswer(splitIntervalChoices.options, selectedQuality, selectedNumber);
          els.answerArea.querySelectorAll('[data-quality]').forEach((button) => {
            const quality = button.dataset.quality || '';
            const disabled = Boolean(selectedNumber && !hasOption(quality, selectedNumber));
            button.classList.toggle('is-selected', quality === selectedQuality);
            button.disabled = submitted || disabled;
          });
          els.answerArea.querySelectorAll('[data-number]').forEach((button) => {
            const number = button.dataset.number || '';
            const disabled = Boolean(selectedQuality && !hasOption(selectedQuality, number));
            button.classList.toggle('is-selected', number === selectedNumber);
            button.disabled = submitted || disabled;
          });
          els.submitButton.disabled = submitted || !selectedAnswer;
          if (status) status.textContent = selectedAnswer ? `Selected: ${selectedAnswer}` : 'Choose one quality and one interval number.';
        };

        els.answerArea.querySelectorAll('[data-quality]').forEach((button) => {
          button.addEventListener('click', () => {
            if (submitted || button.disabled) return;
            selectedQuality = button.dataset.quality || '';
            if (selectedNumber && !hasOption(selectedQuality, selectedNumber)) selectedNumber = '';
            updateSplitAnswer();
          });
        });
        els.answerArea.querySelectorAll('[data-number]').forEach((button) => {
          button.addEventListener('click', () => {
            if (submitted || button.disabled) return;
            selectedNumber = button.dataset.number || '';
            if (selectedQuality && !hasOption(selectedQuality, selectedNumber)) selectedQuality = '';
            updateSplitAnswer();
          });
        });
        updateSplitAnswer();
        return;
      }

      els.answerArea.innerHTML = `
        ${renderQuestionVisual(question)}
        <div class="choice-grid" role="group" aria-label="Answer choices">
          ${choices.map((choice) => `<button class="choice-button" type="button" data-answer="${escapeHTML(choice)}">${escapeHTML(choice)}</button>`).join('')}
        </div>
      `;
      els.answerArea.querySelectorAll('.choice-button').forEach((button) => {
        button.addEventListener('click', () => {
          if (submitted) return;
          selectedAnswer = button.dataset.answer || '';
          els.answerArea.querySelectorAll('.choice-button').forEach((item) => item.classList.toggle('is-selected', item === button));
          els.submitButton.disabled = !selectedAnswer;
        });
      });
      return;
    }

    els.answerArea.className = 'mixed-answer-area is-typed-question';
    els.answerArea.innerHTML = `
      <form class="answer-form" id="typedAnswerForm">
        <label>
          <span>Your answer</span>
          <input id="typedAnswerInput" type="text" autocomplete="off" placeholder="Type your answer…" />
        </label>
      </form>
    `;
    const input = document.getElementById('typedAnswerInput');
    input.addEventListener('input', () => {
      selectedAnswer = input.value;
      els.submitButton.disabled = submitted || !String(selectedAnswer || '').trim();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitAnswer();
      }
    });
  }

  function renderSubmissionFeedback(submission = {}) {
    els.feedbackPanel.classList.remove('hidden');
    els.feedbackPanel.classList.toggle('is-correct', Boolean(submission.correct));
    els.feedbackPanel.classList.toggle('is-incorrect', !submission.correct);
    const score = `${Number(submission.score || 0)} / ${Number(submission.total || 0)}`;
    const feedback = submission.feedback || submission.shortComment || (submission.correct ? 'Correct.' : 'Submitted.');
    els.feedbackPanel.innerHTML = `
      <p><strong>Submitted score: ${escapeHTML(score)}</strong></p>
      <p>${escapeHTML(feedback)}</p>
      ${submission.modelAnswer ? `<p><strong>Model answer:</strong> ${escapeHTML(submission.modelAnswer)}</p>` : ''}
    `;
  }

  function renderQuestion(state) {
    const question = state.question || {};
    const moduleLabel = question.moduleTitle || state.moduleTitle || 'EchoAural';
    setModulePresentation(question.moduleId || state.questionModuleId || state.moduleId || 'mixed');
    updateMixedSummary(state);
    showQuestionPanel();
    els.roomPill.textContent = `Room ${state.roomCode || roomCode}`;
    els.moduleEyebrow.textContent = String(moduleLabel).toUpperCase();
    els.questionModuleEyebrow.textContent = String(moduleLabel).toUpperCase();
    els.questionTitle.textContent = question.title || question.id || 'Question';
    els.questionPrompt.textContent = question.prompt || question.question || 'Listen and answer.';

    const audioPath = resolveAudioPath(question);
    if (audioPath && els.studentAudio.getAttribute('src') !== audioPath) els.studentAudio.src = audioPath;

    if (currentQuestionRunId !== Number(state.questionRunId || 0)) {
      currentQuestionRunId = Number(state.questionRunId || 0);
      renderAnswerControls(question);
    } else {
      submitted = Boolean(state?.student?.submitted);
      if (submitted && state?.student?.submission) {
        els.submitButton.disabled = true;
        els.submitButton.textContent = 'Submitted';
        renderSubmissionFeedback(state.student.submission);
      }
    }
  }

  function setExamLabZoom(value) {
    examLabZoom = Math.max(0.7, Math.min(1.75, Number(value) || 1));
    if (examEls.scoreCanvas) examEls.scoreCanvas.style.width = `${examLabZoom * 100}%`;
    if (examEls.zoomLabel) examEls.zoomLabel.textContent = `${Math.round(examLabZoom * 100)}%`;
  }

  function examLabRhythmNote(x, y = 46) {
    return `<ellipse cx="${x}" cy="${y}" rx="7" ry="4.6" transform="rotate(-18 ${x} ${y})"></ellipse><path d="M${x + 6} ${y - 1}V18"></path>`;
  }

  function examLabRhythmGroup(type, start) {
    if (type === 'q-ss') {
      const notes = [start, start + 29, start + 49];
      return `${notes.map((x) => examLabRhythmNote(x)).join('')}<path class="exam-lab-rhythm-beam" d="M${start + 5} 18H${start + 55}V23H${start + 5}Z"></path><path class="exam-lab-rhythm-beam" d="M${start + 34} 25H${start + 55}V30H${start + 34}Z"></path>`;
    }
    if (type === 'ssss') {
      const notes = [start, start + 19, start + 38, start + 57];
      return `${notes.map((x) => examLabRhythmNote(x)).join('')}<path class="exam-lab-rhythm-beam" d="M${start + 5} 18H${start + 63}V23H${start + 5}Z"></path><path class="exam-lab-rhythm-beam" d="M${start + 5} 25H${start + 63}V30H${start + 5}Z"></path>`;
    }
    if (type === 'crotchet') return examLabRhythmNote(start + 30);
    if (type === 'qq') {
      const notes = [start + 8, start + 48];
      return `${notes.map((x) => examLabRhythmNote(x)).join('')}<path class="exam-lab-rhythm-beam" d="M${start + 13} 18H${start + 54}V23H${start + 13}Z"></path>`;
    }
    const notes = [start + 8, start + 49];
    return `${notes.map((x) => examLabRhythmNote(x)).join('')}<circle class="exam-lab-rhythm-dot" cx="${start + 20}" cy="43" r="2.2"></circle><path class="exam-lab-rhythm-beam" d="M${start + 13} 18H${start + 55}V23H${start + 13}Z"></path><path class="exam-lab-rhythm-beam" d="M${start + 39} 25H${start + 55}V30H${start + 39}Z"></path>`;
  }

  function renderExamLabRhythm(pattern) {
    const starts = [18, 108, 198];
    return `<svg class="exam-lab-rhythm-notation" viewBox="0 0 286 78" role="img" aria-label="Notated rhythm option">
      <g class="exam-lab-rhythm-staff">${[27, 36, 45, 54, 63].map((y) => `<path d="M5 ${y}H280"></path>`).join('')}<path class="exam-lab-rhythm-barline" d="M280 27V63"></path></g>
      <g class="exam-lab-rhythm-notes">${(pattern || []).map((group, index) => examLabRhythmGroup(group, starts[index])).join('')}</g>
    </svg>`;
  }

  function shuffledExamLabRhythmOptions(options = []) {
    const output = options.slice();
    for (let index = output.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [output[index], output[target]] = [output[target], output[index]];
    }
    return output;
  }

  function renderExamLabScoreMasks(masks = []) {
    if (!examEls.scoreMasks) return;
    examEls.scoreMasks.innerHTML = masks.map((mask) => {
      const style = `left:${Number(mask.left)}%;top:${Number(mask.top)}%;width:${Number(mask.width)}%;height:${Number(mask.height)}%;`;
      if (mask.type === 'blank-stave') {
        return `<span class="exam-lab-score-mask exam-lab-score-mask-blank-stave" style="${style}"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${[31, 43, 55, 67, 79].map((y) => `<line x1="0" y1="${y}" x2="100" y2="${y}"></line>`).join('')}</svg></span>`;
      }
      return `<span class="exam-lab-score-mask exam-lab-score-mask-plain" style="${style}"></span>`;
    }).join('');
  }

  function examLabAnswer(question) {
    if (!examEls.form || !question?.id) return '';
    if (question.responseType === 'multiple-choice' || question.responseType === 'rhythm-choice') {
      return examEls.form.querySelector(`input[name="${question.id}"]:checked`)?.value || '';
    }
    return examEls.form.elements[question.id]?.value || '';
  }

  function examLabCompletedCount(question = currentState?.question || {}) {
    const questions = Array.isArray(question.questions) ? question.questions : [];
    return questions.filter((item) => String(examLabAnswer(item) || '').trim()).length;
  }

  function updateExamLabCompletion() {
    const question = currentState?.question || {};
    const questions = Array.isArray(question.questions) ? question.questions : [];
    const completed = examLabCompletedCount(question);
    if (examEls.answerProgress) examEls.answerProgress.textContent = `${completed}/${questions.length}`;
    if (!questions.length || currentState?.student?.submitted || !currentState?.submissionsOpen) return;
    const remaining = questions.length - completed;
    examEls.submitButton.disabled = remaining > 0;
    examEls.formMessage.textContent = remaining
      ? `Complete ${remaining} more question${remaining === 1 ? '' : 's'}.`
      : 'All answers complete. Submit when ready.';
  }

  function renderExamLabQuestionControls(question = {}) {
    const questions = Array.isArray(question.questions) ? question.questions : [];
    examEls.questionList.innerHTML = questions.map((item, index) => {
      const inputId = `exam-live-${item.id}`;
      let control = '';
      if (item.responseType === 'multiple-choice') {
        control = `<div class="exam-lab-choice-grid" role="radiogroup" aria-label="${escapeHTML(item.prompt)}">
          ${(item.options || []).map((option) => `<label><input type="radio" name="${escapeHTML(item.id)}" value="${escapeHTML(option)}" /><span>${escapeHTML(option)}</span></label>`).join('')}
        </div>`;
      } else if (item.responseType === 'rhythm-choice') {
        control = `<div class="exam-lab-rhythm-choice-grid" role="radiogroup" aria-label="${escapeHTML(item.prompt)}">
          ${shuffledExamLabRhythmOptions(item.options || []).map((option, optionIndex) => `<label><input type="radio" name="${escapeHTML(item.id)}" value="${escapeHTML(option.id)}" /><span><strong>${String.fromCharCode(65 + optionIndex)}</strong>${renderExamLabRhythm(option.pattern)}</span></label>`).join('')}
        </div>`;
      } else if (item.responseType === 'extended-text') {
        control = `<textarea id="${escapeHTML(inputId)}" name="${escapeHTML(item.id)}" rows="3" maxlength="2000" placeholder="${escapeHTML(item.placeholder || 'Write your musical answer.')}"></textarea>`;
      } else {
        control = `<input id="${escapeHTML(inputId)}" name="${escapeHTML(item.id)}" type="text" maxlength="500" autocomplete="off" />`;
      }
      return `<article class="exam-lab-live-question">
        <div class="exam-lab-question-head">
          <span>${Number(item.number || index + 1)}</span>
          ${item.responseType === 'multiple-choice' || item.responseType === 'rhythm-choice'
            ? `<strong>${escapeHTML(item.prompt)}</strong>`
            : `<label for="${escapeHTML(inputId)}">${escapeHTML(item.prompt)}</label>`}
          <em>[${Number(item.marks || 1)}]</em>
        </div>
        ${control}
      </article>`;
    }).join('');
    examEls.form.oninput = updateExamLabCompletion;
    examEls.form.onchange = updateExamLabCompletion;
    updateExamLabCompletion();
  }

  function lockExamLabForm(message) {
    examEls.form.querySelectorAll('input, textarea').forEach((field) => { field.disabled = true; });
    examEls.submitButton.disabled = true;
    examEls.formMessage.textContent = message;
  }

  function examLabRouteHref(route = {}) {
    if (route.status !== 'live' || !route.path || route.path === '#') return '';
    const clean = String(route.path).replace(/^\.\.\//, '');
    return clean.startsWith('/') ? clean : `/modules/${clean}`;
  }

  function showExamLabPrivateFeedback(result, state) {
    if (!result || !examEls.feedback) return;
    const feedbackKey = `${state.roomCode}:${state.roundId}:${result.score}:${result.maximumScore}`;
    if (examLabFeedbackKey === feedbackKey && !examEls.feedback.hidden) return;
    examLabFeedbackKey = feedbackKey;
    const outcomeRows = (result.outcomes || []).map((outcome) => {
      const missing = (outcome.missingMarkPoints || []).length
        ? `<small>Missing: ${escapeHTML(outcome.missingMarkPoints.join('; '))}</small>`
        : '';
      return `<article class="exam-lab-feedback-row ${outcome.marks >= outcome.maxMarks ? 'is-secure' : 'is-focus'}">
        <div><strong>Question ${Number(outcome.number || 0)}</strong><span>${escapeHTML(outcome.answer || 'No answer')}</span></div>
        <em>${Number(outcome.marks || 0)} / ${Number(outcome.maxMarks || 0)}</em>
        <p>${escapeHTML(outcome.feedback || '')}</p>
        ${outcome.correctResponse ? `<small><strong>Accepted response:</strong> ${escapeHTML(outcome.correctResponse)}</small>` : ''}
        ${missing}
      </article>`;
    }).join('');
    const recommendations = (result.recommendations || []).map((recommendation) => {
      const route = recommendation.route || {};
      const href = examLabRouteHref(route);
      return `<div class="exam-lab-feedback-route">
        <strong>${escapeHTML(route.module || 'Review this skill')}</strong>
        <span>${escapeHTML(recommendation.reason || route.focus || '')}</span>
        ${href ? `<a href="${escapeHTML(href)}">Open practice</a>` : '<em>No live practice route yet</em>'}
      </div>`;
    }).join('');
    examEls.feedback.innerHTML = `<section class="exam-lab-private-feedback-card">
      <button id="examLabFeedbackClose" type="button" aria-label="Close private feedback">×</button>
      <p class="eyebrow">PRIVATE ROUND FEEDBACK</p>
      <div class="exam-lab-feedback-hero"><span>Your score</span><strong>${Number(result.score || 0)} / ${Number(result.maximumScore || 0)}</strong><small>${Number(result.percentage || 0)}%</small></div>
      ${result.sourceTitle ? `<p class="exam-lab-source-reveal">Source: ${escapeHTML(result.sourceTitle)}</p>` : ''}
      <div class="exam-lab-feedback-list">${outcomeRows}</div>
      ${recommendations ? `<div class="exam-lab-feedback-routes"><h3>Recommended practice</h3>${recommendations}</div>` : ''}
      <button id="examLabFeedbackReview" class="primary-button" type="button">Review Answers</button>
    </section>`;
    examEls.feedback.hidden = false;
    document.body.classList.add('exam-lab-feedback-open');
    const close = () => {
      examEls.feedback.hidden = true;
      document.body.classList.remove('exam-lab-feedback-open');
    };
    document.getElementById('examLabFeedbackClose')?.addEventListener('click', close);
    document.getElementById('examLabFeedbackReview')?.addEventListener('click', close);
  }

  function renderExamLabState(state) {
    const question = state.question || null;
    const questions = Array.isArray(question?.questions) ? question.questions : [];
    const ownSubmission = state.student?.submission || null;
    const submittedState = Boolean(state.student?.submitted);
    document.title = 'Exam Lab Live Session | EchoAural';
    document.body.classList.add('exam-lab-live-student');
    setModulePresentation('exam-lab');
    examEls.genericLayout.hidden = true;
    examEls.layout.hidden = false;
    els.roomPill.textContent = `Room ${state.roomCode || roomCode}`;
    examEls.roomCode.textContent = state.roomCode || roomCode;
    examEls.studentName.textContent = studentName || 'Student';

    const playback = state.playback || {};
    const playing = Number(playback.endsAt || 0) > Number(state.serverNow || Date.now());
    if (playing) examEls.playState.textContent = `Playing ${Number(playback.listen || state.listens || 1)} of ${Number(state.maxListens || 1)} — listen from the teacher’s device.`;
    else if (state.listens) examEls.playState.textContent = `${Number(state.listens)} of ${Number(state.maxListens || 1)} playings used.`;
    else examEls.playState.textContent = 'Waiting for the teacher to play the extract.';

    if (!question) {
      examEls.studentStatus.textContent = state.quiz?.ended ? 'Finished' : 'Waiting';
      examEls.waiting.hidden = false;
      examEls.scoreScroll.hidden = true;
      examEls.noScore.hidden = true;
      renderExamLabScoreMasks([]);
      examEls.questionList.innerHTML = '';
      examEls.submitButton.disabled = true;
      examEls.formMessage.textContent = state.quiz?.ended ? 'This session has finished.' : 'Wait for the session to begin.';
      return;
    }

    examEls.waiting.hidden = true;
    if (question.score) {
      examEls.scoreImage.src = question.score;
      examEls.scoreImage.alt = question.scoreAlt || 'Printed score for the listening extract.';
      renderExamLabScoreMasks(question.scoreMasks || []);
      examEls.scoreScroll.hidden = false;
      examEls.noScore.hidden = true;
    } else {
      renderExamLabScoreMasks([]);
      examEls.scoreScroll.hidden = true;
      examEls.noScore.hidden = false;
    }

    if (examLabRenderedRunId !== Number(state.questionRunId || 0)) {
      examLabRenderedRunId = Number(state.questionRunId || 0);
      renderExamLabQuestionControls(question);
    }

    examEls.answerProgress.textContent = `${examLabCompletedCount(question)}/${questions.length}`;
    if (state.feedbackReleased && ownSubmission?.examLabResult) {
      examEls.studentStatus.textContent = 'Feedback released';
      lockExamLabForm(`Session finished · ${ownSubmission.score} / ${ownSubmission.total} marks.`);
      showExamLabPrivateFeedback(ownSubmission.examLabResult, state);
    } else if (state.feedbackReleased) {
      examEls.studentStatus.textContent = 'Finished';
      lockExamLabForm('Session finished. No answers were submitted.');
    } else if (submittedState) {
      examEls.studentStatus.textContent = 'Submitted';
      lockExamLabForm('Answers submitted. Private feedback will appear when the teacher finishes the session.');
    } else if (!state.submissionsOpen) {
      examEls.studentStatus.textContent = 'Locked';
      lockExamLabForm('The teacher has locked submissions.');
    } else {
      examEls.studentStatus.textContent = 'Answering';
      examEls.form.querySelectorAll('input, textarea').forEach((field) => { field.disabled = false; });
      updateExamLabCompletion();
    }
  }

  async function submitExamLabAnswers(event) {
    event.preventDefault();
    if (!currentState || currentState.moduleId !== 'exam-lab' || currentState.student?.submitted || !currentState.submissionsOpen) return;
    const questions = Array.isArray(currentState.question?.questions) ? currentState.question.questions : [];
    const answers = questions.map((question) => ({ questionId: question.id, answer: String(examLabAnswer(question) || '').trim() }));
    if (answers.some((item) => !item.answer)) {
      examEls.formMessage.textContent = 'Answer every question before submitting.';
      return;
    }
    examEls.submitButton.disabled = true;
    examEls.submitButton.textContent = 'Submitting…';
    try {
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        accessToken: examLabAccessToken,
        answers
      });
      examEls.submitButton.textContent = 'Submitted';
      renderExamLabState(response.state);
    } catch (error) {
      examEls.submitButton.textContent = 'Submit Answers';
      examEls.submitButton.disabled = false;
      examEls.formMessage.textContent = error.message || 'Could not submit your answers.';
    }
  }

  function handleState(state) {
    currentState = state;
    if (state.dismissed) {
      window.location.href = '/join';
      return;
    }
    if (state.moduleId === 'exam-lab') {
      renderExamLabState(state);
      return;
    }
    updateMixedSummary(state);
    els.roomPill.textContent = `Room ${state.roomCode || roomCode}`;
    els.moduleEyebrow.textContent = String(state.moduleTitle || 'EchoAural').toUpperCase();

    if (state.moduleId === 'melody-master') {
      const target = `/modules/melody-master/student-laptop.html?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(studentName)}&student=${encodeURIComponent(studentId)}`;
      window.location.replace(target);
      return;
    }

    if (state.moduleId === 'instrument-identifier') {
      const target = `/modules/instrument-identifier/student-classroom.html?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(studentName)}&student=${encodeURIComponent(studentId)}`;
      window.location.replace(target);
      return;
    }

    if (state.moduleId === 'melodic-intervals') {
      const target = `/modules/melodic-intervals/student-classroom.html?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(studentName)}&student=${encodeURIComponent(studentId)}`;
      window.location.replace(target);
      return;
    }

    const playbackId = state.playback && state.playback.id ? String(state.playback.id) : '';
    if (state.question) {
      const isNewPlayback = playbackId && playbackId !== lastPlaybackId;
      if (isNewPlayback) lastPlaybackId = playbackId;
      renderQuestion(state);
      scheduleStudentAudio(state, Boolean(isNewPlayback));
      return;
    }

    setWaiting('You are in. Wait for your teacher to start the question.');
  }

  async function refreshState() {
    if (!roomCode || !studentId) return;
    try {
      const accessQuery = examLabAccessToken ? `&accessToken=${encodeURIComponent(examLabAccessToken)}` : '';
      const state = await api(`/api/classroom/state?roomCode=${encodeURIComponent(roomCode)}&studentId=${encodeURIComponent(studentId)}${accessQuery}`);
      handleState(state);
    } catch (error) {
      setWaiting(error.message || 'Connection lost. Check the room code or ask your teacher to recreate the session.');
    }
  }

  function startPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(refreshState, 1000);
    refreshState();
  }

  async function submitAnswer() {
    if (!roomCode || !studentId || !currentState || submitted) return;
    const answer = String(selectedAnswer || '').trim();
    if (!answer) return;
    els.submitButton.disabled = true;
    els.submitButton.textContent = 'Submitting…';
    try {
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        answer,
        questionId: currentState.question?.id,
        questionIndex: currentState.questionIndex
      });
      submitted = true;
      handleState(response.state);
      renderSubmissionFeedback(response.submission);
    } catch (error) {
      els.submitButton.disabled = false;
      els.submitButton.textContent = 'Submit answer';
      els.feedbackPanel.classList.remove('hidden');
      els.feedbackPanel.innerHTML = `<p>${escapeHTML(error.message || 'Could not submit your answer.')}</p>`;
    }
  }

  function boot() {
    ensureStudentId();
    if (!roomCode) {
      window.location.href = '/join';
      return;
    }
    window.localStorage.setItem('ea_classroom_last_room', roomCode);
    if (studentName) window.localStorage.setItem('ea_classroom_student_name', studentName);
    els.roomPill.textContent = `Room ${roomCode}`;
    els.enableAudioButton.addEventListener('click', unlockStudentAudio);
    els.manualPlayButton.addEventListener('click', () => playStudentQuestionAudio(currentState?.question || {}));
    els.submitButton.addEventListener('click', submitAnswer);
    examEls.form.addEventListener('submit', submitExamLabAnswers);
    examEls.zoomIn.addEventListener('click', () => setExamLabZoom(examLabZoom + 0.15));
    examEls.zoomOut.addEventListener('click', () => setExamLabZoom(examLabZoom - 0.15));
    examEls.fitScore.addEventListener('click', () => setExamLabZoom(1));
    setExamLabZoom(1);
    setWaiting('You are in. Wait for your teacher to start the question.');
    startPolling();
  }

  boot();
})();
