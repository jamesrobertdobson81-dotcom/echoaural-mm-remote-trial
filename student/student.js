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

  const SILENT_AUDIO_DATA_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

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

  function ensureStudentId() {
    if (!studentId) studentId = `student-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem('ea_classroom_student_tab_id', studentId);
    return studentId;
  }

  function setAudioStatus(message = '', state = '') {
    els.audioStatus.textContent = message;
    els.audioStatus.className = `status-message ${state ? `is-${state}` : ''}`.trim();
  }

  async function api(path, body = null, method = body ? 'POST' : 'GET') {
    const options = { method, headers: { Accept: 'application/json' } };
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

  function resolveAudioPath(question = {}) {
    const raw = String(question.audio || '').trim();
    if (!raw) return '';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('/')) return raw;
    const moduleId = question.moduleId || currentState?.moduleId || '';
    if (moduleId === 'instrument-identifier') return `/modules/instrument-identifier/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'texture-trainer') return `/modules/texture-trainer/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'melody-master') return `/modules/melody-master/${raw.replace(/^\.\//, '')}`;
    if (moduleId === 'melodic-intervals') return `/modules/melodic-intervals/${raw.replace(/^\.\//, '')}`;
    return raw;
  }

  function setWaiting(message = '') {
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

    const playNow = () => {
      const attempt = els.studentAudio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          studentAudioUnlocked = false;
          els.enableAudioButton.disabled = false;
          els.enableAudioButton.textContent = 'Enable audio for remote play';
          setAudioStatus('Your browser blocked the excerpt. Click Enable Audio, then ask the teacher to play again.', 'bad');
        });
      }
    };

    setAudioStatus(studentAudioUnlocked
      ? 'Get ready — the excerpt will play from this computer.'
      : 'Click Enable Audio if you do not hear the excerpt.', studentAudioUnlocked ? 'good' : '');

    studentAudioTimer = window.setTimeout(playNow, msUntilAudio);
  }

  function renderAnswerControls(question = {}) {
    submitted = Boolean(currentState?.student?.submitted);
    selectedAnswer = '';
    els.feedbackPanel.classList.add('hidden');
    els.feedbackPanel.innerHTML = '';
    els.submitButton.disabled = submitted;
    els.submitButton.textContent = submitted ? 'Submitted' : 'Submit answer';

    if (submitted && currentState?.student?.submission) {
      renderSubmissionFeedback(currentState.student.submission);
      els.submitButton.disabled = true;
    }

    if (question.answerType === 'choice') {
      const choices = Array.isArray(question.choices) ? question.choices : [];
      els.answerArea.innerHTML = `
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
    showQuestionPanel();
    els.roomPill.textContent = `Room ${state.roomCode || roomCode}`;
    els.moduleEyebrow.textContent = String(state.moduleTitle || 'EchoAural').toUpperCase();
    els.questionModuleEyebrow.textContent = String(state.moduleTitle || 'EchoAural').toUpperCase();
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

  function handleState(state) {
    currentState = state;
    if (state.dismissed) {
      window.location.href = '/join';
      return;
    }
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
      const state = await api(`/api/classroom/state?roomCode=${encodeURIComponent(roomCode)}&studentId=${encodeURIComponent(studentId)}`);
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
    els.manualPlayButton.addEventListener('click', () => {
      const attempt = els.studentAudio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => setAudioStatus('Audio was blocked. Click Enable Audio first.', 'bad'));
    });
    els.submitButton.addEventListener('click', submitAnswer);
    setWaiting('You are in. Wait for your teacher to start the question.');
    startPolling();
  }

  boot();
})();
