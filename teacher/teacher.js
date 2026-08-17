const els = {
  moduleGrid: document.getElementById('moduleGrid'),
  selectedModuleChip: document.getElementById('selectedModuleChip'),
  createSessionButton: document.getElementById('createSessionButton'),
  connectionStatus: document.getElementById('connectionStatus'),
  sessionCard: document.getElementById('sessionCard'),
  roomCode: document.getElementById('roomCode'),
  joinLink: document.getElementById('joinLink'),
  copyLinkButton: document.getElementById('copyLinkButton'),
  activeQuestionTitle: document.getElementById('activeQuestionTitle'),
  questionInstruction: document.getElementById('questionInstruction'),
  teacherAudio: document.getElementById('teacherAudio'),
  primaryQuizButton: document.getElementById('primaryQuizButton'),
  closeSubmissionsButton: document.getElementById('closeSubmissionsButton'),
  endQuizButton: document.getElementById('endQuizButton'),
  teacherNotice: document.getElementById('teacherNotice'),
  studentCount: document.getElementById('studentCount'),
  studentList: document.getElementById('studentList'),
  classAverage: document.getElementById('classAverage'),
  submittedSummary: document.getElementById('submittedSummary'),
  accuracySummary: document.getElementById('accuracySummary'),
  submissionsStatus: document.getElementById('submissionsStatus'),
  leaderboardList: document.getElementById('leaderboardList'),
  quizSettingsModal: document.getElementById('quizSettingsModal'),
  closeSettingsModalButton: document.getElementById('closeSettingsModalButton'),
  quizLengthOptions: document.getElementById('quizLengthOptions'),
  playLimitOptions: document.getElementById('playLimitOptions'),
  settingsSummary: document.getElementById('settingsSummary'),
  settingsModuleEyebrow: document.getElementById('settingsModuleEyebrow'),
  saveSettingsButton: document.getElementById('saveSettingsButton'),
  finalLeaderboardModal: document.getElementById('finalLeaderboardModal'),
  finalLeaderboardContent: document.getElementById('finalLeaderboardContent'),
  finalModuleEyebrow: document.getElementById('finalModuleEyebrow'),
  closeFinalLeaderboardButton: document.getElementById('closeFinalLeaderboardButton'),
  classResultsPanel: document.getElementById('classResultsPanel'),
  classResultsEyebrow: document.getElementById('classResultsEyebrow'),
  classResultsHeading: document.getElementById('classResultsHeading'),
  quizLengthSettingsSection: document.getElementById('quizLengthSettingsSection'),
  playLimitSettingsSection: document.getElementById('playLimitSettingsSection'),
  finalLeaderboardTitle: document.getElementById('finalLeaderboardTitle'),
  questionSetSummary: document.getElementById('questionSetSummary')
};

const launchParams = new URLSearchParams(window.location.search);
const requestedRoomCode = String(launchParams.get('roomCode') || launchParams.get('room') || '').trim().toUpperCase();
const requestedLaunchModuleId = String(launchParams.get('module') || '').trim();
const DASHBOARD_LAUNCH_MODULE_IDS = new Set([
  'instrument-identifier',
  'melody-master',
  'melodic-intervals',
  'mixed',
  'exam-lab',
  'texture-trainer',
  'meter-master',
  'cadence-coach',
  'musical-language',
  'ensemble-recognition',
  'key-signature-sprint',
  'chord-identifier',
  'era-explorer'
]);
const QUESTION_LEVEL_LABELS = {
  all: 'All levels',
  foundation: 'Foundation',
  developing: 'Developing',
  securing: 'Securing',
  mastering: 'Mastering'
};
const DEFAULT_MIXED_MODULE_IDS = ['instrument-identifier', 'ensemble-recognition', 'melodic-intervals', 'texture-trainer', 'meter-master', 'cadence-coach', 'musical-language', 'key-signature-sprint', 'melody-master'];

function normaliseQuestionLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(QUESTION_LEVEL_LABELS, level) ? level : 'all';
}

function numberFromParam(name, fallback, allowedValues = []) {
  const value = Number(launchParams.get(name));
  if (!Number.isFinite(value)) return fallback;
  if (allowedValues.length && !allowedValues.includes(value)) return fallback;
  return value;
}

function parseMixedModuleIds(value = '') {
  const allowed = new Set(DEFAULT_MIXED_MODULE_IDS);
  const parsed = String(value || '')
    .split(',')
    .map((moduleId) => moduleId.trim())
    .filter((moduleId, index, all) => allowed.has(moduleId) && all.indexOf(moduleId) === index);
  return parsed.length ? parsed : DEFAULT_MIXED_MODULE_IDS.slice();
}

const dashboardLaunch = {
  enabled: launchParams.get('dashboardLaunch') === '1',
  moduleId: DASHBOARD_LAUNCH_MODULE_IDS.has(requestedLaunchModuleId) ? requestedLaunchModuleId : '',
  mode: launchParams.get('launch') === 'homework' ? 'homework' : 'live',
  autoCreate: launchParams.get('autoCreate') === '1',
  questionLevel: normaliseQuestionLevel(launchParams.get('questionLevel')),
  quizLength: numberFromParam('quizLength', 3, [1, 3, 5, 10, 15, 20]),
  maxListens: numberFromParam('maxListens', 4, [1, 2, 3, 4, 5, 6, 7, 8]),
  mixedModuleIds: parseMixedModuleIds(launchParams.get('mixedModules')),
  classId: String(launchParams.get('classId') || '').trim(),
  questionSetDraftId: String(launchParams.get('questionSetDraft') || '').trim()
};

if (dashboardLaunch.enabled) {
  document.body.classList.add('dashboard-launched', dashboardLaunch.mode === 'homework' ? 'homework-launch' : 'live-launch');
}

let modules = [];
let selectedModuleId = dashboardLaunch.moduleId || requestedLaunchModuleId || 'melody-master';
let roomCode = '';
let currentState = null;
let pollTimer = null;
let isPolling = false;
let primaryAction = 'settings';
let isTeacherAudioPlaying = false;
let quizSettings = {
  quizLength: dashboardLaunch.quizLength,
  maxListens: dashboardLaunch.maxListens,
  questionLevel: dashboardLaunch.questionLevel,
  saved: false
};
let isEditingQuizSettings = false;
let dashboardAutoCreateAttempted = false;

const TEACHER_MODULE_CATALOG = [
  { id: 'instrument-identifier', title: 'Instrument Identifier', shortLabel: 'II', active: true, status: 'Live' },
  { id: 'melody-master', title: 'Melody Master', shortLabel: 'MM', active: true, status: 'Live' },
  { id: 'melodic-intervals', title: 'Melodic Intervals', shortLabel: 'MI', active: true, status: 'Live', showInSelector: false, parentModule: 'melody-master' },
  { id: 'mixed', title: 'Mixed Apps', shortLabel: 'MIX', active: true, status: 'Live', iconPath: '/assets/icons/dashboard/progress-mode.png' },
  { id: 'exam-lab', title: 'Exam Lab', shortLabel: 'EL', active: true, status: 'Live', iconPath: '/assets/icons/modules/exam-lab.png' },
  { id: 'cadence-coach', title: 'Cadence Coach', shortLabel: 'CC', active: true, status: 'Live' },
  { id: 'context-coach', title: 'ContextCoach', shortLabel: 'CX', active: false, status: 'Coming Soon', iconPath: '/assets/icons/modules/context-coach.png' },
  { id: 'texture-trainer', title: 'Texture Trainer', shortLabel: 'TT', active: true, status: 'Live' },
  { id: 'meter-master', title: 'Meter Master', shortLabel: 'MT', active: true, status: 'Live' },
  { id: 'musical-language', title: 'ScoreDecoder Vocabulary', shortLabel: 'SD', active: true, status: 'Live', iconPath: '/modules/musical-language/assets/score-decoder-icon.png' },
  { id: 'ensemble-recognition', title: 'Ensemble Recognition', shortLabel: 'ER', active: true, status: 'Live', iconPath: '/assets/icons/modules/instrument-identifier.png' },
  { id: 'key-signature-sprint', title: 'Key Signature Sprint', shortLabel: 'KS', active: true, status: 'Live', iconPath: '/assets/icons/modules/harmony-explorer.png' },
  { id: 'harmony-explorer', title: 'Harmony Explorer', shortLabel: 'HX', active: false, status: 'Coming Soon' }
];

function getActiveTeacherModuleIds() {
  return TEACHER_MODULE_CATALOG.filter((module) => module.active).map((module) => module.id);
}

function normaliseSelectedTeacherModule() {
  const activeIds = getActiveTeacherModuleIds();
  if (dashboardLaunch.enabled && activeIds.includes(dashboardLaunch.moduleId)) {
    selectedModuleId = dashboardLaunch.moduleId;
    return;
  }
  if (!activeIds.includes(selectedModuleId)) selectedModuleId = 'melody-master';
}

function getEffectiveSessionModuleId() {
  if (dashboardLaunch.enabled && dashboardLaunch.moduleId) return dashboardLaunch.moduleId;
  return selectedModuleId;
}

function getEffectiveMixedModuleIds(moduleId = getEffectiveSessionModuleId()) {
  return moduleId === 'mixed' ? dashboardLaunch.mixedModuleIds : undefined;
}

function escapeHTML(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setNotice(message, state = '') {
  els.teacherNotice.textContent = message;
  els.teacherNotice.className = `notice teacher-status-tile ${state}`.trim();
}

function setConnectedUI(isConnected) {
  const apiBase = window.EchoAuralClassroom?.getApiBase?.() || 'this site';
  els.connectionStatus.textContent = isConnected
    ? `Connected to the classroom server${apiBase && apiBase !== 'this site' ? ` (${apiBase})` : ''}.`
    : 'Teacher Mode needs the hosted classroom server. Check the classroom API URL or run node server.js locally.';
  els.createSessionButton.disabled = !isConnected;
  if (!isConnected) {
    els.primaryQuizButton.disabled = true;
    els.endQuizButton.disabled = true;
    setNotice('Not connected. Local: run node server.js. Online: check teacher-api.echoaural.com or the configured classroom API URL.', 'bad');
  }
}

async function api(path, body = null, method = body ? 'POST' : 'GET') {
  const options = { method, credentials: 'include', headers: { Accept: 'application/json' } };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(window.EchoAuralClassroom.buildApiUrl(path), options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; }
  catch (_error) { throw new Error('The classroom server returned an unreadable response.'); }
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function resolveAudioPath(question = {}) {
  const raw = String(question.audio || question.file || '').trim();
  if (!raw) return '';
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
  const moduleId = question.moduleId || currentState?.moduleId || selectedModuleId || '';
  const cleanPath = raw.replace(/^\.\//, '');
  if (moduleId === 'instrument-identifier') return `/modules/instrument-identifier/${cleanPath}`;
  if (moduleId === 'texture-trainer') return `/modules/texture-trainer/${cleanPath}`;
  if (moduleId === 'melody-master') return `/modules/melody-master/${cleanPath}`;
  if (moduleId === 'melodic-intervals') return `/modules/melodic-intervals/${cleanPath}`;
  if (moduleId === 'cadence-coach') return `/modules/cadence-coach/${cleanPath}`;
  if (moduleId === 'meter-master') return `/modules/meter-master/${cleanPath}`;
  if (moduleId === 'musical-language') return `/modules/musical-language/${cleanPath}`;
  if (moduleId === 'ensemble-recognition') return `/modules/ensemble-recognition/${cleanPath}`;
  return cleanPath;
}

function resolveAudioSequence(question = {}) {
  const sequence = Array.isArray(question.audioSequence) ? question.audioSequence : [];
  return sequence.map((item) => resolveAudioPath({ ...question, audio: item, file: item })).filter(Boolean);
}

function questionHasAudio(question = currentState?.question) {
  return Boolean(resolveAudioPath(question || {}) || resolveAudioSequence(question || {}).length);
}

function playAudioFileOnce(url) {
  return new Promise((resolve, reject) => {
    els.teacherAudio.pause();
    els.teacherAudio.currentTime = 0;
    els.teacherAudio.onended = () => resolve();
    els.teacherAudio.onerror = () => reject(new Error(`Could not load the audio file: ${url}.`));
    els.teacherAudio.src = url;
    const attempt = els.teacherAudio.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(reject);
  });
}

async function playAudioSequence(urls = [], gapMs = 380) {
  for (let index = 0; index < urls.length; index += 1) {
    await playAudioFileOnce(urls[index]);
    if (index < urls.length - 1) await delay(gapMs);
  }
}

function pluralise(value, singular, plural = `${singular}s`) {
  return Number(value) === 1 ? singular : plural;
}

function getTeacherModuleCatalogItem(moduleId) {
  return TEACHER_MODULE_CATALOG.find((module) => module.id === moduleId) || null;
}

function getServerModule(moduleId) {
  return modules.find((module) => module.id === moduleId) || null;
}

function getDisplayModule(moduleId) {
  const catalogItem = getTeacherModuleCatalogItem(moduleId) || {};
  const serverModule = getServerModule(moduleId) || {};
  return {
    ...catalogItem,
    ...serverModule,
    id: moduleId || catalogItem.id || serverModule.id || 'melody-master',
    title: catalogItem.title || serverModule.title || 'EchoAural',
    active: Boolean(catalogItem.active),
    status: catalogItem.status || (catalogItem.active ? 'Live' : 'Coming Soon')
  };
}

function getSelectedModule() {
  normaliseSelectedTeacherModule();
  return getDisplayModule(selectedModuleId);
}

function isExamLabMode(state = currentState) {
  return (state?.moduleId || selectedModuleId) === 'exam-lab';
}

function updateExamLabPresentation(state = currentState) {
  const examLab = isExamLabMode(state);
  document.body.classList.toggle('exam-lab-teacher-mode', examLab);
  if (els.classResultsEyebrow) els.classResultsEyebrow.textContent = examLab ? 'PRIVATE CLASS DIAGNOSIS' : 'CLASS RESULTS';
  if (els.classResultsHeading) els.classResultsHeading.textContent = examLab ? 'Session status' : 'Leaderboard';
  if (els.closeSubmissionsButton) els.closeSubmissionsButton.textContent = examLab ? 'Lock Submissions' : 'Close Submissions';
  if (els.endQuizButton) els.endQuizButton.textContent = examLab ? 'Finish Session' : 'End Quiz';
  if (els.quizLengthSettingsSection) els.quizLengthSettingsSection.hidden = examLab;
  if (els.playLimitSettingsSection) els.playLimitSettingsSection.hidden = examLab;
  if (examLab) quizSettings.quizLength = 1;
}

function getModuleFallback(module = {}) {
  return String(module.shortLabel || module.title || module.id || 'EA')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

function getModuleTitleParts(title = '') {
  const words = String(title || 'EchoAural').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return { main: words[0] || 'EchoAural', gradient: '' };
  return { main: words.slice(0, -1).join(' '), gradient: words[words.length - 1] };
}

function getModuleIconPath(module = {}) {
  if (module.iconPath) return module.iconPath;
  return `/assets/icons/modules/${encodeURIComponent(module.id || 'melody-master')}.png`;
}

function getModuleWaveformMarkup() {
  return `
    <span class="teacher-module-card-waveform" aria-hidden="true">
      <span style="--h: 28%; --delay: 0s;"></span>
      <span style="--h: 48%; --delay: .06s;"></span>
      <span style="--h: 76%; --delay: .12s;"></span>
      <span style="--h: 100%; --delay: .18s;"></span>
      <span style="--h: 68%; --delay: .24s;"></span>
      <span style="--h: 42%; --delay: .30s;"></span>
      <span style="--h: 58%; --delay: .36s;"></span>
      <span style="--h: 84%; --delay: .42s;"></span>
      <span style="--h: 62%; --delay: .48s;"></span>
    </span>
  `;
}

function renderModuleSelector() {
  normaliseSelectedTeacherModule();
  const selected = getSelectedModule();
  updateExamLabPresentation(currentState);
  els.selectedModuleChip.textContent = selected.title || 'Choose module';
  if (els.settingsModuleEyebrow) els.settingsModuleEyebrow.textContent = (selected.title || 'EchoAural').toUpperCase();
  if (els.finalModuleEyebrow) els.finalModuleEyebrow.textContent = (selected.title || 'EchoAural').toUpperCase();

  els.moduleGrid.innerHTML = TEACHER_MODULE_CATALOG.filter((catalogModule) => catalogModule.showInSelector !== false).map((catalogModule) => {
    const module = getDisplayModule(catalogModule.id);
    const titleParts = getModuleTitleParts(module.title);
    const isSelected = module.id === selectedModuleId;
    const isActive = Boolean(module.active);
    const statusText = isActive ? 'Live' : 'Coming Soon';
    return `
      <button class="teacher-module-card ${isActive ? 'live' : 'locked'} ${isSelected ? 'is-selected' : ''}" type="button" data-module-id="${escapeHTML(module.id)}" data-module-active="${isActive ? 'true' : 'false'}" aria-label="${isActive ? 'Choose' : 'Coming soon:'} ${escapeHTML(module.title)}" ${isActive ? '' : 'aria-disabled="true"'}>
        ${getModuleWaveformMarkup()}
        <span class="teacher-module-icon" data-fallback="${escapeHTML(getModuleFallback(module))}">
          <img
            src="${escapeHTML(getModuleIconPath(module))}"
            alt=""
            aria-hidden="true"
            onerror="this.remove(); this.parentElement.classList.add('missing-icon');"
          />
        </span>
        <span class="teacher-module-title-wordmark" aria-hidden="true">
          <span class="teacher-module-title-text">
            <span class="teacher-module-title-main">${escapeHTML(titleParts.main)}</span>
            ${titleParts.gradient ? `<span class="teacher-module-title-gradient">${escapeHTML(titleParts.gradient)}</span>` : ''}
          </span>
        </span>
        <span class="sr-only">${escapeHTML(module.title)}</span>
        <span class="teacher-module-status ${isActive ? 'live-status' : ''}">${escapeHTML(statusText)}</span>
      </button>
    `;
  }).join('');
}

function selectModule(moduleId) {
  const module = getDisplayModule(moduleId);
  if (!module.active) {
    setNotice(`${module.title || 'This app'} Teacher Mode is coming soon.`, 'good');
    return;
  }
  if (!moduleId || moduleId === selectedModuleId) return;
  if (roomCode && (moduleId === 'exam-lab' || selectedModuleId === 'exam-lab')) {
    setNotice('Create a new room when changing to or from Exam Lab.', 'good');
    return;
  }
  selectedModuleId = moduleId;
  quizSettings.saved = false;
  renderModuleSelector();
  updateSettingsSummary();

  if (roomCode) {
    api('/api/classroom/module', {
      roomCode,
      moduleId: selectedModuleId,
      mixedModuleIds: selectedModuleId === 'mixed' ? dashboardLaunch.mixedModuleIds : undefined
    })
      .then((response) => {
        renderState(response.state);
        updateTeacherStatus(response.state);
        setNotice(`${getSelectedModule().title} selected. Save settings before starting.`, 'good');
      })
      .catch((error) => setNotice(error.message || 'Could not change module.', 'bad'));
  }
}

function formatPlayButtonLabel(prefix, playsRemaining, maxListens) {
  const remaining = Math.max(0, Number(playsRemaining) || 0);
  const max = Math.max(1, Number(maxListens) || 1);
  const label = remaining === 1 ? 'play left' : 'plays left';
  return `${prefix} · ${remaining}/${max} ${label}`;
}

function getQuestionTitle(question) {
  if (!question) return 'No question active';
  if (currentState?.moduleId === 'exam-lab' || question.moduleId === 'exam-lab') return 'Exam Lab listening extract';
  // Instrument Identifier resource titles often contain the answer, so keep the
  // teacher display safe for projected screens and student-facing classrooms.
  if (currentState?.moduleId === 'instrument-identifier' || question.moduleId === 'instrument-identifier') {
    return question.id || question.title || 'Instrument Identifier question';
  }
  const parts = [question.id, question.composer, question.work || question.title].filter(Boolean);
  return parts.join(' · ');
}

function getQuizInfo(state = currentState) {
  const quiz = state?.quiz || {};
  const total = Number(quiz.totalQuestions || quizSettings.quizLength || 3);
  const current = Number(quiz.currentQuestionNumber || (state?.active ? 1 : 0));
  const maxListens = Number(state?.maxListens || quiz.maxListens || quizSettings.maxListens || 4);
  const listens = Number(state?.listens || 0);
  return {
    total,
    current,
    maxListens,
    listens,
    playsRemaining: Math.max(0, maxListens - listens),
    started: Boolean(quiz.started || state?.active),
    ended: Boolean(quiz.ended)
  };
}

function updateSettingsSummary() {
  const moduleTitle = getSelectedModule().title || 'EchoAural';
  if (isExamLabMode()) {
    els.settingsSummary.textContent = `${moduleTitle} · one complete server-selected extract · configured playback limit`;
    return;
  }
  const levelLabel = quizSettings.questionLevel && quizSettings.questionLevel !== 'all'
    ? ` · ${QUESTION_LEVEL_LABELS[quizSettings.questionLevel] || 'Levelled'}`
    : '';
  const launchLabel = dashboardLaunch.enabled
    ? ` · ${dashboardLaunch.mode === 'homework' ? 'Homework setup' : 'Live session'}`
    : '';
  els.settingsSummary.textContent = `${moduleTitle} · ${quizSettings.quizLength} ${pluralise(quizSettings.quizLength, 'question')}${levelLabel} · ${quizSettings.maxListens} ${pluralise(quizSettings.maxListens, 'play')} per question${launchLabel}`;
}

function selectOption(groupEl, value) {
  groupEl.querySelectorAll('.option-button').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.value) === Number(value));
  });
}

function openSettingsModal() {
  isEditingQuizSettings = true;
  if (isExamLabMode()) quizSettings.quizLength = 1;
  selectOption(els.quizLengthOptions, quizSettings.quizLength);
  selectOption(els.playLimitOptions, quizSettings.maxListens);
  updateSettingsSummary();
  els.quizSettingsModal.hidden = false;
  window.setTimeout(() => els.saveSettingsButton.focus(), 30);
}

function closeSettingsModal() {
  els.quizSettingsModal.hidden = true;
  isEditingQuizSettings = false;
}

async function saveSettings() {
  if (!roomCode) {
    closeSettingsModal();
    setNotice('Create a class session before saving quiz settings.', 'bad');
    return;
  }
  els.saveSettingsButton.disabled = true;
  try {
    const response = await applyRoomSettings();
    closeSettingsModal();
    if (response?.state) updateTeacherStatus(response.state);
  } catch (error) {
    setNotice(error.message || 'Could not save quiz settings.', 'bad');
  } finally {
    els.saveSettingsButton.disabled = false;
  }
}

function updatePrimaryButton(state = currentState) {
  const hasRoom = Boolean(roomCode);
  const quiz = getQuizInfo(state);
  els.primaryQuizButton.disabled = !hasRoom;
  els.endQuizButton.disabled = !hasRoom || quiz.ended;

  if (!hasRoom) {
    primaryAction = 'settings';
    els.primaryQuizButton.textContent = 'Settings';
    return;
  }

  if (!quizSettings.saved && !quiz.started) {
    primaryAction = 'settings';
    els.primaryQuizButton.textContent = 'Settings';
    return;
  }

  if (quiz.ended) {
    primaryAction = 'complete';
    els.primaryQuizButton.textContent = isExamLabMode(state) ? 'Session Complete' : 'Quiz Complete';
    els.primaryQuizButton.disabled = true;
    return;
  }

  if (!state?.active) {
    primaryAction = 'start';
    els.primaryQuizButton.textContent = isExamLabMode(state) ? 'Start Exam Lab' : 'Start Quiz';
    return;
  }


  if (!questionHasAudio(state?.question)) {
    primaryAction = quiz.current >= quiz.total ? 'finish' : 'next';
    els.primaryQuizButton.textContent = quiz.current >= quiz.total ? 'Finish Quiz' : 'Next Question';
    return;
  }

  if (isTeacherAudioPlaying) {
    primaryAction = 'playing';
    els.primaryQuizButton.disabled = true;
    els.primaryQuizButton.textContent = formatPlayButtonLabel('Playing…', quiz.playsRemaining, quiz.maxListens);
    return;
  }

  if (quiz.listens >= quiz.maxListens) {
    primaryAction = quiz.current >= quiz.total ? 'finish' : 'next';
    els.primaryQuizButton.textContent = quiz.current >= quiz.total
      ? (isExamLabMode(state) ? 'Finish Session' : 'Finish Quiz')
      : 'Next Question';
    return;
  }

  primaryAction = 'play';
  const prefix = quiz.listens > 0 ? 'Replay Extract' : (isExamLabMode(state) ? 'Play Extract' : 'Play Excerpt');
  els.primaryQuizButton.textContent = formatPlayButtonLabel(prefix, quiz.playsRemaining, quiz.maxListens);
}

function updateTeacherStatus(state = currentState) {
  if (!roomCode) {
    setNotice('Create a Class Session', 'good');
    return;
  }
  const quiz = getQuizInfo(state);
  if (!quizSettings.saved && !quiz.started) {
    setNotice('Select Settings', 'good');
    return;
  }
  if (quiz.ended) {
    setNotice(isExamLabMode(state)
      ? 'Exam Lab session complete · private feedback released.'
      : `Quiz complete · ${quiz.current || quiz.total}/${quiz.total} questions.`, 'good');
    return;
  }
  if (!state?.active) {
    setNotice(isExamLabMode(state)
      ? `Exam Lab ready · ${Number(state?.totalMarks || 0)} marks · ${quiz.maxListens} permitted playings.`
      : `Quiz ready · ${quiz.total} ${pluralise(quiz.total, 'question')} · ${quiz.maxListens}/${quiz.maxListens} plays remaining.`, 'good');
    return;
  }
  setNotice(isExamLabMode(state)
    ? `Exam Lab active · ${quiz.playsRemaining}/${quiz.maxListens} playings remaining · ${Number(state?.summary?.submitted || 0)} submitted.`
    : `Question ${quiz.current}/${quiz.total} · ${quiz.playsRemaining}/${quiz.maxListens} plays remaining.`, 'good');
}

function updateSessionCard(payload) {
  roomCode = payload.roomCode;
  selectedModuleId = payload.moduleId || selectedModuleId;
  quizSettings.saved = false;
  document.body.classList.add('session-created');
  renderModuleSelector();
  els.sessionCard.classList.remove('is-muted');
  els.roomCode.textContent = roomCode;
  els.joinLink.value = payload.shortJoinUrl || payload.laptopJoinUrl || payload.joinUrl || 'Create a session first';
  els.copyLinkButton.disabled = false;
  setNotice(dashboardLaunch.enabled || payload.moduleId === 'exam-lab' ? 'Session created. Settings are being applied…' : 'Select Settings', 'good');
}

function renderQuestionSetSummary(state = currentState) {
  if (!els.questionSetSummary) return;
  const questionSet = state?.questionSet;
  if (!questionSet?.spec || !questionSet?.preview) {
    els.questionSetSummary.hidden = true;
    els.questionSetSummary.innerHTML = '';
    return;
  }
  const purposeLabels = {
    starter: 'Starter',
    main: 'Main activity',
    plenary: 'Plenary',
    diagnostic: 'Diagnostic',
    exam: 'Exam practice',
    custom: 'Custom set'
  };
  const strategyLabels = {
    'class-priorities': 'Class priorities',
    balanced: 'Balanced mixed',
    random: 'Random',
    'skill-focus': 'Skill focus',
    'app-focus': 'App focus',
    'teacher-picked': 'Teacher-picked'
  };
  const modulesLabel = Object.keys(questionSet.preview.modules || {}).join(', ');
  els.questionSetSummary.innerHTML = `<strong>${escapeHTML(purposeLabels[questionSet.spec.purpose] || 'Planned set')}</strong> · ${escapeHTML(strategyLabels[questionSet.spec.strategy] || questionSet.spec.strategy)} · ${Number(questionSet.questionCount || questionSet.preview.questionCount || 0)} questions${modulesLabel ? ` · ${escapeHTML(modulesLabel)}` : ''}`;
  els.questionSetSummary.hidden = false;
}

function classroomSettingsPayload() {
  const sessionModuleId = getEffectiveSessionModuleId();
  const payload = {
    roomCode,
    moduleId: sessionModuleId,
    quizLength: isExamLabMode() ? 1 : quizSettings.quizLength,
    maxListens: quizSettings.maxListens,
    questionLevel: quizSettings.questionLevel
  };
  const mixedModuleIds = getEffectiveMixedModuleIds(sessionModuleId);
  if (mixedModuleIds) payload.mixedModuleIds = mixedModuleIds;
  return payload;
}

async function applyRoomSettings() {
  const response = await api('/api/classroom/settings', classroomSettingsPayload());
  quizSettings.saved = true;
  renderState(response.state);
  return response;
}

function getListDensityClass(count) {
  if (count > 18) return 'is-ultra';
  if (count > 12) return 'is-compact';
  if (count > 7) return 'is-dense';
  return '';
}

function renderStudents(students = []) {
  els.studentCount.textContent = `${students.length} joined`;
  els.studentList.style.setProperty('--student-count', Math.max(students.length, 1));
  els.studentList.style.setProperty('--student-rows', Math.max(Math.ceil(students.length / 2), 1));
  if (!students.length) {
    els.studentList.className = 'student-list empty-state';
    els.studentList.textContent = 'No students joined yet.';
    return;
  }
  els.studentList.className = `student-list ${getListDensityClass(students.length)}`.trim();
  const examLab = isExamLabMode();
  const released = Boolean(currentState?.feedbackReleased);
  els.studentList.innerHTML = students.map((student) => `
    <article class="student-pill ${student.connected ? 'is-online' : 'is-away'} ${student.submitted ? 'is-submitted' : ''}">
      <span class="student-dot" aria-hidden="true"></span>
      <strong>${escapeHTML(student.name)}</strong>
      <small>${examLab
        ? (student.submitted ? (released && student.score !== null ? `${student.score}/${student.total}` : 'submitted') : student.connected ? 'answering' : 'away')
        : student.submitted ? `${student.score}/${student.total}` : student.connected ? 'joined' : 'away'}</small>
    </article>
  `).join('');
}

function renderLeaderboard(state) {
  if (isExamLabMode(state)) {
    const students = state.students || [];
    const summary = state.summary || {};
    const analysis = state.examLabAnalysis;
    els.classAverage.textContent = state.feedbackReleased && analysis ? `Average ${analysis.classAverage}%` : 'Results private';
    els.submittedSummary.textContent = `${Number(summary.submitted || 0)} / ${Number(summary.joined || 0)}`;
    els.accuracySummary.textContent = state.feedbackReleased && analysis ? `${analysis.classAverage}%` : 'Hidden';
    els.submissionsStatus.textContent = state.submissionsOpen ? 'Open' : state.submissionsClosed ? 'Locked' : 'Waiting';
    els.leaderboardList.style.setProperty('--leaderboard-count', Math.max(students.length, 1));
    if (!students.length) {
      els.leaderboardList.className = 'leaderboard-list empty-state';
      els.leaderboardList.textContent = 'Completion status will appear as students join.';
      return;
    }
    els.leaderboardList.className = `leaderboard-list exam-lab-status-list ${getListDensityClass(students.length)}`.trim();
    els.leaderboardList.innerHTML = students.map((student) => `
      <article class="leaderboard-row exam-lab-status-row ${student.submitted ? 'is-current-submitted' : ''}">
        <span class="exam-lab-status-dot" aria-hidden="true"></span>
        <div class="leaderboard-name-block"><strong>${escapeHTML(student.name)}</strong><small>${student.submitted ? 'Answers submitted' : state.submissionsOpen ? 'Answering' : 'Not submitted'}</small></div>
        <em>${student.submitted ? 'Submitted' : 'Waiting'}</em>
      </article>
    `).join('');
    return;
  }
  const leaderboard = state.leaderboard || [];
  const summary = state.summary || {};
  const joined = Number(summary.joined || 0);
  const submitted = Number(summary.submitted || 0);
  const visibleLeaderboard = leaderboard.slice(0, 10);
  els.classAverage.textContent = summary.totalPossible ? `Average ${summary.classAverage}%` : 'Average —';
  els.submittedSummary.textContent = `${submitted} / ${joined}`;
  els.accuracySummary.textContent = summary.currentTotalPossible ? `${Math.round((summary.currentTotalCorrect / summary.currentTotalPossible) * 100)}%` : '—';
  els.submissionsStatus.textContent = state.submissionsOpen ? 'Open' : state.submissionsClosed ? 'Closed' : 'Waiting';
  els.leaderboardList.style.setProperty('--leaderboard-count', Math.max(visibleLeaderboard.length, 1));

  if (!visibleLeaderboard.length) {
    els.leaderboardList.className = 'leaderboard-list empty-state';
    els.leaderboardList.textContent = 'Scores appear after students submit.';
    return;
  }

  els.leaderboardList.className = `leaderboard-list ${getListDensityClass(visibleLeaderboard.length)}`.trim();
  els.leaderboardList.innerHTML = visibleLeaderboard.map((student, index) => {
    const cumulativeTotal = Number(student.cumulativeTotal || 0);
    const cumulativeScore = Number(student.cumulativeScore || 0);
    const percentage = cumulativeTotal ? Math.round((cumulativeScore / cumulativeTotal) * 100) : null;
    return `
      <article class="leaderboard-row ${student.submitted ? 'is-current-submitted' : ''}">
        <span class="rank">${index + 1}</span>
        <div class="leaderboard-name-block">
          <strong>${escapeHTML(student.name)}</strong>
          <small>${cumulativeTotal ? `${cumulativeScore}/${cumulativeTotal}` : 'No score yet'}</small>
        </div>
        <em>${percentage === null ? '—' : `${percentage}%`}</em>
      </article>
    `;
  }).join('');
}

function examLabPracticeHref(route = {}) {
  if (route.status !== 'live' || !route.path || route.path === '#') return '';
  const clean = String(route.path).replace(/^\.\.\//, '');
  return clean.startsWith('/') ? clean : `/modules/${clean}`;
}

function getExamLabAnalysisMarkup(state = currentState) {
  const analysis = state?.examLabAnalysis;
  if (!analysis) return '<div class="empty-state final-empty-state">No submitted Exam Lab results were recorded.</div>';
  const questionRows = (analysis.questions || []).map((question) => `
    <article class="exam-lab-analysis-row ${question.successPercentage >= 70 ? 'is-secure' : 'is-focus'}">
      <div><strong>Question ${Number(question.number || 0)} · ${Number(question.marks || 0)} ${pluralise(question.marks, 'mark')}</strong><span>${escapeHTML(question.prompt)}</span></div>
      <em>${Number(question.successPercentage || 0)}%</em>
      <p>${Number(question.fullyCorrect || 0)} fully correct · ${Number(question.partiallyCorrect || 0)} partially correct · ${Number(question.incorrect || 0)} incorrect · ${Number(question.unanswered || 0)} unanswered</p>
      <small>Skills: ${escapeHTML((question.skills || []).join(', ') || 'Listening analysis')}</small>
    </article>
  `).join('');
  const skillRows = (analysis.skills || []).map((skill) => `
    <article class="exam-lab-skill-row ${skill.percentage >= 70 ? 'is-secure' : 'is-focus'}">
      <div><strong>${escapeHTML(skill.skill)}</strong><span>${escapeHTML((skill.affectedStudents || []).length ? `Review with ${skill.affectedStudents.join(', ')}` : 'Secure across submitted work')}</span></div>
      <em>${Number(skill.percentage || 0)}%</em>
    </article>
  `).join('');
  const individuals = (analysis.individuals || []).map((student) => {
    if (!student.result) return `<details class="exam-lab-individual"><summary><span>${escapeHTML(student.name)}</span><strong>Not submitted</strong></summary><p>No answers were submitted before the session ended.</p></details>`;
    const outcomes = (student.result.outcomes || []).map((outcome) => `
      <article class="exam-lab-individual-question">
        <div><strong>Question ${Number(outcome.number || 0)}</strong><span>${escapeHTML(outcome.answer || 'No answer')}</span></div>
        <em>${Number(outcome.marks || 0)} / ${Number(outcome.maxMarks || 0)}</em>
        <p>${escapeHTML(outcome.feedback || '')}</p>
        ${(outcome.missingMarkPoints || []).length ? `<small>Missing: ${escapeHTML(outcome.missingMarkPoints.join('; '))}</small>` : ''}
      </article>
    `).join('');
    return `<details class="exam-lab-individual"><summary><span>${escapeHTML(student.name)}</span><strong>${Number(student.result.score || 0)} / ${Number(student.result.maximumScore || 0)} · ${Number(student.result.percentage || 0)}%</strong></summary><div>${outcomes}</div></details>`;
  }).join('');
  const recommendations = (analysis.recommendations || []).map((recommendation) => {
    const route = recommendation.route || {};
    const href = examLabPracticeHref(route);
    return `<article class="exam-lab-recommendation">
      <div><strong>${escapeHTML(route.module || 'No live practice route yet')}</strong><span>${escapeHTML((recommendation.skills || []).join(', ') || 'Listening skill gap')}</span></div>
      <p>${escapeHTML((recommendation.reasons || []).join(' '))}</p>
      <small>Affected students: ${escapeHTML((recommendation.affectedStudents || []).join(', ') || 'None')}</small>
      ${href ? `<a href="${escapeHTML(href)}">Open practice route</a>` : '<em>No live practice route yet</em>'}
    </article>`;
  }).join('');

  return `
    <div class="final-leaderboard-hero exam-lab-analysis-hero">
      <span>Class average</span>
      <strong>${Number(analysis.classAverage || 0)}%</strong>
      <small>${Number(analysis.submitted || 0)} of ${Number(analysis.joined || 0)} students submitted · ${Number(analysis.totalMarks || 0)} marks available</small>
    </div>
    ${analysis.sourceTitle ? `<p class="exam-lab-analysis-source">Source: ${escapeHTML(analysis.sourceTitle)}</p>` : ''}
    <section class="exam-lab-analysis-section"><h3>Question analysis</h3><div class="exam-lab-analysis-list">${questionRows || '<p>No question evidence.</p>'}</div></section>
    <section class="exam-lab-analysis-section"><h3>Skill analysis</h3><div class="exam-lab-skill-list">${skillRows || '<p>No skill evidence.</p>'}</div></section>
    <section class="exam-lab-analysis-section"><h3>Individual results</h3><div class="exam-lab-individual-list">${individuals}</div></section>
    <details class="exam-lab-homework-review" open><summary>Review recommended homework</summary><p>Recommendations are for teacher review only. No homework has been assigned automatically.</p><div>${recommendations || '<p>All tested skills were secure; no route is recommended.</p>'}</div></details>
    <p class="final-leaderboard-reset-note">Close this diagnosis to keep the room open. Create a new room for another randomly selected Exam Lab extract.</p>
  `;
}

function getFinalLeaderboardMarkup(state = currentState) {
  if (isExamLabMode(state)) return getExamLabAnalysisMarkup(state);
  const leaderboard = state?.leaderboard || [];
  const summary = state?.summary || {};
  const rows = leaderboard.length
    ? leaderboard.map((student, index) => {
      const cumulativeTotal = Number(student.cumulativeTotal || 0);
      const cumulativeScore = Number(student.cumulativeScore || 0);
      const percentage = cumulativeTotal ? Math.round((cumulativeScore / cumulativeTotal) * 100) : null;
      return `
        <article class="final-leaderboard-row ${cumulativeTotal ? '' : 'is-unsubmitted'}">
          <span class="rank">${index + 1}</span>
          <div>
            <strong>${escapeHTML(student.name)}</strong>
            <small>${cumulativeTotal ? `${cumulativeScore}/${cumulativeTotal} marks · ${student.questionsSubmitted || 0} submitted` : 'No submitted score'}</small>
          </div>
          <em>${cumulativeTotal ? `${percentage}%` : '—'}</em>
        </article>
      `;
    }).join('')
    : '<div class="empty-state final-empty-state">No submitted scores were recorded.</div>';

  return `
    <div class="final-leaderboard-hero">
      <span>Class average</span>
      <strong>${summary.totalPossible ? `${summary.classAverage}%` : '—'}</strong>
      <small>${summary.totalPossible ? `${summary.totalCorrect}/${summary.totalPossible} class marks` : 'No class score yet'}</small>
    </div>
    <div class="final-leaderboard-list" aria-label="Final class leaderboard">
      ${rows}
    </div>
    <p class="final-leaderboard-reset-note">Press the × button to keep this room open and send students to the holding screen for the next round.</p>
  `;
}

function showFinalLeaderboard(state = currentState) {
  if (!els.finalLeaderboardModal || !els.finalLeaderboardContent) return;
  if (els.finalLeaderboardTitle) els.finalLeaderboardTitle.textContent = isExamLabMode(state) ? 'Exam Lab class diagnosis' : 'Final leaderboard';
  if (els.closeFinalLeaderboardButton) els.closeFinalLeaderboardButton.setAttribute('aria-label', isExamLabMode(state) ? 'Close Exam Lab diagnosis and return to Teacher Dashboard' : 'Close final leaderboard and reset classroom');
  els.finalLeaderboardContent.innerHTML = getFinalLeaderboardMarkup(state);
  els.finalLeaderboardModal.hidden = false;
}

function hideFinalLeaderboard() {
  if (els.finalLeaderboardModal) els.finalLeaderboardModal.hidden = true;
}

async function dismissFinalLeaderboard() {
  if (!roomCode) {
    hideFinalLeaderboard();
    return;
  }

  try {
    const examLab = isExamLabMode();
    const response = await api(examLab ? '/api/classroom/dismiss' : '/api/classroom/next-round', { roomCode });
    hideFinalLeaderboard();
    renderState(response.state);
    updateTeacherStatus(response.state);
    if (examLab) {
      window.location.assign('/account/teacher-dashboard/');
      return;
    }
    setNotice('Room is still active. Choose settings and start the next round when ready.', 'good');
  } catch (error) {
    hideFinalLeaderboard();
    setNotice(error.message || 'The room is still open, but Teacher Mode could not prepare the next round.', 'bad');
  }
}

function renderQuestionInfo(state) {
  const question = state.question;
  const quiz = getQuizInfo(state);
  els.activeQuestionTitle.textContent = question && quiz.started && !quiz.ended ? getQuestionTitle(question) : '';
  if (els.questionInstruction) {
    els.questionInstruction.textContent = question
      ? (question.prompt || question.question || 'Answer the question.')
      : `Ready for ${getSelectedModule().title || 'Teacher Mode'}.`;
  }

  if (question) {
    const audioPath = resolveAudioPath(question);
    if (!isTeacherAudioPlaying && audioPath && els.teacherAudio.getAttribute('src') !== audioPath) els.teacherAudio.src = audioPath;
    return;
  }

  els.activeQuestionTitle.textContent = '';
}

function renderState(state) {
  currentState = state;
  if (state.moduleId && state.moduleId !== selectedModuleId) {
    selectedModuleId = state.moduleId;
    renderModuleSelector();
  }
  if (state.quiz) {
    if (!isEditingQuizSettings) {
      if (Number(state.quiz.totalQuestions)) quizSettings.quizLength = Number(state.quiz.totalQuestions);
      if (Number(state.maxListens)) quizSettings.maxListens = Number(state.maxListens);
      if (state.questionLevel) quizSettings.questionLevel = normaliseQuestionLevel(state.questionLevel);
    }
    if (state.quiz.started || state.active) quizSettings.saved = true;
    updateSettingsSummary();
  }

  updateExamLabPresentation(state);
  renderQuestionSetSummary(state);

  renderQuestionInfo(state);
  if (state.quiz && state.quiz.ended && !state.dismissed) showFinalLeaderboard(state);
  els.closeSubmissionsButton.disabled = !state.question || !state.submissionsOpen;
  updatePrimaryButton(state);
  renderStudents(state.students || []);
  renderLeaderboard(state);
}

function startPolling() {
  if (pollTimer) window.clearInterval(pollTimer);
  pollTimer = window.setInterval(refreshState, 1500);
  refreshState();
}

async function refreshState() {
  if (!roomCode || isPolling) return;
  isPolling = true;
  try {
    const state = await api(`/api/classroom/state?roomCode=${encodeURIComponent(roomCode)}`);
    setConnectedUI(true);
    renderState(state);
    updateTeacherStatus(state);
  } catch (error) {
    setConnectedUI(false);
    setNotice(error.message || 'Could not refresh classroom state.', 'bad');
  } finally {
    isPolling = false;
  }
}

async function createSession() {
  els.createSessionButton.disabled = true;
  setNotice('Creating classroom room…');
  try {
    const sessionModuleId = getEffectiveSessionModuleId();
    const payload = {
      moduleId: sessionModuleId,
      questionLevel: quizSettings.questionLevel,
      classId: dashboardLaunch.classId,
      questionSetDraftId: dashboardLaunch.questionSetDraftId,
      frontendBase: window.EchoAuralClassroom.getFrontendBase(),
      apiBase: window.EchoAuralClassroom.getApiBase()
    };
    const mixedModuleIds = getEffectiveMixedModuleIds(sessionModuleId);
    if (mixedModuleIds) payload.mixedModuleIds = mixedModuleIds;
    const response = await api('/api/classroom/create', payload);
    updateSessionCard(response);
    if (dashboardLaunch.enabled || sessionModuleId === 'exam-lab') {
      const settingsResponse = await applyRoomSettings();
      updateTeacherStatus(settingsResponse.state);
    } else {
      renderState(response.state);
      updateTeacherStatus(response.state);
    }
    startPolling();
  } catch (error) {
    els.createSessionButton.disabled = false;
    setNotice(error.message || 'Could not create a session. Make sure you opened this page through http://localhost:3000/teacher/.', 'bad');
  }
}

async function startQuiz() {
  if (!roomCode) return;
  if (!quizSettings.saved) return openSettingsModal();
  try {
    const sessionModuleId = getEffectiveSessionModuleId();
    const payload = {
      roomCode,
      moduleId: sessionModuleId,
      questionIndex: 0,
      resetQuiz: true,
      quizLength: quizSettings.quizLength,
      maxListens: quizSettings.maxListens,
      questionLevel: quizSettings.questionLevel
    };
    const mixedModuleIds = getEffectiveMixedModuleIds(sessionModuleId);
    if (mixedModuleIds) payload.mixedModuleIds = mixedModuleIds;
    const response = await api('/api/classroom/start', payload);
    renderState(response.state);
    updateTeacherStatus(response.state);
    if (questionHasAudio(response.state?.question)) await playExcerpt({ leadInSeconds: selectedModuleId === 'melody-master' ? 2 : 1 });
  } catch (error) {
    setNotice(error.message || 'Could not start the quiz.', 'bad');
  }
}

async function nextQuestion() {
  if (!roomCode) return;
  const quiz = getQuizInfo(currentState);
  if (quiz.current >= quiz.total) return endQuiz();
  try {
    const response = await api('/api/classroom/next', { roomCode });
    renderState(response.state);
    updateTeacherStatus(response.state);
    if (questionHasAudio(response.state?.question)) await playExcerpt({ leadInSeconds: selectedModuleId === 'melody-master' ? 2 : 1 });
  } catch (error) {
    setNotice(error.message || 'Could not start the next question.', 'bad');
  }
}

async function closeSubmissions() {
  if (!roomCode) return;
  try {
    const response = await api('/api/classroom/close', { roomCode });
    renderState(response.state);
    updateTeacherStatus(response.state);
  } catch (error) {
    setNotice(error.message || 'Could not close submissions.', 'bad');
  }
}

async function playExcerpt(options = {}) {
  if (!roomCode) return;
  const leadInSeconds = Number.isFinite(Number(options.leadInSeconds)) ? Number(options.leadInSeconds) : 0;
  let attemptedAudioPath = '';
  try {
    const response = await api('/api/classroom/play', { roomCode, leadInSeconds });
    renderState(response.state);
    updateTeacherStatus(response.state);
    const stateQuestion = response.state?.question || currentState?.question || {};
    const audioSequenceUrls = Array.isArray(response.audioSequenceUrls) && response.audioSequenceUrls.length
      ? response.audioSequenceUrls
      : resolveAudioSequence(stateQuestion);
    const audioPath = response.audioUrl || resolveAudioPath(stateQuestion);
    attemptedAudioPath = audioSequenceUrls.length ? audioSequenceUrls.join(', ') : audioPath;
    if (!audioSequenceUrls.length && !audioPath) return setNotice('No audio path is available for this question.', 'bad');

    els.teacherAudio.onended = null;
    els.teacherAudio.onpause = null;
    els.teacherAudio.onerror = null;
    const playback = response.playback || response.state?.playback || {};
    const serverNow = Number(response.state?.serverNow || Date.now());
    const leadInMs = Math.max(0, Number(playback.audioStartAt || 0) - serverNow);

    isTeacherAudioPlaying = true;
    updatePrimaryButton(response.state);
    updateTeacherStatus(response.state);

    if (leadInMs > 0) await delay(leadInMs);
    if (audioSequenceUrls.length) {
      await playAudioSequence(audioSequenceUrls, Number(stateQuestion.sequenceGapMs || 380));
    } else {
      await playAudioFileOnce(audioPath);
    }

    isTeacherAudioPlaying = false;
    updatePrimaryButton(currentState);
    updateTeacherStatus(currentState);
  } catch (error) {
    isTeacherAudioPlaying = false;
    updatePrimaryButton(currentState);
    const unsupportedAudio = error && (
      error.name === 'NotSupportedError' ||
      String(error.message || '').toLowerCase().includes('no supported sources')
    );
    if (unsupportedAudio && attemptedAudioPath) {
      const moduleHint = selectedModuleId === 'instrument-identifier'
        ? ' Check that modules/instrument-identifier/audio contains the II audio clips.'
        : '';
      setNotice(`Could not play the audio file: ${attemptedAudioPath}.${moduleHint}`, 'bad');
      return;
    }
    setNotice(error.message || 'Could not play the excerpt. Check that the audio file exists.', 'bad');
  }
}

async function endQuiz() {
  if (!roomCode) return;
  try {
    isTeacherAudioPlaying = false;
    els.teacherAudio.pause();
    const response = await api('/api/classroom/end', { roomCode });
    renderState(response.state);
    showFinalLeaderboard(response.state);
    setNotice(isExamLabMode(response.state)
      ? 'Session finished. Private feedback and the class diagnosis are now available.'
      : 'Quiz ended. The final leaderboard is open.', 'good');
  } catch (error) {
    setNotice(error.message || 'Could not end the quiz.', 'bad');
  }
}

function copyJoinLink() {
  if (!els.joinLink.value || els.joinLink.value === 'Create a session first') return;
  navigator.clipboard?.writeText(els.joinLink.value).then(() => setNotice('Student short link copied.', 'good'));
  els.joinLink.select();
}

async function handlePrimaryAction() {
  if (primaryAction === 'settings') return openSettingsModal();
  if (primaryAction === 'start') return startQuiz();
  if (primaryAction === 'play') return playExcerpt({ leadInSeconds: 0 });
  if (primaryAction === 'playing') return;
  if (primaryAction === 'next') return nextQuestion();
  if (primaryAction === 'finish') return endQuiz();
}

async function checkServer() {
  try {
    const response = await api('/api/classroom/health');
    modules = response.modules || [];
    normaliseSelectedTeacherModule();
    renderModuleSelector();
    updateSettingsSummary();
    setConnectedUI(true);
    if (requestedRoomCode && !roomCode) {
      roomCode = requestedRoomCode;
      els.roomCode.textContent = roomCode;
      els.sessionCard.classList.remove('is-muted');
      await refreshState();
      startPolling();
      return;
    }
    setNotice(dashboardLaunch.enabled ? 'Dashboard setup loaded.' : 'Create a Class Session', 'good');
    await maybeAutoCreateDashboardSession();
  } catch (_error) {
    modules = [
      { id: 'instrument-identifier', title: 'Instrument Identifier', description: 'Identify the featured instrument.' },
      { id: 'melody-master', title: 'Melody Master', description: 'Melodic dictation.' },
      { id: 'melodic-intervals', title: 'Melodic Intervals', description: 'Generated interval recognition.' }
    ];
    normaliseSelectedTeacherModule();
    renderModuleSelector();
    setConnectedUI(false);
  }
}

async function maybeAutoCreateDashboardSession() {
  if (!dashboardLaunch.enabled || !dashboardLaunch.autoCreate || dashboardAutoCreateAttempted || roomCode) return;
  dashboardAutoCreateAttempted = true;
  await createSession();
}

els.moduleGrid.addEventListener('click', (event) => {
  const button = event.target.closest('.teacher-module-card');
  if (!button) return;
  selectModule(button.dataset.moduleId);
});
els.createSessionButton.addEventListener('click', createSession);
els.primaryQuizButton.addEventListener('click', handlePrimaryAction);
els.closeSubmissionsButton.addEventListener('click', closeSubmissions);
els.endQuizButton.addEventListener('click', endQuiz);
els.copyLinkButton.addEventListener('click', copyJoinLink);
els.closeSettingsModalButton.addEventListener('click', closeSettingsModal);
els.saveSettingsButton.addEventListener('click', saveSettings);
if (els.closeFinalLeaderboardButton) els.closeFinalLeaderboardButton.addEventListener('click', dismissFinalLeaderboard);
els.quizSettingsModal.addEventListener('click', (event) => {
  if (event.target === els.quizSettingsModal) closeSettingsModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.quizSettingsModal.hidden) closeSettingsModal();
});
els.quizLengthOptions.addEventListener('click', (event) => {
  const button = event.target.closest('.option-button');
  if (!button) return;
  quizSettings.quizLength = Number(button.dataset.value) || 3;
  if (!currentState?.quiz?.started && !currentState?.active) quizSettings.saved = false;
  selectOption(els.quizLengthOptions, quizSettings.quizLength);
  updateSettingsSummary();
});
els.playLimitOptions.addEventListener('click', (event) => {
  const button = event.target.closest('.option-button');
  if (!button) return;
  quizSettings.maxListens = Number(button.dataset.value) || 4;
  if (!currentState?.quiz?.started && !currentState?.active) quizSettings.saved = false;
  selectOption(els.playLimitOptions, quizSettings.maxListens);
  updateSettingsSummary();
});

updateSettingsSummary();
checkServer();
