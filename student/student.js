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
    feedbackPanel: document.getElementById('feedbackPanel'),
    liveAppPanel: document.getElementById('liveAppPanel'),
    liveAppFrame: document.getElementById('liveAppFrame'),
    liveAppFrameLoading: document.getElementById('liveAppFrameLoading'),
    outerQuizHeader: document.querySelector('.quiz-header'),
    outerStatsRow: document.querySelector('.statsRow')
  };

  // Melody Master uses the same parent callback as Progress Mode when its
  // score/question artwork needs to extend beyond the centre tile. Live
  // Sessions do not have PM's parent overlay, so provide the equivalent host
  // boundary here and let the iframe occupy the full student viewport.
  window.EAProgressModeSetMmScoreExpanded = function (expanded) {
    if (!els.liveAppPanel) return;
    const isExpanded = Boolean(expanded);
    els.liveAppPanel.classList.toggle('mm-score-expanded', isExpanded);
    document.body.classList.toggle('mm-score-expanded', isExpanded);
    if (isExpanded) {
      // Keep the Live Session nav visible above the expanded score, matching
      // PM's top-anchor rather than covering the whole page from y=0.
      const topbar = document.querySelector('.topbar');
      const top = topbar ? Math.round(topbar.getBoundingClientRect().bottom) : 0;
      els.liveAppPanel.style.top = `${top}px`;
      els.liveAppPanel.style.bottom = '0px';
      els.liveAppPanel.style.height = `calc(100vh - ${top}px)`;
      els.liveAppPanel.style.padding = '0';
      els.liveAppPanel.style.background = 'transparent';
    } else {
      els.liveAppPanel.style.removeProperty('top');
      els.liveAppPanel.style.removeProperty('bottom');
      els.liveAppPanel.style.removeProperty('height');
      els.liveAppPanel.style.removeProperty('padding');
      els.liveAppPanel.style.removeProperty('background');
    }
  };

  // Same pair of globals modules/progress-mode/script.js exposes for its
  // own #appFrame, in the same shape — app-drivers.js's applyFocusMode
  // already calls installRoundLabelFix/installRoundScoreFix on every
  // driver-hosted iframe (see waitForLiveReady/waitForLiveAutoStartedQuestion
  // below), which read window.parent.EAProgressModeGetRoundProgress/
  // GetRoundScore to overwrite the embedded app's own "Question X of Y"/
  // "Mark: X / Y" with the real round position. Without these defined here,
  // that overwrite silently no-ops (the functions just don't exist on this
  // page), leaving the embedded app's own sub-round counter showing
  // alongside — never matching, e.g. "Question 1 of 3" for one slot of a
  // melody-master dictation question, right underneath student-shell's own
  // correct "Question 4 of 10" above the iframe. Reads currentState fresh
  // each call, same as updateMixedSummary below computes the outer
  // roundText/scoreText from, so both stay in lockstep.
  window.EAProgressModeGetRoundProgress = function () {
    const state = currentState || {};
    const quiz = state.quiz || {};
    const total = Number(quiz.totalQuestions || 0);
    const current = Number(quiz.currentQuestionNumber || (state.question ? 1 : 0));
    return { position: Math.max(0, current - 1), total };
  };

  window.EAProgressModeGetRoundScore = function () {
    const state = currentState || {};
    const student = (state.students || []).find((item) => item.id === studentId) || {};
    return { correct: Number(student.cumulativeScore || 0), attempted: Number(student.cumulativeTotal || 0) };
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
    waitingModuleMain: document.getElementById('waitingModuleMain'),
    waitingModuleGradient: document.getElementById('waitingModuleGradient'),
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

  // Live Session iframe host state. Reuses modules/progress-mode/
  // app-drivers.js's DRIVERS — the same configure()-then-DOM-poll mechanism
  // Progress Mode already relies on for every one of these apps — rather
  // than the separate postMessage "contract-question-injection" scheme
  // pm-registry.js's rendererBridgeCapability field advertises: in practice
  // only Structure Spotter's own script.js actually implements the
  // receiving side of that contract, so every other app just sat on its own
  // ready screen forever behind "Loading question…". Trade-off accepted
  // knowingly: a driver can only say "start this app at this LEVEL", not
  // "load this exact question", so a mixed-round student sees a real
  // question from the planned app/level, not necessarily the literal
  // question the teacher's preview listed.
  let liveIframeRunId = null;
  let liveIframeAnswered = false;
  let liveDriverTimer = null;
  let liveActiveSourceKey = '';
  let liveActiveDriver = null;
  let liveActiveLevelIndex = 0;
  let liveCurrentSignature = null;
  let liveCurrentRevealedAt = null;

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
    if (moduleId === 'melody-master') {
      return {
        id: 'melody-master',
        title: 'Melody Master',
        main: 'Melody',
        gradient: 'Master',
        icon: '/assets/icons/modules/melody-master.png',
        hint: 'Listen carefully, then enter or choose the melodic answer.'
      };
    }
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
    if (moduleId === 'texture-trainer') {
      return { id: moduleId, title: 'Texture Trainer', main: 'Texture', gradient: 'Trainer', icon: '/assets/icons/modules/texture-trainer.png', hint: 'Listen carefully, then describe or identify the musical texture.' };
    }
    if (moduleId === 'meter-master') {
      return { id: moduleId, title: 'Meter Master', main: 'Meter', gradient: 'Master', icon: '/assets/icons/modules/meter-master.png', hint: 'Listen for the pulse and choose the best metre answer.' };
    }
    if (moduleId === 'cadence-coach') {
      return { id: moduleId, title: 'Cadence Coach', main: 'Cadence', gradient: 'Coach', icon: '/assets/icons/modules/cadence-coach.png', hint: 'Listen to the ending and identify the cadence.' };
    }
    if (moduleId === 'musical-language') {
      return { id: moduleId, title: 'ScoreDecoder Vocabulary', main: 'ScoreDecoder', gradient: 'Vocabulary', icon: '/modules/musical-language/assets/score-decoder-icon.png', hint: 'Identify or explain the musical term or marking.' };
    }
    if (moduleId === 'ensemble-recognition') {
      return { id: moduleId, title: 'Ensemble Recognition', main: 'Ensemble', gradient: 'Recognition', icon: '/assets/icons/modules/instrument-identifier.png', hint: 'Listen to the performing forces and identify the ensemble.' };
    }
    if (moduleId === 'key-signature-sprint') {
      return { id: moduleId, title: 'Key Signatures', main: 'Key', gradient: 'Signatures', icon: '/assets/icons/modules/harmony-explorer.png', hint: 'Read the key signature and choose the matching key.' };
    }
    // Reached before a question exists yet (the waiting screen always calls
    // setModulePresentation('mixed') — see setWaiting()) and, in principle,
    // for any moduleId this list doesn't recognise. Every real question
    // always carries its own specific moduleId via its adapter's
    // prepareQuestion(), so in practice this is the waiting screen's own
    // "Live Session" brand, not a per-app fallback — it previously showed
    // "Mixed Apps" with Progress Mode's icon, which made sense only when
    // this file was Progress Mode's own renderer.
    return {
      id: 'mixed',
      title: 'Live Session',
      main: 'Live',
      gradient: 'Session',
      icon: '/assets/icons/dashboard/join-live-session.png',
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

    [mixedEls.topbarModuleIcon, mixedEls.waitingModuleIcon, mixedEls.centreModuleIcon, mixedEls.answerModuleIcon]
      .forEach((icon) => setImage(icon, presentation.icon));

    [
      [mixedEls.topbarModuleMain, mixedEls.topbarModuleGradient],
      [mixedEls.waitingModuleMain, mixedEls.waitingModuleGradient],
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
    const options = { method, credentials: 'include', headers: { Accept: 'application/json' } };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(window.EchoAuralClassroom.buildApiUrl(path), options);
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_error) { throw new Error('The classroom server returned an unreadable response.'); }
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error || `Request failed (${response.status}).`);
      error.code = data.code || '';
      error.state = data.state || null;
      error.status = response.status;
      throw error;
    }
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
    if (moduleId === 'cadence-coach') return `/modules/cadence-coach/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'meter-master') return `/modules/meter-master/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'musical-language') return `/modules/musical-language/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'ensemble-recognition') return `/modules/ensemble-recognition/${raw.replace(/^\.\//, '')}`;
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

  function setOuterRoundChromeHidden(hidden) {
    // Same reasoning as Progress Mode's own #readyState: once a real
    // question is showing in the driver-hosted iframe, its own "Question
    // X of Y"/"Mark: X / Y" (now overwritten to the real round position —
    // see EAProgressModeGetRoundProgress/GetRoundScore above) is the only
    // one that should be visible. Left shown, this outer copy just
    // duplicates it as a second, confusing counter sitting above the
    // iframe. Only ever hidden for the live-app-panel case — the bespoke
    // questionPanel/waitingPanel views have no embedded-app duplicate to
    // step on, so they keep using this outer chrome as their one and only
    // indicator, same as before.
    if (els.outerQuizHeader) els.outerQuizHeader.classList.toggle('hidden', hidden);
    if (els.outerStatsRow) els.outerStatsRow.classList.toggle('hidden', hidden);
  }

  function setWaiting(message = '') {
    setModulePresentation('mixed');
    updateMixedSummary(currentState || {});
    teardownLiveIframe();
    setOuterRoundChromeHidden(false);
    els.waitingPanel.classList.remove('hidden');
    els.questionPanel.classList.add('hidden');
    els.liveAppPanel.classList.add('hidden');
    els.waitingTitle.textContent = 'Waiting…';
    els.waitingMessage.textContent = message || 'Wait for your teacher to start the question.';
  }

  function showQuestionPanel() {
    setOuterRoundChromeHidden(false);
    els.waitingPanel.classList.add('hidden');
    els.liveAppPanel.classList.add('hidden');
    els.questionPanel.classList.remove('hidden');
  }

  function showLiveAppPanel() {
    setOuterRoundChromeHidden(true);
    els.waitingPanel.classList.add('hidden');
    els.questionPanel.classList.add('hidden');
    els.liveAppPanel.classList.remove('hidden');
  }

  // A mixed round's plan carries an explicit sourceKey per question
  // (question-set-builder.js — needed there since one module, e.g.
  // musical-language or melody-master, can map to several DRIVERS entries).
  // A single-app room's own adapter.serialiseQuestion() never had a reason
  // to expose that field, so falls back to the registry's first (commonly
  // only) source for that moduleId.
  function resolveLiveSourceKey(question = {}) {
    if (question.sourceKey) return question.sourceKey;
    const matches = window.EchoAuralPMRegistry && question.moduleId
      ? window.EchoAuralPMRegistry.byModule(question.moduleId)
      : null;
    return matches && matches[0] ? matches[0].sourceKey : '';
  }

  function shouldUseLiveIframe(question = {}) {
    const sourceKey = resolveLiveSourceKey(question);
    return Boolean(sourceKey && window.EAProgressModeDrivers && window.EAProgressModeDrivers[sourceKey]);
  }

  function clearLiveDriverTimer() {
    if (liveDriverTimer) { window.clearInterval(liveDriverTimer); liveDriverTimer = null; }
  }

  function teardownLiveIframe() {
    if (els.liveAppPanel) window.EAProgressModeSetMmScoreExpanded(false);
    clearLiveDriverTimer();
    if (!liveIframeRunId) return;
    silenceCurrentLiveFrame();
    liveIframeRunId = null;
    liveIframeAnswered = false;
    liveActiveSourceKey = '';
    liveActiveDriver = null;
    liveActiveLevelIndex = 0;
    liveCurrentSignature = null;
    liveCurrentRevealedAt = null;
    if (els.liveAppFrame.src) {
      els.liveAppFrame.src = 'about:blank';
      els.liveAppFrame.removeAttribute('src');
    }
  }

  // Pauses whatever's playing in the CURRENT iframe document before it gets
  // torn down by the next navigation. Same fix and reasoning as modules/
  // progress-mode/script.js's silenceCurrentFrame/pauseFrameMedia:
  // reassigning iframe.src doesn't tear down the previous document
  // instantly, so a still-playing note can bleed audibly into the next
  // navigation — most noticeable on apps that autoplay immediately, like
  // Melodic Intervals (heard as "extra notes" beyond the two it should
  // play). Called before every src reassignment below, reroll or not.
  function pauseLiveFrameMedia(doc) {
    try {
      doc.querySelectorAll('audio, video').forEach((media) => {
        try { if (!media.paused) media.pause(); } catch (_error) { /* ignore */ }
      });
    } catch (_error) { /* not accessible — nothing to silence */ }
  }

  function silenceCurrentLiveFrame() {
    try {
      const doc = els.liveAppFrame.contentDocument;
      if (doc) pauseLiveFrameMedia(doc);
    } catch (_error) { /* cross-origin or not yet loaded */ }
  }


  // Namespaced separately from Progress Mode's own "progressmode:" keys —
  // Live Session's studentId (an "account-<id>" room participant, or an
  // ephemeral anonymous id for a guest join) is never the same string
  // Progress Mode itself uses for a logged-in student, so sharing one
  // key namespace wouldn't actually unify the two anyway; each gets its
  // own honestly-scoped seen-question history instead.
  function liveSpacedRepKey(sourceKey) {
    return `livesession:${studentId}:${sourceKey}`;
  }

  // Mirrors modules/progress-mode/script.js's loadCurrentSlotFrame/
  // waitForReady/waitForAutoStartedQuestion/confirmStartedThenPoll/
  // checkSignatureThenPoll/beginAnsweredPolling — the exact sequence
  // Progress Mode already uses for every one of these apps — simplified
  // for Live Session's needs: no empty-pool level-escalation-or-replace
  // retry (a teacher-run class round has one shared question per slot, not
  // a personal queue to substitute within), and — unlike Progress Mode —
  // no reroll on a duplicate/cooling-down signature either (see
  // checkLiveSignatureThenPoll's own comment for why: reroll there means
  // reloading the iframe, which re-triggers the app's own autoplay audibly
  // every time, confirmed live as "several audio extracts" per question
  // once today's testing had built up enough seen-history to make repeats
  // common). Always accepts whatever the driver draws; still records it
  // into the same seen-cycle/cooldown store, so a question is at least
  // less likely to resurface too soon in this student's *next* session.
  function renderLiveIframeQuestion(state, question) {
    showLiveAppPanel();
    const runId = Number(state.questionRunId || 0);

    if (liveIframeRunId === runId) {
      if (state.student?.submitted) liveIframeAnswered = true;
      return;
    }

    clearLiveDriverTimer();
    liveIframeRunId = runId;
    liveIframeAnswered = Boolean(state.student?.submitted);
    liveCurrentSignature = null;
    liveCurrentRevealedAt = null;
    els.feedbackPanel.classList.add('hidden');
    els.feedbackPanel.innerHTML = '';

    liveActiveSourceKey = resolveLiveSourceKey(question);
    liveActiveDriver = window.EAProgressModeDrivers[liveActiveSourceKey];
    liveActiveLevelIndex = Math.max(0, liveActiveDriver.levelValues.findIndex(
      (value) => String(value).toLowerCase() === String(question.level || '').toLowerCase()
    ));
    loadLiveDriverFrame(runId);
  }

  function loadLiveDriverFrame(runId) {
    const driver = liveActiveDriver;
    silenceCurrentLiveFrame();
    els.liveAppFrameLoading.textContent = 'Loading question…';
    els.liveAppFrameLoading.classList.remove('hidden');

    // driver.path/buildUrl() return paths relative to /modules/progress-
    // mode/ (the only page that has ever loaded these drivers before now),
    // sometimes with their own query string already attached (buildUrl) —
    // resolve against that same virtual base (not this page's own /student/
    // location, which would silently walk to the wrong directory), keeping
    // any query string intact rather than dropping it via .pathname alone.
    const rawUrl = driver.buildUrl ? driver.buildUrl(liveActiveLevelIndex) : driver.path;
    const resolvedUrl = new URL(rawUrl, `${window.location.origin}/modules/progress-mode/`);
    const baseUrl = resolvedUrl.pathname + resolvedUrl.search;
    const separator = resolvedUrl.search ? '&' : '?';
    els.liveAppFrame.src = `${baseUrl}${separator}${new URLSearchParams({
      _live: Date.now(),
      eaProgressHost: '1',
      eaProgressSlot: `${roomCode}:${studentId}:${runId}`,
      eaProgressSource: liveActiveSourceKey
    }).toString()}`;

    els.liveAppFrame.onload = () => {
      if (liveIframeRunId !== runId) return;
      const doc = els.liveAppFrame.contentDocument;
      if (!doc) return;
      if (driver.autoStarts) {
        waitForLiveAutoStartedQuestion(doc, driver, runId);
      } else {
        waitForLiveReady(doc, driver, liveActiveLevelIndex, runId);
      }
    };
  }

  function liveFrameStillCurrent(doc, runId) {
    return liveIframeRunId === runId && doc.defaultView && doc.defaultView === els.liveAppFrame.contentWindow;
  }

  function waitForLiveReady(doc, driver, levelIndex, runId) {
    let attempts = 0;
    let configured = false;
    clearLiveDriverTimer();
    liveDriverTimer = window.setInterval(() => {
      attempts += 1;
      if (!liveFrameStillCurrent(doc, runId)) { clearLiveDriverTimer(); return; }
      if (window.EAProgressModeApplyFocusMode) window.EAProgressModeApplyFocusMode(doc);
      const startButton = doc.getElementById(driver.startButtonId);
      if (!startButton) {
        if (attempts > 120) { clearLiveDriverTimer(); showLiveIframeUnavailable(); }
        return;
      }
      if (!configured) {
        if (typeof driver.configure === 'function') driver.configure(doc, levelIndex);
        configured = true;
      }
      if (!startButton.disabled) {
        clearLiveDriverTimer();
        startButton.click();
        confirmLiveStarted(doc, driver, runId);
      } else if (attempts > 120) {
        clearLiveDriverTimer();
        showLiveIframeUnavailable();
      }
    }, 50);
  }

  function confirmLiveStarted(doc, driver, runId) {
    let attempts = 0;
    clearLiveDriverTimer();
    liveDriverTimer = window.setInterval(() => {
      attempts += 1;
      if (!liveFrameStillCurrent(doc, runId)) { clearLiveDriverTimer(); return; }
      const quizPanel = doc.querySelector('.quiz-panel');
      const stillOnReadyScreen = !!quizPanel && quizPanel.classList.contains('is-ready');
      if (!stillOnReadyScreen) {
        clearLiveDriverTimer();
        checkLiveSignatureThenPoll(doc, driver, runId);
        return;
      }
      if (attempts > 60) { clearLiveDriverTimer(); showLiveIframeUnavailable(); }
    }, 50);
  }

  function waitForLiveAutoStartedQuestion(doc, driver, runId) {
    let attempts = 0;
    clearLiveDriverTimer();
    liveDriverTimer = window.setInterval(() => {
      attempts += 1;
      if (!liveFrameStillCurrent(doc, runId)) { clearLiveDriverTimer(); return; }
      if (window.EAProgressModeApplyFocusMode) window.EAProgressModeApplyFocusMode(doc);
      let hasQuestion = false;
      try { hasQuestion = !!(driver.getSignature && driver.getSignature(doc)); } catch (_error) { /* not ready yet */ }
      if (hasQuestion) {
        clearLiveDriverTimer();
        checkLiveSignatureThenPoll(doc, driver, runId);
      } else if (attempts > 120) {
        clearLiveDriverTimer();
        showLiveIframeUnavailable();
      }
    }, 50);
  }

  // Deliberately does NOT reroll on a duplicate/cooling-down signature —
  // tried that first (reloading the iframe to draw again), and confirmed
  // live that it's audible: reloading re-triggers the target app's own
  // autoplay every time, so a student rejecting even one repeat hears that
  // app's clip start and get cut short, sometimes several times in a row
  // while the exhausted pool keeps re-drawing the same handful of
  // questions (this is what surfaced as "each question plays several
  // audio extracts" once today's own testing had built up enough seen-
  // history to make that common). Unlike Progress Mode's own reroll (a
  // student's private queue, retried silently before anything is heard),
  // a driver here can't be asked for a specific replacement question, only
  // "start over" — which means "play its intro again" for every one of
  // these apps. So this always accepts whatever the driver actually drew.
  // Still records it into the same seen-cycle/cooldown store as before —
  // no false promise of same-round dedup, but a question a class hears
  // today genuinely is less likely to resurface too soon in a *future*
  // session, which is the part this can actually deliver without a
  // per-app audio contract to interrupt cleanly.
  function checkLiveSignatureThenPoll(doc, driver, runId) {
    let signature = null;
    try { signature = driver.getSignature ? driver.getSignature(doc) : null; } catch (_error) { signature = null; }

    if (signature) rememberLiveSlotSignature(signature);
    liveCurrentSignature = signature;
    liveCurrentRevealedAt = Date.now();
    els.liveAppFrameLoading.classList.add('hidden');
    try { els.liveAppFrame.contentWindow && els.liveAppFrame.contentWindow.focus(); } catch (_error) { /* ignore */ }
    beginLiveAnsweredPolling(doc, driver, runId);
  }

  function rememberLiveSlotSignature(signature) {
    const SR = window.EchoAuralSpacedRepetition;
    const seenKey = liveSpacedRepKey(liveActiveSourceKey);
    // A source's pool is finite — once every candidate at this level has
    // already been shown, keep accepting draws instead of quietly refusing
    // to record anything further (SR.markShown no-ops past a full cycle
    // otherwise). Reset first so the cycle starts fresh from here, mirroring
    // Progress Mode's own exhausted-pool fallback.
    if (SR && SR.getSeenIds(seenKey).indexOf(signature) !== -1) SR.resetCycle(seenKey);
    if (SR) SR.markShown([signature], { key: seenKey, idOf: (value) => value });
  }

  function showLiveIframeUnavailable() {
    els.liveAppFrameLoading.textContent = 'This question is not available right now — ask your teacher to move on.';
    els.liveAppFrameLoading.classList.remove('hidden');
  }

  function beginLiveAnsweredPolling(doc, driver, runId) {
    clearLiveDriverTimer();
    liveDriverTimer = window.setInterval(() => {
      if (!liveFrameStillCurrent(doc, runId)) { clearLiveDriverTimer(); return; }
      let answered = false;
      try { answered = driver.isAnswered(doc); } catch (_error) { answered = false; }
      if (!answered) return;
      clearLiveDriverTimer();
      let correct = false;
      try { correct = !!driver.isCorrect(doc); } catch (_error) { correct = false; }
      submitLiveIframeAnswer(correct);
    }, 200);
  }

  async function submitLiveIframeAnswer(correct) {
    if (liveIframeAnswered || !currentState || !currentState.question) return;
    liveIframeAnswered = true;
    // Feeds the exact same SM-2 cooldown schedule shouldRerollLiveSignature
    // reads from, so a question answered here is genuinely spaced out over
    // this student's future Live Sessions, not just skipped this once.
    if (liveCurrentSignature && window.EAProgressModeStore) {
      const responseTimeMs = liveCurrentRevealedAt ? Date.now() - liveCurrentRevealedAt : undefined;
      window.EAProgressModeStore.recordQuestionOutcome(studentId, liveActiveSourceKey, liveCurrentSignature, correct, responseTimeMs);
    }
    try {
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        driverReportedCorrect: correct,
        questionId: currentState.question?.id,
        questionIndex: currentState.questionIndex,
        questionRunId: currentState.questionRunId,
        roundId: currentState.roundId
      });
      handleState(response.state);
    } catch (error) {
      liveIframeAnswered = false;
      if (error.code === 'STALE_QUESTION' && error.state) {
        handleState(error.state);
        return;
      }
      els.feedbackPanel.classList.remove('hidden');
      els.feedbackPanel.innerHTML = `<p>${escapeHTML(error.message || 'Could not submit your answer. Ask your teacher to check.')}</p>`;
    }
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
    if (question.keySignature) {
      const count = Math.max(0, Number(question.keySignature.count || 0));
      const accidental = question.keySignature.type === 'flat' ? '♭' : question.keySignature.type === 'sharp' ? '♯' : '';
      return `<div class="mixed-key-signature-visual" role="img" aria-label="${escapeHTML(question.keySignature.displayLabel || 'Key signature')}"><span class="mixed-key-clef" aria-hidden="true">𝄞</span><span class="mixed-key-accidentals" aria-hidden="true">${Array.from({ length: count }, () => accidental).join(' ') || '—'}</span></div>`;
    }
    if (question.visual) {
      return `<div class="mixed-generic-visual"><img src="${escapeHTML(question.visual)}" alt="${escapeHTML(question.visualAlt || '')}" /></div>`;
    }
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
    // A submission response can briefly omit the public question while the
    // room state is being rebuilt. Do not tear down a working PM iframe and
    // send the student back to the app's home screen during that transient
    // poll gap.
    if (!state.question && liveIframeRunId) return;
    const question = state.question || {};
    const moduleLabel = question.moduleTitle || state.moduleTitle || 'EchoAural';
    setModulePresentation(question.moduleId || state.questionModuleId || state.moduleId || 'mixed');
    updateMixedSummary(state);
    els.roomPill.textContent = `Room ${state.roomCode || roomCode}`;
    els.moduleEyebrow.textContent = String(moduleLabel).toUpperCase();
    els.questionModuleEyebrow.textContent = String(moduleLabel).toUpperCase();

    if (shouldUseLiveIframe(question)) {
      renderLiveIframeQuestion(state, question);
      return;
    }
    teardownLiveIframe();

    showQuestionPanel();
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

    const playbackId = state.playback && state.playback.id ? String(state.playback.id) : '';
    if (state.question) {
      const isNewPlayback = playbackId && playbackId !== lastPlaybackId;
      if (isNewPlayback) lastPlaybackId = playbackId;
      renderQuestion(state);
      // Live-iframe questions play their own audio from inside the real app
      // (its own manual Play button — see modules/instrument-identifier/
      // script.js's loadQuestionById, which never autoplays) rather than
      // through this host's own studentAudio element/server-synced
      // playback endpoint. Scheduling it here too would be pointless at
      // best and, if a stale playbackId from a previous non-iframe
      // question is still around, a real risk of audio bleeding from the
      // wrong source. Note this is a real, deliberate behaviour change from
      // the old bespoke renderer: the teacher dashboard's centrally-
      // synchronized "everyone hears it together, N listens max" playback
      // control does not reach into the iframe — each student can replay
      // freely inside the embedded app instead. Worth revisiting, not
      // silently patched over tonight.
      if (!shouldUseLiveIframe(state.question)) scheduleStudentAudio(state, Boolean(isNewPlayback));
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
        questionIndex: currentState.questionIndex,
        questionRunId: currentState.questionRunId,
        roundId: currentState.roundId
      });
      submitted = true;
      handleState(response.state);
      renderSubmissionFeedback(response.submission);
    } catch (error) {
      els.submitButton.disabled = false;
      els.submitButton.textContent = 'Submit answer';
      els.feedbackPanel.classList.remove('hidden');
      if (error.code === 'STALE_QUESTION') {
        // Not a real failure — the teacher moved on before this request
        // landed. Refresh to the room's current question instead of
        // showing a scary error for something the student didn't do wrong.
        submitted = false;
        els.feedbackPanel.innerHTML = '<p>That question moved on before your answer arrived — showing the current one.</p>';
        if (error.state) handleState(error.state);
      } else {
        els.feedbackPanel.innerHTML = `<p>${escapeHTML(error.message || 'Could not submit your answer.')}</p>`;
      }
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
