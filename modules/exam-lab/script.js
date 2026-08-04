(() => {
  "use strict";

  const availableSets = window.EXAM_LAB_QUESTION_SETS || {};
  const requestedSetId = new URLSearchParams(window.location.search).get("extract")?.trim().toUpperCase();
  const set = availableSets[requestedSetId] || window.EXAM_LAB_QUESTION_SET;
  if (!set) throw new Error("Exam Lab question data failed to load.");
  if (!window.ExamLabMarking) throw new Error("Exam Lab marking support failed to load.");
  if (!window.ExamLabCore) throw new Error("Exam Lab shared core failed to load.");

  const { normalise } = window.ExamLabMarking;

  const $ = (id) => document.getElementById(id);
  const els = {
    audio: $("examAudio"),
    playButton: $("playButton"),
    playButtonLabel: $("playButtonLabel"),
    playStatus: $("playStatus"),
    playPips: $("playPips"),
    playsRemaining: $("playsRemaining"),
    audioProgress: $("audioProgress"),
    currentTime: $("currentTime"),
    durationTime: $("durationTime"),
    scoreImage: $("scoreImage"),
    scoreCanvas: $("scoreCanvas"),
    scoreScroll: $("scoreScroll"),
    zoomIn: $("zoomInButton"),
    zoomOut: $("zoomOutButton"),
    zoomLabel: $("zoomLabel"),
    fitScore: $("fitScoreButton"),
    questionList: $("questionList"),
    answerForm: $("answerForm"),
    submitButton: $("submitButton"),
    retryButton: $("retryButton"),
    formMessage: $("formMessage"),
    answerCount: $("answerCount"),
    completionCircle: $("completionCircle"),
    extractSelector: $("extractSelector"),
    extractIdBadge: $("extractIdBadge"),
    extractMarksBadge: $("extractMarksBadge"),
    resultSummary: $("resultSummary")
  };

  const state = {
    playsUsed: 0,
    submitted: false,
    zoom: 1,
    lastResult: null,
    startingPlayback: false
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  function renderQuestions() {
    els.questionList.innerHTML = set.questions.map((q) => {
      const inputId = `answer-${q.id}`;
      let response = "";

      if (q.responseType === "multiple-choice") {
        response = `<div class="choice-grid" role="radiogroup" aria-label="${escapeHtml(q.prompt)}">
          ${q.options.map((option, index) => `<label class="choice-option">
            <input type="radio" name="${q.id}" value="${escapeHtml(option)}" ${index === 0 ? "" : ""} />
            <span>${escapeHtml(option)}</span>
          </label>`).join("")}
        </div>`;
      } else if (q.responseType === "extended-text") {
        response = `<textarea class="extended-answer" id="${inputId}" name="${q.id}" rows="4" maxlength="600" placeholder="${escapeHtml(q.placeholder || "Write two separate musical reasons.")}"></textarea>`;
      } else {
        response = `<input class="text-answer" id="${inputId}" name="${q.id}" type="text" autocomplete="off" maxlength="80" />`;
      }

      return `<article class="question-card" id="card-${q.id}" data-question-id="${q.id}">
        <div class="question-head">
          <span class="question-number">${q.number}</span>
          <div class="question-copy">
            ${q.responseType === "multiple-choice" ? `<span class="question-label">${escapeHtml(q.prompt)}</span>` : `<label for="${inputId}">${escapeHtml(q.prompt)}</label>`}
          </div>
          <span class="question-marks">[${q.marks}]</span>
        </div>
        ${response}
        <div class="question-feedback" id="feedback-${q.id}" hidden></div>
      </article>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
  }

  function getAnswer(q) {
    if (q.responseType === "multiple-choice") {
      return els.answerForm.querySelector(`input[name="${q.id}"]:checked`)?.value || "";
    }
    return els.answerForm.elements[q.id]?.value || "";
  }

  function countCompleted() {
    return set.questions.reduce((total, q) => total + (normalise(getAnswer(q)) ? 1 : 0), 0);
  }

  function updateCompletion() {
    const completed = countCompleted();
    const fraction = completed / set.questions.length;
    els.answerCount.textContent = `${completed}/${set.questions.length}`;
    els.completionCircle.style.strokeDashoffset = String(113.1 * (1 - fraction));
    els.formMessage.textContent = completed === set.questions.length
      ? "All answers complete. Submit when ready."
      : `Complete ${set.questions.length - completed} more question${set.questions.length - completed === 1 ? "" : "s"}.`;
  }

  function submitAnswers(event) {
    event.preventDefault();
    if (state.submitted) return;

    const completed = countCompleted();
    if (completed < set.questions.length) {
      els.formMessage.textContent = "Please answer every question before submitting.";
      const firstMissing = set.questions.find((q) => !normalise(getAnswer(q)));
      document.getElementById(`card-${firstMissing.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const marked = window.ExamLabCore.markExtract(set, set.questions.map((q) => ({
      questionId: q.id,
      answer: getAnswer(q)
    })), { allowInternalIds: true });
    const results = marked.outcomes.map((outcome) => ({
      questionId: outcome.internalQuestionId,
      answer: outcome.answer,
      marks: outcome.marks,
      correct: outcome.correct,
      evidence: outcome.evidence,
      details: outcome.details,
      issues: outcome.issues,
      maxMarks: outcome.maxMarks,
      skills: outcome.skills,
      cambridgeRequirements: set.questions.find((question) => question.id === outcome.internalQuestionId)?.cambridgeRequirements || [],
      route: outcome.route
    }));

    state.submitted = true;
    state.lastResult = {
      questionSetId: set.id,
      score: marked.score,
      maxScore: marked.maximumScore,
      percentage: marked.percentage,
      playsUsed: state.playsUsed,
      submittedAt: new Date().toISOString(),
      results
    };

    renderFeedback(results);
    renderSummary(state.lastResult);
    persistResult(state.lastResult);
    disableForm();

    window.dispatchEvent(new CustomEvent("examlab:completed", { detail: state.lastResult }));
  }

  function renderFeedback(results) {
    results.forEach((result) => {
      const q = set.questions.find((item) => item.id === result.questionId);
      const card = document.getElementById(`card-${q.id}`);
      const feedback = document.getElementById(`feedback-${q.id}`);
      card.classList.add(result.correct ? "is-correct" : "is-incorrect");

      const routeText = q.route.status === "live" ? `Practise in ${q.route.module}` : `${q.route.module} — planned`;
      const route = result.correct
        ? ""
        : q.route.status === "live"
          ? `<a class="route-link" href="${q.route.path}">${escapeHtml(routeText)}</a>`
          : `<span class="route-link planned">${escapeHtml(routeText)}</span>`;
      const detail = renderMarkingDetail(q, result);
      let message;
      if (q.markingFeedbackMode === "answer-coach") {
        message = result.correct ? "Two distinct musical reasons credited." : `${result.marks} of 2 musical reasons credited.`;
      } else if (q.showAllMarkPoints) {
        message = result.correct ? "Both mark points credited." : "Review the two separate mark points.";
      } else if (result.correct) {
        message = `Correct.${q.feedback ? ` ${escapeHtml(q.feedback)}` : ""}`;
      } else {
        message = q.feedback ? escapeHtml(q.feedback) : `Model answer: ${escapeHtml(q.modelAnswer)}`;
      }

      feedback.innerHTML = `<strong>${result.marks}/${q.marks}</strong> — ${message}${detail}${route}`;
      feedback.hidden = false;
    });
  }

  function renderMarkingDetail(q, result) {
    if (q.showAllMarkPoints) {
      return `<ul class="mark-point-feedback">${result.details.map((detail) => `<li class="${detail.credited ? "is-credited" : "is-uncredited"}"><strong>${detail.credited ? "Credited" : "Not credited"}:</strong> ${escapeHtml(detail.label)}</li>`).join("")}</ul>`;
    }

    if (q.markingFeedbackMode === "answer-coach") {
      const credited = result.details.filter((detail) => detail.credited);
      const creditedItems = credited.length
        ? credited.map((detail) => `<li class="is-credited"><strong>${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.explanation)}</li>`).join("")
        : "<li class=\"is-uncredited\">No valid musical feature was credited.</li>";
      const issues = result.marks < q.marks && result.issues.length
        ? `<div class="answer-coach-issues">${result.issues.map((issue) => `<span>${escapeHtml(issue)}</span>`).join("")}</div>`
        : "";
      const suggestion = result.marks < q.marks
        ? result.details.find((detail) => !detail.credited)?.suggestion
        : "";
      return `<div class="answer-coach-feedback"><span>Answer Coach</span><ul class="mark-point-feedback">${creditedItems}</ul>${issues}${suggestion ? `<p><strong>Try adding:</strong> ${escapeHtml(suggestion)}</p>` : ""}</div>`;
    }

    if (q.responseType === "extended-text" && result.evidence.length) {
      return `<br />Recognised evidence: ${result.evidence.map((item) => escapeHtml(item.replace(/-/g, " "))).join(", ")}.`;
    }

    return "";
  }

  function renderSummary(result) {
    const missed = result.results.filter((item) => item.marks < item.maxMarks);
    const priorityRoutes = [...new Map(missed.map((item) => [item.route.module, item.route])).values()];
    const routeText = priorityRoutes.length
      ? `Next focus: ${priorityRoutes.map((route) => `${route.module} (${route.focus})`).join("; ")}.`
      : "All tested skills were secure in this extract.";
    const resultLabel = result.percentage >= 75
      ? "Strong exam listening"
      : result.percentage >= 50
        ? "Developing exam listening"
        : "Targeted practice recommended";
    const questionRows = result.results.map((item, index) => {
      const question = set.questions.find((candidate) => candidate.id === item.questionId);
      const detail = item.correct ? "Correct" : `Review: ${question.modelAnswer}`;
      return `<div class="exl-feedback-row ${item.correct ? "is-correct" : ""}">
        <span>Question ${index + 1}</span>
        <strong>${item.marks} / ${item.maxMarks}</strong>
        <small>${escapeHtml(detail)}</small>
      </div>`;
    }).join("");

    els.resultSummary.innerHTML = `<div class="exl-round-feedback-card">
      <button id="roundFeedbackCloseButton" class="exl-round-feedback-close" type="button" aria-label="Close round feedback">×</button>
      <p class="eyebrow">ROUND FEEDBACK</p>
      <div class="exl-round-feedback-hero">
        <span>Final score</span>
        <strong>${result.score} / ${result.maxScore}</strong>
        <small>${result.results.length}/${set.questions.length} questions submitted · ${result.percentage}%</small>
      </div>
      <div class="exl-feedback-metrics" aria-label="Round summary">
        <div class="exl-feedback-metric ${result.percentage >= 75 ? "is-secure" : "is-focus"}">
          <span>Marks</span>
          <strong>${result.score} / ${result.maxScore}</strong>
        </div>
        <div class="exl-feedback-metric ${result.playsUsed <= Math.ceil(set.maxPlays / 2) ? "is-secure" : "is-focus"}">
          <span>Plays used</span>
          <strong>${result.playsUsed} / ${set.maxPlays}</strong>
        </div>
      </div>
      <div class="exl-compiled-feedback">
        <span>Compiled feedback</span>
        <strong>${escapeHtml(resultLabel)}. ${escapeHtml(routeText)} Source revealed: ${escapeHtml(set.source.composer)}, ${escapeHtml(set.source.work)}, ${escapeHtml(set.source.movement)}.</strong>
      </div>
      <div class="exl-feedback-list" aria-label="Question-by-question round results">${questionRows}</div>
      <button id="roundFeedbackReviewButton" class="primary-button exl-round-feedback-button" type="button">Review Answers</button>
    </div>`;
    els.resultSummary.hidden = false;
    document.body.classList.add("exl-round-feedback-open");
    els.resultSummary.querySelector("#roundFeedbackCloseButton")?.addEventListener("click", closeSummary);
    els.resultSummary.querySelector("#roundFeedbackReviewButton")?.addEventListener("click", closeSummary);
    els.resultSummary.querySelector("#roundFeedbackCloseButton")?.focus();
  }

  function closeSummary() {
    els.resultSummary.hidden = true;
    document.body.classList.remove("exl-round-feedback-open");
  }

  function disableForm() {
    els.answerForm.querySelectorAll("input, textarea").forEach((field) => { field.disabled = true; });
    els.submitButton.hidden = true;
    els.retryButton.hidden = false;
    els.formMessage.textContent = `Submitted using ${state.playsUsed} of ${set.maxPlays} available plays.`;
  }

  function retry() {
    state.submitted = false;
    state.lastResult = null;
    els.answerForm.reset();
    els.answerForm.querySelectorAll("input, textarea").forEach((field) => { field.disabled = false; });
    els.questionList.querySelectorAll(".question-card").forEach((card) => card.classList.remove("is-correct", "is-incorrect"));
    els.questionList.querySelectorAll(".question-feedback").forEach((feedback) => { feedback.hidden = true; feedback.innerHTML = ""; });
    closeSummary();
    els.resultSummary.innerHTML = "";
    els.submitButton.hidden = false;
    els.retryButton.hidden = true;
    updateCompletion();
    els.questionList.scrollTo({ top: 0, behavior: "smooth" });
  }

  function persistResult(result) {
    const key = "ea.examLab.results.v1";
    try {
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(result);
      localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
    } catch (error) {
      console.warn("Exam Lab result could not be saved locally.", error);
    }
  }

  function updatePlayUI() {
    const remaining = Math.max(0, set.maxPlays - state.playsUsed);
    [...els.playPips.children].forEach((pip, index) => pip.classList.toggle("used", index < state.playsUsed));
    els.playsRemaining.textContent = `${remaining} remaining`;
    els.playStatus.textContent = remaining ? `${remaining} play${remaining === 1 ? "" : "s"} available` : "Play limit reached";
    if (state.startingPlayback || !els.audio.paused) {
      els.playButtonLabel.textContent = "Playing extract";
      els.playButton.classList.add("is-playing");
      els.playButton.disabled = true;
    } else {
      els.playButtonLabel.textContent = remaining ? "Play extract" : "No plays remaining";
      els.playButton.classList.remove("is-playing");
      els.playButton.disabled = !remaining;
    }
  }

  async function playExtract() {
    if (state.startingPlayback || !els.audio.paused || state.playsUsed >= set.maxPlays) return;
    state.startingPlayback = true;
    state.playsUsed += 1;
    els.audio.currentTime = 0;
    updatePlayUI();
    try {
      await els.audio.play();
      state.startingPlayback = false;
      updatePlayUI();
    } catch (error) {
      state.startingPlayback = false;
      state.playsUsed -= 1;
      updatePlayUI();
      els.playStatus.textContent = "Audio could not start. Try again.";
      console.error(error);
    }
  }

  function updateAudioProgress() {
    const duration = els.audio.duration || 0;
    const fraction = duration ? Math.min(1, els.audio.currentTime / duration) : 0;
    els.audioProgress.style.width = `${fraction * 100}%`;
    els.currentTime.textContent = formatTime(els.audio.currentTime);
    if (Number.isFinite(duration)) els.durationTime.textContent = formatTime(duration);
  }

  function handleEnded() {
    els.audio.currentTime = 0;
    updateAudioProgress();
    updatePlayUI();
  }

  function setZoom(value) {
    state.zoom = Math.min(1.75, Math.max(.7, value));
    els.scoreCanvas.style.width = `${state.zoom * 100}%`;
    els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function init() {
    renderQuestions();
    document.title = `${set.id} | Exam Lab | EchoAural`;
    els.extractSelector.value = set.id;
    els.extractIdBadge.textContent = set.id;
    els.extractMarksBadge.textContent = `${set.totalMarks} marks`;
    els.audio.src = set.audio;
    els.scoreImage.src = set.score;
    els.scoreImage.alt = set.scoreAlt;
    els.durationTime.textContent = "0:00";
    updateCompletion();
    updatePlayUI();
    setZoom(1);

    els.playButton.addEventListener("click", playExtract);
    els.audio.addEventListener("loadedmetadata", updateAudioProgress);
    els.audio.addEventListener("timeupdate", updateAudioProgress);
    els.audio.addEventListener("ended", handleEnded);
    els.audio.addEventListener("pause", updatePlayUI);
    els.audio.addEventListener("play", updatePlayUI);
    els.answerForm.addEventListener("input", updateCompletion);
    els.answerForm.addEventListener("change", updateCompletion);
    els.answerForm.addEventListener("submit", submitAnswers);
    els.retryButton.addEventListener("click", retry);
    els.zoomIn.addEventListener("click", () => setZoom(state.zoom + .15));
    els.zoomOut.addEventListener("click", () => setZoom(state.zoom - .15));
    els.fitScore.addEventListener("click", () => setZoom(1));
    els.extractSelector.addEventListener("change", () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("extract", els.extractSelector.value);
      window.location.assign(nextUrl.toString());
    });
  }

  init();
})();
