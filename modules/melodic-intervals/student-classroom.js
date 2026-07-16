(() => {
  const data = window.EchoAuralMelodicIntervals;
  const els = {
    topbarCode: document.getElementById('classroomTopbarCode'),
    sideCode: document.getElementById('classroomSideCode'),
    studentName: document.getElementById('classroomStudentName'),
    connectionStatus: document.getElementById('classroomConnectionStatus'),
    studentLine: document.getElementById('classroomStudentLine'),
    roundText: document.getElementById('roundText'),
    progressInner: document.getElementById('progressInner'),
    scoreText: document.getElementById('scoreText'),
    streakText: document.getElementById('streakText'),
    xpText: document.getElementById('xpText'),
    questionText: document.getElementById('questionText'),
    staveStage: document.getElementById('staveStage'),
    noteHint: document.getElementById('noteHint'),
    answers: document.getElementById('answers'),
    feedback: document.getElementById('feedback'),
    submitButton: document.getElementById('classroomSubmitButton'),
    manualPlayButton: document.getElementById('manualPlayButton'),
    answerCard: document.getElementById('answerCard'),
    roundFeedbackOverlay: document.getElementById('roundFeedbackOverlay'),
    roundFeedbackContent: document.getElementById('roundFeedbackContent'),
    studentAudio: document.getElementById('studentAudio')
  };

  const NOTE_ASSET = '/modules/melody-master/assets/icons/notes/crotchet-sibelius.png';
  const SCORE_ASSET = '/modules/melodic-intervals/assets/blank-treble-bar.png';
  const STAVE_WIDTH = 666;
  const STAVE_HEIGHT = 210;
  const NOTE_START_X = 240;
  const NOTE_TARGET_X = 360;
  const NOTE_LEDGER_WIDTH = 48;

  const params = new URLSearchParams(window.location.search);
  let roomCode = normaliseRoomCode(params.get('room') || window.localStorage.getItem('ea_classroom_last_room'));
  let studentId = String(params.get('student') || window.sessionStorage.getItem('ea_classroom_student_tab_id') || '').trim();
  let studentName = String(params.get('name') || window.localStorage.getItem('ea_classroom_student_name') || '').trim();
  let currentState = null;
  let currentQuestionRunId = null;
  let pollTimer = null;
  let lastPlaybackId = '';
  let selectedAnswer = '';
  let submitted = false;
  let audioTimer = null;
  let audioPlaying = false;

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

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  async function api(path, body = null, method = body ? 'POST' : 'GET') {
    const options = { method, headers: { Accept: 'application/json' } };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(window.EchoAuralClassroom.buildApiUrl(path), options);
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; }
    catch (_error) { throw new Error('The classroom server returned an unreadable response.'); }
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }

  function resolveAudioPath(raw = '') {
    const clean = String(raw || '').trim();
    if (!clean) return '';
    if (/^(https?:)?\/\//i.test(clean) || clean.startsWith('/')) return clean;
    return `/modules/melodic-intervals/${clean.replace(/^\.\//, '')}`;
  }

  function resolveAudioSequence(question = {}) {
    const sequence = Array.isArray(question.audioSequence) && question.audioSequence.length
      ? question.audioSequence
      : [question.audio, question.targetAudio].filter(Boolean);
    return sequence.map(resolveAudioPath).filter(Boolean);
  }

  function resolveStaffAsset(raw = '') {
    const clean = String(raw || '').trim();
    if (!clean) return SCORE_ASSET;
    if (/^(https?:)?\/\//i.test(clean) || clean.startsWith('/')) return clean;
    return `/modules/melodic-intervals/${clean.replace(/^\.\//, '')}`;
  }

  function playAudioFile(url) {
    return new Promise((resolve, reject) => {
      els.studentAudio.pause();
      els.studentAudio.currentTime = 0;
      els.studentAudio.onended = () => resolve();
      els.studentAudio.onerror = () => reject(new Error('The interval audio file could not be loaded.'));
      els.studentAudio.src = url;
      const attempt = els.studentAudio.play();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(reject);
    });
  }

  async function playCurrentSequence(question = currentState?.question) {
    if (!question || audioPlaying) return;
    const urls = resolveAudioSequence(question);
    if (!urls.length) return;
    audioPlaying = true;
    els.manualPlayButton.disabled = true;
    els.manualPlayButton.textContent = 'Playing…';
    try {
      for (let index = 0; index < urls.length; index += 1) {
        await playAudioFile(urls[index]);
        if (index < urls.length - 1) await delay(question.sequenceGapMs || 380);
      }
    } catch (_error) {
      els.feedback.textContent = 'Audio was blocked. Tap Play on this computer again.';
      els.feedback.className = 'bad';
    } finally {
      audioPlaying = false;
      els.manualPlayButton.disabled = !currentState?.question;
      els.manualPlayButton.textContent = 'Play on this computer';
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

  function noteMarkup(note, x, clef) {
    const y = data.getStaffY(note, clef);
    return `
      ${ledgerMarkup(note, x, clef)}
      ${accidentalMarkup(note, x, y)}
      <img class="mi-crotchet-note" src="${NOTE_ASSET}" alt="" aria-hidden="true" draggable="false" data-note-id="${escapeHTML(note.id)}" style="${positionStyle(x, y)}" />
    `;
  }

  function getStaveMarkup(question = {}) {
    const clef = question.clef || 'treble';
    const startNote = getNote(question.startNoteId);
    const targetNote = getNote(question.targetNoteId);

    if (!startNote || !targetNote) return '<p class="muted">No stave data available.</p>';

    return `
      <img class="mi-score-bg" src="${escapeHTML(resolveStaffAsset(question.staffAsset))}" alt="" aria-hidden="true" draggable="false" />
      ${noteMarkup(startNote, NOTE_START_X, clef)}
      ${noteMarkup(targetNote, NOTE_TARGET_X, clef)}
    `;
  }

  function renderEmptyAnswerCard(message = 'Wait for the teacher to start the interval quiz.') {
    els.answerCard.innerHTML = `
      <div class="answerCard-empty">
        <div class="answer-empty-brand" aria-hidden="true"><span class="answer-empty-wave"><span></span><span></span><span></span></span></div>
        <p>${escapeHTML(message)}</p>
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

  function getRoundSummary(state = currentState) {
    const results = state.student?.results || [];
    const possible = results.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const awarded = results.reduce((sum, item) => sum + Number(item.score || 0), 0);
    const percentage = possible ? Math.round((awarded / possible) * 100) : 0;
    return { results, possible, awarded, percentage };
  }

  function showRoundFeedback(state = currentState) {
    const summary = getRoundSummary(state);
    const rows = summary.results.map((item, index) => `
      <div class="mi-diagnostic-row"><span>Q${index + 1}</span><span>${Number(item.score || 0)} / ${Number(item.total || 0)}</span></div>
    `).join('');
    els.roundFeedbackContent.innerHTML = `
      <div class="mi-round-summary">
        <strong>${summary.awarded} / ${summary.possible} (${summary.percentage}%)</strong>
        <p>${summary.percentage >= 80 ? 'Secure interval recognition.' : summary.percentage >= 50 ? 'Good start. Keep linking sound to stave distance.' : 'Focus on the distance between the two notes.'}</p>
        <div class="mi-diagnostic-list">${rows}</div>
      </div>
    `;
    els.roundFeedbackOverlay.hidden = false;
    els.answerCard.innerHTML = `
      <div class="answerCard-empty classroom-status-panel is-submitted">
        <span class="classroom-status-pill">Round feedback</span>
        <div class="mi-round-summary"><strong>${summary.awarded} / ${summary.possible} (${summary.percentage}%)</strong><p>Your personalised interval feedback is shown here.</p></div>
      </div>
    `;
  }

  function hideRoundFeedback() {
    els.roundFeedbackOverlay.hidden = true;
  }

  function setWaiting(message = 'You are in. Wait for your teacher to start the quiz.') {
    hideRoundFeedback();
    els.questionText.textContent = message;
    els.staveStage.innerHTML = '';
    els.noteHint.textContent = 'The notes will appear here.';
    els.answers.innerHTML = '';
    els.feedback.textContent = '';
    els.feedback.className = '';
    els.submitButton.disabled = true;
    els.manualPlayButton.disabled = true;
    renderEmptyAnswerCard('The answer panel will unlock after you submit.');
  }

  function renderAnswerControls(state = currentState) {
    const question = state.question || {};
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const submission = state.student?.submission || null;
    submitted = Boolean(state.student?.submitted);
    if (submitted && submission && !selectedAnswer) selectedAnswer = submission.answer || '';

    els.answers.innerHTML = choices.map((choice) => {
      const isSelected = String(choice) === String(selectedAnswer);
      const isCorrect = submitted && String(choice) === String(submission?.modelAnswer || '');
      const isWrong = submitted && isSelected && !isCorrect;
      const classes = ['mi-answer-button'];
      if (isSelected) classes.push('is-selected');
      if (isCorrect) classes.push('correct');
      if (isWrong) classes.push('wrong');
      return `<button class="${classes.join(' ')}" type="button" data-answer="${escapeHTML(choice)}" ${submitted ? 'disabled' : ''}>${escapeHTML(choice)}</button>`;
    }).join('');

    els.answers.querySelectorAll('.mi-answer-button').forEach((button) => {
      button.addEventListener('click', () => {
        if (submitted) return;
        selectedAnswer = button.dataset.answer || '';
        els.answers.querySelectorAll('.mi-answer-button').forEach((item) => item.classList.remove('is-selected'));
        button.classList.add('is-selected');
        els.submitButton.disabled = false;
        els.feedback.textContent = `Selected: ${selectedAnswer}`;
        els.feedback.className = '';
      });
    });

    if (submitted && submission) {
      els.submitButton.disabled = true;
      els.submitButton.textContent = 'Submitted';
      els.feedback.textContent = submission.feedback || submission.shortComment || 'Submitted.';
      els.feedback.className = submission.correct ? 'good' : 'bad';
      els.answerCard.innerHTML = `
        <div class="answerCard-empty classroom-status-panel ${submission.correct ? 'is-submitted' : ''}">
          <span class="classroom-status-pill">${submission.correct ? 'Correct' : 'Review'}</span>
          <div class="mi-round-summary"><strong>${Number(submission.score || 0)} / ${Number(submission.total || 0)}</strong><p>${escapeHTML(submission.feedback || '')}</p><div class="mi-diagnostic-list"><div class="mi-diagnostic-row"><span>Model answer</span><span>${escapeHTML(submission.modelAnswer || question.intervalLabel || '')}</span></div></div></div>
        </div>
      `;
    } else {
      els.submitButton.disabled = !selectedAnswer;
      els.submitButton.textContent = 'Submit answer';
      if (!selectedAnswer) els.feedback.textContent = 'Choose the interval you can hear.';
      renderEmptyAnswerCard('Choose an interval, then submit when you are ready.');
    }
  }

  function renderQuestion(state = currentState) {
    const question = state.question || {};
    hideRoundFeedback();
    els.questionText.textContent = question.prompt || 'Listen to the two notes and identify the interval.';
    els.staveStage.innerHTML = getStaveMarkup(question);
    els.noteHint.textContent = `${question.startNoteLabel || 'First note'} to ${question.targetNoteLabel || 'second note'}. Listen, then name the interval.`;
    els.manualPlayButton.disabled = false;
    if (currentQuestionRunId !== Number(state.questionRunId || 0)) {
      currentQuestionRunId = Number(state.questionRunId || 0);
      selectedAnswer = '';
      renderAnswerControls(state);
    } else if (state.student?.submitted) {
      renderAnswerControls(state);
    }
    renderStats(state);
  }

  function scheduleStudentAudio(state, isNewPlayback = false) {
    const playback = state.playback || null;
    const playbackId = playback?.id ? String(playback.id) : '';
    if (!playbackId || !isNewPlayback || playbackId === lastPlaybackId) return;
    lastPlaybackId = playbackId;
    if (audioTimer) window.clearTimeout(audioTimer);
    const serverNow = Number(state.serverNow || Date.now());
    const msUntilAudio = Math.max(0, Number(playback.audioStartAt || serverNow) - serverNow);
    audioTimer = window.setTimeout(() => playCurrentSequence(state.question), msUntilAudio);
    els.feedback.textContent = 'Get ready — the interval will play from this computer.';
    els.feedback.className = '';
  }

  async function submitAnswer() {
    if (!currentState || submitted || !selectedAnswer) return;
    els.submitButton.disabled = true;
    els.submitButton.textContent = 'Submitting…';
    try {
      const response = await api('/api/classroom/submit', {
        roomCode,
        studentId,
        answer: selectedAnswer,
        questionId: currentState.question?.id,
        questionIndex: currentState.questionIndex
      });
      submitted = true;
      handleState(response.state);
    } catch (error) {
      els.submitButton.disabled = false;
      els.submitButton.textContent = 'Submit answer';
      els.feedback.textContent = error.message || 'Could not submit your answer.';
      els.feedback.className = 'bad';
    }
  }

  function handleState(state) {
    currentState = state;
    els.topbarCode.textContent = state.roomCode || roomCode;
    els.sideCode.textContent = state.roomCode || roomCode;
    els.studentName.textContent = studentName || 'Student';
    els.connectionStatus.textContent = state.active ? 'Live' : 'Waiting';
    els.studentLine.textContent = `You are connected as ${studentName || 'Student'}.`;

    if (state.dismissed) {
      window.location.href = '/join';
      return;
    }

    if (state.moduleId && state.moduleId !== 'melodic-intervals') {
      if (state.moduleId === 'melody-master') window.location.replace(`/modules/melody-master/student-laptop.html?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(studentName)}&student=${encodeURIComponent(studentId)}`);
      else if (state.moduleId === 'instrument-identifier') window.location.replace(`/modules/instrument-identifier/student-classroom.html?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(studentName)}&student=${encodeURIComponent(studentId)}`);
      else window.location.replace(`/student/student-shell.html?room=${encodeURIComponent(roomCode)}&student=${encodeURIComponent(studentId)}&name=${encodeURIComponent(studentName)}`);
      return;
    }

    renderStats(state);
    if (state.quiz?.ended && !state.dismissed) {
      showRoundFeedback(state);
      return;
    }

    const playbackId = state.playback?.id ? String(state.playback.id) : '';
    if (state.question) {
      const isNewPlayback = playbackId && playbackId !== lastPlaybackId;
      renderQuestion(state);
      scheduleStudentAudio(state, Boolean(isNewPlayback));
      return;
    }

    setWaiting('You are in. Wait for your teacher to start the quiz.');
  }

  async function refreshState() {
    if (!roomCode || !studentId) return;
    try {
      const state = await api(`/api/classroom/state?roomCode=${encodeURIComponent(roomCode)}&studentId=${encodeURIComponent(studentId)}`);
      handleState(state);
    } catch (error) {
      els.connectionStatus.textContent = 'Offline';
      setWaiting(error.message || 'Connection lost. Check the room code.');
    }
  }

  function boot() {
    ensureStudentId();
    if (!roomCode || !studentName) {
      window.location.href = '/join';
      return;
    }
    window.localStorage.setItem('ea_classroom_last_room', roomCode);
    window.localStorage.setItem('ea_classroom_student_name', studentName);
    els.topbarCode.textContent = roomCode;
    els.sideCode.textContent = roomCode;
    els.studentName.textContent = studentName;
    els.submitButton.addEventListener('click', submitAnswer);
    els.manualPlayButton.addEventListener('click', () => playCurrentSequence());
    setWaiting('You are in. Wait for your teacher to start the quiz.');
    pollTimer = window.setInterval(refreshState, 1000);
    refreshState();
  }

  boot();
})();
