// Generic review engine shared by all 4 draft-content reviewers. Reads
// window.EAReviewDraftQuestions (set by each app's own -draft.js data file)
// and window.EAReviewConfig ({ appKey, appLabel, brandApp }) set inline by
// each app's HTML page. Nothing here touches any live app file or data.
(function () {
  "use strict";

  var config = window.EAReviewConfig || { appKey: "app", appLabel: "App", brandApp: "" };
  window.EAReviewShell.build(config);

  var STORAGE_KEY = "echoaural.reviewStaging." + config.appKey + ".v1";
  var LEVELS = ["Foundation", "Developing", "Securing", "Mastering"];

  var questions = Array.isArray(window.EAReviewDraftQuestions) ? window.EAReviewDraftQuestions : [];

  var state = {
    activeIndex: 0,
    filter: "all",
    levelFilter: "all",
    search: "",
    revealed: false,
    reviews: loadReviews()
  };

  var els = {
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
    questionPrompt: document.getElementById("questionPrompt"),
    questionDetails: document.getElementById("questionDetails"),
    answerChoicePreview: document.getElementById("answerChoicePreview"),
    playClipButton: document.getElementById("playClipButton"),
    audioStatus: document.getElementById("audioStatus"),
    audioPlayer: document.getElementById("audioPlayer"),
    clipStartInput: document.getElementById("clipStartInput"),
    clipEndInput: document.getElementById("clipEndInput"),
    setStartToCurrentButton: document.getElementById("setStartToCurrentButton"),
    setEndToCurrentButton: document.getElementById("setEndToCurrentButton"),
    fullDuration: document.getElementById("fullDuration"),
    prevButton: document.getElementById("prevButton"),
    revealButton: document.getElementById("revealButton"),
    nextButton: document.getElementById("nextButton"),
    reviewForm: document.getElementById("reviewForm"),
    reviewNotes: document.getElementById("reviewNotes"),
    markscheme: document.getElementById("markscheme"),
    markschemeContent: document.getElementById("markschemeContent"),
    sourceSummaryContent: document.getElementById("sourceSummaryContent"),
    downloadJsonButton: document.getElementById("downloadJsonButton"),
    downloadCsvButton: document.getElementById("downloadCsvButton"),
    clearReviewButton: document.getElementById("clearReviewButton"),
    saveStatus: document.getElementById("saveStatus")
  };

  function loadReviews() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) { return {}; }
  }

  function saveReviews() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews, null, 2));
    setSaveStatus("Saved locally.");
  }

  function setSaveStatus(msg) {
    els.saveStatus.textContent = msg;
  }

  function getReview(question) {
    if (!state.reviews[question.id]) {
      state.reviews[question.id] = {
        decision: "",
        level: question.level,
        clipStart: question.clipStart,
        clipEnd: question.clipEnd,
        issues: [],
        notes: ""
      };
    }
    return state.reviews[question.id];
  }

  function currentQuestion() {
    var list = filteredQuestions();
    return list[state.activeIndex] || null;
  }

  function filteredQuestions() {
    return questions.filter(function (q) {
      var review = state.reviews[q.id];
      if (state.levelFilter !== "all") {
        var effectiveLevel = (review && review.level) || q.level;
        if (effectiveLevel !== state.levelFilter) return false;
      }
      if (state.filter === "unreviewed" && review && review.decision) return false;
      if (state.filter === "drop" && !(review && review.decision === "drop")) return false;
      if (state.search) {
        var haystack = (q.id + " " + q.trackTitle + " " + q.question + " " + q.subStyle).toLowerCase();
        if (haystack.indexOf(state.search.toLowerCase()) === -1) return false;
      }
      return true;
    });
  }

  function renderSummary() {
    els.totalCount.textContent = String(questions.length);
    var reviewed = 0, dropped = 0;
    var byLevel = {};
    questions.forEach(function (q) {
      var review = state.reviews[q.id];
      if (review && review.decision) reviewed++;
      if (review && review.decision === "drop") dropped++;
      var lvl = (review && review.level) || q.level;
      byLevel[lvl] = (byLevel[lvl] || 0) + 1;
    });
    els.reviewedCount.textContent = String(reviewed);
    els.dropCount.textContent = String(dropped);
    els.levelCountSummary.textContent = LEVELS.map(function (lvl) { return lvl + ": " + (byLevel[lvl] || 0); }).join(" · ");
  }

  function renderList() {
    var list = filteredQuestions();
    els.questionList.innerHTML = list.map(function (q, i) {
      var review = state.reviews[q.id];
      var decision = review && review.decision;
      var cls = "question-row" + (i === state.activeIndex ? " is-active" : "") + (decision ? " has-decision is-" + decision : "");
      return (
        '<button class="' + cls + '" type="button" data-index="' + i + '">' +
        '<strong>' + q.id + '</strong>' +
        '<span>' + escapeHtml(q.trackTitle) + '</span>' +
        '<small>' + ((review && review.level) || q.level) + (decision ? " · " + decision : "") + '</small>' +
        '</button>'
      );
    }).join("");
    Array.prototype.forEach.call(els.questionList.querySelectorAll("[data-index]"), function (btn) {
      btn.addEventListener("click", function () {
        state.activeIndex = Number(btn.dataset.index);
        renderCurrentQuestion();
        renderList();
      });
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderAnswerChoicePreview(question) {
    if (!question.options || !question.options.length) {
      els.answerChoicePreview.innerHTML = "";
      return;
    }
    els.answerChoicePreview.innerHTML =
      '<span class="choice-preview-label">Options</span>' +
      '<div class="choice-preview-grid">' +
      question.options.map(function (opt) { return '<span class="choice-pill">' + escapeHtml(opt) + '</span>'; }).join("") +
      '</div>';
  }

  function renderMarkscheme(question) {
    els.markschemeContent.innerHTML =
      '<p>' + escapeHtml(question.answer || "No marking guidance provided.") + '</p>';
  }

  function renderSourceSummary(question) {
    var rows = [
      ["AoS", question.aos],
      ["Cambridge topic", question.cambridgeTopic],
      ["Sub-style", question.subStyle],
      ["Clip file", question.clipFilename],
      ["Other takes", question.otherTakes],
      ["Feature tag", question.featureTag],
      ["Tracker status", question.status]
    ];
    els.sourceSummaryContent.innerHTML = rows.map(function (r) {
      if (!r[1]) return "";
      return '<div class="source-row"><span>' + r[0] + '</span><strong>' + escapeHtml(r[1]) + '</strong></div>';
    }).join("");
  }

  function setCheckedRadio(name, value) {
    var inputs = els.reviewForm.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (input) { input.checked = input.value === value; });
  }

  function setCheckedIssues(issues) {
    var inputs = els.reviewForm.querySelectorAll('input[name="issue"]');
    Array.prototype.forEach.call(inputs, function (input) { input.checked = issues.indexOf(input.value) !== -1; });
  }

  function renderCurrentQuestion() {
    var question = currentQuestion();
    var list = filteredQuestions();
    if (!question) {
      els.questionTitle.textContent = "No questions match this filter.";
      els.questionPrompt.textContent = "";
      return;
    }
    var review = getReview(question);

    els.questionPosition.textContent = "Question " + (state.activeIndex + 1) + " / " + list.length;
    els.questionLevelBadge.textContent = (review.level || question.level) + " · " + (question.type || "Type unset");
    els.questionId.textContent = question.id;
    els.questionTitle.textContent = question.trackTitle || "Untitled";
    els.questionPrompt.textContent = question.question || "";
    els.questionDetails.textContent = question.marks + (Number(question.marks) === 1 ? " mark" : " marks") + " · " + question.subStyle;

    if (els.audioPlayer.dataset.questionId !== question.id) {
      els.audioPlayer.pause();
      els.audioPlayer.src = question.audio;
      els.audioPlayer.dataset.questionId = question.id;
      els.audioPlayer.load();
      els.fullDuration.textContent = question.clipDuration ? formatTime(question.clipDuration) : "—";
      updatePlaybackUi("Ready to play.");
    }
    els.clipStartInput.value = review.clipStart;
    els.clipEndInput.value = review.clipEnd;

    renderAnswerChoicePreview(question);
    els.prevButton.disabled = state.activeIndex <= 0;
    els.nextButton.textContent = state.activeIndex >= list.length - 1 ? "Finish review" : "Next question";
    els.revealButton.textContent = state.revealed ? "Hide answer" : "Reveal answer";
    els.markscheme.hidden = !state.revealed;

    els.reviewNotes.value = review.notes || "";
    setCheckedRadio("decision", review.decision);
    setCheckedRadio("level", review.level);
    setCheckedIssues(review.issues || []);
    renderMarkscheme(question);
    renderSourceSummary(question);
  }

  function formatTime(seconds) {
    var s = Math.round(Number(seconds) || 0);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function updatePlaybackUi(message) {
    els.audioStatus.textContent = message;
    els.playClipButton.textContent = "Play Clip";
  }

  // ---------- Clip-bounded playback ----------

  els.playClipButton.addEventListener("click", function () {
    var question = currentQuestion();
    if (!question) return;
    if (els.audioPlayer.paused) {
      var start = Number(els.clipStartInput.value) || 0;
      els.audioPlayer.currentTime = start;
      els.audioPlayer.play();
      els.playClipButton.textContent = "Pause Clip";
      els.audioStatus.textContent = "Playing clip window…";
    } else {
      els.audioPlayer.pause();
      els.playClipButton.textContent = "Play Clip";
      els.audioStatus.textContent = "Paused.";
    }
  });

  els.audioPlayer.addEventListener("timeupdate", function () {
    var end = Number(els.clipEndInput.value) || 0;
    var start = Number(els.clipStartInput.value) || 0;
    if (end > start && els.audioPlayer.currentTime >= end) {
      els.audioPlayer.pause();
      els.audioPlayer.currentTime = start;
      els.playClipButton.textContent = "Play Clip";
      els.audioStatus.textContent = "Clip finished.";
    }
  });

  els.audioPlayer.addEventListener("pause", function () {
    els.playClipButton.textContent = "Play Clip";
  });

  els.setStartToCurrentButton.addEventListener("click", function () {
    els.clipStartInput.value = Math.round(els.audioPlayer.currentTime * 10) / 10;
    persistClipEdit();
  });
  els.setEndToCurrentButton.addEventListener("click", function () {
    els.clipEndInput.value = Math.round(els.audioPlayer.currentTime * 10) / 10;
    persistClipEdit();
  });
  els.clipStartInput.addEventListener("change", persistClipEdit);
  els.clipEndInput.addEventListener("change", persistClipEdit);

  function persistClipEdit() {
    var question = currentQuestion();
    if (!question) return;
    var review = getReview(question);
    review.clipStart = Number(els.clipStartInput.value) || 0;
    review.clipEnd = Number(els.clipEndInput.value) || 0;
    saveReviews();
  }

  // ---------- Navigation ----------

  els.prevButton.addEventListener("click", function () {
    if (state.activeIndex > 0) { state.activeIndex--; renderCurrentQuestion(); renderList(); }
  });
  els.nextButton.addEventListener("click", function () {
    var list = filteredQuestions();
    if (state.activeIndex < list.length - 1) { state.activeIndex++; renderCurrentQuestion(); renderList(); }
  });
  els.revealButton.addEventListener("click", function () {
    state.revealed = !state.revealed;
    els.markscheme.hidden = !state.revealed;
    els.revealButton.textContent = state.revealed ? "Hide answer" : "Reveal answer";
  });

  // ---------- Filters ----------

  els.searchInput.addEventListener("input", function () {
    state.search = els.searchInput.value;
    state.activeIndex = 0;
    renderList();
    renderCurrentQuestion();
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-level-filter]"), function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-level-filter]").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      state.levelFilter = btn.dataset.levelFilter;
      state.activeIndex = 0;
      renderList();
      renderCurrentQuestion();
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-filter]"), function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-filter]").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      state.filter = btn.dataset.filter;
      state.activeIndex = 0;
      renderList();
      renderCurrentQuestion();
    });
  });

  // ---------- Review form ----------

  els.reviewForm.addEventListener("change", function (event) {
    var question = currentQuestion();
    if (!question) return;
    var review = getReview(question);
    if (event.target.name === "decision") review.decision = event.target.value;
    if (event.target.name === "level") review.level = event.target.value;
    if (event.target.name === "issue") {
      var issues = new Set(review.issues || []);
      if (event.target.checked) issues.add(event.target.value); else issues.delete(event.target.value);
      review.issues = Array.from(issues);
    }
    saveReviews();
    renderSummary();
    renderList();
    els.questionLevelBadge.textContent = (review.level || question.level) + " · " + (question.type || "Type unset");
  });

  els.reviewNotes.addEventListener("input", function () {
    var question = currentQuestion();
    if (!question) return;
    getReview(question).notes = els.reviewNotes.value;
    saveReviews();
  });

  // ---------- Export ----------

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildExportRows() {
    return questions.map(function (q) {
      var review = state.reviews[q.id] || {};
      return {
        id: q.id,
        trackTitle: q.trackTitle,
        clipFilename: q.clipFilename,
        question: q.question,
        type: q.type,
        marks: q.marks,
        draftLevel: q.level,
        reviewedLevel: review.level || q.level,
        clipStart: review.clipStart != null ? review.clipStart : q.clipStart,
        clipEnd: review.clipEnd != null ? review.clipEnd : q.clipEnd,
        decision: review.decision || "",
        issues: (review.issues || []).join(";"),
        notes: review.notes || ""
      };
    });
  }

  els.downloadJsonButton.addEventListener("click", function () {
    downloadFile(config.appKey + "-review.json", JSON.stringify(buildExportRows(), null, 2), "application/json");
  });

  els.downloadCsvButton.addEventListener("click", function () {
    var rows = buildExportRows();
    var headers = Object.keys(rows[0] || { id: "" });
    var csv = [headers.join(",")].concat(rows.map(function (r) {
      return headers.map(function (h) {
        var v = String(r[h] == null ? "" : r[h]).replace(/"/g, '""');
        return /[",\n]/.test(v) ? '"' + v + '"' : v;
      }).join(",");
    })).join("\n");
    downloadFile(config.appKey + "-review.csv", csv, "text/csv");
  });

  els.clearReviewButton.addEventListener("click", function () {
    if (!confirm("Clear all local review decisions for " + config.appLabel + "? This cannot be undone.")) return;
    state.reviews = {};
    saveReviews();
    renderCurrentQuestion();
    renderList();
    renderSummary();
  });

  // ---------- Init ----------

  renderSummary();
  renderList();
  renderCurrentQuestion();
  setSaveStatus(questions.length ? "Loaded " + questions.length + " draft questions." : "No draft questions found.");
})();
