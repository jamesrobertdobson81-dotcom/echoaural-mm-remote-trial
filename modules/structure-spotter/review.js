(function () {
  "use strict";

  const STORAGE_KEY = "echoaural.structureSpotter.review.v1";
  const DATA_URL = "data/EA_Structure_Spotter_v1.csv";
  const APP_URL = "index.html";
  const LEVELS = ["Foundation", "Developing", "Securing", "Mastering"];
  const SOURCE_KEY = "structure-spotter";

  // Same hand-rolled quoted-CSV parser as modules/structure-spotter/script.js
  // (kept in sync deliberately rather than shared, matching ScoreDecoder's
  // review tool convention — this review tool has no runtime dependency on
  // the app's own script).
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

  const state = {
    activeIndex: 0,
    filter: "all",
    levelFilter: "all",
    elementFilter: "all",
    search: "",
    reviews: loadReviews()
  };

  let questions = [];
  let loadToken = 0;
  let appReadyForToken = -1;
  let fallbackTimer = null;

  const elements = {
    totalCount: document.getElementById("totalCount"),
    reviewedCount: document.getElementById("reviewedCount"),
    dropCount: document.getElementById("dropCount"),
    levelCountSummary: document.getElementById("levelCountSummary"),
    searchInput: document.getElementById("searchInput"),
    questionList: document.getElementById("questionList"),
    questionPosition: document.getElementById("questionPosition"),
    questionLevelBadge: document.getElementById("questionLevelBadge"),
    questionId: document.getElementById("questionId"),
    questionTitle: document.getElementById("questionTitle"),
    questionMeta: document.getElementById("questionMeta"),
    auditionFrame: document.getElementById("auditionFrame"),
    iframeStatus: document.getElementById("iframeStatus"),
    prevButton: document.getElementById("prevButton"),
    reloadButton: document.getElementById("reloadButton"),
    nextButton: document.getElementById("nextButton"),
    reviewForm: document.getElementById("reviewForm"),
    reviewNotes: document.getElementById("reviewNotes"),
    sourceSummaryContent: document.getElementById("sourceSummaryContent"),
    downloadJsonButton: document.getElementById("downloadJsonButton"),
    downloadCsvButton: document.getElementById("downloadCsvButton"),
    clearReviewButton: document.getElementById("clearReviewButton"),
    saveStatus: document.getElementById("saveStatus")
  };

  function loadReviews() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function saveReviews() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews, null, 2));
    setSaveStatus("Saved locally.");
  }

  function setSaveStatus(message) {
    if (elements.saveStatus) elements.saveStatus.textContent = message;
  }

  function currentQuestion() {
    return questions[state.activeIndex] || null;
  }

  function getReview(question = currentQuestion()) {
    if (!question) return {};
    if (!state.reviews[question.question_id]) {
      state.reviews[question.question_id] = {
        questionId: question.question_id,
        decision: "",
        difficulty: "",
        issues: [],
        notes: "",
        reviewedAt: ""
      };
    }
    return state.reviews[question.question_id];
  }

  function updateReview(patch = {}) {
    const question = currentQuestion();
    if (!question) return;
    state.reviews[question.question_id] = {
      ...getReview(question),
      ...patch,
      questionId: question.question_id,
      reviewedAt: new Date().toISOString()
    };
    saveReviews();
    renderSummary();
    renderQuestionList();
  }

  function reviewIsComplete(review = {}) {
    return Boolean(review.decision || review.difficulty || review.notes || (review.issues || []).length);
  }

  function getFilteredQuestions() {
    const search = state.search.trim().toLowerCase();
    return questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => {
        const review = state.reviews[question.question_id] || {};
        if (state.levelFilter !== "all" && question.level !== state.levelFilter) return false;
        if (state.elementFilter !== "all" && question.element !== state.elementFilter) return false;
        if (state.filter === "unreviewed" && reviewIsComplete(review)) return false;
        if (state.filter === "drop" && review.decision !== "drop") return false;
        if (state.filter === "locked" && question.status !== "locked_until_level") return false;
        if (!search) return true;
        const haystack = [
          question.question_id, question.term, question.element, question.subskill,
          question.level, question.prompt, question.correct_answer, question.concept_code
        ].join(" ").toLowerCase();
        return haystack.includes(search);
      });
  }

  function renderSummary() {
    const reviews = questions.map((question) => state.reviews[question.question_id] || {});
    const reviewed = reviews.filter(reviewIsComplete).length;
    const drop = reviews.filter((review) => review.decision === "drop").length;
    elements.totalCount.textContent = String(questions.length);
    elements.reviewedCount.textContent = String(reviewed);
    elements.dropCount.textContent = String(drop);
    if (elements.levelCountSummary) {
      const lockedCount = questions.filter((question) => question.status === "locked_until_level").length;
      elements.levelCountSummary.textContent = LEVELS
        .map((level) => `${level}: ${questions.filter((question) => question.level === level).length}`)
        .join(" · ") + ` · Locked: ${lockedCount}`;
    }
  }

  function renderQuestionList() {
    const rows = getFilteredQuestions();
    elements.questionList.innerHTML = rows.length
      ? rows.map(({ question, index }) => {
        const review = state.reviews[question.question_id] || {};
        const decisionClass = review.decision ? `decision-${review.decision}` : "";
        const decisionLabel = review.decision || "unreviewed";
        const activeClass = index === state.activeIndex ? " is-active" : "";
        return `
          <button class="question-button${activeClass}" type="button" data-index="${index}">
            <strong>${escapeHtml(question.question_id)} · ${escapeHtml(question.term || "Untitled term")}</strong>
            <small>${escapeHtml(question.prompt || "Structure Spotter question")}</small>
            <span class="question-tags">
              <span class="${decisionClass}">${escapeHtml(decisionLabel)}</span>
              <span>${escapeHtml(question.level || "level unset")}</span>
              <span>${escapeHtml(question.element || "")}</span>
              ${question.status === "locked_until_level" ? "<span>locked</span>" : ""}
            </span>
          </button>
        `;
      }).join("")
      : `<p class="save-status">No questions match this filter.</p>`;

    elements.questionList.querySelectorAll(".question-button").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        if (!Number.isFinite(index)) return;
        goToIndex(index);
      });
    });
  }

  function renderCurrentQuestion() {
    const question = currentQuestion();
    if (!question) return;
    const review = getReview(question);
    elements.questionPosition.textContent = `Question ${state.activeIndex + 1} / ${questions.length}`;
    elements.questionLevelBadge.textContent = `${question.level || "Level unset"} · ${question.element || ""}`;
    elements.questionId.textContent = question.question_id;
    elements.questionTitle.textContent = question.term ? capitalise(question.term) : "Untitled Structure Spotter question";
    elements.questionMeta.textContent = `${question.question_type || ""} · ${question.marks || "?"} mark${question.marks === "1" ? "" : "s"} · ${question.subskill || ""}${question.status === "locked_until_level" ? " · locked_until_level" : ""}`;

    elements.reviewNotes.value = review.notes || "";
    elements.prevButton.disabled = state.activeIndex <= 0;
    elements.nextButton.textContent = state.activeIndex >= questions.length - 1 ? "Finish review" : "Next question";

    setCheckedRadio("decision", review.decision);
    setCheckedRadio("difficulty", review.difficulty);
    setCheckedValues("issue", review.issues || []);
    renderSourceSummary(question);
    loadQuestionIntoIframe(question);
  }

  function renderSourceSummary(question) {
    const rows = [
      ["Question ID", question.question_id],
      ["Concept code", question.concept_code],
      ["Term", question.term],
      ["Pattern (symbol_display)", question.symbol_display],
      ["Meaning", question.meaning],
      ["Prompt", question.prompt],
      ["Options", (question.options || "").split(" | ").filter(Boolean).join("; ")],
      ["Correct answer", question.correct_answer],
      ["Accepted answers", (question.accepted_answers || "").split("|").filter(Boolean).join("; ")],
      ["Mark scheme", question.mark_scheme],
      ["Feedback", question.feedback],
      ["Common confusions", question.common_confusions],
      ["CIE status", question.cie_status],
      ["CIE requirement", question.cie_requirement],
      ["Status", question.status],
      ["Existing notes", question.notes],
      ["Source URL", question.source_url]
    ].filter(([, value]) => String(value || "").trim());
    elements.sourceSummaryContent.innerHTML = rows.map(([label, value]) => `
      <div class="source-row">
        <span>${escapeHtml(label)}</span>
        <p>${label === "Source URL" ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>` : escapeHtml(value)}</p>
      </div>
    `).join("");
  }

  // --- Iframe audition: drives the REAL Structure Spotter app via the same
  // teacher-load-question postMessage contract Live Sessions use. ---

  function buildSlotId(question) {
    return `review:${question.question_id}:${Date.now()}`;
  }

  function applyFocusMode() {
    try {
      const doc = elements.auditionFrame.contentDocument;
      if (doc && window.EAProgressModeApplyFocusMode) window.EAProgressModeApplyFocusMode(doc);
    } catch (_error) { /* not yet accessible — safe to skip and retry on the next event */ }
  }

  function loadQuestionIntoIframe(question) {
    loadToken += 1;
    const token = loadToken;
    appReadyForToken = -1;
    if (fallbackTimer) { window.clearTimeout(fallbackTimer); fallbackTimer = null; }

    const slotId = buildSlotId(question);
    elements.auditionFrame.dataset.slotId = slotId;
    elements.auditionFrame.dataset.sourceKey = SOURCE_KEY;
    elements.auditionFrame.dataset.questionId = question.question_id;
    elements.iframeStatus.textContent = "Loading Structure Spotter…";
    elements.iframeStatus.classList.remove("is-hidden");

    const query = new URLSearchParams({
      _review: String(Date.now()),
      eaProgressHost: "1",
      eaProgressSlot: slotId,
      eaProgressSource: SOURCE_KEY
    });
    elements.auditionFrame.src = `${APP_URL}?${query.toString()}`;

    elements.auditionFrame.onload = () => {
      if (token !== loadToken) return;
      applyFocusMode();
      if (appReadyForToken !== token) sendLoadQuestion(question, slotId, token);
    };
    fallbackTimer = window.setTimeout(() => {
      if (token !== loadToken) return;
      if (appReadyForToken !== token) sendLoadQuestion(question, slotId, token);
    }, 1200);
  }

  function sendLoadQuestion(question, slotId, token) {
    if (token !== loadToken) return;
    const frameWindow = elements.auditionFrame.contentWindow;
    if (!frameWindow) return;
    frameWindow.postMessage({
      namespace: "echoaural-progress",
      version: 1,
      contractVersion: 2,
      type: "teacher-load-question",
      slotId,
      sourceKey: SOURCE_KEY,
      roomId: "",
      roundId: "",
      questionId: question.question_id,
      payload: {
        questionId: question.question_id,
        level: question.level || "",
        sourceKey: SOURCE_KEY
      }
    }, window.location.origin);
  }

  function handleFrameMessage(event) {
    const slotId = elements.auditionFrame.dataset.slotId;
    if (!slotId || event.origin !== window.location.origin || event.source !== elements.auditionFrame.contentWindow) return;
    const message = event.data || {};
    if (message.namespace !== "echoaural-progress" || message.version !== 1 || message.slotId !== slotId) return;

    if (message.type === "app-ready") {
      appReadyForToken = loadToken;
      applyFocusMode();
      const question = currentQuestion();
      if (question) sendLoadQuestion(question, slotId, loadToken);
      return;
    }
    if (message.type === "question-ready") {
      elements.iframeStatus.classList.add("is-hidden");
      return;
    }
    if (message.type === "pool-empty") {
      elements.iframeStatus.textContent = "Structure Spotter reported this question could not be loaded.";
      elements.iframeStatus.classList.remove("is-hidden");
      return;
    }
  }

  function setCheckedRadio(name, value) {
    elements.reviewForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = input.value === value;
    });
  }

  function setCheckedValues(name, values = []) {
    const selected = new Set(values);
    elements.reviewForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function getSelectedRadio(name) {
    return elements.reviewForm.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function getSelectedValues(name) {
    return Array.from(elements.reviewForm.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
  }

  function goToIndex(index) {
    if (!questions.length) return;
    state.activeIndex = Math.max(0, Math.min(index, questions.length - 1));
    render();
  }

  function exportRows() {
    return questions.map((question) => {
      const review = state.reviews[question.question_id] || {};
      return {
        questionId: question.question_id,
        term: question.term || "",
        element: question.element || "",
        subskill: question.subskill || "",
        currentLevel: question.level || "",
        status: question.status || "",
        prompt: question.prompt || "",
        correctAnswer: question.correct_answer || "",
        decision: review.decision || "",
        reviewedLevel: review.difficulty || "",
        issues: (review.issues || []).join("; "),
        notes: review.notes || "",
        reviewedAt: review.reviewedAt || ""
      };
    });
  }

  function downloadJson() {
    const rows = exportRows();
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "Structure Spotter review.html",
      questionCount: questions.length,
      reviewedCount: rows.filter((row) => row.decision || row.reviewedLevel || row.issues || row.notes).length,
      rows
    };
    downloadFile(`structure-spotter-review-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function downloadCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
    ].join("\n");
    downloadFile(`structure-spotter-review-${dateStamp()}.csv`, csv, "text/csv");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function dateStamp() {
    const now = new Date();
    return [
      now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0")
    ].join("");
  }

  function capitalise(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", () => {
      state.search = elements.searchInput.value;
      renderQuestionList();
    });

    document.querySelectorAll("[data-level-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.levelFilter = button.dataset.levelFilter || "all";
        document.querySelectorAll("[data-level-filter]").forEach((filterButton) => {
          filterButton.classList.toggle("is-active", filterButton === button);
        });
        renderQuestionList();
      });
    });

    document.querySelectorAll("[data-element-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.elementFilter = button.dataset.elementFilter || "all";
        document.querySelectorAll("[data-element-filter]").forEach((filterButton) => {
          filterButton.classList.toggle("is-active", filterButton === button);
        });
        renderQuestionList();
      });
    });

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter || "all";
        document.querySelectorAll("[data-filter]").forEach((filterButton) => {
          filterButton.classList.toggle("is-active", filterButton === button);
        });
        renderQuestionList();
      });
    });

    elements.reviewNotes.addEventListener("input", () => {
      updateReview({ notes: elements.reviewNotes.value });
    });

    elements.reviewForm.addEventListener("change", () => {
      updateReview({
        decision: getSelectedRadio("decision"),
        difficulty: getSelectedRadio("difficulty"),
        issues: getSelectedValues("issue")
      });
    });

    elements.prevButton.addEventListener("click", () => goToIndex(state.activeIndex - 1));
    elements.nextButton.addEventListener("click", () => goToIndex(state.activeIndex + 1));
    elements.reloadButton.addEventListener("click", () => {
      const question = currentQuestion();
      if (question) loadQuestionIntoIframe(question);
    });

    elements.downloadJsonButton.addEventListener("click", downloadJson);
    elements.downloadCsvButton.addEventListener("click", downloadCsv);
    elements.clearReviewButton.addEventListener("click", () => {
      if (!window.confirm("Clear all locally saved Structure Spotter review notes?")) return;
      state.reviews = {};
      localStorage.removeItem(STORAGE_KEY);
      setSaveStatus("Local review cleared.");
      render();
    });

    window.addEventListener("message", handleFrameMessage);
  }

  function render() {
    renderSummary();
    renderQuestionList();
    renderCurrentQuestion();
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL, { headers: { Accept: "text/csv" } });
      if (!response.ok) throw new Error(`Structure Spotter data failed to load (${response.status}).`);
      const text = await response.text();
      questions = parseCsv(text);
    } catch (error) {
      document.body.innerHTML = `<main class="panel"><h1>Structure Spotter questions could not be loaded.</h1><p>${escapeHtml(error?.message || "")}</p></main>`;
      return;
    }

    if (!questions.length) {
      document.body.innerHTML = "<main class=\"panel\"><h1>Structure Spotter questions could not be loaded.</h1></main>";
      return;
    }

    bindEvents();
    render();
  }

  init();
}());
