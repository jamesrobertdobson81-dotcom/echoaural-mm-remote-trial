(function () {
  "use strict";

  const STORAGE_KEY = "echoaural.melodyMaster.reviewedDevicesTesting.v2";
  const CAMBRIDGE_TERMS = [
    "Ascending", "Descending", "By step", "In leaps", "Scalic", "Broken chord", "Arpeggio",
    "Chromatic", "Repetition", "Ascending sequence", "Descending sequence", "Imitation",
    "Ostinato", "Riff", "Alberti bass", "Trill", "Mordent", "Turn", "Appoggiatura", "Acciaccatura"
  ];
  const state = {
    questions: [],
    activeIndex: 0,
    filter: "all",
    originFilter: "all",
    search: "",
    revealed: true,
    reviews: loadReviews()
  };

  const elements = Object.fromEntries([
    "totalCount", "reviewedCount", "dropCount", "originCountSummary", "searchInput", "questionList",
    "questionPosition", "questionLevelBadge", "questionId", "questionTitle", "questionPrompt", "questionDetails",
    "originalAnswer", "proposedAnswer", "answerChoicePreview", "playClipButton", "audioStatus", "audioPlayer",
    "prevButton", "revealButton", "nextButton", "reviewForm", "reviewNotes", "markscheme", "markschemeContent",
    "sourceSummaryContent", "downloadJsonButton", "downloadCsvButton", "clearReviewButton", "saveStatus"
  ].map((id) => [id, document.getElementById(id)]));

  function loadReviews() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch (_error) {
      return {};
    }
  }

  function saveReviews() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews, null, 2));
    elements.saveStatus.textContent = "Saved locally.";
  }

  function normalise(value) {
    return String(value || "").trim().toLowerCase();
  }

  function proposedExistingAnswer(answer) {
    const mappings = {
      "conjunct": "By step",
      "disjunct": "In leaps",
      "triadic": "Broken chord / arpeggio — verify which term fits",
      "sequence": "Ascending or descending sequence — direction must be verified",
      "arpeggio / broken chord": "Arpeggio / broken chord"
    };
    return mappings[normalise(answer)] || answer;
  }

  function existingCategory(answer) {
    const value = normalise(answer);
    if (["ascending", "descending", "conjunct", "disjunct", "scalic", "triadic", "arpeggio / broken chord"].includes(value)) return "Melody";
    if (value === "chromatic") return "Scales and modes";
    return "Musical devices";
  }

  function proposedPrompt(category) {
    if (category === "Melody") return "Which term best describes the movement or shape of the melody?";
    if (category === "Scales and modes") return "Which term best describes the pitch material in the melody?";
    if (category === "Ornaments") return "Which ornament is heard in the extract?";
    return "Which musical device is most clearly heard in the extract?";
  }

  function prepareExisting(question) {
    const category = existingCategory(question.correctAnswer);
    const proposedAnswer = proposedExistingAnswer(question.correctAnswer);
    const requiresDirection = normalise(question.correctAnswer) === "sequence";
    const requiresVocabularyEdit = proposedAnswer !== question.correctAnswer;
    return {
      reviewId: `MM-${question.id}`,
      id: question.id,
      origin: "MM Devices",
      level: question.level || "Developing",
      category,
      audio: question.audio,
      originalPrompt: question.question,
      proposedPrompt: proposedPrompt(category),
      originalAnswer: question.correctAnswer,
      proposedAnswer,
      choices: Array.isArray(question.choices) ? question.choices : [],
      feedback: question.feedback || "",
      evidence: question.diagnosticTags || "",
      confidence: question.clarityConfidence || "",
      composer: question.composer || "",
      work: question.work || "",
      movement: question.movement || "",
      performer: question.performer || "",
      instrument: question.instrumentation || "",
      source: question.sourceProvider || "",
      rights: question.licenceType || "",
      alignmentNote: requiresDirection
        ? "Cambridge specifies ascending sequence and descending sequence, not undirected sequence."
        : requiresVocabularyEdit
          ? `The original label is not Cambridge's listed wording. Proposed review wording: ${proposedAnswer}.`
          : "The answer uses Cambridge 0410 vocabulary, but the audio still needs aural confirmation.",
      suggestedIssues: [
        ...(requiresDirection ? ["wrong-direction", "vocabulary"] : []),
        ...(requiresVocabularyEdit && !requiresDirection ? ["vocabulary"] : []),
        ...(question.clarityConfidence === "Medium" ? ["unclear-device"] : [])
      ]
    };
  }

  function prepareIi(question) {
    const answer = normalise(question.originalAnswer);
    const isOrnament = /trill|turn|mordent|appoggiatura|acciaccatura/.test(answer);
    const directionKnown = answer === "ascending sequence" || answer === "descending sequence";
    const proposedAnswer = directionKnown
      ? answer.replace(/\b\w/g, (character) => character.toUpperCase())
      : answer === "trill"
        ? "Trill"
        : answer === "trill/turn"
          ? "Trill or turn — identify one after listening"
          : "Ascending or descending sequence — direction must be verified";
    return {
      reviewId: `II-${question.id}`,
      id: question.id,
      origin: "II tag",
      level: directionKnown || isOrnament ? "Developing" : "Securing",
      category: isOrnament ? "Ornaments" : "Musical devices",
      audio: question.audio,
      originalPrompt: question.originalPrompt,
      proposedPrompt: proposedPrompt(isOrnament ? "Ornaments" : "Musical devices"),
      originalAnswer: question.originalAnswer,
      proposedAnswer,
      choices: [],
      feedback: "",
      evidence: "Recovered manual Instrument Identifier tag; listen before approving.",
      confidence: directionKnown || answer === "trill" ? "Tagged" : "Direction/detail unresolved",
      composer: question.composer || "",
      work: question.work || "",
      movement: "",
      performer: "",
      instrument: question.instrument || "",
      source: question.source || "",
      rights: question.rights || "",
      alignmentNote: directionKnown || answer === "trill"
        ? "The recovered label is an exact Cambridge 0410 term; confirm it is prominent in the audio."
        : isOrnament
          ? "Cambridge requires the specific ornament, so choose trill or turn after listening."
          : "Cambridge requires ascending sequence or descending sequence; determine the direction after listening.",
      suggestedIssues: [
        ...(!directionKnown && !isOrnament ? ["wrong-direction", "vocabulary"] : []),
        ...(answer === "trill/turn" ? ["vocabulary", "unclear-device"] : []),
        ...(!question.source || !question.rights ? ["rights"] : [])
      ]
    };
  }

  async function loadQuestions() {
    const currentResponse = await fetch("data/melody-master-melodic-devices-50.json", { cache: "no-store" });
    if (!currentResponse.ok) throw new Error("Reviewed MM Devices question data could not be loaded.");
    const current = await currentResponse.json();
    state.questions = (current.questions || []).map(prepareExisting);
  }

  function currentQuestion() {
    return state.questions[state.activeIndex] || null;
  }

  function getReview(question = currentQuestion()) {
    if (!question) return {};
    if (!state.reviews[question.reviewId]) {
      state.reviews[question.reviewId] = {
        reviewId: question.reviewId,
        questionId: question.id,
        origin: question.origin,
        decision: "",
        difficulty: "",
        issues: question.suggestedIssues.slice(),
        notes: "",
        reviewedAt: ""
      };
    }
    return state.reviews[question.reviewId];
  }

  function reviewComplete(review = {}) {
    return Boolean(review.decision || review.difficulty || review.notes || review.reviewedAt);
  }

  function updateReview(patch) {
    const question = currentQuestion();
    if (!question) return;
    state.reviews[question.reviewId] = {
      ...getReview(question),
      ...patch,
      reviewedAt: new Date().toISOString()
    };
    saveReviews();
    renderSummary();
    renderQuestionList();
  }

  function filteredQuestions() {
    const search = normalise(state.search);
    return state.questions.map((question, index) => ({ question, index })).filter(({ question }) => {
      const review = state.reviews[question.reviewId] || {};
      if (state.originFilter !== "all" && question.origin !== state.originFilter) return false;
      if (state.filter === "unreviewed" && reviewComplete(review)) return false;
      if (state.filter === "drop" && review.decision !== "drop") return false;
      if (!search) return true;
      return normalise([question.id, question.origin, question.originalAnswer, question.proposedAnswer, question.composer, question.work, question.instrument].join(" ")).includes(search);
    });
  }

  function renderSummary() {
    const reviews = state.questions.map((question) => state.reviews[question.reviewId] || {});
    elements.totalCount.textContent = String(state.questions.length);
    elements.reviewedCount.textContent = String(reviews.filter(reviewComplete).length);
    elements.dropCount.textContent = String(reviews.filter((review) => review.decision === "drop").length);
    const mmCount = state.questions.filter((question) => question.origin === "MM Devices").length;
    const iiCount = state.questions.length - mmCount;
    elements.originCountSummary.textContent = `MM Devices: ${mmCount} · recovered II tags: ${iiCount}`;
  }

  function renderQuestionList() {
    const rows = filteredQuestions();
    elements.questionList.innerHTML = rows.length ? rows.map(({ question, index }) => {
      const review = state.reviews[question.reviewId] || {};
      const active = index === state.activeIndex ? " is-active" : "";
      const decision = review.decision || "unreviewed";
      return `<button class="question-button${active}" type="button" data-index="${index}">
        <strong>${escapeHtml(question.id)} · ${escapeHtml(question.proposedAnswer)}</strong>
        <small>${escapeHtml(question.composer || "Unknown composer")} · ${escapeHtml(question.work || "Untitled source")}</small>
        <span class="question-tags"><span class="decision-${escapeHtml(decision)}">${escapeHtml(decision)}</span><span class="candidate-origin">${escapeHtml(question.origin)}</span><span>${escapeHtml(question.category)}</span></span>
      </button>`;
    }).join("") : `<p class="save-status">No candidates match this filter.</p>`;
    elements.questionList.querySelectorAll(".question-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeIndex = Number(button.dataset.index);
        state.revealed = true;
        render();
      });
    });
  }

  function renderCurrent(options = {}) {
    const question = currentQuestion();
    if (!question) return;
    const review = getReview(question);
    elements.questionPosition.textContent = `Candidate ${state.activeIndex + 1} / ${state.questions.length}`;
    elements.questionLevelBadge.textContent = `${question.origin} · ${question.level}`;
    elements.questionId.textContent = question.id;
    elements.questionTitle.textContent = question.composer ? `${question.composer} — ${question.work}` : question.work;
    elements.questionPrompt.textContent = question.originalPrompt;
    elements.questionDetails.textContent = `${question.category} · ${question.confidence || "confidence unset"}`;
    elements.originalAnswer.textContent = question.originalAnswer;
    elements.proposedAnswer.textContent = question.proposedAnswer;
    elements.answerChoicePreview.innerHTML = question.choices.length
      ? `<span class="answer-mode-label">Current choices</span><div class="choice-preview-grid">${question.choices.map((choice) => `<span class="choice-pill${normalise(choice) === normalise(question.originalAnswer) ? " is-correct" : ""}">${escapeHtml(choice)}</span>`).join("")}</div>`
      : `<span class="answer-mode-label">Recovered II candidate</span><p>No production distractors yet. Review the audio and precise Cambridge answer first.</p>`;
    if (!options.keepAudio || elements.audioPlayer.dataset.reviewId !== question.reviewId) {
      elements.audioPlayer.pause();
      elements.audioPlayer.src = question.audio;
      elements.audioPlayer.dataset.reviewId = question.reviewId;
      elements.audioPlayer.load();
      updateAudioStatus("Ready to play.");
    }
    elements.prevButton.disabled = state.activeIndex === 0;
    elements.nextButton.textContent = state.activeIndex === state.questions.length - 1 ? "Finish review" : "Next candidate";
    elements.revealButton.textContent = state.revealed ? "Hide evidence" : "Show evidence";
    elements.markscheme.hidden = !state.revealed;
    elements.reviewNotes.value = review.notes || "";
    setChecked("decision", review.decision);
    setChecked("difficulty", review.difficulty);
    setIssues(review.issues || []);
    renderEvidence(question);
    renderSource(question);
  }

  function renderEvidence(question) {
    const rows = [
      ["Proposed exam prompt", question.proposedPrompt],
      ["Cambridge alignment", question.alignmentNote],
      ["Existing evidence/tag", question.evidence],
      ["Cambridge vocabulary boundary", CAMBRIDGE_TERMS.join(", ")],
      ["Current feedback", question.feedback]
    ].filter(([, value]) => value);
    elements.markschemeContent.innerHTML = rows.map(([label, value]) => `<div class="markscheme-section"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`).join("");
  }

  function renderSource(question) {
    const rows = [
      ["Candidate source", question.origin], ["Audio", question.audio], ["Composer", question.composer],
      ["Work", question.work], ["Movement", question.movement], ["Instrument", question.instrument],
      ["Performer", question.performer], ["Source", question.source], ["Rights", question.rights]
    ].filter(([, value]) => value);
    elements.sourceSummaryContent.innerHTML = rows.map(([label, value]) => `<div class="source-row"><span>${escapeHtml(label)}</span><p>${escapeHtml(value)}</p></div>`).join("");
  }

  function setChecked(name, value) {
    elements.reviewForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => { input.checked = input.value === value; });
  }

  function setIssues(values) {
    const selected = new Set(values);
    elements.reviewForm.querySelectorAll('input[name="issue"]').forEach((input) => { input.checked = selected.has(input.value); });
  }

  function selectedRadio(name) {
    return elements.reviewForm.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function selectedIssues() {
    return Array.from(elements.reviewForm.querySelectorAll('input[name="issue"]:checked')).map((input) => input.value);
  }

  function exportRows() {
    return state.questions.map((question) => {
      const review = state.reviews[question.reviewId] || {};
      return {
        reviewId: question.reviewId,
        questionId: question.id,
        origin: question.origin,
        audio: question.audio,
        category: question.category,
        originalPrompt: question.originalPrompt,
        proposedPrompt: question.proposedPrompt,
        originalAnswer: question.originalAnswer,
        proposedCambridgeAnswer: question.proposedAnswer,
        currentLevel: question.level,
        decision: review.decision || "",
        reviewedDifficulty: review.difficulty || "",
        issues: (review.issues || []).join("; "),
        notes: review.notes || "",
        reviewedAt: review.reviewedAt || ""
      };
    });
  }

  function downloadJson() {
    const rows = exportRows();
    downloadFile(`mm-devices-review-${dateStamp()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), source: "MM Devices review.html", candidateCount: rows.length, rows }, null, 2), "application/json");
  }

  function downloadCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
    downloadFile(`mm-devices-review-${dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function downloadFile(filename, content, type) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function updateAudioStatus(message) {
    elements.audioStatus.textContent = message;
    elements.playClipButton.textContent = elements.audioPlayer.paused ? "Play Clip" : "Pause Clip";
  }

  function render() {
    renderSummary();
    renderQuestionList();
    renderCurrent();
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", () => { state.search = elements.searchInput.value; renderQuestionList(); });
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderQuestionList();
    }));
    document.querySelectorAll("[data-origin-filter]").forEach((button) => button.addEventListener("click", () => {
      state.originFilter = button.dataset.originFilter;
      document.querySelectorAll("[data-origin-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderQuestionList();
    }));
    elements.reviewForm.addEventListener("change", () => updateReview({ decision: selectedRadio("decision"), difficulty: selectedRadio("difficulty"), issues: selectedIssues(), notes: elements.reviewNotes.value }));
    elements.reviewNotes.addEventListener("input", () => updateReview({ notes: elements.reviewNotes.value }));
    elements.prevButton.addEventListener("click", () => { state.activeIndex = Math.max(0, state.activeIndex - 1); state.revealed = true; render(); });
    elements.nextButton.addEventListener("click", () => { state.activeIndex = Math.min(state.questions.length - 1, state.activeIndex + 1); state.revealed = true; render(); });
    elements.revealButton.addEventListener("click", () => { state.revealed = !state.revealed; renderCurrent({ keepAudio: true }); });
    elements.playClipButton.addEventListener("click", async () => {
      if (!elements.audioPlayer.paused) { elements.audioPlayer.pause(); updateAudioStatus("Paused."); return; }
      try { await elements.audioPlayer.play(); updateAudioStatus("Playing clip…"); } catch (_error) { updateAudioStatus("Audio could not play."); }
    });
    elements.audioPlayer.addEventListener("play", () => updateAudioStatus("Playing clip…"));
    elements.audioPlayer.addEventListener("pause", () => updateAudioStatus(elements.audioPlayer.ended ? "Clip finished." : "Paused."));
    elements.audioPlayer.addEventListener("error", () => updateAudioStatus("Audio file could not be loaded."));
    elements.downloadJsonButton.addEventListener("click", downloadJson);
    elements.downloadCsvButton.addEventListener("click", downloadCsv);
    elements.clearReviewButton.addEventListener("click", () => {
      if (!window.confirm("Clear all locally saved MM Devices review decisions?")) return;
      state.reviews = {};
      localStorage.removeItem(STORAGE_KEY);
      elements.saveStatus.textContent = "Local review cleared.";
      render();
    });
  }

  loadQuestions().then(() => {
    bindEvents();
    render();
  }).catch((error) => {
    document.body.innerHTML = `<main class="panel"><h1>MM Devices reviewer could not load.</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
}());
