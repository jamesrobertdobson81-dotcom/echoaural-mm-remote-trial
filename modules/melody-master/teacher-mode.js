const els = {
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
  saveSettingsButton: document.getElementById('saveSettingsButton')
};

let roomCode = '';
let currentState = null;
let currentQuestionIndex = 0;
let pollTimer = null;
let isPolling = false;
let primaryAction = 'settings';
let quizSettings = {
  quizLength: 3,
  maxListens: 4,
  saved: false
};

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
  els.connectionStatus.textContent = isConnected
    ? 'Connected to the local classroom server.'
    : 'Teacher Mode needs the local classroom server. Run node server.js from the EchoAural folder, then open the localhost teacher URL.';
  els.createSessionButton.disabled = !isConnected;
  if (!isConnected) {
    els.primaryQuizButton.disabled = true;
    els.endQuizButton.disabled = true;
    setNotice('Not connected. In Terminal run: cd "/Users/james/Desktop/EchoAural 2" then node server.js', 'bad');
  }
}

async function api(path, body = null, method = body ? 'POST' : 'GET') {
  const options = { method, headers: { Accept: 'application/json' } };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
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

function pluralise(value, singular, plural = `${singular}s`) {
  return Number(value) === 1 ? singular : plural;
}

function getQuestionTitle(question) {
  if (!question) return 'No question active';
  const parts = [question.id, question.composer, question.work].filter(Boolean);
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
  els.settingsSummary.textContent = `${quizSettings.quizLength} ${pluralise(quizSettings.quizLength, 'question')} · ${quizSettings.maxListens} ${pluralise(quizSettings.maxListens, 'play')} per question`;
}

function selectOption(groupEl, value) {
  groupEl.querySelectorAll('.option-button').forEach((button) => {
    button.classList.toggle('is-selected', Number(button.dataset.value) === Number(value));
  });
}

function openSettingsModal() {
  selectOption(els.quizLengthOptions, quizSettings.quizLength);
  selectOption(els.playLimitOptions, quizSettings.maxListens);
  updateSettingsSummary();
  els.quizSettingsModal.hidden = false;
  window.setTimeout(() => els.saveSettingsButton.focus(), 30);
}

function closeSettingsModal() {
  els.quizSettingsModal.hidden = true;
}

async function saveSettings() {
  if (!roomCode) {
    closeSettingsModal();
    setNotice('Create a class session before saving quiz settings.', 'bad');
    return;
  }
  els.saveSettingsButton.disabled = true;
  try {
    const response = await api('/api/classroom/settings', {
      roomCode,
      quizLength: quizSettings.quizLength,
      maxListens: quizSettings.maxListens
    });
    quizSettings.saved = true;
    closeSettingsModal();
    renderState(response.state);
    updateTeacherStatus(response.state);
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
    els.primaryQuizButton.textContent = 'Quiz Complete';
    els.primaryQuizButton.disabled = true;
    return;
  }

  if (!state?.active) {
    primaryAction = 'start';
    els.primaryQuizButton.textContent = 'Start Quiz';
    return;
  }

  if (quiz.listens >= quiz.maxListens) {
    primaryAction = quiz.current >= quiz.total ? 'finish' : 'next';
    els.primaryQuizButton.textContent = quiz.current >= quiz.total ? 'Finish Quiz' : 'Next Question';
    return;
  }

  primaryAction = 'play';
  els.primaryQuizButton.textContent = 'Play Again';
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
    setNotice(`Quiz complete · ${quiz.current || quiz.total}/${quiz.total} questions.`, 'good');
    return;
  }
  if (!state?.active) {
    setNotice(`Quiz ready · ${quiz.total} ${pluralise(quiz.total, 'question')} · ${quiz.maxListens}/${quiz.maxListens} plays remaining.`, 'good');
    return;
  }
  setNotice(`Question ${quiz.current}/${quiz.total} · ${quiz.playsRemaining}/${quiz.maxListens} plays remaining.`, 'good');
}

function updateSessionCard(payload) {
  roomCode = payload.roomCode;
  quizSettings.saved = false;
  els.sessionCard.classList.remove('is-muted');
  els.roomCode.textContent = roomCode;
  els.joinLink.value = payload.shortJoinUrl || payload.laptopJoinUrl || payload.joinUrl || 'Create a session first';
  els.copyLinkButton.disabled = false;
  setNotice('Select Settings', 'good');
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
  els.studentList.innerHTML = students.map((student) => `
    <article class="student-row">
      <div>
        <strong>${escapeHTML(student.name)}</strong>
        <span>${student.connected ? 'connected' : 'offline'}</span>
      </div>
      <em class="status-badge ${student.submitted ? 'is-submitted' : 'is-waiting'}">
        ${student.submitted ? 'Submitted' : 'Not submitted'}
      </em>
    </article>
  `).join('');
}

function renderLeaderboard(state) {
  const allStudents = state.leaderboard || [];
  const students = allStudents.slice(0, 10);
  const summary = state.summary || {};
  const joined = summary.joined || 0;
  const submitted = summary.submitted || 0;
  const totalPossible = summary.totalPossible || 0;
  const totalCorrect = summary.totalCorrect || 0;

  els.submittedSummary.textContent = `${submitted} / ${joined}`;
  els.accuracySummary.textContent = totalPossible ? `${totalCorrect} / ${totalPossible}` : '—';
  els.classAverage.textContent = totalPossible ? `Average ${summary.classAverage}%` : 'Average —';
  els.submissionsStatus.textContent = state.submissionsOpen ? 'Open' : state.active ? 'Closed' : 'Waiting';

  // Display leaderboard as a Top 10 only so it always fits in the teacher panel.
  els.leaderboardList.style.setProperty('--leaderboard-count', Math.max(students.length, 1));

  if (!students.length || !students.some((student) => Number(student.cumulativeTotal || 0) > 0)) {
    els.leaderboardList.className = 'leaderboard-list empty-state';
    els.leaderboardList.textContent = 'Quiz scores appear here and carry across questions.';
    return;
  }

  els.leaderboardList.className = `leaderboard-list ${getListDensityClass(students.length)}`.trim();
  els.leaderboardList.innerHTML = students.map((student, index) => {
    const cumulativeTotal = Number(student.cumulativeTotal || 0);
    const cumulativeScore = Number(student.cumulativeScore || 0);
    const cumulativePercentage = student.cumulativePercentage === null || student.cumulativePercentage === undefined ? null : Number(student.cumulativePercentage);
    const currentLine = student.submitted
      ? `This question: ${student.score}/${student.total} correct`
      : state.active ? 'This question: not submitted' : `${student.questionsSubmitted || 0} submitted`;
    return `
      <article class="leaderboard-row ${student.submitted || cumulativeTotal ? '' : 'is-unsubmitted'}">
        <span class="rank">${index + 1}</span>
        <div>
          <strong>${escapeHTML(student.name)}</strong>
          <span>Quiz total: ${cumulativeScore}/${cumulativeTotal} · ${currentLine}</span>
        </div>
        <em>${cumulativeTotal ? `${cumulativePercentage}%` : '—'}</em>
      </article>
    `;
  }).join('');
}

function renderQuestionInfo(state) {
  const question = state.question;
  const quiz = getQuizInfo(state);
  els.activeQuestionTitle.textContent = question && quiz.started && !quiz.ended
    ? getQuestionTitle(question)
    : '';
  if (els.questionInstruction) els.questionInstruction.textContent = 'Complete the melody';

  if (question) {
    if (els.teacherAudio.getAttribute('src') !== question.audio) els.teacherAudio.src = question.audio || '';
    return;
  }

  els.activeQuestionTitle.textContent = '';
}

function renderState(state) {
  currentState = state;
  if (typeof state.questionIndex === 'number') currentQuestionIndex = state.questionIndex;
  if (state.quiz) {
    if (Number(state.quiz.totalQuestions)) quizSettings.quizLength = Number(state.quiz.totalQuestions);
    if (Number(state.maxListens)) quizSettings.maxListens = Number(state.maxListens);
    if (state.quiz.started || state.active) quizSettings.saved = true;
  }

  renderQuestionInfo(state);
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
    const response = await api('/api/classroom/create', {});
    updateSessionCard(response);
    renderState(response.state);
    updateTeacherStatus(response.state);
    startPolling();
  } catch (error) {
    els.createSessionButton.disabled = false;
    setNotice(error.message || 'Could not create a session. Make sure you opened this page through http://localhost:3000.', 'bad');
  }
}

async function startQuiz() {
  if (!roomCode) return;
  if (!quizSettings.saved) return openSettingsModal();
  try {
    const response = await api('/api/classroom/start', {
      roomCode,
      questionIndex: 0,
      resetQuiz: true,
      quizLength: quizSettings.quizLength,
      maxListens: quizSettings.maxListens
    });
    renderState(response.state);
    updateTeacherStatus(response.state);
    await playExcerpt({ leadInSeconds: 2 });
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
    await playExcerpt({ leadInSeconds: 2 });
  } catch (error) {
    setNotice(error.message || 'Could not start the next question.', 'bad');
  }
}

async function closeSubmissions(message = 'Submissions closed. Leaderboard is ready.') {
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
  try {
    const response = await api('/api/classroom/play', { roomCode, leadInSeconds });
    renderState(response.state);
    updateTeacherStatus(response.state);
    const audioPath = response.audio || response.state?.question?.audio || currentState?.question?.audio || '';
    if (!audioPath) return setNotice('No audio path is available for this question.', 'bad');

    els.teacherAudio.src = audioPath;
    els.teacherAudio.currentTime = 0;
    els.teacherAudio.onended = null;
    const playback = response.playback || response.state?.playback || {};
    const serverNow = Number(response.state?.serverNow || Date.now());
    const leadInMs = Math.max(0, Number(playback.audioStartAt || 0) - serverNow);

    if (leadInMs > 0) await delay(leadInMs);
    await els.teacherAudio.play();
    updateTeacherStatus(response.state);
  } catch (error) {
    setNotice(error.message || 'Could not play the excerpt. Check that the audio file exists.', 'bad');
  }
}

async function endQuiz() {
  if (!roomCode) return;
  try {
    els.teacherAudio.pause();
    const response = await api('/api/classroom/end', { roomCode });
    renderState(response.state);
    setNotice('Quiz ended. The leaderboard remains available for review.', 'good');
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
  if (primaryAction === 'next') return nextQuestion();
  if (primaryAction === 'finish') return endQuiz();
}

async function checkServer() {
  try {
    await api('/api/classroom/health');
    setConnectedUI(true);
    setNotice('Create a Class Session', 'good');
  } catch (_error) {
    setConnectedUI(false);
  }
}

els.createSessionButton.addEventListener('click', createSession);
els.primaryQuizButton.addEventListener('click', handlePrimaryAction);
els.closeSubmissionsButton.addEventListener('click', () => closeSubmissions());
els.endQuizButton.addEventListener('click', endQuiz);
els.copyLinkButton.addEventListener('click', copyJoinLink);
els.closeSettingsModalButton.addEventListener('click', closeSettingsModal);
els.saveSettingsButton.addEventListener('click', saveSettings);
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
  selectOption(els.quizLengthOptions, quizSettings.quizLength);
  updateSettingsSummary();
});
els.playLimitOptions.addEventListener('click', (event) => {
  const button = event.target.closest('.option-button');
  if (!button) return;
  quizSettings.maxListens = Number(button.dataset.value) || 4;
  selectOption(els.playLimitOptions, quizSettings.maxListens);
  updateSettingsSummary();
});

updateSettingsSummary();
checkServer();
