(function () {
  const STORAGE_KEY = "echoaural.textureTrainer.review.v1";
  const LEVELS = ["Foundation", "Developing", "Securing", "Mastering"];
  const DECISIONS = ["keep", "edit", "drop"];
  const TEXTURE_CHOICE_FALLBACKS = [
    "Monophonic",
    "Homophonic",
    "Polyphonic",
    "Contrapuntal",
    "Imitative",
    "Fugal",
    "Canon",
    "Unison",
    "Octaves",
    "Melody and accompaniment",
    "Chordal homophony",
    "Antiphonal",
    "Heterophonic",
    "Layered texture",
    "Solo and tutti",
    "Parallel motion"
  ];
  const TextureQuestionSystem = window.EchoAuralTextureQuestionSystem || null;

  const rawQuestions = Array.isArray(window.textureQuestions) ? window.textureQuestions : [];
  const questions = rawQuestions.map((question, index) => (
    TextureQuestionSystem?.normaliseQuestion
      ? TextureQuestionSystem.normaliseQuestion(question, index)
      : question
  ));
  const state = {
    activeIndex: 0,
    filter: "all",
    levelFilter: "all",
    search: "",
    revealed: true,
    reviews: loadReviews()
  };

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
    questionPrompt: document.getElementById("questionPrompt"),
    questionDetails: document.getElementById("questionDetails"),
    answerChoicePreview: document.getElementById("answerChoicePreview"),
    playClipButton: document.getElementById("playClipButton"),
    audioStatus: document.getElementById("audioStatus"),
    audioPlayer: document.getElementById("audioPlayer"),
    trialAnswer: document.getElementById("trialAnswer"),
    markTrialButton: document.getElementById("markTrialButton"),
    trialMarkResult: document.getElementById("trialMarkResult"),
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
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveReviews() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews, null, 2));
    setSaveStatus("Saved locally.");
  }

  function setSaveStatus(message) {
    if (!elements.saveStatus) return;
    elements.saveStatus.textContent = message;
  }

  function currentQuestion() {
    return questions[state.activeIndex] || null;
  }

  function getReview(question = currentQuestion()) {
    if (!question) return {};
    if (!state.reviews[question.id]) {
      state.reviews[question.id] = {
        questionId: question.id,
        decision: "",
        difficulty: "",
        issues: [],
        trialAnswer: "",
        notes: "",
        reviewedAt: ""
      };
    }
    return state.reviews[question.id];
  }

  function updateReview(patch = {}) {
    const question = currentQuestion();
    if (!question) return;

    state.reviews[question.id] = {
      ...getReview(question),
      ...patch,
      questionId: question.id,
      reviewedAt: new Date().toISOString()
    };

    saveReviews();
    renderSummary();
    renderQuestionList();
    renderCurrentQuestion({ keepReveal: true, keepAudio: true });
  }

  function reviewIsComplete(review = {}) {
    return Boolean(review.decision || review.difficulty || review.notes || review.trialAnswer || (review.issues || []).length);
  }

  function getFilteredQuestions() {
    const search = state.search.trim().toLowerCase();

    return questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => {
        const review = state.reviews[question.id] || {};
        if (state.levelFilter !== "all" && question.level !== state.levelFilter) return false;
        if (state.filter === "unreviewed" && reviewIsComplete(review)) return false;
        if (state.filter === "drop" && review.decision !== "drop") return false;
        if (!search) return true;

        const haystack = [
          question.id,
          question.title,
          question.prompt,
          question.textureFocus,
          question.level,
          question.responseType,
          question.preferredAnswer,
          question.correctChoice,
          question.work,
          question.performer,
          question.modelAnswer
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      });
  }

  function renderSummary() {
    const reviews = questions.map((question) => state.reviews[question.id] || {});
    const reviewed = reviews.filter(reviewIsComplete).length;
    const drop = reviews.filter((review) => review.decision === "drop").length;

    elements.totalCount.textContent = String(questions.length);
    elements.reviewedCount.textContent = String(reviewed);
    elements.dropCount.textContent = String(drop);
    if (elements.levelCountSummary) {
      elements.levelCountSummary.textContent = LEVELS
        .map((level) => `${level}: ${questions.filter((question) => question.level === level).length}`)
        .join(" · ");
    }
  }

  function renderQuestionList() {
    const rows = getFilteredQuestions();

    elements.questionList.innerHTML = rows.length
      ? rows.map(({ question, index }) => {
        const review = state.reviews[question.id] || {};
        const decisionClass = review.decision ? `decision-${review.decision}` : "";
        const decisionLabel = review.decision || "unreviewed";
        const currentLevelLabel = question.level || "level unset";
        const responseLabel = formatResponseType(question.responseType);
        const reviewDifficultyLabel = review.difficulty ? `review: ${review.difficulty}` : "review difficulty unset";
        const activeClass = index === state.activeIndex ? " is-active" : "";

        return `
          <button class="question-button${activeClass}" type="button" data-index="${index}">
            <strong>${escapeHtml(question.id)} · ${escapeHtml(question.title || "Untitled question")}</strong>
            <small>${escapeHtml(question.prompt || question.textureFocus || "Texture question")}</small>
            <span class="question-tags">
              <span class="${decisionClass}">${escapeHtml(decisionLabel)}</span>
              <span>${escapeHtml(currentLevelLabel)}</span>
              <span>${escapeHtml(responseLabel)}</span>
              <span>${escapeHtml(reviewDifficultyLabel)}</span>
            </span>
          </button>
        `;
      }).join("")
      : `<p class="save-status">No questions match this filter.</p>`;

    elements.questionList.querySelectorAll(".question-button").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        if (!Number.isFinite(index)) return;
        state.activeIndex = index;
        state.revealed = true;
        render();
      });
    });
  }

  function renderCurrentQuestion(options = {}) {
    const question = currentQuestion();
    if (!question) return;

    const review = getReview(question);
    elements.questionPosition.textContent = `Question ${state.activeIndex + 1} / ${questions.length}`;
    elements.questionLevelBadge.textContent = `${question.level || "Level unset"} · ${formatResponseType(question.responseType)}`;
    elements.questionId.textContent = question.id;
    elements.questionTitle.textContent = question.title || "Untitled texture question";
    elements.questionPrompt.textContent = question.prompt || "Listen and answer the question.";
    elements.questionDetails.textContent = `${question.maxMarks || 1} ${Number(question.maxMarks) === 1 ? "mark" : "marks"} · Current bank level: ${question.level || "unset"} · ${question.textureFocus || question.broadTextureCategory || "Texture focus unset"}`;
    if (!options.keepAudio || elements.audioPlayer.dataset.questionId !== question.id) {
      elements.audioPlayer.pause();
      elements.audioPlayer.src = resolveAudioPath(question.audio);
      elements.audioPlayer.dataset.questionId = question.id;
      elements.audioPlayer.dataset.clipStart = String(Number(question.clipStart) || 0);
      elements.audioPlayer.dataset.clipEnd = String(Number(question.clipEnd) || 0);
      elements.audioPlayer.load();
      updatePlaybackUi("Ready to play.");
    }
    elements.trialAnswer.value = review.trialAnswer || "";
    renderTrialMarkResult();
    elements.reviewNotes.value = review.notes || "";
    elements.prevButton.disabled = state.activeIndex <= 0;
    elements.nextButton.textContent = state.activeIndex >= questions.length - 1 ? "Finish review" : "Next question";
    elements.revealButton.textContent = state.revealed ? "Hide mark scheme" : "Reveal mark scheme";
    elements.markscheme.hidden = !state.revealed;
    renderAnswerChoicePreview(question);

    setCheckedRadio("decision", review.decision);
    setCheckedRadio("difficulty", review.difficulty);
    setCheckedIssues(review.issues || []);
    renderMarkscheme(question);
    renderSourceSummary(question);
  }

  function formatResponseType(responseType = "") {
    if (responseType === "multiple-choice") return "Multiple choice";
    if (responseType === "short-text") return "Short written answer";
    if (responseType === "extended-text") return "Extended written answer";
    return "Answer mode unset";
  }

  function resolveAudioPath(audioPath = "") {
    const cleanPath = String(audioPath || "").trim();
    if (!cleanPath) return "";
    if (/^(https?:)?\/\//i.test(cleanPath) || cleanPath.startsWith("/")) return cleanPath;
    return cleanPath;
  }

  function uniqueChoiceLabels(choices = []) {
    const uniqueChoices = [];
    choices.forEach((choice) => {
      const label = String(choice || "").trim();
      if (!label) return;
      if (uniqueChoices.some((existingChoice) => TextureQuestionSystem?.sameAnswer?.(existingChoice, label) || existingChoice.toLowerCase() === label.toLowerCase())) return;
      uniqueChoices.push(label);
    });
    return uniqueChoices;
  }

  function getEffectiveMultipleChoiceOptions(question) {
    if (question.responseType !== "multiple-choice") return [];
    const configuredChoices = uniqueChoiceLabels([
      ...(question.answerChoices || []),
      ...(question.answerOptions || [])
    ]);
    const correctChoice = String(question.correctChoice || question.preferredAnswer || configuredChoices[0] || "").trim();
    const configuredHasCorrect = configuredChoices.some((choice) => TextureQuestionSystem?.sameAnswer?.(choice, correctChoice) || choice.toLowerCase() === correctChoice.toLowerCase());
    const baseChoices = uniqueChoiceLabels([
      ...(configuredHasCorrect ? configuredChoices : [correctChoice, ...configuredChoices]),
      ...TEXTURE_CHOICE_FALLBACKS
    ]);
    const displayedCorrectChoice = baseChoices.find((choice) => TextureQuestionSystem?.sameAnswer?.(choice, correctChoice) || choice.toLowerCase() === correctChoice.toLowerCase()) || baseChoices[0] || correctChoice;
    const distractors = baseChoices
      .filter((choice) => !(TextureQuestionSystem?.isChoiceEquivalentToCorrect?.(choice, question, displayedCorrectChoice) || choice.toLowerCase() === displayedCorrectChoice.toLowerCase()))
      .slice(0, 3);
    return uniqueChoiceLabels([displayedCorrectChoice, ...distractors]).slice(0, 4);
  }

  function renderAnswerChoicePreview(question) {
    if (!elements.answerChoicePreview) return;
    const choices = getEffectiveMultipleChoiceOptions(question);
    if (question.responseType !== "multiple-choice") {
      elements.answerChoicePreview.innerHTML = `
        <span class="answer-mode-label">${escapeHtml(formatResponseType(question.responseType))}</span>
        <p>Written answer expected. Use the trial answer box to test the current automatic marker.</p>
      `;
      return;
    }

    elements.answerChoicePreview.innerHTML = `
      <span class="answer-mode-label">Multiple-choice answers</span>
      <div class="choice-preview-grid">
        ${choices.map((choice) => `
          <span class="choice-pill${TextureQuestionSystem?.sameAnswer?.(choice, question.correctChoice) ? " is-correct" : ""}">
            ${escapeHtml(choice)}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderTrialMarkResult() {
    if (!elements.trialMarkResult) return;
    const question = currentQuestion();
    const answer = elements.trialAnswer?.value || "";
    if (!question || !answer.trim()) {
      elements.trialMarkResult.textContent = "Use this to test the current automatic marker.";
      elements.trialMarkResult.className = "trial-mark-result";
      return;
    }
    if (!TextureQuestionSystem?.markAnswer) {
      elements.trialMarkResult.textContent = "Automatic marker helper is not available on this review page.";
      elements.trialMarkResult.className = "trial-mark-result";
      return;
    }

    const result = TextureQuestionSystem.markAnswer(question, answer);
    const missing = Array.isArray(result.missingConcepts) && result.missingConcepts.length
      ? ` Missing: ${result.missingConcepts.slice(0, 3).join(", ")}.`
      : "";
    elements.trialMarkResult.textContent = `${result.label}: ${result.marksAwarded}/${result.maxMarks}.${missing} ${result.feedback || ""}`.trim();
    elements.trialMarkResult.className = `trial-mark-result is-${result.status || "unchecked"}`;
  }

  function renderSourceSummary(question) {
    if (!elements.sourceSummaryContent) return;
    const rows = [
      ["ID", question.id],
      ["Current level", question.level],
      ["Response mode", formatResponseType(question.responseType)],
      ["Preferred answer", question.preferredAnswer],
      ["Correct choice", question.correctChoice],
      ["Broad category", question.broadTextureCategory],
      ["Specific term", question.specificTextureTerm],
      ["Audio", question.audio],
      ["Timing", timingText(question)],
      ["Source", sourceText(question)]
    ].filter(([, value]) => String(value || "").trim());

    elements.sourceSummaryContent.innerHTML = rows.map(([label, value]) => `
      <div class="source-row">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </div>
    `).join("");
  }

  function timingText(question) {
    const start = Number(question.clipStart) || 0;
    const end = Number(question.clipEnd) || 0;
    const duration = Number(question.clipDuration || question.audioDurationSeconds) || 0;
    if (end > start) return `${start}s–${end}s`;
    if (duration) return `${duration}s`;
    return "";
  }

  function renderMarkscheme(question) {
    const effectiveChoices = getEffectiveMultipleChoiceOptions(question);
    const sections = [
      ["Model answer", question.modelAnswer],
      ["Accepted answers", listText(question.acceptedAnswers)],
      ["Partial answers", listText(question.partialAnswers)],
      ["Accepted written answers", listText(question.acceptedWrittenAnswers)],
      ["Current multiple-choice options", listText(effectiveChoices.length ? effectiveChoices : question.answerChoices)],
      ["Incorrect examples", listText(question.incorrectAnswers)],
      ["Mark points", markPointsText(question.markPoints)],
      ["Correct feedback", question.feedbackCorrect],
      ["Partial feedback", question.feedbackPartial],
      ["Incorrect feedback", question.feedbackIncorrect],
      ["Vocabulary tip", question.vocabularyTip],
      ["Source", sourceText(question)]
    ].filter(([, value]) => String(value || "").trim());

    elements.markschemeContent.innerHTML = sections.map(([label, value]) => `
      <div class="markscheme-section">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </div>
    `).join("");
  }

  function listText(values) {
    return Array.isArray(values) ? values.join("; ") : "";
  }

  function markPointsText(points) {
    if (!Array.isArray(points) || !points.length) return "";
    return points.map((point) => {
      const accepted = listText(point.acceptedAnswers);
      const partial = listText(point.partialAnswers);
      return `${point.label || "Point"} — accepted: ${accepted || "—"}${partial ? `; partial: ${partial}` : ""}`;
    }).join(" | ");
  }

  function sourceText(question) {
    return [
      question.work,
      question.performer,
      question.source,
      question.rights,
      question.audio
    ].filter(Boolean).join(" · ");
  }

  function setCheckedRadio(name, value) {
    elements.reviewForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = input.value === value;
    });
  }

  function setCheckedIssues(values = []) {
    const selected = new Set(values);
    elements.reviewForm.querySelectorAll('input[name="issue"]').forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function getSelectedRadio(name) {
    return elements.reviewForm.querySelector(`input[name="${name}"]:checked`)?.value || "";
  }

  function getSelectedIssues() {
    return Array.from(elements.reviewForm.querySelectorAll('input[name="issue"]:checked')).map((input) => input.value);
  }

  function goToIndex(index) {
    if (!questions.length) return;
    state.activeIndex = Math.max(0, Math.min(index, questions.length - 1));
    state.revealed = true;
    render();
  }

  function exportRows() {
    return questions.map((question) => {
      const review = state.reviews[question.id] || {};
      return {
        questionId: question.id,
        title: question.title || "",
        audio: question.audio || "",
        textureFocus: question.textureFocus || "",
        currentLevel: question.level || "",
        responseType: question.responseType || "",
        preferredAnswer: question.preferredAnswer || "",
        correctChoice: question.correctChoice || "",
        currentMaxMarks: question.maxMarks || "",
        currentModelAnswer: question.modelAnswer || "",
        decision: review.decision || "",
        reviewedDifficulty: review.difficulty || "",
        issues: (review.issues || []).join("; "),
        trialAnswer: review.trialAnswer || "",
        notes: review.notes || "",
        reviewedAt: review.reviewedAt || ""
      };
    });
  }

  function downloadJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "Texture Trainer review.html",
      questionCount: questions.length,
      reviewedCount: exportRows().filter((row) => row.decision || row.reviewedDifficulty || row.issues || row.trialAnswer || row.notes).length,
      rows: exportRows()
    };
    downloadFile(`texture-trainer-review-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function downloadCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
    ].join("\n");
    downloadFile(`texture-trainer-review-${dateStamp()}.csv`, csv, "text/csv");
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
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }

  function dateStamp() {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0")
    ].join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", () => {
      state.search = elements.searchInput.value;
      renderQuestionList();
    });

    document.querySelectorAll(".filter-button").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.levelFilter) {
          state.levelFilter = button.dataset.levelFilter || "all";
          document.querySelectorAll("[data-level-filter]").forEach((filterButton) => {
            filterButton.classList.toggle("is-active", filterButton === button);
          });
          renderQuestionList();
          return;
        }

        state.filter = button.dataset.filter || "all";
        document.querySelectorAll("[data-filter]").forEach((filterButton) => {
          filterButton.classList.toggle("is-active", filterButton === button);
        });
        renderQuestionList();
      });
    });

    elements.trialAnswer.addEventListener("input", () => {
      updateReview({ trialAnswer: elements.trialAnswer.value });
    });

    elements.markTrialButton.addEventListener("click", renderTrialMarkResult);

    elements.reviewNotes.addEventListener("input", () => {
      updateReview({ notes: elements.reviewNotes.value });
    });

    elements.reviewForm.addEventListener("change", () => {
      updateReview({
        decision: getSelectedRadio("decision"),
        difficulty: getSelectedRadio("difficulty"),
        issues: getSelectedIssues()
      });
    });

    elements.prevButton.addEventListener("click", () => goToIndex(state.activeIndex - 1));
    elements.nextButton.addEventListener("click", () => goToIndex(state.activeIndex + 1));

    elements.playClipButton.addEventListener("click", () => {
      if (!elements.audioPlayer.src) {
        updatePlaybackUi("No audio file set for this question.");
        return;
      }

      if (!elements.audioPlayer.paused) {
        elements.audioPlayer.pause();
        updatePlaybackUi("Paused.");
        return;
      }

      const clipStart = Number(elements.audioPlayer.dataset.clipStart) || 0;
      const clipEnd = Number(elements.audioPlayer.dataset.clipEnd) || 0;
      if (clipStart > 0 && (elements.audioPlayer.currentTime < clipStart || (clipEnd > clipStart && elements.audioPlayer.currentTime >= clipEnd))) {
        elements.audioPlayer.currentTime = clipStart;
      }

      const playAttempt = elements.audioPlayer.play();
      updatePlaybackUi("Playing clip…");

      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => {
          updatePlaybackUi("Audio could not play. Try the small audio controls below.");
        });
      }
    });

    elements.audioPlayer.addEventListener("play", () => {
      const clipStart = Number(elements.audioPlayer.dataset.clipStart) || 0;
      const clipEnd = Number(elements.audioPlayer.dataset.clipEnd) || 0;
      if (clipStart > 0 && (elements.audioPlayer.currentTime < clipStart || (clipEnd > clipStart && elements.audioPlayer.currentTime >= clipEnd))) {
        elements.audioPlayer.currentTime = clipStart;
      }
      updatePlaybackUi("Playing clip…");
    });
    elements.audioPlayer.addEventListener("pause", () => {
      if (!elements.audioPlayer.ended) updatePlaybackUi("Paused.");
    });
    elements.audioPlayer.addEventListener("ended", () => updatePlaybackUi("Clip finished."));
    elements.audioPlayer.addEventListener("error", () => updatePlaybackUi("Audio failed to load."));
    elements.audioPlayer.addEventListener("timeupdate", () => {
      const clipStart = Number(elements.audioPlayer.dataset.clipStart) || 0;
      const clipEnd = Number(elements.audioPlayer.dataset.clipEnd) || 0;
      if (clipEnd > clipStart && elements.audioPlayer.currentTime >= clipEnd) {
        elements.audioPlayer.pause();
        elements.audioPlayer.currentTime = clipEnd;
        updatePlaybackUi("Clip finished.");
      }
    });

    elements.revealButton.addEventListener("click", () => {
      state.revealed = !state.revealed;
      renderCurrentQuestion({ keepReveal: true, keepAudio: true });
    });

    elements.downloadJsonButton.addEventListener("click", downloadJson);
    elements.downloadCsvButton.addEventListener("click", downloadCsv);
    elements.clearReviewButton.addEventListener("click", () => {
      if (!window.confirm("Clear all locally saved Texture Trainer review notes?")) return;
      state.reviews = {};
      localStorage.removeItem(STORAGE_KEY);
      state.revealed = true;
      setSaveStatus("Local review cleared.");
      render();
    });
  }

  function updatePlaybackUi(status) {
    const isPlaying = elements.audioPlayer && !elements.audioPlayer.paused;
    elements.playClipButton.textContent = isPlaying ? "Pause Clip" : "Play Clip";
    elements.audioStatus.textContent = status || (isPlaying ? "Playing clip…" : "Ready to play.");
  }

  function render() {
    renderSummary();
    renderQuestionList();
    renderCurrentQuestion();
  }

  if (!questions.length) {
    document.body.innerHTML = "<main class=\"panel\"><h1>Texture Trainer questions could not be loaded.</h1></main>";
    return;
  }

  bindEvents();
  render();
}());
