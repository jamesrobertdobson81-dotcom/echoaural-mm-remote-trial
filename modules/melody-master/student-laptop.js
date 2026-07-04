(() => {
  const body = document.body;
  const classroom = window.MelodyMasterClassroom;

  const els = {
    gate: document.getElementById('classroomGate'),
    joinCard: document.getElementById('classroomJoinCard'),
    waitCard: document.getElementById('classroomWaitCard'),
    joinForm: document.getElementById('classroomJoinForm'),
    nameInput: document.getElementById('classroomNameInput'),
    codeInput: document.getElementById('classroomCodeInput'),
    joinMessage: document.getElementById('classroomJoinMessage'),
    waitingCode: document.getElementById('classroomWaitingCode'),
    waitingMessage: document.getElementById('classroomWaitingMessage'),
    enableAudioButton: document.getElementById('classroomEnableAudioButton'),
    audioStatus: document.getElementById('classroomAudioStatus'),
    appShell: document.getElementById('classroomAppShell'),
    submitButton: document.getElementById('classroomSubmitButton'),
    answerCard: document.getElementById('answerCard'),
    feedback: document.getElementById('feedback'),
    roundText: document.getElementById('roundText'),
    scoreText: document.getElementById('scoreText'),
    streakText: document.getElementById('streakText'),
    xpText: document.getElementById('xpText')
  };

  let roomCode = '';
  // Important for classroom testing: student identity is per-tab, not shared across browser tabs.
  let studentId = window.sessionStorage.getItem('ea_mm_classroom_student_tab_id') || '';
  let studentName = window.localStorage.getItem('ea_mm_classroom_student_name') || '';
  let pollTimer = null;
  let currentQuestionRunId = null;
  let loadedQuestionRunId = null;
  let lastPlaybackId = '';
  let lastStudentAudioPlaybackId = '';
  let studentAudio = null;
  let studentAudioUnlocked = false;
  let studentAudioTimer = null;
  let hasJoined = false;
  let hasSubmitted = false;
  let submissionsOpen = false;
  let activeQuestionIndex = 0;

  function escapeHTML(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function setPhase(phase) {
    body.classList.remove('classroom-phase-join', 'classroom-phase-waiting', 'classroom-phase-active');
    body.classList.add(`classroom-phase-${phase}`);

    if (els.appShell) {
      const active = phase === 'active';
      els.appShell.setAttribute('aria-hidden', String(!active));
    }

    if (els.waitCard) els.waitCard.hidden = phase !== 'waiting';
  }

  function setJoinMessage(message, state = '') {
    if (!els.joinMessage) return;
    els.joinMessage.textContent = message || '';
    els.joinMessage.className = `classroom-message ${state ? `is-${state}` : ''}`.trim();
  }

  async function api(path, body = null, method = body ? 'POST' : 'GET') {
    const options = { method, headers: { Accept: 'application/json' } };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(path, options);
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_error) { throw new Error('The classroom server returned an unreadable response.'); }
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function ensureStudentId() {
    if (!studentId) {
      studentId = `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem('ea_mm_classroom_student_tab_id', studentId);
    }
    return studentId;
  }

  function normaliseRoomCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }


  const SILENT_AUDIO_DATA_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

  function resolveAudioPath(audioPath = '') {
    const value = String(audioPath || '').trim();
    if (!value) return '';
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('/')) return value;
    return `/modules/melody-master/${value.replace(/^\.\//, '')}`;
  }

  function ensureStudentAudio() {
    if (!studentAudio) {
      studentAudio = new Audio();
      studentAudio.preload = 'auto';
      studentAudio.volume = 1;
    }
    return studentAudio;
  }

  function setAudioStatus(message = '', state = '') {
    if (!els.audioStatus) return;
    els.audioStatus.textContent = message;
    els.audioStatus.className = `classroom-audio-status ${state ? `is-${state}` : ''}`.trim();
  }

  function updateAudioButton() {
    if (!els.enableAudioButton) return;
    els.enableAudioButton.textContent = studentAudioUnlocked ? 'Audio enabled' : 'Enable audio for remote play';
    els.enableAudioButton.classList.toggle('is-enabled', studentAudioUnlocked);
    els.enableAudioButton.disabled = studentAudioUnlocked;
  }

  async function unlockStudentAudio() {
    const audio = ensureStudentAudio();
    try {
      audio.pause();
      audio.src = SILENT_AUDIO_DATA_URI;
      audio.currentTime = 0;
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      studentAudioUnlocked = true;
      updateAudioButton();
      setAudioStatus('Audio enabled. The excerpt will play from this computer when your teacher presses Play.', 'good');
    } catch (_error) {
      studentAudioUnlocked = false;
      updateAudioButton();
      setAudioStatus('Audio was blocked. Click Enable Audio again, then keep this tab open.', 'bad');
    }
  }

  function scheduleStudentAudio(state, isNewPlayback = false) {
    const playback = state && state.playback ? state.playback : null;
    const playbackId = playback && playback.id ? String(playback.id) : '';
    const question = state && state.question ? state.question : {};
    const audioPath = resolveAudioPath(question.audio || '');

    if (!playbackId || !audioPath || !isNewPlayback || playbackId === lastStudentAudioPlaybackId) return;
    lastStudentAudioPlaybackId = playbackId;

    if (studentAudioTimer) {
      window.clearTimeout(studentAudioTimer);
      studentAudioTimer = null;
    }

    const serverNow = Number(state.serverNow || Date.now());
    const audioStartAt = Number(playback.audioStartAt || serverNow);
    const msUntilAudio = Math.max(0, audioStartAt - serverNow);
    const audio = ensureStudentAudio();

    audio.pause();
    audio.src = audioPath;
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 1;
    audio.load();

    const playNow = () => {
      const attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          studentAudioUnlocked = false;
          updateAudioButton();
          setAudioStatus('Your browser blocked the excerpt. Click Enable Audio, then ask the teacher to play again.', 'bad');
          if (classroom && classroom.setFeedback) classroom.setFeedback('Audio was blocked on this computer. Click Enable Audio, then ask your teacher to play again.', 'bad');
        });
      }
    };

    setAudioStatus(studentAudioUnlocked
      ? 'Get ready — the excerpt will play from this computer.'
      : 'Click Enable Audio if you do not hear the excerpt.', studentAudioUnlocked ? 'good' : '');

    studentAudioTimer = window.setTimeout(playNow, msUntilAudio);
  }

  function renderWaiting(message = '') {
    if (els.waitingCode) els.waitingCode.textContent = roomCode || '—';
    if (els.waitingMessage) {
      els.waitingMessage.textContent = message || 'You are in. The Melody Master screen will appear when your teacher presses Play.';
    }
  }

  function renderClassroomStatus(state = {}, message = '') {
    if (!els.answerCard) return;
    const question = state.question || {};
    const student = state.student || {};
    const submitted = Boolean(student.submitted || hasSubmitted);
    const listenText = `${state.listens || 0}/${state.maxListens || 4} listens`;
    const statusText = submitted
      ? 'Your answer has been submitted to your teacher.'
      : state.submissionsOpen
        ? 'Drag all notes into place, then submit once.'
        : 'Submissions are currently closed.';

    els.answerCard.innerHTML = `
      <div class="answerCard-empty mm-source-panel mm-source-panel-active classroom-status-panel ${submitted ? 'is-submitted' : ''}">
        <span class="classroom-status-pill">Live classroom</span>
        <h2>${escapeHTML(question.id || 'Melody Master')}</h2>
        <p>${escapeHTML(message || statusText)}</p>
        <div class="diagnostic-card diagnostic-empty">
          <span>Room ${escapeHTML(roomCode)}</span>
          <strong>${escapeHTML(listenText)}</strong>
        </div>
        <p class="diagnostic-next-step">Teacher controls playback. Your screen uses the same Melody Master score placement, note sizing and drag behaviour as the solo app.</p>
      </div>
    `;
  }

  function updateSubmitButton(state = null) {
    if (!els.submitButton || !classroom) return;
    const payload = classroom.getSubmissionPayload ? classroom.getSubmissionPayload() : null;
    const submitted = Boolean(hasSubmitted || (state && state.student && state.student.submitted));
    const open = state ? Boolean(state.submissionsOpen) : submissionsOpen;
    const canSubmit = Boolean(payload && payload.allPlaced && open && !submitted);
    els.submitButton.disabled = !canSubmit;
    els.submitButton.textContent = submitted ? 'Submitted' : 'Submit Answer';
  }

  function showActiveQuestion(state, playbackStarted = false) {
    if (!classroom) {
      setJoinMessage('Melody Master classroom engine did not load. Refresh the page.', 'bad');
      return;
    }

    const questionRunId = Number(state.questionRunId || 0);
    const questionIndex = Number(state.questionIndex || 0);
    activeQuestionIndex = questionIndex;
    submissionsOpen = Boolean(state.submissionsOpen);
    hasSubmitted = Boolean(state.student && state.student.submitted);

    setPhase('active');

    if (loadedQuestionRunId !== questionRunId) {
      classroom.loadQuestionByIndex(questionIndex);
      loadedQuestionRunId = questionRunId;
    }

    classroom.showQuestionForTeacherPlayback();
    currentQuestionRunId = questionRunId;

    const serverNow = Number(state.serverNow || Date.now());
    const audioStartAt = Number(state.playback && state.playback.audioStartAt || 0);
    const msUntilAudio = Math.max(0, audioStartAt - serverNow);
    const status = playbackStarted && msUntilAudio > 250
      ? 'Get ready — the music will start from this computer.'
      : 'Listen from this computer, then drag the notes into place.';

    if (classroom.setFeedback) classroom.setFeedback(status);
    renderClassroomStatus(state, status);
    updateSubmitButton(state);
    window.requestAnimationFrame(() => {
      classroom.refreshExpandedScorePosition?.();
      classroom.queueNoteScaleUpdate?.();
    });
  }

  function handleState(state) {
    if (!state || state.ok === false) return;
    const questionRunId = Number(state.questionRunId || 0);
    const playbackId = state.playback && state.playback.id ? String(state.playback.id) : '';
    submissionsOpen = Boolean(state.submissionsOpen);
    hasSubmitted = Boolean(state.student && state.student.submitted);

    if (currentQuestionRunId !== null && questionRunId && questionRunId !== currentQuestionRunId) {
      loadedQuestionRunId = null;
      lastPlaybackId = '';
      hasSubmitted = false;
      setPhase('waiting');
      renderWaiting('New question ready. Wait for your teacher to press Play.');
    }

    if (state.question && playbackId) {
      const isNewPlayback = playbackId !== lastPlaybackId;
      if (isNewPlayback || loadedQuestionRunId !== questionRunId || !body.classList.contains('classroom-phase-active')) {
        lastPlaybackId = playbackId;
        showActiveQuestion(state, isNewPlayback);
        scheduleStudentAudio(state, isNewPlayback);
      } else {
        renderClassroomStatus(state);
        updateSubmitButton(state);
      }
      return;
    }

    if (!body.classList.contains('classroom-phase-active')) {
      setPhase('waiting');
      renderWaiting(state.question
        ? 'Question is loaded. Wait for your teacher to press Play.'
        : 'You are in. Wait for your teacher to start the question.');
    } else {
      renderClassroomStatus(state);
      updateSubmitButton(state);
    }
  }

  async function refreshState() {
    if (!hasJoined || !roomCode || !studentId) return;
    try {
      const state = await api(`/api/classroom/state?roomCode=${encodeURIComponent(roomCode)}&studentId=${encodeURIComponent(studentId)}`);
      handleState(state);
    } catch (error) {
      if (!body.classList.contains('classroom-phase-active')) {
        setPhase('waiting');
        renderWaiting(error.message || 'Connection lost. Check the room code or ask your teacher to recreate the session.');
      } else if (classroom && classroom.setFeedback) {
        classroom.setFeedback(error.message || 'Connection lost. Your placed notes remain on this screen.', 'bad');
      }
    }
  }

  function startPolling() {
    if (pollTimer) window.clearInterval(pollTimer);
    pollTimer = window.setInterval(refreshState, 1000);
    refreshState();
  }

  async function joinRoom(event) {
    event.preventDefault();
    roomCode = normaliseRoomCode(els.codeInput && els.codeInput.value);
    studentName = String(els.nameInput && els.nameInput.value || '').trim();

    if (!studentName) return setJoinMessage('Enter your name.', 'bad');
    if (!roomCode) return setJoinMessage('Enter the join code from the teacher screen.', 'bad');

    setJoinMessage('Joining room…');
    ensureStudentId();

    try {
      const response = await api('/api/classroom/join', { roomCode, studentId, name: studentName });
      roomCode = response.roomCode || roomCode;
      hasJoined = true;
      window.localStorage.setItem('ea_mm_classroom_student_name', studentName);
      window.localStorage.setItem('ea_mm_classroom_last_room', roomCode);
      setPhase('waiting');
      renderWaiting(response.question
        ? 'Question is loaded. Enable audio, then wait for your teacher to press Play.'
        : 'You are in. Enable audio, then wait for your teacher to start the question.');
      updateAudioButton();
      if (els.enableAudioButton && !studentAudioUnlocked) setAudioStatus('Click Enable Audio once before the first question.', '');
      startPolling();
    } catch (error) {
      setJoinMessage(error.message || 'Could not join this room.', 'bad');
    }
  }

  async function submitAnswer() {
    if (!classroom || !hasJoined || !roomCode || !studentId) return;
    const payload = classroom.getSubmissionPayload();
    if (!payload || !payload.allPlaced) {
      const total = payload ? payload.total : 0;
      const placed = payload ? payload.placedCount : 0;
      classroom.setFeedback(`Place all notes before submitting. ${placed}/${total} placed.`, 'bad');
      return;
    }

    els.submitButton.disabled = true;
    classroom.setFeedback('Submitting your answer to the teacher…');

    try {
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        answers: payload.answers,
        questionId: payload.questionId,
        questionIndex: payload.questionIndex
      });
      hasSubmitted = true;
      classroom.setFeedback('Submitted. Keep your screen open for the next question.', 'good');
      renderClassroomStatus(response.state, 'Submitted. Your teacher can now see your score on the leaderboard.');
      updateSubmitButton(response.state);
    } catch (error) {
      classroom.setFeedback(error.message || 'Could not submit your answer.', 'bad');
      updateSubmitButton();
    }
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = normaliseRoomCode(params.get('room'));
    const lastRoom = normaliseRoomCode(window.localStorage.getItem('ea_mm_classroom_last_room'));
    if (els.codeInput) els.codeInput.value = roomFromUrl || '';
    if (els.nameInput && studentName) els.nameInput.value = studentName;

    if (els.joinForm) els.joinForm.addEventListener('submit', joinRoom);
    if (els.submitButton) els.submitButton.addEventListener('click', submitAnswer);
    if (els.enableAudioButton) els.enableAudioButton.addEventListener('click', unlockStudentAudio);

    // Keep the submit state in sync with the original Melody Master drag/drop engine.
    window.setInterval(() => {
      if (body.classList.contains('classroom-phase-active')) updateSubmitButton();
    }, 350);

    updateAudioButton();
    setPhase('join');
    if (!roomFromUrl && lastRoom && els.codeInput) {
      els.codeInput.placeholder = lastRoom;
    }
  }

  boot();
})();
