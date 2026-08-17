(function initCadenceCoach() {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const questions = window.EchoAuralCadenceQuestions;
  const requestedQuestion = params.get("question");
  const els = {
    start: document.getElementById("startButton"),
    replay: document.getElementById("replayButton"),
    panel: document.getElementById("gameScreen"),
    playState: document.getElementById("cadencePlayState"),
    scoreSplice: document.getElementById("cadenceScoreSplice"),
    scoreOpening: document.getElementById("cadenceScoreOpening"),
    scoreBars: document.getElementById("cadenceScoreBars"),
    answers: document.getElementById("cadenceAnswers"),
    typedForm: document.getElementById("cadenceTypedForm"),
    typedInput: document.getElementById("cadenceTypedInput"),
    audio: document.getElementById("cadenceAudio"),
    feedback: document.getElementById("feedback"),
    answerCard: document.getElementById("answerCard"),
    scoreText: document.getElementById("scoreText"),
    streakText: document.getElementById("streakText"),
    xpText: document.getElementById("xpText"),
    roundText: document.getElementById("roundText"),
    progress: document.getElementById("progressInner")
  };

  let answered = false;
  let deck = [];
  let question = null;
  let questionIndex = 0;
  let correctCount = 0;
  let streak = 0;
  let xp = 0;
  // True once a Live Session host has loaded its first question through the
  // contract (see loadQuestionById below) — distinguishes "boot the round"
  // from "load another question into an already-running round."
  let contractSessionStarted = false;

  function shuffled(items) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function buildDeck() {
    const requested = questions.find((item) => item.id === requestedQuestion);
    if (!requested) return shuffled(questions);
    return [requested, ...shuffled(questions.filter((item) => item !== requested))];
  }

  function normalise(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+cadence$/, "");
  }

  function selectedLevel() {
    return params.get("level") || "foundation";
  }

  function useTypedAnswer() {
    const mode = params.get("answers") || "adaptive";
    return mode === "typed" || (mode === "adaptive" && selectedLevel() === "exam");
  }

  function setSelectedLevel() {
    const input = document.querySelector(`input[name="harmonyLevel"][value="${selectedLevel()}"]`)
      || document.querySelector('input[name="harmonyLevel"][value="foundation"]');
    if (input) input.checked = true;
  }

  function playExcerpt() {
    els.audio.pause();
    const beginPlayback = () => {
      els.audio.currentTime = question.audioStart;
      const playPromise = els.audio.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
    };
    if (els.audio.readyState >= 1) beginPlayback();
    else els.audio.addEventListener("loadedmetadata", beginPlayback, { once: true });
  }

  function renderAnswers() {
    const typed = useTypedAnswer();
    els.answers.hidden = typed;
    els.typedForm.hidden = !typed;
    els.answers.innerHTML = "";

    if (typed) {
      els.typedInput.value = "";
      window.setTimeout(() => els.typedInput.focus(), 0);
      return;
    }

    question.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-button";
      button.textContent = choice;
      button.addEventListener("click", () => submitAnswer(choice, button));
      els.answers.appendChild(button);
    });
  }

  function showQuestion() {
    question = deck[questionIndex];
    answered = false;
    window.EAProgressEmbed?.questionReady({ id: question.id });
    els.panel.classList.remove("is-ready", "is-complete");
    els.panel.classList.add("is-active");
    els.playState.hidden = false;
    els.replay.textContent = "Replay Excerpt";
    els.replay.disabled = false;
    els.scoreOpening.src = question.score;
    els.scoreBars.src = question.score;
    els.scoreSplice.classList.toggle("is-contained-score", question.scoreDisplay === "contained");
    els.audio.src = question.audio;
    els.feedback.textContent = "";
    els.feedback.className = "";
    els.roundText.textContent = `Question ${questionIndex + 1} of ${deck.length}`;
    els.progress.style.width = `${questionIndex / deck.length * 100}%`;
    els.typedInput.disabled = false;
    renderAnswers();
    window.setTimeout(playExcerpt, 180);
  }

  function startRound(options = {}) {
    deck = buildDeck();
    // Live Session host handed us a specific question via the contract
    // (see loadQuestionById below) — pin it to the front so the existing
    // showQuestion()/nextQuestion() flow picks it up completely unchanged.
    if (options.forcedQuestion) {
      deck = deck.filter((item) => item !== options.forcedQuestion);
      deck.unshift(options.forcedQuestion);
    }
    questionIndex = 0;
    correctCount = 0;
    streak = 0;
    xp = 0;
    els.scoreText.textContent = "Mark: 0 / 0";
    els.streakText.textContent = "Streak: 0";
    els.xpText.textContent = "XP: 0";
    showQuestion();
  }

  // Live Sessions entry point: a teacher (via the classroom server) has
  // picked an exact question and the host wants this exact question
  // rendered, not whatever buildDeck() would have drawn next. Reuses
  // startRound()/showQuestion() completely unchanged (see the
  // forcedQuestion handling above), so this app's real UI, audio and
  // scoring are exactly what a student sees in normal practice, just
  // pointed at a specific question instead of a random deck draw.
  function loadQuestionById(rawId) {
    const id = String(rawId || "").trim();
    if (!id) return false;
    const target = questions.find((item) => item.id === id);
    if (!target) {
      window.EAProgressEmbed?.poolEmpty({ reason: "unknown-question-id", questionId: id });
      return false;
    }

    if (!contractSessionStarted) {
      contractSessionStarted = true;
      startRound({ forcedQuestion: target });
    } else {
      deck = deck.filter((item) => item !== target);
      deck.unshift(target);
      questionIndex = 0;
      showQuestion();
    }
    return true;
  }

  window.EAProgressEmbed?.registerQuestionHandler((payload) => {
    loadQuestionById(payload && (payload.questionId || payload.id));
  });

  function nextQuestion() {
    questionIndex += 1;
    if (questionIndex >= deck.length) {
      deck = shuffled(questions);
      questionIndex = 0;
      correctCount = 0;
      streak = 0;
      xp = 0;
      els.scoreText.textContent = "Mark: 0 / 0";
      els.streakText.textContent = "Streak: 0";
      els.xpText.textContent = "XP: 0";
    }
    showQuestion();
  }

  function handleReplayOrNext() {
    if (answered) nextQuestion();
    else playExcerpt();
  }

  function submitAnswer(value, selectedButton) {
    if (answered || !normalise(value)) return;
    answered = true;
    els.audio.pause();
    const correct = normalise(value) === normalise(question.answer);
    if (correct) {
      correctCount += 1;
      streak += 1;
      xp += 10;
    } else {
      streak = 0;
    }

    els.answers.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      if (normalise(button.textContent) === normalise(question.answer)) button.classList.add("correct");
    });
    if (selectedButton && !correct) selectedButton.classList.add("incorrect");
    els.typedInput.disabled = true;

    els.scoreText.textContent = `Mark: ${correctCount} / ${questionIndex + 1}`;
    els.streakText.textContent = `Streak: ${streak}`;
    els.xpText.textContent = `XP: ${xp}`;
    els.progress.style.width = `${(questionIndex + 1) / deck.length * 100}%`;
    els.feedback.textContent = correct ? "Correct" : `Not quite — the answer is ${question.answer}.`;
    els.feedback.className = correct ? "good" : "bad";
    const cadenceArticle = /^[aeiou]/i.test(question.answer) ? "an" : "a";
    els.answerCard.innerHTML = `<div class="cadence-feedback-card"><p class="${correct ? "good" : "bad"}">${correct ? "Correct" : "Not quite"}</p><div class="cadence-feedback-answer">${question.answer} cadence</div><p>The final harmony forms ${cadenceArticle} ${question.answer.toLowerCase()} cadence in ${question.key}.</p></div>`;
    els.replay.textContent = "Next Question";
    window.EAProgressEmbed?.answerComplete({
      questionId: question.id,
      score: correct ? 1 : 0,
      maximumScore: 1,
      correct,
      responseType: useTypedAnswer() ? "typed" : "multiple-choice",
      answerData: value,
      modelAnswer: question.answer,
      feedback: els.feedback.textContent,
      // Captured for concept-level feedback (shared/js/concept-extractors.js).
      cadenceType: question.answer,
      keyMode: question.mode
    });
    els.replay.focus();
  }

  els.start.addEventListener("click", startRound);
  els.replay.addEventListener("click", handleReplayOrNext);
  els.audio.addEventListener("timeupdate", () => {
    if (question && Number.isFinite(question.audioEnd) && els.audio.currentTime >= question.audioEnd) {
      els.audio.pause();
      els.audio.currentTime = question.audioEnd;
    }
  });
  els.typedForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer(els.typedInput.value);
  });
  els.typedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAnswer(els.typedInput.value);
    }
  });

  setSelectedLevel();
  if (params.get("autostart") === "1") window.setTimeout(startRound, 0);
})();
