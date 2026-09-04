(function homeworkPlayer() {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const assignmentId = String(params.get('assignmentId') || '').trim();

  const els = {
    main: document.getElementById('hwMain'),
    title: document.getElementById('hwTitle'),
    progressFill: document.getElementById('hwProgressFill'),
    progressLabel: document.getElementById('hwProgressLabel'),
    frame: document.getElementById('hwFrame'),
    overlay: document.getElementById('hwOverlay'),
    overlayText: document.getElementById('hwOverlayText'),
    exitLink: document.getElementById('hwExitLink'),
    completeCard: document.getElementById('hwCompleteCard'),
    completeScore: document.getElementById('hwCompleteScore'),
    completeSummary: document.getElementById('hwCompleteSummary'),
    errorCard: document.getElementById('hwErrorCard'),
    errorText: document.getElementById('hwErrorText')
  };

  let assignment = null;
  let position = 0;
  let results = [];
  let slotId = '';
  let currentSource = null;
  let appReady = false;
  let questionAccepted = false;
  let loadTimer = null;

  async function api(path, body) {
    const response = await fetch(path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  function showError(message) {
    els.main.classList.add('is-errored');
    els.errorText.textContent = message || 'This homework could not be loaded.';
    els.errorCard.classList.add('is-active');
  }

  function showOverlay(text) {
    els.overlayText.textContent = text || 'Loading your next question…';
    els.overlay.hidden = false;
  }

  function hideOverlay() {
    els.overlay.hidden = true;
  }

  function setProgress(index) {
    const total = assignment.questions.length;
    els.progressFill.style.width = `${Math.round((index / total) * 100)}%`;
    els.progressLabel.textContent = `Question ${index + 1} of ${total}`;
  }

  // Same lookup Live Session's own iframe host uses (student/student.js) —
  // resolves a stored {moduleId, sourceKey} pair back to a real PM_REGISTRY
  // entry (appUrl, sourceKey) to embed.
  function getRegistrySource(moduleId, sourceKey) {
    const registry = window.EchoAuralPMRegistry;
    if (!registry || !moduleId) return null;
    if (sourceKey) {
      const exact = registry.get(sourceKey);
      if (exact && exact.moduleId === moduleId) return exact;
    }
    const matches = registry.byModule(moduleId);
    return matches && matches[0] ? matches[0] : null;
  }

  // pm-registry appUrl values are relative to modules/progress-mode/ by
  // convention (see that folder's own script.js) — anchoring against the
  // same base here regardless of where this page itself lives.
  function resolveAppUrl(source) {
    return new URL(source.appUrl, `${window.location.origin}/modules/progress-mode/`).pathname;
  }

  // Mirrors student/student.js's sendLiveLoadQuestion() — the same
  // teacher-load-question contract command, just with no room/round id
  // (this is a self-paced homework round, not a Live Session).
  function sendLoadQuestion(question) {
    const frameWindow = els.frame.contentWindow;
    if (!frameWindow || !currentSource) return;
    frameWindow.postMessage({
      namespace: 'echoaural-progress',
      version: 1,
      contractVersion: 2,
      type: 'teacher-load-question',
      slotId,
      sourceKey: currentSource.sourceKey,
      roomId: '',
      roundId: '',
      questionId: question.questionId,
      payload: {
        questionId: question.questionId,
        sourceKey: currentSource.sourceKey,
        // Only used by the procedurally-generated sources (chord-identifier,
        // key-signature-sprint, ContextCoach) to rebuild the exact planned
        // question — see GET /api/student/homework/:id's own comment.
        seed: question.seed || ''
      }
    }, window.location.origin);
  }

  function loadQuestion(index) {
    const question = assignment.questions[index];
    currentSource = getRegistrySource(question.moduleId, question.sourceKey);
    if (!currentSource) {
      showError('One of the apps in this homework is not available right now. Ask your teacher to check.');
      return;
    }
    appReady = false;
    questionAccepted = false;
    slotId = `homework:${assignmentId}:${index}:${Date.now()}`;
    setProgress(index);
    showOverlay('Loading your next question…');

    const appUrl = resolveAppUrl(currentSource);
    const query = new URLSearchParams({
      eaProgressHost: '1',
      eaProgressSlot: slotId,
      eaProgressSource: currentSource.sourceKey
    });
    els.frame.src = `${appUrl}?${query.toString()}`;

    if (loadTimer) window.clearTimeout(loadTimer);
    // Some PM apps finish booting without ever emitting app-ready — same
    // fallback window student/student.js's own live-iframe host uses, so a
    // valid question never stays stuck behind the loading overlay.
    loadTimer = window.setTimeout(() => {
      if (!appReady) {
        appReady = true;
        sendLoadQuestion(question);
      }
    }, 1200);
  }

  function recordAnswer(payload) {
    const question = assignment.questions[position];
    results.push({
      moduleId: question.moduleId,
      questionId: question.questionId,
      score: Number(payload.score || 0),
      maximumScore: Number(payload.maximumScore || 1),
      feedback: String(payload.feedback || ''),
      answerData: buildAnswerData(question.moduleId, payload)
    });
  }

  // Pulls the same concept-tagging fields each module's own answerComplete()
  // call already reports (metreFamily/mode/... for meter-master,
  // textureFocus/... for texture-trainer, category/correctAnswer/... for
  // melody-master — see each module's script.js) straight through into the
  // attempt's answer_data, so the teacher/student dashboards' existing
  // concept-level feedback works for homework exactly as it does for PM.
  function buildAnswerData(moduleId, payload) {
    const base = {
      responseType: payload.responseType || '',
      modelAnswer: payload.modelAnswer,
      studentAnswer: payload.answerData
    };
    if (moduleId === 'meter-master') {
      return {
        ...base,
        metreFamily: payload.metreFamily,
        mode: payload.mode,
        requiresScore: payload.requiresScore,
        timeSignature: payload.timeSignature
      };
    }
    if (moduleId === 'texture-trainer') {
      return {
        ...base,
        textureFocus: payload.textureFocus,
        specificTextureTerm: payload.specificTextureTerm,
        target: payload.target
      };
    }
    if (moduleId === 'melody-master') {
      return {
        ...base,
        category: payload.category,
        difficulty: payload.difficulty,
        correctAnswer: payload.correctAnswer,
        aosCode: payload.aosCode
      };
    }
    return base;
  }

  function advance() {
    position += 1;
    if (position >= assignment.questions.length) {
      finish();
      return;
    }
    loadQuestion(position);
  }

  function handleFrameMessage(event) {
    if (event.origin !== window.location.origin || event.source !== els.frame.contentWindow) return;
    const message = event.data || {};
    if (message.namespace !== 'echoaural-progress' || message.version !== 1 || message.slotId !== slotId) return;

    if (message.type === 'app-ready') {
      if (appReady) return;
      appReady = true;
      sendLoadQuestion(assignment.questions[position]);
      return;
    }
    if (message.type === 'question-ready') {
      hideOverlay();
      return;
    }
    if (message.type === 'pool-empty') {
      showOverlay('This question is not available right now — moving on.');
      window.setTimeout(advance, 1200);
      return;
    }
    if (message.type === 'answer-complete' && !questionAccepted) {
      questionAccepted = true;
      recordAnswer(message.payload || {});
      showOverlay('Saving your answer…');
      window.setTimeout(advance, 700);
    }
  }

  async function finish() {
    els.main.classList.add('is-finished');
    try {
      const response = await api(`/api/student/homework/${assignmentId}/complete`, { questions: results });
      const score = results.reduce((sum, question) => sum + question.score, 0);
      const maximumScore = results.reduce((sum, question) => sum + question.maximumScore, 0);
      const percentage = maximumScore > 0 ? Math.round((score / maximumScore) * 100) : 0;
      els.progressFill.style.width = '100%';
      els.progressLabel.textContent = 'Complete';
      els.completeScore.textContent = `${percentage}%`;
      els.completeSummary.textContent = `${score} out of ${maximumScore} marks — ${results.length} question${results.length === 1 ? '' : 's'} completed.`;
      els.completeCard.classList.add('is-active');
      void response;
    } catch (error) {
      els.main.classList.remove('is-finished');
      showError(error.message);
    }
  }

  async function boot() {
    if (!assignmentId) {
      showError('No homework assignment was specified.');
      return;
    }
    try {
      const response = await api(`/api/student/homework/${assignmentId}`);
      assignment = response.assignment;
      if (!assignment.questions || !assignment.questions.length) {
        showError('This homework does not have any questions yet.');
        return;
      }
      els.title.textContent = assignment.title || 'Homework';
      document.title = `${assignment.title || 'Homework'} | EchoAural`;
      window.addEventListener('message', handleFrameMessage);
      loadQuestion(0);
    } catch (error) {
      showError(error.message);
    }
  }

  els.exitLink.addEventListener('click', (event) => {
    if (!results.length && position === 0) return;
    if (!window.confirm('Leave this homework? Your progress on this round will not be saved.')) {
      event.preventDefault();
    }
  });

  boot();
})();
