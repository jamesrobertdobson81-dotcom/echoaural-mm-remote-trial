(() => {
  const data = window.EchoAuralMelodicIntervals;
  const els = {
    settingsToggle: document.getElementById('settingsToggle'),
    advancedSettings: document.getElementById('advancedSettings'),
    replayIntervalButton: document.getElementById('replayIntervalButton'),
    startButton: document.getElementById('startButton'),
    resetButton: document.getElementById('restartButton'),
    questionText: document.getElementById('questionText'),
    questionMarks: document.getElementById('questionMarks'),
    feedback: document.getElementById('feedback'),
    scoreText: document.getElementById('scoreText'),
    roundText: document.getElementById('roundText'),
    progressInner: document.getElementById('progressInner'),
    staveStage: document.getElementById('staveStage'),
    answers: document.getElementById('answers'),
    answerCard: document.getElementById('answerCard'),
    audio: document.getElementById('intervalAudio'),
    quizPanel: document.getElementById('gameScreen'),
    setupMessage: document.getElementById('setupMessage')
  };

  const NOTE_ASSET = '../../assets/icons/notation/crotchet.png';
  const ACCIDENTAL_ASSET = { '♯': '../../assets/icons/notation/sharp.png', '♭': '../../assets/icons/notation/flat.png' };
  const STAVE_WIDTH = data.STAVE_IMAGE_METRICS.width;
  const STAVE_HEIGHT = 210;
  const NOTE_LEDGER_WIDTH = 48;
  const DEFAULT_PLAY_LIMIT = 3;

  // Baked clef+stave+key-signature artwork (real Sibelius exports), cropped wider
  // than Harmony Explorer's copies so the stave lines reach the right edge of the
  // tile natively — no separate line-extension needed. Placed so its stave lines
  // land exactly on the note-positioning grid below (topLineY 63, lineSpace 21 —
  // the same scale the baked images were cropped at, so no extra scaling is needed).
  const KEYSIG_ASSET_BASE = '../../assets/icons/notation/keysig-mi/';
  const KEYSIG_IMAGE_WIDTH = 430;
  const KEYSIG_IMAGE_HEIGHT = 160;
  const KEYSIG_IMAGE_OFFSET_X = -5;
  const KEYSIG_IMAGE_OFFSET_Y = 23;

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
  const activeAudioResolvers = new Set();
  const activeIntervalAudios = new Set();
  let playLimit = DEFAULT_PLAY_LIMIT;
  let playsUsedThisQuestion = 0;
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

  function getQuestionMarkTotal(question) {
    if (!question) return 0;
    if (question.mode === 'construction') return 2;
    if (question.answerMode === 'quality') return 2;
    return 1;
  }

  function normaliseIntervalQuality(value) {
    const norm = data.normaliseIntervalAnswer(value);
    const match = norm.match(/^(major|minor|perfect|augmented|diminished)/);
    return match ? match[1] : '';
  }

  function normaliseIntervalNumber(value) {
    const norm = data.normaliseIntervalAnswer(value);
    const match = norm.match(/(unison|2nd|3rd|4th|5th|6th|7th|octave)/);
    return match ? match[1] : norm;
  }

  function isIntervalQualityCorrect(answer, question) {
    const expected = normaliseIntervalQuality(question.intervalQuality || question.correctAnswer);
    if (!expected) return data.sameInterval(answer, question.correctAnswer);
    return normaliseIntervalQuality(answer) === expected;
  }

  function isIntervalNumberCorrect(answer, question) {
    const expected = question.intervalLabel || '';
    if (!expected) return data.sameInterval(answer, question.correctAnswer);
    return data.sameInterval(normaliseIntervalNumber(answer), expected);
  }

  function scoreQuestionAnswer(question, selectedAnswer, pitchCorrect) {
    if (question.mode === 'construction') {
      const intervalCorrect = data.sameInterval(selectedAnswer, question.correctAnswer);
      const pitchOk = Boolean(pitchCorrect);
      return {
        awarded: (intervalCorrect ? 1 : 0) + (pitchOk ? 1 : 0),
        possible: 2,
        intervalCorrect,
        pitchCorrect: pitchOk,
        qualityCorrect: intervalCorrect,
        numberCorrect: intervalCorrect
      };
    }

    if (question.answerMode === 'quality') {
      const qualityCorrect = isIntervalQualityCorrect(selectedAnswer, question);
      const numberCorrect = isIntervalNumberCorrect(selectedAnswer, question);
      return {
        awarded: (qualityCorrect ? 1 : 0) + (numberCorrect ? 1 : 0),
        possible: 2,
        intervalCorrect: qualityCorrect && numberCorrect,
        pitchCorrect: true,
        qualityCorrect,
        numberCorrect
      };
    }

    const intervalCorrect = data.sameInterval(selectedAnswer, question.correctAnswer);
    return {
      awarded: intervalCorrect ? 1 : 0,
      possible: 1,
      intervalCorrect,
      pitchCorrect: true,
      qualityCorrect: intervalCorrect,
      numberCorrect: intervalCorrect
    };
  }

  function stripTrailingQuestionMarkSuffix(text) {
    if (window.EAQuestionPromptMarks?.stripTrailing) {
      return window.EAQuestionPromptMarks.stripTrailing(text);
    }
    return String(text ?? '')
      .replace(/(?:[\s\u00A0\u202F]*)[(（]\s*\d+(?:\.\d+)?\s*[)）]\s*$/u, '')
      .replace(/[\s\u00A0\u202F]+$/u, '');
  }

  function setQuestionPrompt(text, question = null) {
    const promptEl = els.questionText.querySelector('.mi-question-prompt') || els.questionText;
    promptEl.textContent = stripTrailingQuestionMarkSuffix(text);

    const marks = question && roundActive ? getQuestionMarkTotal(question) : 0;
    if (els.questionMarks) {
      if (marks > 0) {
        els.questionMarks.textContent = `\u00A0(${marks})`;
        els.questionMarks.hidden = false;
        els.questionMarks.setAttribute('aria-hidden', 'false');
        els.questionMarks.setAttribute('aria-label', `${marks} mark${marks === 1 ? '' : 's'}`);
      } else {
        els.questionMarks.textContent = '';
        els.questionMarks.hidden = true;
        els.questionMarks.setAttribute('aria-hidden', 'true');
        els.questionMarks.removeAttribute('aria-label');
      }
    }
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function isProgressionMode() {
    return learningMode === 'progression';
  }

  function applyDashboardLinks() {
    if (!isProgressionMode()) return;
    document.querySelectorAll('.topbar-home-link, .brand[href], a[aria-label*="EchoAural home"]').forEach((link) => {
      link.href = dashboardPath;
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
    els.quizPanel?.classList.toggle('is-dense-answer-set', false);
  }

  function buildQuestionMcChoices(question, pool = []) {
    return data.buildMcChoices({
      correctAnswer: question.correctAnswer
        || (question.answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel),
      answerMode: question.answerMode,
      pool: pool.length ? pool : data.buildChoices({
        level: question.levelKey || question.level,
        answerMode: question.answerMode,
        includeOctave: question.intervalLabel === 'Octave'
      })
    });
  }

  function getSelectedRadio(name, fallback) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : fallback;
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

    const heading = document.querySelector('.mi-progress-heading') || modeGrid.previousElementSibling;
    if (heading && /^h[1-6]$/i.test(heading.tagName)) {
      heading.textContent = 'Progress Mode';
      heading.hidden = false;
      heading.removeAttribute('aria-hidden');
    }

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

    document.querySelectorAll('input[name="questionCount"], input[name="answerMode"], input[name="intervalSet"]').forEach((input) => {
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

  const MM_LEVEL_NAMES = ['Foundation', 'Developing', 'Securing', 'Mastering'];
  const MM_SKILL_OPTIONS = [
    { value: 'dictation', label: 'Dictation', icon: '../../assets/icons/modules/mm-transparent/melodic-dictation-transparent.png' },
    { value: 'intervals', label: 'Intervals', icon: '../../assets/icons/modules/mm-transparent/melodic-intervals-transparent.png' },
    { value: 'devices', label: 'Devices', icon: '../../assets/icons/modules/mm-transparent/melodic-devices-transparent.png' }
  ];
  const MM_LEVEL_ICONS = {
    Foundation: '../../assets/icons/levels/mm-transparent/foundation-transparent.png',
    Developing: '../../assets/icons/levels/mm-transparent/developing-transparent.png',
    Securing: '../../assets/icons/levels/mm-transparent/securing-transparent.png',
    Mastering: '../../assets/icons/levels/mm-transparent/mastering-transparent.png'
  };

  function isMelodyMasterLaunch() {
    return launchParams.source === 'melody-master';
  }

  function renderMelodyMasterTopbar() {
    const appShell = document.querySelector('.app-shell');
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    if (appShell) {
      appShell.setAttribute('data-brand-app', 'melody-master');
    }

    topbar.innerHTML = `
      <a class="brand refined-logo" href="../../index.html" aria-label="Back to EchoAural home">
        <span class="brand-wave refined-wave" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </span>
        <strong class="wordmark">
          <span class="wordmark-echo">Echo</span><span class="wordmark-aural">Aural</span>
        </strong>
      </a>
      <nav class="topbar-actions" aria-label="Melody Master navigation">
        <a class="topbar-module-chip" href="#gameScreen" aria-label="Melody Master module">
          <span class="topbar-module-icon" aria-hidden="true">
            <img
              src="../../assets/icons/modules/melody-master.png"
              alt=""
              onerror="this.style.display='none'; this.parentElement.classList.add('missing-topbar-icon');"
            />
          </span>
          <span class="topbar-mm-mark" aria-hidden="true">
            <span class="topbar-mm-main">M</span><span class="topbar-mm-gradient">M</span>
          </span>
          <span class="sr-only">Melody Master</span>
        </a>
        <a class="topbar-link topbar-app-link topbar-app-link-ii" href="../instrument-identifier/index.html" aria-label="Open Instrument Identifier">
          <span class="module-title-text">
            <span class="module-title-main">Instrument</span><span class="module-title-gradient">Identifier</span>
          </span>
        </a>
        <a class="topbar-link topbar-app-link topbar-app-link-tt" href="../texture-trainer/index.html" aria-label="Open Texture Trainer">
          <span class="module-title-text">
            <span class="module-title-main">Texture</span><span class="module-title-gradient">Trainer</span>
          </span>
        </a>
        <a class="topbar-link topbar-app-link topbar-app-link-meter" href="../meter-master/index.html" aria-label="Open Meter Master">
          <span class="module-title-text">
            <span class="module-title-main">Meter</span><span class="module-title-gradient">Master</span>
          </span>
        </a>
        <a class="topbar-link topbar-app-link topbar-app-link-cc" href="../../era-explorer/index.html" aria-label="Open ContextCoach">
          <span class="module-title-text">
            <span class="module-title-main">Context</span><span class="module-title-gradient">Coach</span>
          </span>
        </a>
        <a class="topbar-link topbar-home-link" href="../../index.html" aria-label="Back to EchoAural home">
          <span class="back-label">Back to</span>
          <span class="mini-wordmark" aria-hidden="true">
            <span class="mini-wordmark-echo">Echo</span><span class="mini-wordmark-aural">Aural</span>
          </span>
          <span class="sr-only">EchoAural home</span>
        </a>
      </nav>
    `;
  }

  function renderMelodyMasterSetupPanel(activeLevelName = 'Foundation') {
    const setupPanel = document.getElementById('homeScreen');
    if (!setupPanel) return;

    const heading = setupPanel.querySelector('.panel-section-heading');
    const selectedLevel = MM_LEVEL_NAMES.includes(activeLevelName) ? activeLevelName : 'Foundation';
    const skillMarkup = MM_SKILL_OPTIONS.map((skill) => `
      <label class="melody-skill-button">
        <input type="radio" name="quizMode" value="${escapeHTML(skill.value)}"${skill.value === 'intervals' ? ' checked' : ''} disabled />
        <span class="melody-skill-icon" aria-hidden="true">
          <img class="melody-skill-icon-img" src="${escapeHTML(skill.icon)}" alt="" />
        </span>
        <strong>${escapeHTML(skill.label)}</strong>
      </label>
    `).join('');
    const levelMarkup = MM_LEVEL_NAMES.map((level) => `
      <label class="level-button">
        <input type="radio" name="mmLevel" value="${escapeHTML(level)}"${level === selectedLevel ? ' checked' : ''} disabled />
        <img class="level-icon" src="${escapeHTML(MM_LEVEL_ICONS[level])}" alt="" aria-hidden="true" />
        <strong>${escapeHTML(level)}</strong>
      </label>
    `).join('');

    setupPanel.innerHTML = heading ? heading.outerHTML : '';
    setupPanel.insertAdjacentHTML('beforeend', `
      <div class="panel-hero mm-panel-hero">
        <div class="mm-hero-lockup">
          <span class="mm-hero-icon" aria-hidden="true">
            <img src="../../assets/icons/modules/melody-master.png" alt="" onerror="this.style.display='none'; this.parentElement.classList.add('missing-mm-icon');" />
          </span>
          <div class="mm-title-lockup" aria-hidden="true">
            <span class="mm-title-wave"><span></span><span></span><span></span><span></span><span></span></span>
            <span class="mm-title-text">
              <span class="mm-title-main">Melody</span>
              <span class="mm-title-gradient">Master</span>
            </span>
          </div>
          <h1 class="sr-only">Melody Master</h1>
        </div>
        <p class="eyebrow mm-brand-eyebrow">GCSE MUSIC LISTENING SKILLS</p>
      </div>
      <h2 class="melody-skill-heading">Skill</h2>
      <div class="melody-skill-grid" aria-label="Melody Master skill">${skillMarkup}</div>
      <h2>Level</h2>
      <div class="level-grid melody-mode-grid progression-level-grid" aria-label="Melody Master level">${levelMarkup}</div>
      <p id="setupMessage" role="status" aria-live="polite"></p>
    `);

    setupPanel.querySelectorAll('input').forEach((input) => {
      input.disabled = true;
      input.closest('label')?.setAttribute('aria-disabled', 'true');
    });

    els.setupMessage = document.getElementById('setupMessage');
  }

  function applyMelodyMasterLaunchPanel() {
    if (!isMelodyMasterLaunch()) return;
    document.body.classList.add('mi-melody-master-launch');
    renderMelodyMasterTopbar();
    const activeLevel = resolveMelodyMasterLevel();
    renderMelodyMasterSetupPanel(activeLevel?.name || 'Foundation');
  }

  function getLaunchParams() {
    const params = new URLSearchParams(window.location.search || '');
    return {
      mode: params.get('mode'),
      count: params.get('count'),
      answerMode: params.get('answerMode'),
      set: params.get('set'),
      level: params.get('level'),
      source: params.get('source'),
      plays: params.get('plays') || params.get('playLimit'),
      autostart: params.get('autostart') === '1'
    };
  }

  function resolveMelodyMasterLevel(launch = launchParams) {
    if (launch?.source !== 'melody-master') return null;
    return data.getLevelDefinition(launch.level || 'foundation');
  }

  function resolvePlayLimit(launch = launchParams) {
    const fromLaunch = launch?.plays || launch?.playLimit;
    if (fromLaunch) {
      return Math.max(1, Number(fromLaunch) || DEFAULT_PLAY_LIMIT);
    }
    return DEFAULT_PLAY_LIMIT;
  }

  function resetPlayCounterForQuestion() {
    playsUsedThisQuestion = 0;
  }

  function getRemainingPlays() {
    return Math.max(0, playLimit - playsUsedThisQuestion);
  }

  function updateReplayButton() {
    if (!els.replayIntervalButton) return;

    const show = roundActive && currentQuestion && !answered;
    els.replayIntervalButton.hidden = !show;
    if (!show) return;

    const exhausted = getRemainingPlays() <= 0;
    els.replayIntervalButton.classList.toggle('is-exhausted', exhausted);
    els.replayIntervalButton.setAttribute('aria-disabled', exhausted || audioPlaying ? 'true' : 'false');
  }

  function applyLaunchParams() {
    const launch = getLaunchParams();
    const melodyMasterLevel = resolveMelodyMasterLevel(launch);
    if (launch.count) setRadioValue('questionCount', launch.count);
    if (melodyMasterLevel) {
      setRadioValue('answerMode', melodyMasterLevel.answerMode);
    } else if (launch.answerMode) {
      setRadioValue('answerMode', launch.answerMode);
    }
    if (launch.set) setRadioValue('intervalSet', launch.set);
    playLimit = resolvePlayLimit(launch);
    return launch;
  }

  function getAvailableQuestions() {
    const set = getIntervalSet();
    return allQuestions.filter((question) => set === 'octaves' || question.intervalLabel !== 'Octave');
  }

  function selectBalancedQuestions(pool = [], count = 5, spacedKey = '') {
    const targetCount = Math.max(1, Math.min(Number(count) || 1, pool.length));
    const SR = window.EchoAuralSpacedRepetition;
    const shuffled = SR && spacedKey
      ? SR.orderByLeastRecentlyShown(pool, { key: spacedKey, idOf: (question) => question.id })
      : shuffle(pool);
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

    const result = selected.length ? selected : shuffled.slice(0, targetCount);
    if (spacedKey) window.EchoAuralSpacedRepetition?.markShown(result, { key: spacedKey, idOf: (question) => question.id });
    return result;
  }

  function isWrittenInputQuestion(question = currentQuestion) {
    return question?.inputMode === 'written' || question?.answerType === 'text';
  }

  function buildLevelRound(activeLevel, questionCount = getQuestionCount()) {
    const levelQuestions = data.buildQuestions({ level: activeLevel.key });
    const questions = selectBalancedQuestions(levelQuestions, questionCount, `mi:level:${activeLevel.key}`);
    const levelChoices = data.buildChoices({ level: activeLevel.key });

    return questions.map((question) => ({
      ...question,
      mode: 'recognition',
      answerMode: question.answerMode || activeLevel.answerMode,
      inputMode: question.inputMode || activeLevel.inputMode || 'choice',
      answerType: question.answerType || (question.inputMode === 'written' ? 'text' : 'choice'),
      choices: isWrittenInputQuestion(question)
        ? []
        : (Array.isArray(question.choices) && question.choices.length === 4
          ? question.choices
          : buildQuestionMcChoices(question, levelChoices)),
      correctAnswer: (question.answerMode || activeLevel.answerMode) === 'quality'
        ? question.intervalFullLabel
        : question.intervalLabel
    }));
  }

  function buildProgressionRound() {
    setCurrentProgressionLevelFromProgress(accountProgressionState);
    setProgressionMessage();
    renderProgressionLevelTile();

    return buildLevelRound(activeProgressionLevel, activeProgressionLevel.questions);
  }

  function buildMelodyMasterLevelRound() {
    const activeLevel = resolveMelodyMasterLevel();
    if (!activeLevel) return [];
    return buildLevelRound(activeLevel, getQuestionCount());
  }

  // Extracted from buildRound() below so a single raw question (from
  // getAvailableQuestions()) can be wrapped into the same 'recognition'-mode
  // shape a normal round produces — reused by loadQuestionById's Live
  // Session path so a host-selected question renders exactly like any
  // other practice question, not a bespoke second wrapping.
  function wrapQuestionForRecognition(question, { answerMode, questionChoices }) {
    const correctAnswer = answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel;
    return {
      ...question,
      mode: 'recognition',
      answerMode,
      choices: buildQuestionMcChoices({ ...question, answerMode, correctAnswer }, questionChoices),
      correctAnswer
    };
  }

  function buildRound() {
    if (isProgressionMode()) return buildProgressionRound();

    const melodyMasterLevel = resolveMelodyMasterLevel();
    if (melodyMasterLevel) return buildMelodyMasterLevelRound();

    const answerMode = getAnswerMode();
    const includeOctave = getIntervalSet() === 'octaves';
    const questionChoices = data.buildChoices({ answerMode, includeOctave });
    const practiceKey = `mi:practice:${answerMode}:${includeOctave ? 'octaves' : 'no-octaves'}`;
    const SR = window.EchoAuralSpacedRepetition;
    let orderedPool = SR
      ? SR.orderByLeastRecentlyShown(getAvailableQuestions(), { key: practiceKey, idOf: (question) => question.id })
      : shuffle(getAvailableQuestions());
    const roundSize = getQuestionCount();
    // Many different audio clips share the same interval label — keep the
    // same interval answer from appearing twice in one round.
    if (SR?.dedupeByAnswer) {
      orderedPool = SR.dedupeByAnswer(
        orderedPool,
        roundSize,
        (question) => answerMode === 'quality' ? question.intervalFullLabel : question.intervalLabel
      );
    }
    const questions = orderedPool.slice(0, roundSize);
    SR?.markShown(questions, { key: practiceKey, idOf: (question) => question.id });
    return questions.map((question) => wrapQuestionForRecognition(question, { answerMode, questionChoices }));
  }

  function audioPath(raw) {
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return raw.replace(/^\.\//, '');
  }

  function stopIntervalAudio() {
    playbackToken += 1;
    activeAudioResolvers.forEach((resolve) => resolve({ cancelled: true }));
    activeAudioResolvers.clear();
    activeIntervalAudios.forEach((player) => {
      player.onended = null;
      player.onerror = null;
      player.pause();
      try { player.currentTime = 0; } catch (error) { /* Ignore harmless reset errors. */ }
    });
    activeIntervalAudios.clear();
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
      const player = new Audio(audioPath(path));
      activeIntervalAudios.add(player);
      activeAudioResolvers.add(resolve);
      const finish = (result) => {
        activeAudioResolvers.delete(resolve);
        activeIntervalAudios.delete(player);
        resolve(result);
      };
      player.onended = () => {
        if (token !== playbackToken) {
          finish({ cancelled: true });
          return;
        }
        finish({ cancelled: false });
      };
      player.onerror = () => {
        if (token !== playbackToken) {
          finish({ cancelled: true });
          return;
        }
        activeAudioResolvers.delete(resolve);
        activeIntervalAudios.delete(player);
        reject(new Error(`Could not load ${path}`));
      };
      const attempt = player.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch((error) => {
          if (token !== playbackToken) {
            finish({ cancelled: true });
            return;
          }
          activeAudioResolvers.delete(resolve);
          activeIntervalAudios.delete(player);
          reject(error);
        });
      }
    });
  }

  async function playInterval() {
    if (!currentQuestion) return;
    if (audioPlaying) return;
    if (playsUsedThisQuestion >= playLimit) {
      updateReplayButton();
      return;
    }

    const token = playbackToken + 1;
    playbackToken = token;
    audioPlaying = true;
    playsUsedThisQuestion += 1;
    updateReplayButton();
    try {
      const sequence = currentQuestion.audioSequence || [currentQuestion.startAudio, currentQuestion.targetAudio].filter(Boolean);
      const playPromises = [];
      for (let i = 0; i < sequence.length; i += 1) {
        playPromises.push(playAudioFile(sequence[i], token));
        if (i < sequence.length - 1) {
          await delay(1000);
          if (token !== playbackToken) return;
        }
      }
      const results = await Promise.all(playPromises);
      if (results.some((result) => result && result.cancelled)) return;
    } catch (error) {
      if (token !== playbackToken) return;
      playsUsedThisQuestion = Math.max(0, playsUsedThisQuestion - 1);
    } finally {
      if (token === playbackToken) {
        audioPlaying = false;
        activeAudioResolvers.clear();
        activeIntervalAudios.clear();
        updateReplayButton();
      }
    }
  }

  function handleReplayInterval() {
    if (!roundActive || answered || audioPlaying) return;
    if (getRemainingPlays() <= 0) return;
    void playInterval();
  }

  function getNote(id) {
    return data.findNote(id);
  }

  function pct(value, total) {
    return `${((Number(value) || 0) / total) * 100}%`;
  }

  function resolveNotePositions(question = currentQuestion) {
    const accidentalCount = Number(question?.keySignatureAccidentals);
    return data.getNotePositions(Number.isFinite(accidentalCount) ? accidentalCount : 0);
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
    const asset = ACCIDENTAL_ASSET[note.accidental];
    if (!asset) {
      return `<span class="mi-accidental" aria-hidden="true" style="${positionStyle(x - 32, y + 1)}">${escapeHTML(note.accidental)}</span>`;
    }
    const typeClass = note.accidental === '♯' ? 'mi-note-accidental-sharp' : 'mi-note-accidental-flat';
    return `<img class="mi-note-accidental ${typeClass}" src="${asset}" alt="" aria-hidden="true" draggable="false" style="${positionStyle(x - 26, y)}" />`;
  }

  function noteMarkup(note, x, className = '', id = '') {
    const clef = currentQuestion?.clef || 'treble';
    const y = data.getStaffY(note, clef);
    const stemClass = data.getStemDirection(note, clef) === 'down' ? ' is-stem-down' : '';
    const idMarkup = id ? ` id="${escapeHTML(id)}"` : '';
    return `
      ${ledgerMarkup(note, x, clef)}
      ${accidentalMarkup(note, x, y)}
      <img${idMarkup} class="mi-crotchet-note${stemClass} ${className}" src="${NOTE_ASSET}" alt="" aria-hidden="true" draggable="false" data-note-id="${escapeHTML(note.id)}" style="${positionStyle(x, y)}" />
    `;
  }

  function keySignatureAssetPath(keySignature) {
    const map = keySignature?.accidentalMap || {};
    const letters = Object.keys(map);
    if (!letters.length) return `${KEYSIG_ASSET_BASE}treble-natural-0.png`;
    const type = map[letters[0]] > 0 ? 'sharp' : 'flat';
    return `${KEYSIG_ASSET_BASE}treble-${type}-${letters.length}.png`;
  }

  function staveBackgroundMarkup(keySignature) {
    const asset = keySignatureAssetPath(keySignature);
    return `<img class="mi-stave-bg" src="${asset}" alt="" aria-hidden="true" draggable="false" style="left:${pct(KEYSIG_IMAGE_OFFSET_X, STAVE_WIDTH)};top:${pct(KEYSIG_IMAGE_OFFSET_Y, STAVE_HEIGHT)};width:${pct(KEYSIG_IMAGE_WIDTH, STAVE_WIDTH)};height:${pct(KEYSIG_IMAGE_HEIGHT, STAVE_HEIGHT)};" />`;
  }

  function getStaveMarkup(question, options = {}) {
    const clef = question.clef || 'treble';
    const startNote = getNote(question.startNoteId);
    const targetNote = getNote(question.targetNoteId);
    const hideTarget = Boolean(options.hideTarget);
    if (!startNote || !targetNote) return '<p class="muted">No stave data available.</p>';

    const targetY = data.getStaffY(targetNote, clef);
    const { startX, targetX } = resolveNotePositions(question);
    const dropLane = question.mode === 'construction'
      ? `<span class="mi-drop-lane" aria-hidden="true" style="left:${pct(targetX, STAVE_WIDTH)};top:${pct(105, STAVE_HEIGHT)};"></span>`
      : '';
    const keySignature = data.findKeySignature(question.keySignatureId);

    return `
      ${staveBackgroundMarkup(keySignature)}
      ${dropLane}
      ${noteMarkup(startNote, startX, 'mi-start-note')}
      ${hideTarget
        ? `<span class="mi-hidden-note-placeholder" aria-hidden="true" style="${positionStyle(targetX, targetY)}"></span>${noteMarkup(startNote, targetX, 'mi-target-note mi-drag-note', 'dragNote')}`
        : noteMarkup(targetNote, targetX, 'mi-target-note')}
    `;
  }

  function positionDragNote(noteId) {
    const note = getNote(noteId) || getNote(currentQuestion.startNoteId);
    const dragNote = document.getElementById('dragNote');
    if (!dragNote || !note) return;
    const y = data.getStaffY(note, currentQuestion.clef);
    const { targetX } = resolveNotePositions(currentQuestion);
    dragNote.style.left = pct(targetX, STAVE_WIDTH);
    dragNote.style.top = pct(y, STAVE_HEIGHT);
    dragNote.classList.toggle('is-stem-down', data.getStemDirection(note, currentQuestion.clef) === 'down');
    dragNote.dataset.noteId = note.id;
    const existingLedgers = els.staveStage.querySelectorAll('[data-drag-ledger="true"]');
    existingLedgers.forEach((item) => item.remove());
    const ledgers = data.getLedgerLines(note, currentQuestion.clef);
    ledgers.forEach((lineY) => {
      const ledger = document.createElement('span');
      ledger.className = 'mi-note-ledger';
      ledger.dataset.dragLedger = 'true';
      ledger.setAttribute('aria-hidden', 'true');
      ledger.style.left = pct(targetX - (NOTE_LEDGER_WIDTH / 2), STAVE_WIDTH);
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
      updateFlowButton();
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
    }
  }

  function renderChoices(question) {
    selectedInterval = '';
    els.answers.classList.remove('mi-written-answer-area');
    const choices = Array.isArray(question.choices) && question.choices.length === 4
      ? question.choices
      : buildQuestionMcChoices(question);
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
        submitAnswerIfReady();
      });
    });
  }

  function renderWrittenInput(question) {
    selectedInterval = '';
    els.answers.classList.add('mi-written-answer-area');
    setDenseAnswerLayout(0);
    delete els.answers.dataset.answerCount;
    const placeholder = question.answerMode === 'quality' ? 'e.g. Major 3rd' : 'e.g. 5th';
    els.answers.innerHTML = `
      <label class="mi-written-answer-label" for="miWrittenAnswer">Type your answer</label>
      <input class="mi-written-answer-input" id="miWrittenAnswer" type="text" autocomplete="off" maxlength="40" placeholder="${escapeHTML(placeholder)}" />
    `;

    const input = document.getElementById('miWrittenAnswer');
    if (!input) return;

    input.addEventListener('input', () => {
      if (answered) return;
      selectedInterval = input.value.trim();
      updateFlowButton();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitAnswerIfReady();
      }
    });

    window.requestAnimationFrame(() => input.focus());
  }

  function renderAnswerInput(question) {
    if (isWrittenInputQuestion(question)) renderWrittenInput(question);
    else renderChoices(question);
  }

  function isReadyForAnswer() {
    if (!currentQuestion || answered) return false;
    const hasInterval = Boolean(String(selectedInterval || '').trim());
    const hasPitch = currentQuestion.mode !== 'construction' || pitchPlaced;
    return hasInterval && hasPitch;
  }

  function updateFlowButton() {
    if (!roundActive) {
      els.startButton.textContent = 'Start Quiz';
      updateReplayButton();
      return;
    }

    if (answered) {
      els.startButton.textContent = questionIndex >= roundQuestions.length - 1 ? 'Finish Quiz' : 'Next Question';
      updateReplayButton();
      return;
    }

    els.startButton.textContent = 'Next Question';
    updateReplayButton();
  }

  function submitAnswerIfReady() {
    if (!isReadyForAnswer()) {
      updateFlowButton();
      return;
    }
    checkAnswer();
  }

  function setQuestion(question) {
    setQuizVisualState('active');
    currentQuestion = question;
    window.EAProgressEmbed?.questionReady({ id: question.id, level: question.levelKey || question.level });
    answered = false;
    selectedInterval = '';
    draggedNoteId = '';
    pitchPlaced = question.mode !== 'construction';
    resetPlayCounterForQuestion();
    els.startButton.textContent = 'Next Question';
    setQuestionPrompt(
      question.mode === 'construction'
        ? (question.answerMode === 'quality'
          ? 'Listen to the two notes. Drag the second note, then choose the interval quality and number.'
          : 'Listen to the two notes. Drag the second note, then name the interval.')
        : (isWrittenInputQuestion(question)
          ? (question.answerMode === 'quality'
            ? 'Listen to the two notes and type the full interval quality and number.'
            : 'Listen to the two notes and type the interval name.')
          : (question.answerMode === 'quality'
            ? 'Listen to the two notes and identify the interval quality and number shown on the stave.'
            : 'Listen to the two notes and identify the interval shown on the stave.')),
      question
    );
    els.roundText.textContent = `Question ${questionIndex + 1} of ${roundQuestions.length}`;
    els.progressInner.style.width = `${Math.max(0, (questionIndex / Math.max(1, roundQuestions.length)) * 100)}%`;
    els.feedback.textContent = '';
    els.feedback.className = '';
    renderStave(question);
    renderAnswerInput(question);
    renderEmptyAnswerCard();
    updateReplayButton();
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
          <strong>Listen carefully, then ${isWrittenInputQuestion() ? 'type your answer' : 'choose your answer'}. Your result and round score will appear here.</strong>
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
    const isQualityMode = question.answerMode === 'quality' && question.mode !== 'construction';
    const firstMetricLabel = question.mode === 'construction'
      ? 'Interval mark'
      : (isQualityMode ? 'Quality mark' : 'Interval mark');
    const firstMetricText = isQualityMode
      ? `${result.qualityCorrect ? 1 : 0} / 1`
      : `${result.intervalCorrect ? 1 : 0} / 1`;
    const firstMetricState = isQualityMode
      ? getMetricStateClass(result.qualityCorrect ? 1 : 0, 1)
      : getMetricStateClass(result.intervalCorrect ? 1 : 0, 1);
    const pitchMarkText = question.mode === 'construction' ? `${result.pitchCorrect ? 1 : 0} / 1` : null;
    const secondMetricLabel = question.mode === 'construction'
      ? 'Pitch mark'
      : (isQualityMode ? 'Number mark' : 'Round score');
    const secondMetricText = question.mode === 'construction'
      ? pitchMarkText
      : (isQualityMode ? `${result.numberCorrect ? 1 : 0} / 1` : `${score} / ${roundPossible}`);
    const secondMetricState = question.mode === 'construction'
      ? getMetricStateClass(result.pitchCorrect ? 1 : 0, 1)
      : (isQualityMode
        ? getMetricStateClass(result.numberCorrect ? 1 : 0, 1)
        : getMetricStateClass(score, roundPossible));
    const answerDetail = question.mode === 'construction'
      ? `Your interval: ${selectedInterval || '—'} · your second note: ${(getNote(draggedNoteId) || {}).label || '—'}`
      : `Your answer: ${selectedInterval || '—'}`;

    els.answerCard.innerHTML = `
      <div class="answer-reveal mm-source-panel ${isFullyCorrect ? 'is-correct' : 'is-wrong'} mm-diagnostic-panel mm-gcse-feedback-panel mm-main-quiz-feedback-panel mi-console-feedback-panel">
        <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Melodic Intervals mark breakdown">
          <div class="diagnostic-metric ${firstMetricState}">
            <span>${escapeHTML(firstMetricLabel)}</span>
            <strong>${escapeHTML(firstMetricText)}</strong>
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
    const pitchCorrect = currentQuestion.mode !== 'construction' || draggedNoteId === currentQuestion.targetNoteId;
    const scoring = scoreQuestionAnswer(currentQuestion, selectedInterval, pitchCorrect);
    const { awarded, possible, intervalCorrect, qualityCorrect, numberCorrect } = scoring;
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
      qualityCorrect,
      numberCorrect,
      pitchCorrect: scoring.pitchCorrect,
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

    const writtenInput = document.getElementById('miWrittenAnswer');
    if (writtenInput) {
      writtenInput.disabled = true;
      writtenInput.classList.toggle('is-correct', intervalCorrect);
      writtenInput.classList.toggle('is-wrong', !intervalCorrect);
    }

    const message = awarded === possible
      ? `Correct — ${currentQuestion.startNoteLabel} to ${currentQuestion.targetNoteLabel} in ${currentQuestion.keySignatureLabel} is a ${currentQuestion.correctAnswer}.`
      : currentQuestion.mode === 'construction'
        ? `Not quite. The target was ${currentQuestion.targetNoteLabel}, creating a ${currentQuestion.correctAnswer} in ${currentQuestion.keySignatureLabel}.`
        : `Not quite. The interval was a ${currentQuestion.correctAnswer} in ${currentQuestion.keySignatureLabel}.`;

    els.scoreText.textContent = `Mark: ${score} / ${total}`;
    els.progressInner.style.width = `${Math.max(0, ((questionIndex + 1) / Math.max(1, roundQuestions.length)) * 100)}%`;
    els.startButton.textContent = questionIndex >= roundQuestions.length - 1 ? 'Finish Quiz' : 'Next Question';
    result.score = awarded;
    result.total = possible;
    result.message = message;
    renderAnswerCard(result);
    window.EAProgressEmbed?.answerComplete({
      questionId: currentQuestion.id,
      score: awarded,
      maximumScore: possible,
      correct: awarded >= possible,
      responseType: currentQuestion.mode === 'construction' ? 'construction' : (isWrittenInputQuestion(currentQuestion) ? 'typed' : 'multiple-choice'),
      answerData: selectedInterval,
      modelAnswer: currentQuestion.correctAnswer,
      feedback: message,
      // Captured for concept-level feedback (shared/js/concept-extractors.js)
      // — same field names saveIntervalProgress() already uses for its own
      // native progress-tracking payload, just now also forwarded here.
      intervalLabel: currentQuestion.intervalLabel,
      intervalQuality: currentQuestion.intervalQuality,
      direction: currentQuestion.direction,
      keySignatureAccidentals: currentQuestion.keySignatureAccidentals
    });
    updateReplayButton();
  }

  function nextOrFinish() {
    if (!roundActive || !answered) return;
    stopIntervalAudio();
    if (questionIndex >= roundQuestions.length - 1) {
      finishRound();
      return;
    }
    questionIndex += 1;
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
      mode: roundResults[0]?.mode || 'recognition',
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
    setQuestionPrompt('Round complete. Review your feedback, then close the tile to return to the start screen.');
    const percentage = total ? Math.round((score / total) * 100) : 0;
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
    els.scoreText.textContent = 'Mark: 0 / 0';
    els.startButton.textContent = 'Next Question';
    setQuestion(roundQuestions[0]);
    playInterval();
  }

  // True once a Live Session host has loaded its first question through the
  // contract (see loadQuestionById below) — distinguishes "boot the round"
  // from "load another question into an already-running round."
  let contractSessionStarted = false;

  // Live Sessions entry point: a teacher (via the classroom server) has
  // picked an exact question and wants this exact question rendered, not
  // whatever buildRound() would have drawn next. Reused
  // wrapQuestionForRecognition() so a host-selected question is wrapped
  // exactly the way a normal round wraps one (always 'recognition' mode —
  // the same MC/typed shape every practice round already uses — never
  // 'construction', which only a different, explicit launch path selects).
  function loadQuestionById(rawId, hostQuestion = null) {
    const id = String(rawId || '').trim();
    if (!id) return false;
    // A Live Session host has already selected the exact question. Do not
    // apply the student's stale interval-set filter here (it can exclude
    // octaves or other valid host-selected questions and falsely report
    // "ask your teacher to move on").
    const target = allQuestions.find((question) => question.id === id)
      || (hostQuestion && String(hostQuestion.id || '') === id ? hostQuestion : null);
    if (!target) {
      window.EAProgressEmbed?.poolEmpty({ reason: 'unknown-question-id', questionId: id });
      return false;
    }

    const answerMode = getAnswerMode();
    const includeOctave = getIntervalSet() === 'octaves';
    const questionChoices = data.buildChoices({ answerMode, includeOctave });
    const wrapped = wrapQuestionForRecognition(target, { answerMode, questionChoices });

    if (!contractSessionStarted) {
      contractSessionStarted = true;
      stopIntervalAudio();
      removeRoundFeedbackOverlay();
      recordedProgressionRound = false;
      roundQuestions = [wrapped];
      questionIndex = 0;
      score = 0;
      total = 0;
      roundResults = [];
      resetIntervalProgressRound();
      roundActive = true;
      els.scoreText.textContent = 'Mark: 0 / 0';
      els.startButton.textContent = 'Next Question';
    } else {
      roundQuestions[questionIndex] = wrapped;
    }
    setQuestion(wrapped);
    playInterval();
    return true;
  }

  window.EAProgressEmbed?.registerQuestionHandler((payload) => {
    loadQuestionById(payload && (payload.questionId || payload.id), payload && payload.questionData);
  });

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
    els.scoreText.textContent = 'Mark: 0 / 0';
    els.roundText.textContent = 'Ready';
    els.progressInner.style.width = '0%';
    setQuestionPrompt(
      isProgressionMode()
        ? `Start the ${activeProgressionLevel.name} Progress Mode round.`
        : 'Start the quiz when you are ready.'
    );
    els.staveStage.innerHTML = '';
    els.answers.innerHTML = '';
    els.answers.classList.remove('mi-written-answer-area');
    setDenseAnswerLayout(0);
    delete els.answers.dataset.answerCount;
    els.feedback.textContent = '';
    els.feedback.className = '';
    els.startButton.textContent = 'Start Quiz';
    updateReplayButton();
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
  els.replayIntervalButton?.addEventListener('click', handleReplayInterval);
  els.startButton.addEventListener('click', handleMainAction);
  els.resetButton.addEventListener('click', resetApp);
  window.addEventListener('resize', () => {
    if (currentQuestion && currentQuestion.mode === 'construction' && draggedNoteId) positionDragNote(draggedNoteId);
  });

  async function boot() {
    applyDashboardLinks();
    launchParams = applyLaunchParams();

    if (isProgressionMode()) {
      try {
        await window.EAProgressionStore?.ready?.();
      } catch (_error) {}
      accountProgressionState = await readAccountProgressionState();
      setCurrentProgressionLevelFromProgress(accountProgressionState);
      lockProgressionSettings();
    } else if (isMelodyMasterLaunch()) {
      applyMelodyMasterLaunchPanel();
    }

    resetApp();
    if (isProgressionMode()) lockProgressionSettings();
    if (launchParams.autostart) {
      startRound();
    }
  }

  void boot();
})();
