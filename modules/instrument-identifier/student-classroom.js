(() => {
  const body = document.body;

  const els = {
    gate: document.getElementById('classroomGate'),
    appShell: document.getElementById('classroomAppShell'),
    joinForm: document.getElementById('classroomJoinForm'),
    nameInput: document.getElementById('classroomNameInput'),
    codeInput: document.getElementById('classroomCodeInput'),
    joinMessage: document.getElementById('classroomJoinMessage'),
    waitCard: document.getElementById('classroomWaitCard'),
    waitingCode: document.getElementById('classroomWaitingCode'),
    waitingMessage: document.getElementById('classroomWaitingMessage'),
    topbarCode: document.getElementById('classroomTopbarCode'),
    sideCode: document.getElementById('classroomSideCode'),
    studentName: document.getElementById('classroomStudentName'),
    studentLine: document.getElementById('classroomStudentLine'),
    connectionStatus: document.getElementById('classroomConnectionStatus'),
    enableAudioButton: document.getElementById('classroomEnableAudioButton'),
    audioStatus: document.getElementById('classroomAudioStatus'),
    studentAudio: document.getElementById('classroomStudentAudio'),
    quizPanel: document.getElementById('gameScreen'),
    roundText: document.getElementById('roundText'),
    progressInner: document.getElementById('progressInner'),
    scoreText: document.getElementById('scoreText'),
    streakText: document.getElementById('streakText'),
    xpText: document.getElementById('xpText'),
    questionText: document.getElementById('questionText'),
    answers: document.getElementById('answers'),
    feedback: document.getElementById('feedback'),
    manualPlayButton: document.getElementById('manualPlayButton'),
    submitButton: document.getElementById('classroomSubmitButton'),
    answerCard: document.getElementById('answerCard'),
    roundFeedbackOverlay: document.getElementById('classroomRoundFeedbackOverlay'),
    roundFeedbackContent: document.getElementById('classroomRoundFeedbackContent')
  };

  const params = new URLSearchParams(window.location.search);
  let roomCode = normaliseRoomCode(params.get('room') || window.localStorage.getItem('ea_classroom_last_room'));
  let studentId = String(params.get('student') || window.sessionStorage.getItem('ea_classroom_student_tab_id') || '').trim();
  let studentName = String(params.get('name') || window.localStorage.getItem('ea_classroom_student_name') || '').trim();
  let pollTimer = null;
  let currentState = null;
  let currentQuestionRunId = null;
  let currentRoundId = null;
  let lastPlaybackId = '';
  let selectedAnswer = '';
  let submitted = false;
  let studentAudioUnlocked = false;
  let studentAudioTimer = null;

  const SILENT_AUDIO_DATA_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const ICON_BASE_PATH = '/assets/icons/instruments/';

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
    'acoustic guitar': 'guitar.svg',
    'classical guitar': 'guitar.svg',
    'electric guitar': 'guitar.svg',
    'bass guitar': 'guitar.svg',
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
    marimba: 'xylophone.svg',
    vibraphone: 'vibraphone.svg',
    voice: 'voice.svg',
    soprano: 'voice.svg',
    alto: 'voice.svg',
    tenor: 'voice.svg',
    bass: 'voice.svg',
    choir: 'voice.svg'
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

  function getStudentRouteForModule(moduleId) {
    if (moduleId === 'melody-master') return '/modules/melody-master/student-laptop.html';
    if (moduleId === 'instrument-identifier') return '/modules/instrument-identifier/student-classroom.html';
    return '/student/student-shell.html';
  }

  function redirectIfTeacherModuleChanged(state = {}) {
    const moduleId = String(state.moduleId || '').trim();
    if (!moduleId || moduleId === 'instrument-identifier') return false;
    const targetPath = getStudentRouteForModule(moduleId);
    const params = new URLSearchParams();
    params.set('room', state.roomCode || roomCode);
    if (studentName) params.set('name', studentName);
    if (studentId) params.set('student', studentId);
    window.location.replace(`${targetPath}?${params.toString()}`);
    return true;
  }

  function cleanText(value) {
    return String(value || '').trim().toLowerCase();
  }

  function displayText(value) {
    return String(value || '').trim();
  }

  function normaliseIconKey(value) {
    return cleanText(value)
      .replaceAll('&', 'and')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function slugifyInstrument(value) {
    return normaliseIconKey(value).replace(/\s+/g, '-');
  }

  function getIconFileName(instrument) {
    const key = normaliseIconKey(instrument);
    return INSTRUMENT_ICON_MAP[key] || `${slugifyInstrument(instrument)}.svg`;
  }

  function getInstrumentIcon(instrument) {
    const safeInstrument = displayText(instrument) || 'Instrument';
    const src = `${ICON_BASE_PATH}${getIconFileName(safeInstrument)}`;
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

  function buildMetaRow(label, value) {
    if (!displayText(value)) return '';
    return `
      <div class="meta-row">
        <span>${escapeHTML(label)}</span>
        <strong>${escapeHTML(value)}</strong>
      </div>
    `;
  }

  async function api(path, bodyPayload = null, method = bodyPayload ? 'POST' : 'GET') {
    const options = { method, headers: { Accept: 'application/json' } };
    if (bodyPayload) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(bodyPayload);
    }

    const response = await fetch(window.EchoAuralClassroom.buildApiUrl(path), options);
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_error) { throw new Error('The classroom server returned an unreadable response.'); }
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function ensureStudentId() {
    if (!studentId) studentId = `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
    window.sessionStorage.setItem('ea_ii_classroom_student_tab_id', studentId);
    return studentId;
  }

  function setPhase(phase) {
    body.classList.remove('ii-classroom-phase-join', 'ii-classroom-phase-waiting', 'ii-classroom-phase-active');
    body.classList.add(`ii-classroom-phase-${phase}`);
    if (els.appShell) els.appShell.setAttribute('aria-hidden', String(phase !== 'active'));
    if (els.waitCard) els.waitCard.hidden = phase !== 'waiting';
  }

  function setJoinMessage(message = '', state = '') {
    els.joinMessage.textContent = message;
    els.joinMessage.className = `ii-classroom-message ${state ? `is-${state}` : ''}`.trim();
  }

  function setAudioStatus(message = '', state = '') {
    els.audioStatus.textContent = message;
    els.audioStatus.className = `ii-classroom-audio-status ${state ? `is-${state}` : ''}`.trim();
  }

  function updateAudioButton() {
    els.enableAudioButton.disabled = studentAudioUnlocked;
    els.enableAudioButton.classList.toggle('is-enabled', studentAudioUnlocked);
    els.enableAudioButton.textContent = studentAudioUnlocked ? 'Audio enabled' : 'Enable audio for remote play';
  }

  function updateConnectedLabels() {
    els.topbarCode.textContent = roomCode || '—';
    els.sideCode.textContent = roomCode || '—';
    els.studentName.textContent = studentName || '—';
    els.studentLine.textContent = studentName
      ? `${studentName}, you are connected to the live Instrument Identifier quiz.`
      : 'You are connected to the live Instrument Identifier quiz.';
  }

  function resolveAudioPath(question = {}) {
    const raw = String(question.audio || question.file || '').trim();
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return `/modules/instrument-identifier/${raw.replace(/^\.\//, '')}`;
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
      updateAudioButton();
      setAudioStatus('Audio enabled. The excerpt will play from this computer when your teacher presses Play.', 'good');
    } catch (_error) {
      studentAudioUnlocked = false;
      updateAudioButton();
      setAudioStatus('Audio was blocked. Click Enable Audio again, then keep this tab open.', 'bad');
    }
  }

  function setQuizVisualState(state) {
    els.quizPanel.classList.remove('is-ready', 'is-active', 'is-complete');
    els.quizPanel.classList.add(`is-${state}`);
    body.classList.toggle('ii-classroom-waiting-state', state === 'ready');
    body.classList.toggle('ii-classroom-active-state', state === 'active');
  }

  function renderWaitingCard(message = '') {
    if (els.waitingCode) els.waitingCode.textContent = roomCode || '—';
    if (els.waitingMessage) {
      els.waitingMessage.textContent = message || 'You are in. The Instrument Identifier screen will appear when your teacher starts the quiz.';
    }
  }

  function renderEmptyAnswerCard(message = 'Choose an instrument, then submit when you are ready.') {
    els.answerCard.innerHTML = `
      <div class="answerCard-empty">
        <div class="answer-empty-brand" aria-hidden="true">
          <span class="answer-empty-icon">
            <img src="/assets/icons/modules/instrument-identifier.png" alt="" onerror="this.style.display='none';" />
          </span>
          <span class="answer-empty-wave"><span></span><span></span><span></span><span></span><span></span></span>
        </div>
        <p class="eyebrow">CLASSROOM ANSWER</p>
        <h2>Your listening evidence appears here.</h2>
        <p class="muted">${escapeHTML(message)}</p>
      </div>
    `;
  }

  function renderAnswerReveal(submission = {}, question = {}) {
    const correct = Boolean(submission.correct || Number(submission.score || 0) >= Number(submission.total || 1));
    const modelAnswer = submission.modelAnswer || 'the correct instrument';
    els.answerCard.innerHTML = `
      <div class="answer-reveal ${correct ? 'is-correct' : 'is-wrong'}">
        <div class="answer-status-line">
          <span class="answer-status-dot" aria-hidden="true"></span>
          <p class="${correct ? 'good' : 'bad'}">${correct ? 'Correct' : 'Not quite'}</p>
        </div>

        <div class="reveal-icon">${getInstrumentIcon(modelAnswer)}</div>

        <div class="answer-title-block">
          <p class="eyebrow">IDENTIFIED INSTRUMENT</p>
          <h2>${escapeHTML(modelAnswer)}</h2>
        </div>

        <div class="answer-meta-card">
          ${buildMetaRow('Your answer', submission.answer)}
          ${buildMetaRow('Score', `${Number(submission.score || 0)} / ${Number(submission.total || 1)}`)}
          ${buildMetaRow('Family', question.family)}
          ${buildMetaRow('Type', question.type)}
          ${buildMetaRow('Difficulty', question.difficulty)}
        </div>
      </div>
    `;
  }

  function getRoundResults(state = currentState) {
    const results = state && state.student && Array.isArray(state.student.results) ? state.student.results : [];
    return results.slice().sort((left, right) => Number(left.quizQuestionNumber || 0) - Number(right.quizQuestionNumber || 0));
  }

  function getRoundSummary(state = currentState) {
    const results = getRoundResults(state);
    const awarded = results.reduce((sum, result) => sum + Number(result.score || 0), 0);
    const possible = results.reduce((sum, result) => sum + Number(result.total || 0), 0);
    const percentage = possible ? Math.round((awarded / possible) * 100) : 0;
    return { results, awarded, possible, percentage };
  }

  function getRoundFeedbackText(summary = getRoundSummary()) {
    if (!summary.results.length) return 'No submitted answers were recorded on this device.';
    if (summary.percentage >= 90) return 'Excellent round. Your instrument recognition is secure across the listening questions.';
    if (summary.percentage >= 70) return 'Strong round. Most of your instrument choices were accurate; keep listening for tone colour and playing technique.';
    if (summary.percentage >= 50) return 'Developing round. Some instruments are secure; focus next on comparing family, register and timbre.';
    return 'Keep building confidence. Start by identifying the instrument family, then narrow the answer by tone colour and register.';
  }

  function buildRoundSummaryMarkup(summary = getRoundSummary(), compact = false) {
    const rows = summary.results.length
      ? summary.results.map((result, index) => {
        const score = `${Number(result.score || 0)}/${Number(result.total || 1)}`;
        const answer = result.answer || 'No answer';
        const modelAnswer = result.modelAnswer || 'Correct answer';
        const correct = Number(result.score || 0) >= Number(result.total || 1);
        const detail = correct ? `Correct: ${modelAnswer}` : `You chose ${answer} · Correct: ${modelAnswer}`;
        return `
          <div class="mm-round-review-row ${correct ? 'is-correct' : 'is-focus'}">
            <span>Question ${Number(result.quizQuestionNumber || index + 1)}</span>
            <strong>${escapeHTML(score)}</strong>
            <small>${escapeHTML(detail)}</small>
          </div>
        `;
      }).join('')
      : '<div class="mm-round-review-row"><span>Round</span><strong>No submitted answers</strong><small>Your teacher may still have the class results.</small></div>';

    return `
      <div class="mm-round-review-hero">
        <span>Final score</span>
        <strong>${summary.possible ? escapeHTML(`${summary.awarded}/${summary.possible}`) : '—'}</strong>
        ${summary.possible ? `<small>${escapeHTML(`${summary.percentage}% · ${summary.results.length} submitted`)}</small>` : ''}
      </div>

      <div class="diagnostic-metrics" aria-label="Round score summary">
        <div class="diagnostic-metric ${summary.percentage >= 70 ? 'is-secure' : 'is-focus'}">
          <span>Instrument ID</span>
          <strong>${summary.possible ? escapeHTML(`${summary.awarded}/${summary.possible}`) : '—'}</strong>
        </div>
        <div class="diagnostic-metric ${summary.percentage >= 70 ? 'is-secure' : 'is-focus'}">
          <span>Accuracy</span>
          <strong>${summary.possible ? escapeHTML(`${summary.percentage}%`) : '—'}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Compiled feedback</span>
        <strong>${escapeHTML(getRoundFeedbackText(summary))}</strong>
      </div>

      ${compact ? '' : `<div class="mm-round-review-list" aria-label="Question-by-question classroom results">${rows}</div>`}
    `;
  }

  function hideRoundFeedbackOverlay() {
    if (els.roundFeedbackOverlay) els.roundFeedbackOverlay.hidden = true;
    body.classList.remove('classroom-round-feedback-open');
  }

  function showRoundFeedbackOverlay(state = currentState) {
    if (!els.roundFeedbackOverlay || !els.roundFeedbackContent) return;
    const summary = getRoundSummary(state);
    els.roundFeedbackContent.innerHTML = buildRoundSummaryMarkup(summary);
    els.roundFeedbackOverlay.hidden = false;
    body.classList.add('classroom-round-feedback-open');
  }

  function resetForNewRound(state = {}) {
    selectedAnswer = '';
    submitted = false;
    currentQuestionRunId = null;
    lastPlaybackId = '';
    hideRoundFeedbackOverlay();
    if (els.studentAudio) {
      els.studentAudio.pause();
      els.studentAudio.currentTime = 0;
    }
    if (!state.question) {
      setPhase('waiting');
      setWaiting('You are in. Wait for your teacher to start the quiz.');
      renderStats(state);
    }
  }

  function renderRoundSummary(state = currentState) {
    const summary = getRoundSummary(state);
    showRoundFeedbackOverlay(state);
    els.answerCard.innerHTML = `
      <div class="answerCard-empty classroom-status-panel classroom-round-summary-panel is-submitted">
        <span class="classroom-status-pill">Round feedback</span>
        ${buildRoundSummaryMarkup(summary, true)}
      </div>
    `;
  }

  function renderStats(state = currentState) {
    const ownStudent = (state.students || []).find((student) => student.id === studentId) || {};
    const score = Number(ownStudent.cumulativeScore || 0);
    const total = Number(ownStudent.cumulativeTotal || 0);
    const submittedCount = Number(ownStudent.questionsSubmitted || 0);
    const percentage = ownStudent.cumulativePercentage;
    const quiz = state.quiz || {};
    const current = Number(quiz.currentQuestionNumber || 0);
    const quizTotal = Number(quiz.totalQuestions || 0);

    els.scoreText.textContent = `Score: ${score} / ${total}`;
    els.streakText.textContent = `Submitted: ${submittedCount}`;
    els.xpText.textContent = `Accuracy: ${percentage === null || percentage === undefined ? '—' : `${percentage}%`}`;

    if (quiz.ended) {
      els.roundText.textContent = 'Round complete';
      els.progressInner.style.width = '100%';
    } else if (current && quizTotal) {
      els.roundText.textContent = `Question ${current} / ${quizTotal}`;
      els.progressInner.style.width = `${Math.max(0, Math.min(100, ((current - (submitted ? 0 : 1)) / quizTotal) * 100))}%`;
    } else {
      els.roundText.textContent = 'Waiting for teacher';
      els.progressInner.style.width = '0%';
    }
  }

  function setWaiting(message = 'Waiting for your teacher to start the quiz.') {
    hideRoundFeedbackOverlay();
    renderWaitingCard(message);
    setQuizVisualState('ready');
    els.questionText.textContent = message;
    els.answers.innerHTML = '';
    els.feedback.textContent = '';
    els.feedback.className = '';
    els.submitButton.disabled = true;
    els.submitButton.textContent = 'Submit answer';
    els.manualPlayButton.disabled = true;
    renderEmptyAnswerCard('The answer panel will unlock after you submit.');
  }

  function scheduleStudentAudio(state, isNewPlayback = false) {
    const playback = state && state.playback ? state.playback : null;
    const playbackId = playback && playback.id ? String(playback.id) : '';
    const question = state && state.question ? state.question : {};
    const audioPath = resolveAudioPath(question);

    if (!playbackId || !audioPath || !isNewPlayback || playbackId === lastPlaybackId) return;
    lastPlaybackId = playbackId;

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

    els.studentAudio.onerror = () => {
      setAudioStatus('The audio file could not be loaded. Check that modules/instrument-identifier/audio contains this clip.', 'bad');
    };

    const playNow = () => {
      const attempt = els.studentAudio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          studentAudioUnlocked = false;
          updateAudioButton();
          setAudioStatus('Your browser blocked the excerpt. Click Enable Audio, then ask the teacher to play again.', 'bad');
        });
      }
    };

    setAudioStatus(studentAudioUnlocked
      ? 'Get ready — the excerpt will play from this computer.'
      : 'Click Enable Audio if you do not hear the excerpt.', studentAudioUnlocked ? 'good' : '');

    studentAudioTimer = window.setTimeout(playNow, msUntilAudio);
  }

  function playCurrentAudioManually() {
    const question = currentState && currentState.question ? currentState.question : null;
    const audioPath = resolveAudioPath(question || {});
    if (!question || !audioPath) {
      setAudioStatus('No audio is available for the current question yet.', 'bad');
      return;
    }

    els.studentAudio.pause();
    els.studentAudio.src = audioPath;
    els.studentAudio.currentTime = 0;
    els.studentAudio.muted = false;
    els.studentAudio.volume = 1;
    els.studentAudio.onerror = () => {
      setAudioStatus('The audio file could not be loaded. Check the Instrument Identifier audio folder.', 'bad');
    };
    const attempt = els.studentAudio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => setAudioStatus('Click Enable Audio first, then try again.', 'bad'));
    }
  }

  function renderAnswerControls(state = currentState) {
    const question = state.question || {};
    const choices = Array.isArray(question.choices) ? question.choices.slice(0, 4) : [];
    const submission = state.student && state.student.submission ? state.student.submission : null;
    submitted = Boolean(state.student && state.student.submitted);

    if (!choices.length) {
      els.answers.innerHTML = '<p class="muted">No answer choices are available for this question.</p>';
      els.submitButton.disabled = true;
      return;
    }

    if (submitted && submission && !selectedAnswer) selectedAnswer = submission.answer || '';

    const modelAnswer = submission && submission.modelAnswer ? cleanText(submission.modelAnswer) : '';
    els.answers.innerHTML = choices.map((choice) => {
      const isSelected = cleanText(choice) === cleanText(selectedAnswer);
      const isCorrect = submitted && modelAnswer && cleanText(choice) === modelAnswer;
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
          <span class="option-icon">${getInstrumentIcon(choice)}</span>
          <span class="option-label">${escapeHTML(choice)}</span>
        </button>
      `;
    }).join('');

    els.answers.querySelectorAll('.answer-option').forEach((button) => {
      button.addEventListener('click', () => {
        if (submitted) return;
        selectedAnswer = button.dataset.answer || '';
        els.answers.querySelectorAll('.answer-option').forEach((item) => item.classList.remove('is-selected'));
        button.classList.add('is-selected');
        els.submitButton.disabled = false;
        els.feedback.textContent = `Selected: ${selectedAnswer}`;
        els.feedback.className = '';
      });
    });

    if (submitted) {
      els.submitButton.disabled = true;
      els.submitButton.textContent = 'Submitted';
      els.feedback.textContent = submission.feedback || submission.shortComment || 'Your answer has been submitted.';
      els.feedback.className = submission.correct ? 'good' : 'bad';
      renderAnswerReveal(submission, question);
    } else {
      els.submitButton.disabled = !selectedAnswer;
      els.submitButton.textContent = 'Submit answer';
      if (!selectedAnswer) els.feedback.textContent = 'Choose the instrument you can hear.';
      renderEmptyAnswerCard('Choose an instrument, then submit when you are ready.');
    }
  }

  function renderQuestion(state = currentState) {
    if (!state || !state.question) {
      setWaiting('Waiting for your teacher to start the quiz.');
      renderStats(state || {});
      return;
    }

    setQuizVisualState(state.quiz?.ended ? 'complete' : 'active');
    const question = state.question;
    const questionRunId = String(state.questionRunId || '');
    if (questionRunId && questionRunId !== currentQuestionRunId) {
      currentQuestionRunId = questionRunId;
      selectedAnswer = '';
      submitted = false;
      lastPlaybackId = '';
      hideRoundFeedbackOverlay();
      if (els.studentAudio) {
        els.studentAudio.pause();
        els.studentAudio.currentTime = 0;
      }
    }

    els.connectionStatus.textContent = state.quiz?.ended ? 'Round complete' : (state.submissionsOpen ? 'Open' : 'Closed');
    els.questionText.textContent = question.prompt || question.question || 'Listen to the clip. What instrument is playing?';
    els.manualPlayButton.disabled = !resolveAudioPath(question);
    renderAnswerControls(state);
    renderStats(state);
  }

  function renderState(state = currentState) {
    currentState = state;
    updateConnectedLabels();

    if (!state) {
      setPhase('waiting');
      setWaiting('You are in. Wait for your teacher to start the quiz.');
      return;
    }

    if (redirectIfTeacherModuleChanged(state)) return;

    const playbackId = state.playback && state.playback.id ? String(state.playback.id) : '';
    const isQuizEnded = Boolean(state.quiz && state.quiz.ended);
    const roundId = Number(state.roundId || 0);

    if (roundId && currentRoundId !== null && roundId !== currentRoundId) {
      currentRoundId = roundId;
      resetForNewRound(state);
    } else if (roundId && currentRoundId === null) {
      currentRoundId = roundId;
    }

    if (!state.question) {
      setPhase('waiting');
      setWaiting('You are in. Wait for your teacher to start the quiz.');
      renderStats(state);
      return;
    }

    if (isQuizEnded) {
      setPhase('active');
      renderQuestion(state);
      renderRoundSummary(state);
      return;
    }

    if (!playbackId) {
      setPhase('waiting');
      setWaiting('Question is loaded. Wait for your teacher to press Play.');
      renderStats(state);
      return;
    }

    const isNewPlayback = Boolean(playbackId && playbackId !== lastPlaybackId);
    setPhase('active');
    renderQuestion(state);
    scheduleStudentAudio(state, isNewPlayback);
  }

  async function submitAnswer() {
    if (!roomCode || !studentId || !selectedAnswer || submitted) return;
    els.submitButton.disabled = true;
    els.submitButton.textContent = 'Submitting…';
    try {
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        answer: selectedAnswer
      });
      renderState(response.state);
    } catch (error) {
      els.feedback.textContent = error.message || 'Could not submit your answer.';
      els.feedback.className = 'bad';
      els.submitButton.disabled = false;
      els.submitButton.textContent = 'Submit answer';
    }
  }

  async function refreshState() {
    if (!roomCode || !studentId) return;
    try {
      const state = await api(`/api/classroom/state?roomCode=${encodeURIComponent(roomCode)}&studentId=${encodeURIComponent(studentId)}`);
      els.connectionStatus.textContent = state.submissionsOpen ? 'Open' : 'Connected';
      renderState(state);
    } catch (error) {
      els.connectionStatus.textContent = 'Disconnected';
      els.feedback.textContent = error.message || 'Could not refresh the classroom.';
      els.feedback.className = 'bad';
    }
  }

  function startPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(refreshState, 1200);
    refreshState();
  }

  async function joinClassroom(name, code) {
    studentName = String(name || '').trim();
    roomCode = normaliseRoomCode(code);
    if (!studentName) throw new Error('Enter your name.');
    if (!roomCode) throw new Error('Enter the join code.');
    ensureStudentId();

    const response = await api('/api/classroom/join', { roomCode, studentId, name: studentName });
    roomCode = response.roomCode || roomCode;
    studentId = String(response.studentId || studentId);
    studentName = String(response.studentName || studentName);
    window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
    window.sessionStorage.setItem('ea_ii_classroom_student_tab_id', studentId);
    if (els.nameInput) els.nameInput.value = studentName;
    window.localStorage.setItem('ea_classroom_student_name', studentName);
    window.localStorage.setItem('ea_classroom_last_room', roomCode);
    window.localStorage.setItem('ea_ii_classroom_student_name', studentName);
    window.localStorage.setItem('ea_ii_classroom_last_room', roomCode);

    updateConnectedLabels();
    setPhase('waiting');
    setWaiting('You are in. Wait for your teacher to start the quiz.');
    renderState(response.state);
    startPolling();
  }

  function init() {
    if (roomCode && els.codeInput) els.codeInput.value = roomCode;
    if (studentName && els.nameInput) els.nameInput.value = studentName;
    updateAudioButton();
    updateConnectedLabels();
    setWaiting();

    els.joinForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setJoinMessage('Joining room…');
      try {
        await joinClassroom(els.nameInput.value, els.codeInput.value);
        setJoinMessage('Joined.', 'good');
      } catch (error) {
        setJoinMessage(error.message || 'Could not join this room.', 'bad');
      }
    });

    els.enableAudioButton.addEventListener('click', unlockStudentAudio);
    els.manualPlayButton.addEventListener('click', playCurrentAudioManually);
    els.submitButton.addEventListener('click', submitAnswer);

    if (roomCode && studentName && studentId) {
      joinClassroom(studentName, roomCode).catch((error) => setJoinMessage(error.message || 'Could not rejoin this room.', 'bad'));
    }
  }

  init();
})();
