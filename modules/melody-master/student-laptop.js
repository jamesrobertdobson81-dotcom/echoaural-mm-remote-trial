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
    revealButton: document.getElementById('classroomRevealButton'),
    answerCard: document.getElementById('answerCard'),
    roundFeedbackOverlay: document.getElementById('classroomRoundFeedbackOverlay'),
    roundFeedbackContent: document.getElementById('classroomRoundFeedbackContent'),
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
  let currentRoundId = null;
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
  let localCurrentEvaluation = null;
  const localRoundResults = new Map();

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
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }

  function ensureStudentId() {
    if (!studentId) {
      studentId = `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    window.sessionStorage.setItem('ea_mm_classroom_student_tab_id', studentId);
    window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
    return studentId;
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
    if (!moduleId || moduleId === 'melody-master') return false;
    const targetPath = getStudentRouteForModule(moduleId);
    const params = new URLSearchParams();
    params.set('room', state.roomCode || roomCode);
    if (studentName) params.set('name', studentName);
    if (studentId) params.set('student', studentId);
    window.location.replace(`${targetPath}?${params.toString()}`);
    return true;
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

  function hideClassroomRoundFeedback() {
    if (els.roundFeedbackOverlay) els.roundFeedbackOverlay.hidden = true;
    body.classList.remove('classroom-round-feedback-open');
  }

  function resetForNewRound(state = {}) {
    currentQuestionRunId = null;
    loadedQuestionRunId = null;
    lastPlaybackId = '';
    lastStudentAudioPlaybackId = '';
    hasSubmitted = false;
    submissionsOpen = false;
    localCurrentEvaluation = null;
    localRoundResults.clear();
    hideClassroomRoundFeedback();
    if (studentAudioTimer) {
      window.clearTimeout(studentAudioTimer);
      studentAudioTimer = null;
    }
    if (studentAudio) {
      studentAudio.pause();
      studentAudio.currentTime = 0;
    }
    if (!state.question) {
      setPhase('waiting');
      renderWaiting('You are in. Wait for your teacher to start the question.');
    }
  }

  function resetToJoinForNewCode(message = 'That quiz has finished. Enter the new code from your teacher.') {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (studentAudioTimer) {
      window.clearTimeout(studentAudioTimer);
      studentAudioTimer = null;
    }
    if (studentAudio) {
      studentAudio.pause();
      studentAudio.currentTime = 0;
    }

    hasJoined = false;
    roomCode = '';
    currentQuestionRunId = null;
    loadedQuestionRunId = null;
    lastPlaybackId = '';
    lastStudentAudioPlaybackId = '';
    hasSubmitted = false;
    submissionsOpen = false;
    localCurrentEvaluation = null;
    localRoundResults.clear();
    hideClassroomRoundFeedback();
    window.localStorage.removeItem('ea_mm_classroom_last_room');
    if (els.codeInput) els.codeInput.value = '';
    setPhase('join');
    setJoinMessage(message, 'good');
  }

  function getClassroomFeedbackText(evaluation, official = false) {
    if (!evaluation || !evaluation.marking) {
      return 'Place all notes, then submit your answer.';
    }

    const marking = evaluation.marking;
    if (marking.awardedMarks === marking.maxMarks) {
      return official
        ? 'Full credit. Your official classroom score has been submitted.'
        : 'Full credit. This practice check does not change your submitted score.';
    }

    const scoreNote = official
      ? 'This is your submitted classroom score.'
      : 'Practice check only: your submitted classroom score has not changed.';
    return `${marking.shortComment} ${scoreNote}`;
  }

  function getResultFromEvaluation(questionRunId, evaluation, state = {}) {
    if (!questionRunId || !evaluation || !evaluation.marking) return null;
    const marking = evaluation.marking;
    return {
      questionRunId,
      questionIndex: activeQuestionIndex,
      quizQuestionNumber: Number(state.quiz && state.quiz.currentQuestionNumber || localRoundResults.size + 1),
      awardedMarks: marking.awardedMarks,
      maxMarks: marking.maxMarks,
      pitchMarksAwarded: marking.pitchMarksAwarded,
      pitchMarksAvailable: marking.pitchMarksAvailable,
      shapeMarksAwarded: marking.shapeMarksAwarded,
      shapeMarksAvailable: marking.shapeMarksAvailable,
      shortComment: marking.shortComment || '',
      firstWrongNote: marking.wrongNotes && marking.wrongNotes[0] ? marking.wrongNotes[0].noteNumber : null,
      firstContourError: marking.firstContourError || '',
      firstIntervalSizeError: marking.firstIntervalSizeError || ''
    };
  }

  function saveLocalRoundResult(questionRunId, evaluation, state = {}) {
    const result = getResultFromEvaluation(questionRunId, evaluation, state);
    if (!result) return;
    localRoundResults.set(String(questionRunId), result);
  }

  function getServerRoundResults(state = {}) {
    const serverResults = state && state.student && Array.isArray(state.student.results) ? state.student.results : [];
    return serverResults.map((result, index) => ({
      questionRunId: result.questionRunId || `server-${index}`,
      questionIndex: Number(result.questionIndex || index),
      quizQuestionNumber: Number(result.quizQuestionNumber || index + 1),
      awardedMarks: Number(result.score || result.awardedMarks || 0),
      maxMarks: Number(result.total || result.maxMarks || 0),
      pitchMarksAwarded: Number(result.pitchMarksAwarded || 0),
      pitchMarksAvailable: Number(result.pitchMarksAvailable || result.pitchOnlyTotal || 0),
      shapeMarksAwarded: Number(result.shapeMarksAwarded || 0),
      shapeMarksAvailable: Number(result.shapeMarksAvailable || 0),
      shortComment: result.shortComment || '',
      firstWrongNote: result.firstWrongNote || null,
      firstContourError: result.firstContourError || '',
      firstIntervalSizeError: result.firstIntervalSizeError || ''
    }));
  }

  function getLocalRoundSummary(state = {}) {
    const localResults = Array.from(localRoundResults.values());
    const results = (localResults.length ? localResults : getServerRoundResults(state))
      .sort((a, b) => Number(a.quizQuestionNumber || a.questionRunId || 0) - Number(b.quizQuestionNumber || b.questionRunId || 0));
    const awarded = results.reduce((sum, result) => sum + Number(result.awardedMarks || 0), 0);
    const possible = results.reduce((sum, result) => sum + Number(result.maxMarks || 0), 0);
    const pitchAwarded = results.reduce((sum, result) => sum + Number(result.pitchMarksAwarded || 0), 0);
    const pitchPossible = results.reduce((sum, result) => sum + Number(result.pitchMarksAvailable || 0), 0);
    const contourAwarded = results.reduce((sum, result) => sum + Number(result.shapeMarksAwarded || 0), 0);
    const contourPossible = results.reduce((sum, result) => sum + Number(result.shapeMarksAvailable || 0), 0);
    const percentage = possible ? Math.round((awarded / possible) * 100) : 0;

    return { results, awarded, possible, pitchAwarded, pitchPossible, contourAwarded, contourPossible, percentage };
  }

  function getCompiledClassroomFeedback(summary) {
    if (!summary || !summary.results.length) return 'No submitted answers were recorded on this device.';
    const pitchPercent = summary.pitchPossible ? Math.round((summary.pitchAwarded / summary.pitchPossible) * 100) : 0;
    const contourPercent = summary.contourPossible ? Math.round((summary.contourAwarded / summary.contourPossible) * 100) : 0;

    if (summary.percentage >= 90) return 'Excellent work. Pitch accuracy and melodic contour are secure across the round.';
    if (contourPercent >= 80 && pitchPercent < 70) return 'Your melodic shape is mostly secure, but exact pitch placement needs refining.';
    if (pitchPercent >= 70 && contourPercent < 70) return 'Several exact pitches are accurate, but the melodic direction needs more consistent checking.';
    if (summary.percentage >= 70) return 'Strong work. Review the marked notes and listen carefully for the size of steps and leaps.';
    if (summary.percentage >= 50) return 'Developing work. Start with the first note, then track whether each movement goes up, down, or repeats.';
    return 'Keep practising. First secure the starting note and melodic direction, then refine the exact pitch of each missing note.';
  }

  function buildRoundSummaryMarkup(summary, compact = false) {
    const finalScore = summary.possible ? `${summary.awarded}/${summary.possible}` : '—';
    const rows = summary.results.length
      ? summary.results.map((result, index) => {
          const reviewText = result.firstWrongNote
            ? `First pitch to review: note ${result.firstWrongNote}`
            : (result.firstContourError || result.firstIntervalSizeError || result.shortComment || 'Secure response');
          return `
            <div class="mm-round-review-row">
              <span>Question ${Number(result.quizQuestionNumber || index + 1)}</span>
              <strong>${escapeHTML(`${result.awardedMarks}/${result.maxMarks}`)}</strong>
              <small>Pitch ${escapeHTML(`${result.pitchMarksAwarded}/${result.pitchMarksAvailable || '—'}`)} · Contour ${escapeHTML(`${result.shapeMarksAwarded}/${result.shapeMarksAvailable || '—'}`)} · ${escapeHTML(reviewText)}</small>
            </div>
          `;
        }).join('')
      : '<div class="mm-round-review-row"><span>Round</span><strong>No submitted answers</strong><small>Your teacher may still have the class leaderboard.</small></div>';

    return `
      <div class="mm-round-review-hero">
        <span>Final score</span>
        <strong>${escapeHTML(finalScore)}</strong>
        ${summary.possible ? `<small>${escapeHTML(`${summary.percentage}% · ${summary.results.length} submitted`)}</small>` : ''}
      </div>

      <div class="diagnostic-metrics gcse-mark-metrics mm-two-mark-metrics" aria-label="Round mark breakdown">
        <div class="diagnostic-metric ${summary.pitchPossible && summary.pitchAwarded === summary.pitchPossible ? 'is-secure' : 'is-focus'}">
          <span>Pitch total</span>
          <strong>${summary.pitchPossible ? escapeHTML(`${summary.pitchAwarded}/${summary.pitchPossible}`) : '—'}</strong>
        </div>
        <div class="diagnostic-metric ${summary.contourPossible && summary.contourAwarded === summary.contourPossible ? 'is-secure' : 'is-focus'}">
          <span>Contour total</span>
          <strong>${summary.contourPossible ? escapeHTML(`${summary.contourAwarded}/${summary.contourPossible}`) : '—'}</strong>
        </div>
      </div>

      <div class="diagnostic-card diagnostic-feedback-tile">
        <span>Compiled feedback</span>
        <strong>${escapeHTML(getCompiledClassroomFeedback(summary))}</strong>
      </div>

      <div class="mm-round-review-list" aria-label="Question-by-question classroom results">
        ${rows}
      </div>
    `;
  }

  function showStudentRoundFeedbackOverlay(state = {}) {
    if (!els.roundFeedbackOverlay || !els.roundFeedbackContent) return;
    const summary = getLocalRoundSummary(state);
    els.roundFeedbackContent.innerHTML = buildRoundSummaryMarkup(summary);
    els.roundFeedbackOverlay.hidden = false;
    body.classList.add('classroom-round-feedback-open');
  }

  function renderClassroomRoundSummary(state = {}) {
    if (!els.answerCard) return;
    const summary = getLocalRoundSummary(state);
    showStudentRoundFeedbackOverlay(state);
    els.answerCard.innerHTML = `
      <div class="answerCard-empty mm-source-panel mm-source-panel-active classroom-status-panel classroom-gcse-feedback-panel classroom-round-summary-panel is-submitted">
        <span class="classroom-status-pill">Round feedback</span>
        ${buildRoundSummaryMarkup(summary, true)}
      </div>
    `;
  }

  function renderClassroomStatus(state = {}, message = '') {
    if (!els.answerCard) return;

    if (state.quiz && state.quiz.ended) {
      renderClassroomRoundSummary(state);
      return;
    }

    const student = state.student || {};
    const submitted = Boolean(student.submitted || hasSubmitted);
    const feedbackText = submitted && localCurrentEvaluation
      ? getClassroomFeedbackText(localCurrentEvaluation, true)
      : (message || (state.submissionsOpen ? 'Drag all notes into place, then submit once.' : 'Submissions are currently closed.'));

    if (classroom.renderAttemptFeedback) {
      classroom.renderAttemptFeedback(submitted ? localCurrentEvaluation : null, {
        submitted,
        status: submitted ? 'Submitted' : 'Live classroom',
        feedback: feedbackText
      });
      return;
    }

    els.answerCard.innerHTML = `
      <div class="answerCard-empty mm-source-panel mm-source-panel-active classroom-status-panel ${submitted ? 'is-submitted' : ''}">
        <span class="classroom-status-pill">${submitted ? 'Submitted' : 'Live classroom'}</span>
        <p>${escapeHTML(feedbackText)}</p>
      </div>
    `;
  }

  function updateRevealButton() {
    if (!els.revealButton) return;
    els.revealButton.hidden = !hasSubmitted;
    els.revealButton.textContent = els.revealButton.dataset.showingAnswer === 'true' ? 'Show Question' : 'Reveal Answer';
  }

  function updateSubmitButton(state = null) {
    if (!els.submitButton || !classroom) return;
    const payload = classroom.getSubmissionPayload ? classroom.getSubmissionPayload() : null;
    const submitted = Boolean(hasSubmitted || (state && state.student && state.student.submitted));
    const open = state ? Boolean(state.submissionsOpen) : submissionsOpen;

    if (submitted) {
      els.submitButton.disabled = !(payload && payload.allPlaced);
      els.submitButton.textContent = 'Check again';
      updateRevealButton();
      return;
    }

    const canSubmit = Boolean(payload && payload.allPlaced && open);
    els.submitButton.disabled = !canSubmit;
    els.submitButton.textContent = 'Submit your answers';
    updateRevealButton();
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
      localCurrentEvaluation = null;
      if (els.revealButton) { els.revealButton.hidden = true; els.revealButton.dataset.showingAnswer = 'false'; }
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
    if (state.dismissed) {
      resetToJoinForNewCode('That quiz has finished. Enter the new code from your teacher.');
      return;
    }

    if (redirectIfTeacherModuleChanged(state)) return;

    const roundId = Number(state.roundId || 0);
    if (roundId && currentRoundId !== null && roundId !== currentRoundId) {
      currentRoundId = roundId;
      resetForNewRound(state);
    } else if (roundId && currentRoundId === null) {
      currentRoundId = roundId;
    }

    if (state.quiz && state.quiz.ended) {
      if (studentAudioTimer) {
        window.clearTimeout(studentAudioTimer);
        studentAudioTimer = null;
      }
      if (studentAudio) {
        studentAudio.pause();
        studentAudio.currentTime = 0;
      }
      setPhase('active');
      renderClassroomRoundSummary(state);
      updateSubmitButton(state);
      return;
    }

    const questionRunId = Number(state.questionRunId || 0);
    const playbackId = state.playback && state.playback.id ? String(state.playback.id) : '';
    submissionsOpen = Boolean(state.submissionsOpen);
    hasSubmitted = Boolean(state.student && state.student.submitted);

    if (currentQuestionRunId !== null && questionRunId && questionRunId !== currentQuestionRunId) {
      loadedQuestionRunId = null;
      lastPlaybackId = '';
      hasSubmitted = false;
      localCurrentEvaluation = null;
      if (els.revealButton) { els.revealButton.hidden = true; els.revealButton.dataset.showingAnswer = 'false'; }
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

    if (!state.question) {
      hideClassroomRoundFeedback();
      setPhase('waiting');
      renderWaiting('You are in. Wait for your teacher to start the question.');
      return;
    }

    if (!body.classList.contains('classroom-phase-active')) {
      setPhase('waiting');
      renderWaiting('Question is loaded. Wait for your teacher to press Play.');
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
      const message = error.message || '';
      if (/invalid room code/i.test(message)) {
        resetToJoinForNewCode('That quiz has finished. Enter the new code from your teacher.');
      } else if (!body.classList.contains('classroom-phase-active')) {
        setPhase('waiting');
        renderWaiting(message || 'Connection lost. Check the room code or ask your teacher to recreate the session.');
      } else if (classroom && classroom.setFeedback) {
        classroom.setFeedback(message || 'Connection lost. Your placed notes remain on this screen.', 'bad');
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
      studentId = String(response.studentId || studentId);
      studentName = String(response.studentName || studentName);
      window.sessionStorage.setItem('ea_mm_classroom_student_tab_id', studentId);
      window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
      if (els.nameInput) els.nameInput.value = studentName;
      hasJoined = true;
      localRoundResults.clear();
      hideClassroomRoundFeedback();
      window.localStorage.setItem('ea_mm_classroom_student_name', studentName);
      window.localStorage.setItem('ea_mm_classroom_last_room', roomCode);
      window.localStorage.setItem('ea_classroom_student_name', studentName);
      window.localStorage.setItem('ea_classroom_last_room', roomCode);
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

  function evaluateForPractice(official = false) {
    const evaluation = classroom.evaluateCurrentAttempt
      ? classroom.evaluateCurrentAttempt({ markTokens: true, setSubmittedState: true })
      : null;

    if (!evaluation || !evaluation.allPlaced || !evaluation.marking) {
      const payload = classroom.getSubmissionPayload ? classroom.getSubmissionPayload() : null;
      const total = payload ? payload.total : 0;
      const placed = payload ? payload.placedCount : 0;
      classroom.setFeedback(`Place all notes before ${official ? 'submitting' : 'checking again'}. ${placed}/${total} placed.`, 'bad');
      return null;
    }

    localCurrentEvaluation = evaluation;
    classroom.renderAttemptFeedback?.(evaluation, {
      submitted: hasSubmitted || official,
      status: hasSubmitted || official ? 'Submitted' : 'Live classroom',
      feedback: getClassroomFeedbackText(evaluation, official)
    });
    return evaluation;
  }

  async function submitAnswer() {
    if (!classroom || !hasJoined || !roomCode || !studentId) return;

    if (hasSubmitted) {
      evaluateForPractice(false);
      updateSubmitButton();
      return;
    }

    const payload = classroom.getSubmissionPayload();
    if (!payload || !payload.allPlaced) {
      const total = payload ? payload.total : 0;
      const placed = payload ? payload.placedCount : 0;
      classroom.setFeedback(`Place all notes before submitting. ${placed}/${total} placed.`, 'bad');
      return;
    }

    const evaluation = evaluateForPractice(true);
    if (!evaluation) return;

    els.submitButton.disabled = true;
    classroom.setFeedback('Submitting your answer to the teacher…');

    try {
      const marking = evaluation.marking || {};
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        answers: payload.answers,
        questionId: payload.questionId,
        questionIndex: payload.questionIndex,
        scoring: {
          awardedMarks: marking.awardedMarks,
          maxMarks: marking.maxMarks,
          pitchMarksAwarded: marking.pitchMarksAwarded,
          pitchMarksAvailable: marking.pitchMarksAvailable,
          shapeMarksAwarded: marking.shapeMarksAwarded,
          shapeMarksAvailable: marking.shapeMarksAvailable,
          shortComment: marking.shortComment || '',
          firstWrongNote: marking.wrongNotes && marking.wrongNotes[0] ? marking.wrongNotes[0].noteNumber : null,
          firstContourError: marking.firstContourError || '',
          firstIntervalSizeError: marking.firstIntervalSizeError || ''
        }
      });
      hasSubmitted = true;
      saveLocalRoundResult(currentQuestionRunId, evaluation, response.state);
      classroom.setFeedback('Submitted. You can adjust your notes, check again, or reveal the answer.', 'good');
      classroom.renderAttemptFeedback?.(evaluation, {
        submitted: true,
        status: 'Submitted',
        feedback: getClassroomFeedbackText(evaluation, true)
      });
      updateSubmitButton(response.state);
    } catch (error) {
      classroom.setFeedback(error.message || 'Could not submit your answer.', 'bad');
      updateSubmitButton();
    }
  }

  function toggleRevealAnswer() {
    if (!classroom || !hasSubmitted) return;
    const showing = classroom.toggleAnswer ? classroom.toggleAnswer() : false;
    if (els.revealButton) {
      els.revealButton.dataset.showingAnswer = showing ? 'true' : 'false';
      els.revealButton.textContent = showing ? 'Show Question' : 'Reveal Answer';
    }
    if (localCurrentEvaluation) {
      classroom.renderAttemptFeedback?.(localCurrentEvaluation, {
        submitted: true,
        status: showing ? 'Model answer' : 'Submitted',
        feedback: showing
          ? 'Compare the model answer with your submitted notes. Your official score has not changed.'
          : getClassroomFeedbackText(localCurrentEvaluation, true)
      });
    }
  }

  function boot() {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = normaliseRoomCode(params.get('room'));
    const nameFromUrl = String(params.get('name') || '').trim();
    const studentFromUrl = String(params.get('student') || '').trim();
    const lastRoom = normaliseRoomCode(window.localStorage.getItem('ea_mm_classroom_last_room'));

    if (studentFromUrl) {
      studentId = studentFromUrl;
      window.sessionStorage.setItem('ea_mm_classroom_student_tab_id', studentId);
      window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
    }
    if (nameFromUrl) {
      studentName = nameFromUrl;
      window.localStorage.setItem('ea_mm_classroom_student_name', studentName);
      window.localStorage.setItem('ea_classroom_student_name', studentName);
    }

    if (els.codeInput) els.codeInput.value = roomFromUrl || '';
    if (els.nameInput && studentName) els.nameInput.value = studentName;

    if (els.joinForm) els.joinForm.addEventListener('submit', joinRoom);
    if (els.submitButton) els.submitButton.addEventListener('click', submitAnswer);
    if (els.revealButton) els.revealButton.addEventListener('click', toggleRevealAnswer);
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

    // Shared /student/join.html can pass the room/name/student id directly,
    // so Melody Master students do not have to enter their details twice.
    if (roomFromUrl && studentName && !hasJoined) {
      window.setTimeout(() => joinRoom({ preventDefault() {} }), 80);
    }
  }

  boot();
})();
