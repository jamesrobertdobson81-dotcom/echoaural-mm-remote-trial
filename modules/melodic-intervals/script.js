(() => {
  const data = window.EchoAuralMelodicIntervals;
  const els = {
    settingsToggle: document.getElementById('settingsToggle'),
    advancedSettings: document.getElementById('advancedSettings'),
    startButton: document.getElementById('startButton'),
    playButton: document.getElementById('playButton'),
    checkButton: document.getElementById('checkAnswerButton'),
    resetButton: document.getElementById('restartButton'),
    questionText: document.getElementById('questionText'),
    feedback: document.getElementById('feedback'),
    scoreText: document.getElementById('scoreText'),
    streakText: document.getElementById('streakText'),
    xpText: document.getElementById('xpText'),
    roundText: document.getElementById('roundText'),
    progressInner: document.getElementById('progressInner'),
    staveStage: document.getElementById('staveStage'),
    noteHint: document.getElementById('noteHint'),
    answers: document.getElementById('answers'),
    answerCard: document.getElementById('answerCard'),
    audio: document.getElementById('intervalAudio'),
    quizPanel: document.getElementById('gameScreen'),
    setupMessage: document.getElementById('setupMessage')
  };

  const NOTE_ASSET = '../melody-master/assets/icons/notes/crotchet-sibelius.png';
  const DEFAULT_SCORE_ASSET = 'assets/blank-treble-bar.png';
  const STAVE_WIDTH = 666;
  const STAVE_HEIGHT = 210;
  const NOTE_START_X = 240;
  const NOTE_TARGET_X = 360;
  const NOTE_LEDGER_WIDTH = 48;

  let allQuestions = data.buildQuestions();
  let roundQuestions = [];
  let questionIndex = 0;
  let currentQuestion = null;
  let selectedInterval = '';
  let draggedNoteId = '';
  let score = 0;
  let total = 0;
  let answered = false;
  let roundActive = false;
  let pitchPlaced = false;
  let audioPlaying = false;
  let playbackToken = 0;
  let activeAudioResolver = null;
  let dragState = null;
  let roundResults = [];
  let roundFeedbackOverlay = null;
  let launchParams = {};
  let eaProgressRoundId = "";
  const pageParams = new URLSearchParams(window.location.search || '');
  const rawLearningMode = String(pageParams.get('eaMode') || '').trim().toLowerCase();
  const learningMode = rawLearningMode === 'progress' ? 'progression' : rawLearningMode;
  const dashboardPath = pageParams.get('eaDashboard') || '/account/student-home/';
  const PROGRESSION_LEVELS = [
    { id: 0, key: 'foundation', name: 'Foundation', questions: 5, passMark: 100, description: 'ascending natural-note interval numbers from unison to octave, excluding 6ths and 7ths' },
    { id: 1, key: 'developing', name: 'Developing', questions: 5, passMark: 100, description: 'ascending and descending interval numbers from unison to octave' },
    { id: 2, key: 'securing', name: 'Securing', questions: 5, passMark: 100, description: 'major, minor and perfect interval names in both directions' },
    { id: 3, key: 'mastering', name: 'Mastering', questions: 5, passMark: 100, description: 'complete diatonic interval names in the written key, including the augmented 4th and diminished 5th' }
  ];
  let currentProgressionLevel = 0;
  let activeProgressionLevel = PROGRESSION_LEVELS[0];
  let accountProgressionState = null;
  let recordedProgressionRound = false;

  function escapeHTML(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function isProgressionMode() {
    return learningMode === 'progression';
  }

  function isPracticeMode() {
    return learningMode === 'practice';
  }

  function applyDashboardLinks() {
    if (!isProgressionMode() && !isPracticeMode()) return;
    document.querySelectorAll('.topbar-home-link, .brand[href], a[aria-label*="EchoAural home"]').forEach((link) => {
      link.href = dashboardPath;
    });
  }

  function initialisePracticeTimeTracking() {
    if (!isPracticeMode() || !window.EchoAuralTracking?.savePracticeTime) return;

    const startedAt = new Date();
    const startedMs = Date.now();
    const clientSessionId = window.EchoAuralTracking.createClientRoundId('melodic-intervals-practice');
    let saved = false;

    function savePracticeTime() {
      if (saved) return;
      const durationSeconds = Math.round((Date.now() - startedMs) / 1000);
      if (durationSeconds < 5) return;
      saved = true;
      void window.EchoAuralTracking.savePracticeTime({
        moduleId: 'melodic-intervals',
        clientSessionId,
        durationSeconds,
        startedAt: startedAt.toISOString()
      }, { keepalive: true });
    }

    window.addEventListener('pagehide', savePracticeTime);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') savePracticeTime();
    });
  }

  function shuffle(items = []) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function setQuizVisualState(state) {
    if (!els.quizPanel) return;
    els.quizPanel.classList.remove('is-ready', 'is-active', 'is-complete');
    els.quizPanel.classList.add(`is-${state}`);
  }

  function setDenseAnswerLayout(choiceCount = 0) {
    els.quizPanel?.classList.toggle('is-dense-answer-set', Number(choiceCount) >= 12);
  }

  function getSelectedRadio(name, fallback) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : fallback;
  }

  function getMode() {
    return getSelectedRadio('quizMode', 'recognition');
  }

  function getQuestionCount() {
    return Math.max(1, Number(getSelectedRadio('questionCount', 3)) || 3);
  }

  function getIntervalSet() {
    return getSelectedRadio('intervalSet', 'basic');
  }

  function getAnswerMode() {
    return getSelectedRadio('answerMode', 'number');
  }

  function setRadioValue(name, value) {
    const targetValue = String(value || '');
    const input = Array.from(document.querySelectorAll(`input[name="${name}"]`))
      .find((item) => item.value === targetValue);
    if (input) input.checked = true;
  }

  async function readAccountProgressionState() {
    try {
      const response = await fetch('/api/student/progression-state?moduleId=melodic-intervals', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload?.ok === false ? null : payload;
    } catch (_error) {
      return null;
    }
  }

  function setCurrentProgressionLevelFromProgress(accountState = null) {
    const saved = window.EAProgressionStore?.getModule?.('melodic-intervals') || { unlockedLevel: 0 };
    const localUnlocked = Math.max(0, Math.min(PROGRESSION_LEVELS.length - 1, Number(saved.unlockedLevel) || 0));
    const accountUnlocked = Math.max(0, Math.min(PROGRESSION_LEVELS.length - 1, Number(accountState?.unlockedLevel) || 0));
    const unlockedLevel = Math.max(localUnlocked, accountUnlocked);
    const requestedLevel = pageParams.has('eaLevel')
      ? Math.max(0, Math.min(PROGRESSION_LEVELS.length - 1, Number(pageParams.get('eaLevel')) || 0))
      : unlockedLevel;
    currentProgressionLevel = Math.min(requestedLevel, unlockedLevel);
    activeProgressionLevel = PROGRESSION_LEVELS[currentProgressionLevel] || PROGRESSION_LEVELS[0];
  }

  function setProgressionMessage() {
    if (!els.setupMessage || !isProgressionMode()) return;
    els.setupMessage.textContent =
      `Progression · Level ${currentProgressionLevel} — ${activeProgressionLevel.name}. ` +
      `${activeProgressionLevel.description}. Complete ${activeProgressionLevel.questions} questions and get every answer correct to progress.`;
  }

  function renderProgressionLevelTile() {
    if (!isProgressionMode()) return;
    const modeGrid = document.querySelector('.mi-mode-grid') || document.querySelector('.progression-level-grid');
    if (!modeGrid) return;

    const heading = modeGrid.previousElementSibling;
    if (heading && /^h[1-6]$/i.test(heading.tagName)) heading.textContent = 'Progress Mode';

    modeGrid.hidden = false;
    modeGrid.removeAttribute('aria-hidden');
    modeGrid.classList.add('progression-level-grid');
    modeGrid.setAttribute('aria-label', 'Current Progress Mode level');
    modeGrid.innerHTML = `
      <div class="progression-level-tile" role="status" aria-live="polite">
        <span class="progression-level-kicker">Current level</span>
        <strong>${escapeHTML(activeProgressionLevel.name)}</strong>
        <small>${escapeHTML(activeProgressionLevel.description)}.</small>
        <span class="progression-level-rule">${activeProgressionLevel.questions} questions · all correct to pass</span>
      </div>
    `;
  }

  function lockProgressionSettings() {
    if (!isProgressionMode()) return;
    document.body.classList.add('ea-progression-app');

    document.querySelectorAll('input[name="quizMode"], input[name="questionCount"], input[name="answerMode"], input[name="intervalSet"]').forEach((input) => {
      input.disabled = true;
      input.closest('label')?.setAttribute('aria-disabled', 'true');
    });

    if (els.settingsToggle) {
      els.settingsToggle.disabled = true;
      els.settingsToggle.setAttribute('aria-disabled', 'true');
    }

    const settingsWrap = els.advancedSettings?.closest('.settings-popover-wrap');
    if (settingsWrap) {
      settingsWrap.hidden = true;
      settingsWrap.setAttribute('aria-hidden', 'true');
    }

    setProgressionMessage();
    renderProgressionLevelTile();
  }

  function getLaunchParams() {
    const params = new URLSearchParams(window.location.search || '');
    return {
      mode: params.get('mode'),
      count: params.get('count'),
      answerMode: params.get('answerMode'),
      set: params.get('set'),
      source: params.get('source'),
      autostart: params.get('autostart') === '1'
    };
  }

  function applyLaunchParams() {
    const launch = getLaunchParams();
    if (launch.mode) setRadioValue('quizMode', launch.mode);
    if (launch.count) setRadioValue('questionCount', launch.count);
    if (launch.answerMode) setRadioValue('answerMode', launch.answerMode);
    if (launch.set) setRadioValue('intervalSet', launch.set);
    return launch;
  }

  function getAvailableQuestions() {
    const set = getIntervalSet();
    return allQuestions.filter((question) => set === 'octaves' || question.intervalLabel !== 'Octave');
  }

  function selectBalancedQuestions(pool = [], count = 5) {
    const targetCount = Math.max(1, Math.min(Number(count) || 1, pool.length));
    const shuffled = shuffle(pool);
    const buckets = new Map();
    shuffled.forEach((question) => {
      const key = `${question.correctAnswer || question.intervalFullLabel || question.intervalLabel}|${question.direction || 'ascending'}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(question);
    });

    const selected = [];
    const used = new Set();
    const bucketKeys = shuffle([...buckets.keys()]);

    while (selected.length < targetCount && bucketKeys.some((key) => buckets.get(key).length)) {
      for (const key of bucketKeys) {
        const bucket = buckets.get(key);
        if (!bucket?.length) continue;
        const next = bucket.shift();
        if (!next || used.has(next.id)) continue;
        used.add(next.id);
        selected.push(next);
        if (selected.length >= targetCount) break;
      }
    }

    return selected.length ? selected : shuffled.slice(0, targetCount);
  }

  function buildProgressionRound() {
    setCurrentProgressionLevelFromProgress(accountProgressionState);
    setProgressionMessage();
    renderProgressionLevelTile();

    const levelQuestions = data.buildQuestions({ level: activeProgressionLevel.key });
    const questions = selectBalancedQuestions(levelQuestions, activeProgressionLevel.questions);
    const levelChoices = data.buildChoices({ level: activeProgressionLevel.key });

    return questions.map((question) => ({
      ...question,
      mode: 'recognition',
      answerMode: question.answerMode || activeProgressionLevel.answerMode,
      choices: Array.isArray(question.choices) && question.choices.length ? question.choices : levelChoices,
      correctAnswer: question.answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel
    }));
  }

  function buildRound() {
    if (isProgressionMode()) return buildProgressionRound();

    const mode = getMode();
    const answerMode = getAnswerMode();
    const includeOctave = getIntervalSet() === 'octaves';
    const questionChoices = data.buildChoices({ answerMode, includeOctave });
    const questions = shuffle(getAvailableQuestions()).slice(0, getQuestionCount());
    return questions.map((question) => ({
      ...question,
      mode,
      answerMode,
      choices: questionChoices,
      correctAnswer: answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel
    }));
  }

  function audioPath(raw) {
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return raw.replace(/^\.\//, '');
  }

  function stopIntervalAudio() {
    playbackToken += 1;
    if (activeAudioResolver) {
      const resolve = activeAudioResolver;
      activeAudioResolver = null;
      resolve({ cancelled: true });
    }
    els.audio.onended = null;
    els.audio.onerror = null;
    els.audio.pause();
    try {
      els.audio.currentTime = 0;
    } catch (error) {
      // Ignore harmless reset errors.
    }
    audioPlaying = false;
  }

  function playAudioFile(path, token) {
    return new Promise((resolve, reject) => {
      els.audio.pause();
      try {
        els.audio.currentTime = 0;
      } catch (error) {
        // Ignore; the new source will reset playback below.
      }

      activeAudioResolver = resolve;
      els.audio.onended = () => {
        if (token !== playbackToken) {
          resolve({ cancelled: true });
          return;
        }
        activeAudioResolver = null;
        resolve({ cancelled: false });
      };
      els.audio.onerror = () => {
        if (token !== playbackToken) {
          resolve({ cancelled: true });
          return;
        }
        activeAudioResolver = null;
        reject(new Error(`Could not load ${path}`));
      };
      els.audio.src = audioPath(path);
      const attempt = els.audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch((error) => {
          if (token !== playbackToken) {
            resolve({ cancelled: true });
            return;
          }
          activeAudioResolver = null;
          reject(error);
        });
      }
    });
  }

  async function playInterval() {
    if (!currentQuestion) return;
    if (audioPlaying) stopIntervalAudio();

    const token = playbackToken + 1;
    playbackToken = token;
    audioPlaying = true;
    els.playButton.disabled = true;
    els.playButton.textContent = 'Playing…';
    els.feedback.textContent = currentQuestion.answerMode === 'quality'
      ? 'Listen for the interval number and its quality in the current key signature.'
      : 'Listen for the size of the melodic leap.';
    els.feedback.className = '';
    try {
      const sequence = currentQuestion.audioSequence || [currentQuestion.startAudio, currentQuestion.targetAudio].filter(Boolean);
      for (let i = 0; i < sequence.length; i += 1) {
        const result = await playAudioFile(sequence[i], token);
        if (result && result.cancelled) return;
        if (token !== playbackToken) return;
        if (i < sequence.length - 1) {
          await delay(currentQuestion.sequenceGapMs || 380);
          if (token !== playbackToken) return;
        }
      }
    } catch (error) {
      if (token !== playbackToken) return;
      els.feedback.textContent = error.message || 'Could not play the interval audio.';
      els.feedback.className = 'bad';
    } finally {
      if (token === playbackToken) {
        audioPlaying = false;
        activeAudioResolver = null;
        els.playButton.disabled = !currentQuestion;
        els.playButton.textContent = 'Play Interval';
      }
    }
  }

  function getNote(id) {
    return data.findNote(id);
  }

  function pct(value, total) {
    return `${((Number(value) || 0) / total) * 100}%`;
  }

  function positionStyle(x, y) {
    return `left:${pct(x, STAVE_WIDTH)};top:${pct(y, STAVE_HEIGHT)};`;
  }

  function ledgerMarkup(note, x, clef) {
    return data.getLedgerLines(note, clef).map((lineY) => {
      const left = x - (NOTE_LEDGER_WIDTH / 2);
      return `<span class="mi-note-ledger" aria-hidden="true" style="left:${pct(left, STAVE_WIDTH)};top:${pct(lineY - 1.5, STAVE_HEIGHT)};width:${pct(NOTE_LEDGER_WIDTH, STAVE_WIDTH)};height:${pct(3, STAVE_HEIGHT)};"></span>`;
    }).join('');
  }

  function accidentalMarkup(note, x, y) {
    if (!note.accidental) return '';
    return `<span class="mi-accidental" aria-hidden="true" style="${positionStyle(x - 32, y + 1)}">${escapeHTML(note.accidental)}</span>`;
  }

  function noteMarkup(note, x, className = '', id = '') {
    const clef = currentQuestion?.clef || 'treble';
    const y = data.getStaffY(note, clef);
    const idMarkup = id ? ` id="${escapeHTML(id)}"` : '';
    return `
      ${ledgerMarkup(note, x, clef)}
      ${accidentalMarkup(note, x, y)}
      <img${idMarkup} class="mi-crotchet-note ${className}" src="${NOTE_ASSET}" alt="" aria-hidden="true" draggable="false" data-note-id="${escapeHTML(note.id)}" style="${positionStyle(x, y)}" />
    `;
  }

  function getStaveMarkup(question, options = {}) {
    const clef = question.clef || 'treble';
    const startNote = getNote(question.startNoteId);
    const targetNote = getNote(question.targetNoteId);
    const hideTarget = Boolean(options.hideTarget);
    if (!startNote || !targetNote) return '<p class="muted">No stave data available.</p>';

    const targetY = data.getStaffY(targetNote, clef);
    const dropLane = question.mode === 'construction'
      ? `<span class="mi-drop-lane" aria-hidden="true" style="left:${pct(NOTE_TARGET_X, STAVE_WIDTH)};top:${pct(105, STAVE_HEIGHT)};"></span>`
      : '';

    return `
      <img class="mi-score-bg" src="${escapeHTML(question.staffAsset || DEFAULT_SCORE_ASSET)}" alt="" aria-hidden="true" draggable="false" />
      ${dropLane}
      ${noteMarkup(startNote, NOTE_START_X, 'mi-start-note')}
      ${hideTarget
        ? `<span class="mi-hidden-note-placeholder" aria-hidden="true" style="${positionStyle(NOTE_TARGET_X, targetY)}"></span>${noteMarkup(startNote, NOTE_TARGET_X, 'mi-target-note mi-drag-note', 'dragNote')}`
        : noteMarkup(targetNote, NOTE_TARGET_X, 'mi-target-note')}
    `;
  }

  function positionDragNote(noteId) {
    const note = getNote(noteId) || getNote(currentQuestion.startNoteId);
    const dragNote = document.getElementById('dragNote');
    if (!dragNote || !note) return;
    const y = data.getStaffY(note, currentQuestion.clef);
    dragNote.style.left = pct(NOTE_TARGET_X, STAVE_WIDTH);
    dragNote.style.top = pct(y, STAVE_HEIGHT);
    dragNote.dataset.noteId = note.id;
    const existingLedgers = els.staveStage.querySelectorAll('[data-drag-ledger="true"]');
    existingLedgers.forEach((item) => item.remove());
    const ledgers = data.getLedgerLines(note, currentQuestion.clef);
    ledgers.forEach((lineY) => {
      const ledger = document.createElement('span');
      ledger.className = 'mi-note-ledger';
      ledger.dataset.dragLedger = 'true';
      ledger.setAttribute('aria-hidden', 'true');
      ledger.style.left = pct(NOTE_TARGET_X - (NOTE_LEDGER_WIDTH / 2), STAVE_WIDTH);
      ledger.style.top = pct(lineY - 1.5, STAVE_HEIGHT);
      ledger.style.width = pct(NOTE_LEDGER_WIDTH, STAVE_WIDTH);
      ledger.style.height = pct(3, STAVE_HEIGHT);
      els.staveStage.insertBefore(ledger, dragNote);
    });
  }

  function yToNearestNaturalNote(clientY) {
    const rect = els.staveStage.getBoundingClientRect();
    const staveY = ((clientY - rect.top) / rect.height) * STAVE_HEIGHT;
    const candidates = data.NATURAL_NOTES;
    let best = candidates[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    candidates.forEach((note) => {
      const distance = Math.abs(data.getStaffY(note, currentQuestion.clef) - staveY);
      if (distance < bestDistance) {
        best = note;
        bestDistance = distance;
      }
    });
    return best;
  }

  function attachDragHandlers() {
    const dragNote = document.getElementById('dragNote');
    if (!dragNote || !currentQuestion) return;
    draggedNoteId = currentQuestion.startNoteId;
    pitchPlaced = false;
    positionDragNote(draggedNoteId);
    els.noteHint.textContent = currentQuestion.answerMode === 'quality'
      ? 'Drag the crotchet to the second pitch you heard, then choose the full interval quality and number.'
      : 'Drag the crotchet to the second pitch you heard, then name the interval.';

    dragNote.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      dragState = { active: true, pointerId: event.pointerId };
      dragNote.setPointerCapture(event.pointerId);
    });

    dragNote.addEventListener('pointermove', (event) => {
      if (!dragState || !dragState.active) return;
      const nearest = yToNearestNaturalNote(event.clientY);
      draggedNoteId = nearest.id;
      positionDragNote(draggedNoteId);
      els.noteHint.textContent = currentQuestion.answerMode === 'quality'
        ? `Second note placed on ${nearest.label}. Now choose the interval quality and number.`
        : `Second note placed on ${nearest.label}. Now choose the interval name.`;
      updateCheckButton();
    });

    dragNote.addEventListener('pointerup', (event) => {
      if (!dragState) return;
      const nearest = yToNearestNaturalNote(event.clientY);
      draggedNoteId = nearest.id;
      pitchPlaced = true;
      positionDragNote(draggedNoteId);
      dragState = null;
      submitAnswerIfReady();
    });
  }

  function renderStave(question) {
    const hideTarget = question.mode === 'construction';
    els.staveStage.innerHTML = getStaveMarkup(question, { hideTarget });
    if (hideTarget) {
      window.requestAnimationFrame(() => attachDragHandlers());
    } else {
      els.noteHint.textContent = question.answerMode === 'quality'
        ? `${question.keySignatureLabel} — listen, then identify the interval quality and number.`
        : `${question.startNoteLabel} to ${question.targetNoteLabel}. Listen, then name the interval.`;
    }
  }

  function renderChoices(question) {
    selectedInterval = '';
    const choices = Array.isArray(question.choices) ? question.choices : data.buildChoices({
      answerMode: question.answerMode,
      includeOctave: question.intervalLabel === 'Octave' || getIntervalSet() === 'octaves'
    });
    setDenseAnswerLayout(choices.length);
    els.answers.dataset.answerCount = String(choices.length);
    els.answers.innerHTML = choices.map((choice) => `
      <button class="mi-answer-button" type="button" data-answer="${escapeHTML(choice)}">${escapeHTML(choice)}</button>
    `).join('');

    els.answers.querySelectorAll('.mi-answer-button').forEach((button) => {
      button.addEventListener('click', () => {
        if (answered) return;
        selectedInterval = button.dataset.answer || '';
        els.answers.querySelectorAll('.mi-answer-button').forEach((item) => item.classList.toggle('is-selected', item === button));
        els.feedback.textContent = currentQuestion.mode === 'construction' && !pitchPlaced
          ? `Selected: ${selectedInterval}. Now place the second note.`
          : `Selected: ${selectedInterval}`;
        els.feedback.className = '';
        submitAnswerIfReady();
      });
    });
  }

  function isReadyForAnswer() {
    if (!currentQuestion || answered) return false;
    const hasInterval = Boolean(selectedInterval);
    const hasPitch = currentQuestion.mode !== 'construction' || pitchPlaced;
    return hasInterval && hasPitch;
  }

  function updateFlowButton() {
    if (els.checkButton) els.checkButton.disabled = true;

    if (!roundActive) {
      els.startButton.disabled = false;
      els.startButton.textContent = 'Start Quiz';
      return;
    }

    if (answered) {
      els.startButton.disabled = false;
      els.startButton.textContent = questionIndex >= roundQuestions.length - 1 ? 'Finish Quiz' : 'Next Question';
      return;
    }

    els.startButton.disabled = true;
    els.startButton.textContent = 'Next Question';
  }

  function submitAnswerIfReady() {
    if (!isReadyForAnswer()) {
      updateFlowButton();
      return;
    }
    checkAnswer();
  }

  function updateCheckButton() {
    updateFlowButton();
  }

  function setQuestion(question) {
    setQuizVisualState('active');
    currentQuestion = question;
    answered = false;
    selectedInterval = '';
    draggedNoteId = '';
    pitchPlaced = question.mode !== 'construction';
    els.playButton.disabled = false;
    els.checkButton.disabled = true;
    els.startButton.disabled = true;
    els.startButton.textContent = 'Next Question';
    els.questionText.textContent = question.mode === 'construction'
      ? (question.answerMode === 'quality'
        ? 'Listen to the two notes. Drag the second note, then choose the interval quality and number.'
        : 'Listen to the two notes. Drag the second note, then name the interval.')
      : (question.answerMode === 'quality'
        ? 'Listen to the two notes and identify the interval quality and number shown on the stave.'
        : 'Listen to the two notes and identify the interval shown on the stave.');
    els.roundText.textContent = `Question ${questionIndex + 1} of ${roundQuestions.length}`;
    els.streakText.textContent = isProgressionMode() ? activeProgressionLevel.name : 'Treble clef';
    const answerModeLabel = question.answerMode === 'quality'
      ? (question.mode === 'construction' ? 'Pitch + quality' : 'Quality + number')
      : (question.mode === 'construction' ? 'Pitch + interval' : 'Interval name');
    els.xpText.textContent = isProgressionMode()
      ? `${question.direction === 'descending' ? 'Descending' : 'Ascending'} · ${answerModeLabel}`
      : answerModeLabel;
    els.progressInner.style.width = `${Math.max(0, (questionIndex / Math.max(1, roundQuestions.length)) * 100)}%`;
    els.feedback.textContent = '';
    els.feedback.className = '';
    renderStave(question);
    renderChoices(question);
    renderEmptyAnswerCard();
  }

  function getMetricStateClass(awarded, possible) {
    if (!possible) return '';
    if (awarded >= possible) return 'is-secure';
    if (awarded > 0) return 'is-nearly';
    return 'is-focus';
  }

  function renderEmptyAnswerCard() {
    els.answerCard.innerHTML = `
      <div class="answerCard-empty mm-source-panel mm-source-panel-active mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel mi-console-feedback-panel">
        <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Melodic Intervals mark breakdown">
          <div class="diagnostic-metric">
            <span>Interval mark</span>
            <strong>—</strong>
          </div>
          <div class="diagnostic-metric">
            <span>Round score</span>
            <strong>—</strong>
          </div>
        </div>

        <div class="diagnostic-card diagnostic-feedback-tile">
          <span>Feedback</span>
          <strong>Listen carefully, then choose your answer. Your result and round score will appear here.</strong>
        </div>

        <div class="diagnostic-card mm-round-score-tile">
          <span>Question</span>
          <strong>Ready</strong>
          <p>The interval marking panel will update after each answer.</p>
        </div>
      </div>
    `;
  }

  function renderAnswerCard(result) {
    const question = currentQuestion;
    if (!question || !result) return;
    const isFullyCorrect = result.score === result.total;
    const roundPossible = total || result.total;
    const roundPercentage = roundPossible ? Math.round((score / roundPossible) * 100) : 0;
    const intervalMarkText = `${result.intervalCorrect ? 1 : 0} / 1`;
    const pitchMarkText = question.mode === 'construction' ? `${result.pitchCorrect ? 1 : 0} / 1` : null;
    const secondMetricLabel = question.mode === 'construction' ? 'Pitch mark' : 'Round score';
    const secondMetricText = question.mode === 'construction'
      ? pitchMarkText
      : `${score} / ${roundPossible}`;
    const secondMetricState = question.mode === 'construction'
      ? getMetricStateClass(result.pitchCorrect ? 1 : 0, 1)
      : getMetricStateClass(score, roundPossible);
    const answerDetail = question.mode === 'construction'
      ? `Your interval: ${selectedInterval || '—'} · your second note: ${(getNote(draggedNoteId) || {}).label || '—'}`
      : `Your answer: ${selectedInterval || '—'}`;

    els.answerCard.innerHTML = `
      <div class="answer-reveal mm-source-panel ${isFullyCorrect ? 'is-correct' : 'is-wrong'} mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel mi-console-feedback-panel">
        <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Melodic Intervals mark breakdown">
          <div class="diagnostic-metric ${getMetricStateClass(result.intervalCorrect ? 1 : 0, 1)}">
            <span>Interval mark</span>
            <strong>${escapeHTML(intervalMarkText)}</strong>
          </div>
          <div class="diagnostic-metric ${secondMetricState}">
            <span>${escapeHTML(secondMetricLabel)}</span>
            <strong>${escapeHTML(secondMetricText)}</strong>
          </div>
        </div>

        <div class="diagnostic-card diagnostic-feedback-tile">
          <span>Feedback</span>
          <strong>${escapeHTML(result.message)}</strong>
        </div>

        <div class="diagnostic-card mm-round-score-tile ${questionIndex >= roundQuestions.length - 1 ? 'is-final' : ''}">
          <span>Round score</span>
          <strong>${escapeHTML(`${score} / ${roundPossible}`)}</strong>
          <small>${escapeHTML(`${roundPercentage}% · Question ${questionIndex + 1} of ${roundQuestions.length}`)}</small>
          <p>${escapeHTML(`${answerDetail} · Correct: ${question.correctAnswer} · ${question.startNoteLabel} → ${question.targetNoteLabel} · ${question.keySignatureLabel}`)}</p>
        </div>
      </div>
    `;
  }

  function getRoundFeedbackMessage(percentage) {
    if (percentage >= 90) return 'Excellent. Your interval recognition is secure and accurate.';
    if (percentage >= 75) return 'Strong round. Keep connecting the stave distance to the sound of each interval.';
    if (percentage >= 50) return 'Good start. Focus on hearing whether the second note moves by step, third, fourth, fifth, or octave.';
    return 'Keep practising. Replay intervals slowly and connect the visual distance on the stave to the sound.';
  }

  function renderRoundQuestionRows() {
    if (!roundResults.length) {
      return '<div class="mm-round-review-row"><span>Round</span><strong>No submitted answers</strong><small>Start another quiz when ready.</small></div>';
    }

    return roundResults.map((result, index) => {
      const isCorrect = result.awarded === result.possible;
      const detail = result.mode === 'construction'
        ? `${result.startNoteLabel} → ${result.targetNoteLabel} · ${result.correctAnswer} · ${result.pitchCorrect ? 'pitch secure' : `placed ${result.draggedNoteLabel || '—'}`} · ${result.keySignatureLabel}`
        : `${result.startNoteLabel} → ${result.targetNoteLabel} · ${result.correctAnswer} · ${result.keySignatureLabel}`;
      return `
        <div class="mm-round-review-row ${isCorrect ? 'is-secure' : 'is-focus'}">
          <span>Question ${Number(result.questionNumber || index + 1)}</span>
          <strong>${escapeHTML(`${result.awarded}/${result.possible}`)}</strong>
          <small>${escapeHTML(isCorrect ? `Correct · ${detail}` : `Review · chose ${result.selectedInterval || '—'} · ${detail}`)}</small>
        </div>
      `;
    }).join('');
  }

  function renderRoundFeedbackPanel() {
    const percentage = total ? Math.round((score / total) * 100) : 0;
    const questionTotal = roundQuestions.length || getQuestionCount();
    return `
      <div class="mm-round-review-panel mm-source-panel mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel mi-round-feedback-panel">
        <button class="mi-round-feedback-close" id="miRoundFeedbackClose" type="button" aria-label="Close round feedback">×</button>
        <p class="eyebrow">ROUND FEEDBACK</p>
        <div class="mm-round-review-hero">
          <span>Final score</span>
          <strong>${escapeHTML(`${score}/${total}`)}</strong>
          <small>${escapeHTML(`${roundResults.length}/${questionTotal} questions submitted · ${percentage}%`)}</small>
        </div>

        <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Interval quiz mark breakdown">
          <div class="diagnostic-metric ${score === total && total ? 'is-secure' : 'is-focus'}">
            <span>Interval total</span>
            <strong>${escapeHTML(`${score}/${total}`)}</strong>
          </div>
          <div class="diagnostic-metric ${roundResults.length === questionTotal ? 'is-secure' : 'is-focus'}">
            <span>Questions</span>
            <strong>${escapeHTML(`${roundResults.length}/${questionTotal}`)}</strong>
          </div>
        </div>

        <div class="diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile">
          <span>Compiled feedback</span>
          <strong>${escapeHTML(getRoundFeedbackMessage(percentage))}</strong>
        </div>

        <div class="mm-round-review-list" aria-label="Question-by-question interval results">
          ${renderRoundQuestionRows()}
        </div>
      </div>
    `;
  }

  function removeRoundFeedbackOverlay() {
    if (roundFeedbackOverlay && roundFeedbackOverlay.parentNode) {
      roundFeedbackOverlay.parentNode.removeChild(roundFeedbackOverlay);
    }
    roundFeedbackOverlay = null;
    document.body.classList.remove('mm-round-review-open');
    const appShell = document.querySelector('.app-shell');
    const quizPanel = document.getElementById('gameScreen');
    if (appShell) appShell.classList.remove('is-round-feedback-open');
    if (quizPanel) quizPanel.classList.remove('is-round-feedback-open');
  }

  function closeRoundFeedbackWindow() {
    removeRoundFeedbackOverlay();
    if (isProgressionMode()) {
      window.location.href = dashboardPath;
      return;
    }
    if (launchParams.source === 'melody-master') {
      window.location.href = '../melody-master/index.html';
      return;
    }
    resetApp();
  }

  function showRoundFeedbackWindow() {
    removeRoundFeedbackOverlay();
    const appShell = document.querySelector('.app-shell');
    const quizPanel = document.getElementById('gameScreen');
    if (appShell) appShell.classList.add('is-round-feedback-open');
    if (quizPanel) quizPanel.classList.add('is-round-feedback-open');
    document.body.classList.add('mm-round-review-open');

    roundFeedbackOverlay = document.createElement('div');
    roundFeedbackOverlay.className = 'mm-round-feedback-overlay mi-round-feedback-overlay';
    roundFeedbackOverlay.setAttribute('role', 'dialog');
    roundFeedbackOverlay.setAttribute('aria-modal', 'true');
    roundFeedbackOverlay.setAttribute('aria-label', 'Melodic Intervals round feedback');
    roundFeedbackOverlay.innerHTML = renderRoundFeedbackPanel();
    document.body.appendChild(roundFeedbackOverlay);

    const closeButton = roundFeedbackOverlay.querySelector('#miRoundFeedbackClose');
    if (closeButton) closeButton.addEventListener('click', closeRoundFeedbackWindow);
  }

  function checkAnswer() {
    if (!currentQuestion || answered || !isReadyForAnswer()) return;
    const intervalCorrect = data.sameInterval(selectedInterval, currentQuestion.correctAnswer);
    const pitchCorrect = currentQuestion.mode !== 'construction' || draggedNoteId === currentQuestion.targetNoteId;
    const possible = currentQuestion.mode === 'construction' ? 2 : 1;
    const awarded = (intervalCorrect ? 1 : 0) + (currentQuestion.mode === 'construction' && pitchCorrect ? 1 : 0);
    answered = true;
    score += awarded;
    total += possible;

    const result = {
      questionId: currentQuestion.id,
      questionNumber: questionIndex + 1,
      mode: currentQuestion.mode,
      answerMode: currentQuestion.answerMode,
      awarded,
      possible,
      intervalCorrect,
      pitchCorrect,
      selectedInterval,
      correctAnswer: currentQuestion.correctAnswer,
      intervalLabel: currentQuestion.intervalLabel,
      intervalFullLabel: currentQuestion.intervalFullLabel,
      intervalQuality: currentQuestion.intervalQuality,
      startNoteLabel: currentQuestion.startNoteLabel,
      targetNoteLabel: currentQuestion.targetNoteLabel,
      draggedNoteLabel: (getNote(draggedNoteId) || {}).label || '',
      targetNoteId: currentQuestion.targetNoteId,
      draggedNoteId,
      keySignatureLabel: currentQuestion.keySignatureLabel,
      keySignatureId: currentQuestion.keySignatureId,
      direction: currentQuestion.direction,
      semitoneDistance: currentQuestion.semitoneDistance,
      level: currentQuestion.level || '',
      levelKey: currentQuestion.levelKey || '',
      levelIndex: currentQuestion.levelIndex
    };
    roundResults.push(result);

    els.answers.querySelectorAll('.mi-answer-button').forEach((button) => {
      const value = button.dataset.answer || '';
      button.disabled = true;
      if (data.sameInterval(value, currentQuestion.correctAnswer)) button.classList.add('correct');
      if (data.sameInterval(value, selectedInterval) && !data.sameInterval(value, currentQuestion.correctAnswer)) button.classList.add('wrong');
    });

    const message = awarded === possible
      ? `Correct — ${currentQuestion.startNoteLabel} to ${currentQuestion.targetNoteLabel} in ${currentQuestion.keySignatureLabel} is a ${currentQuestion.correctAnswer}.`
      : currentQuestion.mode === 'construction'
        ? `Not quite. The target was ${currentQuestion.targetNoteLabel}, creating a ${currentQuestion.correctAnswer} in ${currentQuestion.keySignatureLabel}.`
        : `Not quite. The interval was a ${currentQuestion.correctAnswer} in ${currentQuestion.keySignatureLabel}.`;

    els.feedback.textContent = message;
    els.feedback.className = awarded === possible ? 'good' : 'bad';
    els.scoreText.textContent = `Score: ${score} / ${total}`;
    els.progressInner.style.width = `${Math.max(0, ((questionIndex + 1) / Math.max(1, roundQuestions.length)) * 100)}%`;
    els.checkButton.disabled = true;
    els.checkButton.textContent = 'Check Answer';
    els.startButton.disabled = false;
    els.startButton.textContent = questionIndex >= roundQuestions.length - 1 ? 'Finish Quiz' : 'Next Question';
    result.score = awarded;
    result.total = possible;
    result.message = message;
    renderAnswerCard(result);
  }

  function nextOrFinish() {
    if (!roundActive || !answered) return;
    stopIntervalAudio();
    if (questionIndex >= roundQuestions.length - 1) {
      finishRound();
      return;
    }
    questionIndex += 1;
    els.checkButton.textContent = 'Check Answer';
    setQuestion(roundQuestions[questionIndex]);
    playInterval();
  }

  function handleMainAction() {
    if (!roundActive) {
      startRound();
      return;
    }
    nextOrFinish();
  }

  function resetIntervalProgressRound() {
    eaProgressRoundId = window.EchoAuralTracking
      ? window.EchoAuralTracking.createClientRoundId("melodic-intervals")
      : `melodic-intervals-${Date.now()}`;
  }

  function saveIntervalProgress() {
    if (!window.EchoAuralTracking || !roundResults.length) return Promise.resolve({ saved: false, reason: 'tracking-unavailable' });
    if (!eaProgressRoundId) resetIntervalProgressRound();
    const percentage = total ? Math.round((score / total) * 100) : 0;
    const firstQuestion = roundQuestions[0] || {};
    const metadata = {
      mode: roundResults[0]?.mode || getMode(),
      answerMode: firstQuestion.answerMode || getAnswerMode(),
      intervalSet: isProgressionMode() ? activeProgressionLevel.key : getIntervalSet()
    };

    if (isProgressionMode()) {
      metadata.source = 'student_progression';
      metadata.learningMode = 'progression';
      metadata.progressionLevel = currentProgressionLevel;
      metadata.progressionLevelLabel = activeProgressionLevel.name;
      metadata.level = activeProgressionLevel.name;
      metadata.levelKey = activeProgressionLevel.key;
      metadata.passMark = activeProgressionLevel.passMark;
    }

    return window.EchoAuralTracking.saveRound({
      moduleId: "melodic-intervals",
      clientRoundId: eaProgressRoundId,
      score,
      maximumScore: total,
      roundFeedback: getRoundFeedbackMessage(percentage),
      metadata,
      questions: roundResults.map((result, index) => ({
        questionId: result.questionId || `MI-Q${index + 1}`,
        score: Number(result.awarded) || 0,
        maximumScore: Number(result.possible) || 0,
        feedback: result.message || (result.awarded === result.possible ? "Secure interval response." : `Review ${result.correctAnswer}.`),
        answerData: {
          mode: result.mode,
          answerMode: result.answerMode || "",
          intervalCorrect: Boolean(result.intervalCorrect),
          pitchCorrect: Boolean(result.pitchCorrect),
          selectedInterval: result.selectedInterval || "",
          correctAnswer: result.correctAnswer || "",
          intervalLabel: result.intervalLabel || "",
          intervalFullLabel: result.intervalFullLabel || "",
          intervalQuality: result.intervalQuality || "",
          startNoteLabel: result.startNoteLabel || "",
          targetNoteLabel: result.targetNoteLabel || "",
          keySignatureLabel: result.keySignatureLabel || "",
          keySignatureId: result.keySignatureId || "",
          direction: result.direction || "",
          semitoneDistance: Number(result.semitoneDistance) || 0,
          level: result.level || activeProgressionLevel.name || "",
          levelKey: result.levelKey || activeProgressionLevel.key || "",
          progressionLevel: result.levelIndex ?? currentProgressionLevel
        }
      }))
    });
  }

  function progressionResultCopy(passed, percentage, nextUnlocked) {
    if (passed && nextUnlocked) {
      return `<strong>${escapeHTML(activeProgressionLevel.name)} passed at ${percentage}%.</strong> ${escapeHTML(PROGRESSION_LEVELS[currentProgressionLevel + 1].name)} is now unlocked.`;
    }
    if (passed) {
      return `<strong>${escapeHTML(activeProgressionLevel.name)} passed at ${percentage}%.</strong> Replay it to keep your interval recognition sharp.`;
    }
    return `<strong>${percentage}% recorded.</strong> You need every answer correct to unlock the next level.`;
  }

  function insertProgressionResultPanel({ passed, percentage, nextUnlocked, saveResult }) {
    const host = roundFeedbackOverlay?.querySelector('.mi-round-feedback-panel') || els.answerCard;
    if (!host) return;

    host.querySelector('[data-ea-progression-result]')?.remove();
    const panel = document.createElement('div');
    panel.className = 'diagnostic-card diagnostic-feedback-tile';
    panel.setAttribute('data-ea-progression-result', '');
    panel.innerHTML = `
      <span>Progression result</span>
      <strong>${progressionResultCopy(passed, percentage, nextUnlocked)}</strong>
      <small>
        Level ${currentProgressionLevel} · ${escapeHTML(activeProgressionLevel.name)}. ${saveResult?.saved === false
          ? 'This score was kept on this device, but could not be saved to your account yet.'
          : 'This score has been saved to your account progress record.'}
      </small>
      <a class="primary-button" href="${escapeHTML(dashboardPath)}">Return to student dashboard</a>
    `;
    host.appendChild(panel);
  }

  async function recordProgressionRound(roundSave) {
    if (!isProgressionMode() || recordedProgressionRound) return;
    recordedProgressionRound = true;

    let saveResult = null;
    try {
      saveResult = await Promise.resolve(roundSave);
    } catch (_error) {
      saveResult = { saved: false, reason: 'account-save-failed' };
    }

    const maximumScore = Math.max(0, Number(total) || 0);
    const roundScore = Math.max(0, Number(score) || 0);
    const percentage = maximumScore ? Math.round((roundScore / maximumScore) * 100) : 0;
    const passed = percentage >= activeProgressionLevel.passMark && roundResults.length >= activeProgressionLevel.questions;
    const before = Math.max(
      0,
      Math.min(PROGRESSION_LEVELS.length - 1, Number(window.EAProgressionStore?.getModule?.('melodic-intervals')?.unlockedLevel) || 0)
    );

    const result = await window.EAProgressionStore?.recordAttempt?.({
      moduleId: 'melodic-intervals',
      level: currentProgressionLevel,
      score: roundScore,
      maximumScore,
      percentage,
      passMark: activeProgressionLevel.passMark,
      passed
    });

    const after = Math.max(0, Math.min(PROGRESSION_LEVELS.length - 1, Number(result?.moduleState?.unlockedLevel) || before));
    const nextUnlocked = after > before && currentProgressionLevel < PROGRESSION_LEVELS.length - 1;

    insertProgressionResultPanel({ passed, percentage, nextUnlocked, saveResult });

    if (after > currentProgressionLevel) {
      currentProgressionLevel = after;
      activeProgressionLevel = PROGRESSION_LEVELS[currentProgressionLevel] || activeProgressionLevel;
      setProgressionMessage();
      renderProgressionLevelTile();
    }
  }

  function finishRound() {
    stopIntervalAudio();
    const roundSave = saveIntervalProgress();
    setQuizVisualState('complete');
    roundActive = false;
    currentQuestion = null;
    els.roundText.textContent = 'Round complete';
    els.progressInner.style.width = '100%';
    els.questionText.textContent = 'Round complete. Review your feedback, then close the tile to return to the start screen.';
    els.playButton.disabled = true;
    els.checkButton.disabled = true;
    els.checkButton.textContent = 'Check Answer';
    els.startButton.disabled = true;
    els.startButton.textContent = 'Finish Quiz';
    const percentage = total ? Math.round((score / total) * 100) : 0;
    els.feedback.textContent = `Round complete — ${score} / ${total} (${percentage}%).`;
    els.feedback.className = percentage >= 70 ? 'good' : 'bad';
    els.answerCard.innerHTML = `
      <div class="answerCard-empty classroom-status-panel is-submitted mi-answer-result-panel">
        <span class="classroom-status-pill">Round complete</span>
        <div class="mi-round-summary">
          <div class="mi-question-result-hero">
            <span>Final score</span>
            <strong>${escapeHTML(`${score} / ${total}`)}</strong>
            <small>${escapeHTML(`${percentage}% · ${roundResults.length}/${roundQuestions.length} questions`)}</small>
          </div>
          <p>${escapeHTML(getRoundFeedbackMessage(percentage))}</p>
        </div>
      </div>
    `;
    showRoundFeedbackWindow();
    void recordProgressionRound(roundSave);
  }

  function startRound() {
    stopIntervalAudio();
    removeRoundFeedbackOverlay();
    recordedProgressionRound = false;
    roundQuestions = buildRound();
    questionIndex = 0;
    score = 0;
    total = 0;
    roundResults = [];
    resetIntervalProgressRound();
    roundActive = true;
    els.scoreText.textContent = 'Score: 0 / 0';
    els.startButton.textContent = 'Next Question';
    els.startButton.disabled = true;
    els.checkButton.textContent = 'Check Answer';
    els.checkButton.disabled = true;
    setQuestion(roundQuestions[0]);
    playInterval();
  }

  function resetApp() {
    stopIntervalAudio();
    removeRoundFeedbackOverlay();
    roundQuestions = [];
    questionIndex = 0;
    currentQuestion = null;
    selectedInterval = '';
    draggedNoteId = '';
    answered = false;
    roundActive = false;
    pitchPlaced = false;
    setQuizVisualState('ready');
    score = 0;
    total = 0;
    roundResults = [];
    els.scoreText.textContent = 'Score: 0 / 0';
    els.roundText.textContent = 'Ready';
    els.progressInner.style.width = '0%';
    els.questionText.textContent = isProgressionMode()
      ? `Start the ${activeProgressionLevel.name} Progress Mode round.`
      : 'Choose a mode, then start the quiz.';
    els.staveStage.innerHTML = '';
    els.noteHint.textContent = 'The notes will appear here.';
    els.answers.innerHTML = '';
    setDenseAnswerLayout(0);
    delete els.answers.dataset.answerCount;
    els.feedback.textContent = '';
    els.feedback.className = '';
    els.playButton.disabled = true;
    els.checkButton.disabled = true;
    els.checkButton.textContent = 'Check Answer';
    els.startButton.textContent = 'Start Quiz';
    els.startButton.disabled = false;
    renderEmptyAnswerCard();
  }

  function toggleSettings() {
    if (isProgressionMode()) return;
    const isOpen = els.advancedSettings.style.display !== 'none';
    els.advancedSettings.style.display = isOpen ? 'none' : 'block';
    els.advancedSettings.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    els.settingsToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  }

  els.settingsToggle.addEventListener('click', toggleSettings);
  els.startButton.addEventListener('click', handleMainAction);
  els.playButton.addEventListener('click', playInterval);
  els.checkButton.addEventListener('click', submitAnswerIfReady);
  els.resetButton.addEventListener('click', resetApp);
  if (els.checkButton) {
    els.checkButton.hidden = true;
    els.checkButton.setAttribute('aria-hidden', 'true');
  }
  window.addEventListener('resize', () => {
    if (currentQuestion && currentQuestion.mode === 'construction' && draggedNoteId) positionDragNote(draggedNoteId);
  });

  async function boot() {
    applyDashboardLinks();
    initialisePracticeTimeTracking();
    launchParams = applyLaunchParams();

    if (isProgressionMode()) {
      els.startButton.disabled = true;
      try {
        await window.EAProgressionStore?.ready?.();
      } catch (_error) {}
      accountProgressionState = await readAccountProgressionState();
      setCurrentProgressionLevelFromProgress(accountProgressionState);
      lockProgressionSettings();
    }

    resetApp();
    if (isProgressionMode()) lockProgressionSettings();
    if (launchParams.autostart) {
      startRound();
    }
  }

  void boot();
})();
