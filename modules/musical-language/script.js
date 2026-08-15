(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { bank: [], round: [], index: 0, score: 0, available: 0, streak: 0, answered: false };
  let pendingHostedQuestion = null;
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

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i += 1) {
      const curr = [i];
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      prev = curr;
    }
    return prev[n];
  }

  // Very short answers (abbreviations like "mp", "pp", "tr") get no typo
  // tolerance — a 1-character edit there usually spells a genuinely
  // different, wrong marking (mp -> mf), not a typo of the same one.
  function typoTolerance(length) {
    if (length <= 3) return 0;
    if (length <= 7) return 1;
    return 2;
  }

  function compact(value) {
    return value.replace(/\s+/g, "");
  }

  // Written-answer marking is tolerant of missing/extra spaces ("mezzo
  // piano" vs "mezzopiano" vs "Mezzo Piano") — always safe, no guard needed.
  // Both inputs are expected already run through normalise().
  function spacingMatches(response, target) {
    if (!response || !target) return false;
    return response === target || compact(response) === compact(target);
  }

  // Small-typo tolerance, scaled to the target answer's own length so short
  // abbreviations still require an exact match. Deliberately does NOT
  // encode any "is this actually the same concept" knowledge — that guard
  // lives in markTyped, which has the question bank in scope.
  function typoDistanceMatches(response, target) {
    if (!response || !target) return false;
    const responseCompact = compact(response);
    const targetCompact = compact(target);
    return levenshtein(responseCompact, targetCompact) <= typoTolerance(targetCompact.length);
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
    window.EAProgressEmbed?.questionReady({ id: question.question_id, level: question.level });
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
        // "Name this symbol" questions (force_text_options=Yes) show one symbol as
        // the prompt visual and ask the student to recall its name — rendering the
        // answer choices as OTHER symbol icons would let them match pictures
        // instead of recalling the word, defeating the point of the question.
        // Every other multiple_choice/multiple_choice_reverse row keeps the
        // existing icon-matching behaviour untouched.
        const forceText = String(question.force_text_options || "").toLowerCase() === "yes";
        const marking = forceText ? null : optionMarking(option);
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
    // accepted_answers uses a bare "|" delimiter in the data (unlike
    // options, which uses " | ") — splitting on " | " here silently treated
    // every row's whole alternate-answer list as one unmatchable string.
    const accepted = question.accepted_answers.split("|").map(normalise).filter(Boolean);
    const correct = normalise(question.correct_answer);
    if (Number(question.marks) === 1) {
      const candidates = [correct, ...accepted];
      if (candidates.some((candidate) => spacingMatches(answer, candidate))) return 1;

      // Typo-tolerant pass only, guarded: if what was typed is itself a
      // real, DIFFERENT recognised term elsewhere in the bank, treat it as
      // that term rather than a typo of this one. Needed because some
      // legitimate antonym pairs (crescendo/decrescendo, accelerando/
      // rallentando) sit within ordinary typo edit-distance of each other
      // via a short prefix, and conflating them would mark an opposite
      // answer as correct rather than forgive a misspelling.
      const answerIsADifferentRealTerm = state.bank.some((entry) =>
        normalise(entry.term) === answer && normalise(entry.term) !== normalise(question.term)
      );
      if (answerIsADifferentRealTerm) return 0;

      return candidates.some((candidate) => typoDistanceMatches(answer, candidate)) ? 1 : 0;
    }
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
    renderFeedback(question, response, awarded);
    updateStats();
    window.EAProgressEmbed?.answerComplete({
      questionId: question.question_id,
      score: awarded,
      maximumScore: Number(question.marks),
      correct: awarded >= Number(question.marks),
      responseType: question.question_type.startsWith("multiple_choice") ? "multiple-choice" : "typed",
      answerData: response,
      modelAnswer: question.correct_answer,
      feedback: question.feedback || question.meaning || ""
    });
    elements.next.focus();
  }

  function renderFeedback(question, response, awarded) {
    const title = awarded === Number(question.marks) ? "Correct" : awarded ? "Partly correct" : "Not quite";
    elements.answerCard.innerHTML = `<div class="ml-feedback-card"><p class="ml-feedback-status">${title} · ${awarded}/${question.marks}</p><h2>${escapeHtml(question.term.charAt(0).toUpperCase() + question.term.slice(1))}</h2><div class="ml-feedback-row"><span>Your answer</span><strong>${escapeHtml(response)}</strong></div><div class="ml-feedback-row"><span>Correct answer</span><strong>${escapeHtml(question.correct_answer)}</strong></div><div class="ml-feedback-row"><span>Why?</span><p>${escapeHtml(question.feedback || question.meaning)}</p></div></div>`;
  }

  function startRound(options = {}) {
    const level = selected("languageLevel");
    const focus = selected("elementFocus") || "Mixed";
    const count = Number(selected("questionCount") || 5);
    let pool = state.bank.filter((question) => question.status === "active" && question.level === level);
    if (focus !== "Mixed") pool = pool.filter((question) => question.element === focus);
    // A Live Session host's forced question always wins even if it doesn't
    // match the currently-selected level/focus radios (or if the pool is
    // otherwise empty) — those radios aren't necessarily driven by the host
    // yet, and the whole point of loadQuestionById is "render this exact
    // question regardless."
    if (!pool.length && !options.forcedQuestion) {
      elements.setupMessage.textContent = "No active questions are available for those settings.";
      return;
    }
    state.round = shuffle(pool).slice(0, Math.min(count, pool.length));
    if (options.forcedQuestion) {
      state.round = state.round.filter((question) => question !== options.forcedQuestion);
      state.round.unshift(options.forcedQuestion);
    }
    state.index = 0; state.score = 0; state.available = 0; state.streak = 0;
    elements.quiz.classList.remove("is-ready");
    elements.setup.classList.add("is-settings-locked");
    elements.centre.hidden = false;
    closeSettings();
    renderQuestion();
  }

  // True once a Live Session host has loaded its first question through the
  // contract (see loadQuestionById below) — distinguishes "boot the round"
  // from "load another question into an already-running round."
  let contractSessionStarted = false;

  // Live Sessions entry point: a teacher (via the classroom server) has
  // picked an exact question — from any of ScoreDecoder's 4 PM sources
  // (tempo/dynamics/articulation/ornamentation), all served by this one
  // script.js and one CSV bank — and wants this exact question rendered.
  // Reuses startRound()/renderQuestion() completely unchanged (see the
  // forcedQuestion handling above), so this app's real UI, audio and
  // scoring are exactly what a student sees in normal practice, just
  // pointed at a specific question instead of a random round draw.
  // Looks up question_id against the FULL bank (state.bank), not whatever
  // level/focus happens to be selected, since a host-picked question isn't
  // necessarily one the current radio selection would have produced.
  function loadQuestionById(rawId) {
    const id = String(rawId || "").trim();
    if (!id) return false;
    const target = state.bank.find((question) => question.question_id === id);
    if (!target) {
      window.EAProgressEmbed?.poolEmpty({ reason: "unknown-question-id", questionId: id });
      return false;
    }

    if (!contractSessionStarted) {
      contractSessionStarted = true;
      startRound({ forcedQuestion: target });
    } else {
      state.round = state.round.filter((question) => question !== target);
      state.round.unshift(target);
      state.index = 0;
      renderQuestion();
    }
    return true;
  }

  window.EAProgressEmbed?.registerQuestionHandler((payload) => {
    // ScoreDecoder loads its CSV asynchronously. Queue an immediate host
    // request instead of reporting pool-empty before the bank is available.
    if (!state.bank.length) {
      pendingHostedQuestion = payload || {};
      return true;
    }
    return loadQuestionById(payload && (payload.questionId || payload.id));
  });

  function finishRound() {
    if (markingAudio) { markingAudio.pause(); markingAudio.currentTime = 0; markingAudio = null; }
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

  fetch(`data/EA_Musical_Language_v1.csv?v=${Date.now()}`)
    .then((response) => { if (!response.ok) throw new Error(`Question data returned ${response.status}`); return response.text(); })
    .then((text) => {
      state.bank = parseCsv(text);
      elements.setupMessage.textContent = "";
      updateStartState();
      if (pendingHostedQuestion) {
        const request = pendingHostedQuestion;
        pendingHostedQuestion = null;
        loadQuestionById(request.questionId || request.id);
      }
    })
    .catch((error) => { elements.setupMessage.textContent = "The question bank could not be loaded."; console.error(error); });
})();
