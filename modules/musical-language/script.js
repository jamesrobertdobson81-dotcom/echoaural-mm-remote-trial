(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { bank: [], round: [], index: 0, score: 0, available: 0, streak: 0, answered: false };
  const elements = {
    setup: $("#homeScreen"), quiz: $("#gameScreen"), start: $("#startButton"), next: $("#nextButton"), restart: $("#restartButton"),
    toggle: $("#settingsToggle"), settings: $("#advancedSettings"), setupMessage: $("#setupMessage"), roundText: $("#roundText"),
    progress: $("#progressInner"), score: $("#scoreText"), streak: $("#streakText"), xp: $("#xpText"), prompt: $(".he-question-prompt"),
    marks: $("#questionMarks"), kicker: $("#questionKicker"), centre: $("#musicalLanguageCentrePanel"), visual: $("#visualCard"), answers: $("#answers"),
    feedback: $("#feedback"), answerCard: $("#answerCard")
  };

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    const source = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else field += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(field); field = ""; }
      else if (char === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += char;
    }
    if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
    const headers = rows.shift() || [];
    return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function normalise(value) {
    return String(value || "").toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9♩#]+/g, " ").trim().replace(/\s+/g, " ");
  }

  function selected(name) { return $(`input[name="${name}"]:checked`)?.value || ""; }

  function updateStartState() {
    const ready = state.bank.length > 0 && Boolean(selected("languageLevel"));
    elements.start.disabled = !ready;
    if (state.bank.length && !selected("languageLevel")) elements.setupMessage.textContent = "";
    else if (ready) elements.setupMessage.textContent = "";
  }

  function markingImageForTerm(term) {
    const filename = term.toLowerCase().trim().replace(/\s+/g, "-");
    return `assets/markings/${filename}.png`;
  }

  function markingImageFor(question) { return markingImageForTerm(question.term); }

  function optionMarking(option) {
    return state.bank.find((question) => normalise(question.term) === normalise(option));
  }

  const MARKING_CONTENT_HEIGHT = {
    accelerando: 283, accent: 823, acciaccatura: 777, adagio: 276,
    allegretto: 238, allegro: 294, andante: 194, appoggiatura: 770,
    bpm: 432, crescendo: 258, diminuendo: 237, forte: 777,
    fortissimo: 669, largo: 332, legato: 373, "mezzo-forte": 596,
    "mezzo-piano": 406, moderato: 175, mordent: 784, pianissimo: 408,
    piano: 675, prestissimo: 163, presto: 233, rallentando: 350,
    rubato: 220, sforzando: 785, slur: 551, staccato: 784,
    "terraced-dynamics": 465, trill: 798, turn: 784, vivace: 230
  };

  const WRITTEN_TERM_CONTENT_WIDTH = {
    accelerando: 767, adagio: 778, allegretto: 787, allegro: 776,
    andante: 792, largo: 765, moderato: 830, prestissimo: 827,
    presto: 775, rallentando: 744, rubato: 788, vivace: 770
  };

  const ALLEGRO_LETTER_WIDTH = 776 * 40 / 294 / "allegro".length;

  function markingCanvasDimensions(term, marking) {
    const filename = term.toLowerCase().trim().replace(/\s+/g, "-");
    const contentHeight = MARKING_CONTENT_HEIGHT[filename] || 1024;
    const height = 40 * 1024 / contentHeight;
    if (marking.element === "Tempo" && marking.concept_code !== "TEM-BPM") {
      const contentWidth = WRITTEN_TERM_CONTENT_WIDTH[filename] || 1024;
      const width = ALLEGRO_LETTER_WIDTH * term.length * 1024 / contentWidth;
      return { width: `${width.toFixed(2)}px`, height: `${height.toFixed(2)}px` };
    }
    const size = `${height.toFixed(2)}px`;
    return { width: size, height: size };
  }

  function renderVisual(question) {
    const isRecognitionQuestion = question.question_type === "multiple_choice";
    const isScoreQuestion = question.requires_score_context.toLowerCase() === "yes";
    elements.visual.hidden = !(isRecognitionQuestion || isScoreQuestion);
    if (elements.visual.hidden) {
      elements.visual.innerHTML = "";
      return;
    }

    const tempoWordClass = question.element === "Tempo" && question.concept_code !== "TEM-BPM" ? " is-tempo-word" : "";
    const image = `<img class="ml-marking-image${tempoWordClass}" src="${markingImageFor(question)}" alt="${escapeHtml(question.symbol_display || question.term)}" />`;
    if (question.requires_score_context.toLowerCase() === "yes") {
      elements.visual.innerHTML = `<div class="ml-score-context"><div class="ml-staff"><span class="ml-staff-mark ml-staff-image-mark">${image}</span></div><span class="ml-context-caption">${escapeHtml(question.score_context_template || "Score marking")}</span></div>`;
      return;
    }
    elements.visual.innerHTML = image;
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = value || "";
    return span.innerHTML;
  }

  function currentQuestion() { return state.round[state.index]; }

  let markingAudio = null;

  function playQuestionAudio(question) {
    if (markingAudio) { markingAudio.pause(); markingAudio.currentTime = 0; }
    markingAudio = null;
    if (question.audio_required?.toLowerCase() !== "yes" || !question.audio_file) return;
    markingAudio = new Audio(question.audio_file);
    markingAudio.play().catch(() => {});
  }

  function displayedPrompt(question) {
    const isSymbolMultipleChoice = question.question_type === "multiple_choice"
      && (question.element !== "Tempo" || question.concept_code === "TEM-BPM");
    return isSymbolMultipleChoice ? "What does this symbol mean?" : question.prompt;
  }

  function updateStats() {
    elements.roundText.textContent = `Question ${state.index + 1} of ${state.round.length}`;
    elements.progress.style.width = `${((state.index + (state.answered ? 1 : 0)) / state.round.length) * 100}%`;
    elements.score.textContent = `Mark: ${state.score} / ${state.available}`;
    elements.streak.textContent = `Streak: ${state.streak}`;
    elements.xp.textContent = `XP: ${state.score * 10}`;
  }

  function renderQuestion() {
    const question = currentQuestion();
    playQuestionAudio(question);
    state.answered = false;
    elements.next.disabled = true;
    elements.next.textContent = state.index === state.round.length - 1 ? "Finish Round" : "Next Question";
    elements.prompt.textContent = displayedPrompt(question);
    elements.marks.hidden = false;
    elements.marks.textContent = `[${question.marks}]`;
    elements.kicker.textContent = `${question.element.toUpperCase()} · ${question.subskill.toUpperCase()}`;
    elements.feedback.textContent = "";
    renderVisual(question);
    elements.answers.className = "instruments-options he-options ml-options";
    elements.answers.innerHTML = "";

    if (question.question_type.startsWith("multiple_choice")) {
      const options = question.options.split(" | ").filter(Boolean);
      (question.shuffle_options.toLowerCase() === "yes" ? shuffle(options) : options).forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.dataset.answer = option;
        const marking = optionMarking(option);
        if (marking) {
          button.classList.add("has-marking-icon");
          if (marking.element === "Ornamentation") button.classList.add("has-ornament-icon");
          button.setAttribute("aria-label", option);
          const image = document.createElement("img");
          image.className = "ml-answer-marking-image";
          image.src = markingImageForTerm(marking.term);
          image.alt = "";
          const dimensions = markingCanvasDimensions(marking.term, marking);
          image.style.setProperty("--marking-canvas-width", dimensions.width);
          image.style.setProperty("--marking-canvas-height", dimensions.height);
          button.append(image);
        } else {
          button.textContent = option;
        }
        button.addEventListener("click", () => submitAnswer(option));
        elements.answers.append(button);
      });
    } else {
      elements.answers.className = "ml-typed-wrap";
      elements.answers.innerHTML = '<input class="ml-typed-input" id="typedAnswer" type="text" autocomplete="off" spellcheck="false" aria-label="Type your answer" placeholder="Type your answer and press Enter" />';
      const input = $("#typedAnswer");
      input.addEventListener("keydown", (event) => { if (event.key === "Enter" && input.value.trim()) submitAnswer(input.value); });
      requestAnimationFrame(() => input.focus());
    }
    updateStats();
  }

  function markTyped(question, response) {
    const answer = normalise(response);
    const accepted = question.accepted_answers.split(" | ").map(normalise).filter(Boolean);
    const correct = normalise(question.correct_answer);
    if (Number(question.marks) === 1) return accepted.includes(answer) || answer === correct ? 1 : 0;
    const hasTerm = accepted.some((term) => answer.includes(term));
    const meaningWords = normalise(question.meaning).split(" ").filter((word) => word.length > 2);
    const hasMeaning = meaningWords.length > 0 && meaningWords.filter((word) => answer.includes(word)).length >= Math.max(1, Math.ceil(meaningWords.length * .6));
    return Number(hasTerm) + Number(hasMeaning);
  }

  function submitAnswer(response) {
    if (state.answered) return;
    const question = currentQuestion();
    const awarded = question.question_type.startsWith("multiple_choice")
      ? Number(normalise(response) === normalise(question.correct_answer)) * Number(question.marks)
      : markTyped(question, response);
    state.answered = true;
    state.score += awarded;
    state.available += Number(question.marks);
    state.streak = awarded === Number(question.marks) ? state.streak + 1 : 0;
    elements.next.disabled = false;
    elements.answers.querySelectorAll("button, input").forEach((control) => { control.disabled = true; });
    elements.answers.querySelectorAll("button").forEach((button) => {
      if (normalise(button.dataset.answer) === normalise(question.correct_answer)) button.classList.add("correct");
      else if (normalise(button.dataset.answer) === normalise(response)) button.classList.add("incorrect");
    });
    elements.feedback.textContent = awarded === Number(question.marks) ? "Correct" : `${awarded} of ${question.marks} marks`;
    renderFeedback(question, response, awarded);
    updateStats();
    elements.next.focus();
  }

  function renderFeedback(question, response, awarded) {
    const title = awarded === Number(question.marks) ? "Correct" : awarded ? "Partly correct" : "Not quite";
    elements.answerCard.innerHTML = `<div class="ml-feedback-card"><p class="ml-feedback-status">${title} · ${awarded}/${question.marks}</p><h2>${escapeHtml(question.term.charAt(0).toUpperCase() + question.term.slice(1))}</h2><div class="ml-feedback-row"><span>Your answer</span><strong>${escapeHtml(response)}</strong></div><div class="ml-feedback-row"><span>Correct answer</span><strong>${escapeHtml(question.correct_answer)}</strong></div><div class="ml-feedback-row"><span>Why?</span><p>${escapeHtml(question.feedback || question.meaning)}</p></div></div>`;
  }

  function startRound() {
    const level = selected("languageLevel");
    const focus = selected("elementFocus") || "Mixed";
    const count = Number(selected("questionCount") || 5);
    let pool = state.bank.filter((question) => question.status === "active" && question.level === level);
    if (focus !== "Mixed") pool = pool.filter((question) => question.element === focus);
    if (!pool.length) { elements.setupMessage.textContent = "No active questions are available for those settings."; return; }
    state.round = shuffle(pool).slice(0, Math.min(count, pool.length));
    state.index = 0; state.score = 0; state.available = 0; state.streak = 0;
    elements.quiz.classList.remove("is-ready");
    elements.setup.classList.add("is-settings-locked");
    elements.centre.hidden = false;
    closeSettings();
    renderQuestion();
  }

  function finishRound() {
    elements.roundText.textContent = "Round complete";
    elements.prompt.textContent = `You scored ${state.score} out of ${state.round.reduce((sum, question) => sum + Number(question.marks), 0)}.`;
    elements.marks.hidden = true;
    elements.visual.innerHTML = '<span class="ml-visual-symbol">✓</span>';
    elements.answers.innerHTML = "";
    elements.next.disabled = true;
    elements.restart.style.display = "inline-flex";
  }

  function resetRound() {
    elements.quiz.classList.add("is-ready");
    elements.setup.classList.remove("is-settings-locked");
    elements.centre.hidden = true;
    elements.restart.style.display = "none";
    elements.answerCard.innerHTML = '<div class="answerCard-empty he-source-panel"><div class="answer-empty-stage" aria-hidden="true"><div class="answer-empty-orbit"><span class="answer-empty-sparkle answer-empty-sparkle-1"></span><span class="answer-empty-sparkle answer-empty-sparkle-2"></span><span class="answer-empty-sparkle answer-empty-sparkle-3"></span><span class="answer-empty-sparkle answer-empty-sparkle-4"></span><span class="answer-empty-icon"><img src="../../assets/icons/modes/mm-transparent/answers-transparent.png?v=3" alt="" onerror="this.style.display=\'none\'; this.parentElement.classList.add(\'missing-answer-icon\');" /></span></div></div><div class="answer-empty-copy"><h2>Your answers will appear here</h2><p>Complete a quiz to see your responses and performance feedback.</p></div></div>';
    elements.roundText.textContent = "Ready";
    elements.progress.style.width = "0%";
    updateStartState();
  }

  function closeSettings() {
    elements.settings.style.display = "none";
    elements.settings.setAttribute("aria-hidden", "true");
    elements.toggle.setAttribute("aria-expanded", "false");
  }

  elements.toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = elements.toggle.getAttribute("aria-expanded") !== "true";
    elements.settings.style.display = open ? "block" : "none";
    elements.settings.setAttribute("aria-hidden", String(!open));
    elements.toggle.setAttribute("aria-expanded", String(open));
  });
  elements.settings.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", closeSettings);
  $$('input[name="languageLevel"]').forEach((input) => input.addEventListener("change", updateStartState));
  elements.start.addEventListener("click", startRound);
  elements.next.addEventListener("click", () => { if (!state.answered) return; if (state.index >= state.round.length - 1) finishRound(); else { state.index += 1; renderQuestion(); } });
  elements.restart.addEventListener("click", resetRound);
  elements.restart.style.display = "none";

  fetch("data/EA_Musical_Language_v1.csv")
    .then((response) => { if (!response.ok) throw new Error(`Question data returned ${response.status}`); return response.text(); })
    .then((text) => { state.bank = parseCsv(text); elements.setupMessage.textContent = ""; updateStartState(); })
    .catch((error) => { elements.setupMessage.textContent = "The question bank could not be loaded."; console.error(error); });
})();
