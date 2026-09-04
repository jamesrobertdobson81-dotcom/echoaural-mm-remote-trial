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
    marks: $("#questionMarks"), kicker: $("#questionKicker"), centre: $("#structureSpotterCentrePanel"), visual: $("#visualCard"), answers: $("#answers"),
    feedback: $("#feedback"), answerCard: $("#answerCard")
  };

  function parseCsv(text) {
    const rows = [];
    let row = [], field = "", quoted = false;
    const source = text.replace(/^﻿/, "");
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
    return String(value || "").toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
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

  // Very short answers get no typo tolerance — a 1-character edit there
  // usually spells a genuinely different, wrong term, not a typo.
  function typoTolerance(length) {
    if (length <= 3) return 0;
    if (length <= 7) return 1;
    return 2;
  }

  function compact(value) {
    return value.replace(/\s+/g, "");
  }

  function spacingMatches(response, target) {
    if (!response || !target) return false;
    return response === target || compact(response) === compact(target);
  }

  function typoDistanceMatches(response, target) {
    if (!response || !target) return false;
    const responseCompact = compact(response);
    const targetCompact = compact(target);
    return levenshtein(responseCompact, targetCompact) <= typoTolerance(targetCompact.length);
  }

  function selected(name) { return $(`input[name="${name}"]:checked`)?.value || ""; }

  function updateStartState() {
    const ready = state.bank.length > 0 && Boolean(selected("structureLevel"));
    elements.start.disabled = !ready;
    if (state.bank.length && !selected("structureLevel")) elements.setupMessage.textContent = "";
    else if (ready) elements.setupMessage.textContent = "";
  }

  // Structure Spotter has no notation/symbol image assets — instead of an
  // image, the "visual" area renders the structure's own pattern (e.g.
  // "A – B – A – C – A" or "Ālāp – Jōr – Gat – Jhālā") as a row of styled
  // chips, one per section. Only rows that carry a symbol_display value use
  // this (Type A "whole-piece shape" questions on their Developing/Securing
  // tiers, where the pattern is given as part of the question); Foundation
  // and Mastering tiers, and all Type B "named section" questions, have no
  // pattern to show and simply hide the visual card.
  function renderVisual(question) {
    const pattern = (question.symbol_display || "").trim();
    elements.visual.hidden = !pattern;
    if (!pattern) {
      elements.visual.innerHTML = "";
      return;
    }
    const sections = pattern.split(/\s*[–—-]\s*/).filter(Boolean);
    const chips = sections.map((section) => `<span class="ss-pattern-chip">${escapeHtml(section)}</span>`).join('<span class="ss-pattern-arrow" aria-hidden="true"></span>');
    elements.visual.innerHTML = `<div class="ss-pattern-row" role="img" aria-label="${escapeHtml(pattern)}">${chips}</div>`;
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = value || "";
    return span.innerHTML;
  }

  function currentQuestion() { return state.round[state.index]; }

  let structureAudio = null;

  function playQuestionAudio(question) {
    if (structureAudio) { structureAudio.pause(); structureAudio.currentTime = 0; }
    structureAudio = null;
    if (question.audio_required?.toLowerCase() !== "yes" || !question.audio_file) return;
    structureAudio = new Audio(question.audio_file);
    structureAudio.play().catch(() => {});
  }

  function displayedPrompt(question) {
    return question.prompt;
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
    elements.answers.className = "instruments-options he-options ss-options";
    elements.answers.innerHTML = "";

    if (question.question_type.startsWith("multiple_choice")) {
      const options = question.options.split(" | ").filter(Boolean);
      (question.shuffle_options.toLowerCase() === "yes" ? shuffle(options) : options).forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.dataset.answer = option;
        button.textContent = option;
        button.addEventListener("click", () => submitAnswer(option));
        elements.answers.append(button);
      });
    } else {
      elements.answers.className = "ss-typed-wrap";
      elements.answers.innerHTML = '<input class="ss-typed-input" id="typedAnswer" type="text" autocomplete="off" spellcheck="false" aria-label="Type your answer" placeholder="Type your answer and press Enter" />';
      const input = $("#typedAnswer");
      input.addEventListener("keydown", (event) => { if (event.key === "Enter" && input.value.trim()) submitAnswer(input.value); });
      requestAnimationFrame(() => input.focus());
    }
    updateStats();
  }

  function markTyped(question, response) {
    const answer = normalise(response);
    const accepted = question.accepted_answers.split("|").map(normalise).filter(Boolean);
    const correct = normalise(question.correct_answer);
    if (Number(question.marks) === 1) {
      const candidates = [correct, ...accepted];
      if (candidates.some((candidate) => spacingMatches(answer, candidate))) return 1;

      // Typo-tolerant pass only, guarded: if what was typed is itself a
      // real, DIFFERENT recognised term elsewhere in the bank, treat it as
      // that term rather than a typo of this one.
      const answerIsADifferentRealTerm = state.bank.some((entry) =>
        normalise(entry.term) === answer && normalise(entry.term) !== normalise(question.term)
      );
      if (answerIsADifferentRealTerm) return 0;

      return candidates.some((candidate) => typoDistanceMatches(answer, candidate)) ? 1 : 0;
    }
    // 2-mark exam-style rows: 1 mark for mentioning the key term(s), 1 mark
    // for meaningful overlap with the model answer's own wording.
    const hasTerm = accepted.some((term) => answer.includes(term));
    const meaningWords = normalise(question.meaning).split(" ").filter((word) => word.length > 2);
    const hasMeaning = meaningWords.length > 0 && meaningWords.filter((word) => answer.includes(word)).length >= Math.max(1, Math.ceil(meaningWords.length * .5));
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
      feedback: question.feedback || question.meaning || "",
      term: question.term,
      termType: question.term_type,
      musicalElement: question.element
    });
    // Deferred: focusing the Next button synchronously during an Enter
    // keydown (from typed-answer submission) lets that same key's keyup
    // land on the now-focused button and auto-activate it, skipping the
    // question the learner just answered before they can read feedback.
    setTimeout(() => elements.next.focus(), 0);
  }

  function renderFeedback(question, response, awarded) {
    const title = awarded === Number(question.marks) ? "Correct" : awarded ? "Partly correct" : "Not quite";
    elements.answerCard.innerHTML = `<div class="ss-feedback-card"><p class="ss-feedback-status">${title} · ${awarded}/${question.marks}</p><h2>${escapeHtml(question.term.charAt(0).toUpperCase() + question.term.slice(1))}</h2><div class="ss-feedback-row"><span>Your answer</span><strong>${escapeHtml(response)}</strong></div><div class="ss-feedback-row"><span>Correct answer</span><strong>${escapeHtml(question.correct_answer)}</strong></div><div class="ss-feedback-row"><span>Why?</span><p>${escapeHtml(question.feedback || question.meaning)}</p></div></div>`;
  }

  function startRound(options = {}) {
    const level = selected("structureLevel");
    const focus = selected("elementFocus") || "Mixed";
    const count = Number(selected("questionCount") || 5);
    let pool = state.bank.filter((question) => question.status === "active" && question.level === level);
    if (focus !== "Mixed") pool = pool.filter((question) => question.element === focus);
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

  let contractSessionStarted = false;

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
    if (!state.bank.length) {
      pendingHostedQuestion = payload || {};
      return true;
    }
    return loadQuestionById(payload && (payload.questionId || payload.id));
  });

  function finishRound() {
    elements.roundText.textContent = "Round complete";
    elements.prompt.textContent = `You scored ${state.score} out of ${state.round.reduce((sum, question) => sum + Number(question.marks), 0)}.`;
    elements.marks.hidden = true;
    elements.visual.hidden = true;
    elements.visual.innerHTML = "";
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
  $$('input[name="structureLevel"]').forEach((input) => input.addEventListener("change", updateStartState));
  elements.start.addEventListener("click", startRound);
  elements.next.addEventListener("click", () => { if (!state.answered) return; if (state.index >= state.round.length - 1) finishRound(); else { state.index += 1; renderQuestion(); } });
  elements.restart.addEventListener("click", resetRound);
  elements.restart.style.display = "none";

  fetch(`data/EA_Structure_Spotter_v1.csv?v=${Date.now()}`)
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
