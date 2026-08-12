(function () {
  const STORAGE_KEY = "echoaural.meterMaster.review.v1";
  const DATA_URL = "data/meter-master-exam-style-60.json";
  const LEVELS = ["Foundation", "Developing", "Securing", "Mastering"];
  // MMX062-MMX100 (the "GOOD MORNIN JIMMY WORK!" CIE batch) were already reviewed via
  // meter-master-new50-review-202608121043.json and merged into the app on 2026-08-12 —
  // skip them here so they don't come up for review again.
  const ALREADY_REVIEWED_MAX_ID = 61;

  // --- Choice tables and helpers, copied from script.js so the preview here
  // matches exactly what a student sees in the live app (section: keep the
  // review tool honest — it must render off the SAME logic, not a guess). ---
  const FULL_METRE_CHOICES = [
    "Simple duple", "Simple triple", "Simple quadruple",
    "Compound duple", "Compound triple", "Compound quadruple",
    "Irregular quintuple"
  ];
  const TIME_SIGNATURE_CHOICES = ["2/2", "2/4", "3/4", "4/4", "5/4", "6/8", "12/8"];
  const BEAT_COUNT_CHOICES = ["2", "3", "4", "5"];
  const BEAT_UNIT_CHOICES = ["Minim", "Crotchet", "Dotted crotchet", "Quaver"];
  const NOTATION_FEATURE_CHOICES = [
    "Two crotchet beats", "Three crotchet beats", "Four crotchet beats",
    "Two dotted-crotchet beats", "Four dotted-crotchet beats", "Five crotchets grouped unevenly"
  ];
  const RHYTHM_FEATURE_CHOICES = [
    "2/4 and simple duple", "3/4 and simple triple", "4/4 and simple quadruple",
    "2/2 and simple duple", "6/8 and compound duple", "12/8 and compound quadruple",
    "5/4 and irregular quintuple"
  ];
  const COMPOUND_EXPLANATION_CHOICES = [
    "Two main beats divided into threes", "Three crotchet beats divided into twos",
    "Four crotchet beats with simple division", "Five crotchets grouped unevenly"
  ];

  function normaliseText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[-–—]/g, " ")
      .replace(/[^a-z0-9/+\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayCase(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d+\/\d+$/.test(raw)) return raw;
    if (/^\d+$/.test(raw)) return raw;
    return raw.toLowerCase().split(" ").filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  function stableHash(value) {
    const text = String(value || "");
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function stableShuffle(list, seed) {
    return list
      .map((item) => ({ item, score: stableHash(`${seed}:${item}`) }))
      .sort((first, second) => first.score - second.score)
      .map((entry) => entry.item);
  }

  function uniqueChoices(choices) {
    const seen = new Set();
    return choices
      .map((choice) => String(choice || "").trim())
      .filter(Boolean)
      .filter((choice) => {
        const key = normaliseText(choice);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function findMatchingChoice(correctAnswer, choices) {
    const correctKey = normaliseText(correctAnswer);
    return choices.find((choice) => normaliseText(choice) === correctKey) || "";
  }

  function metreFeatureChoice(question) {
    const timeSignature = String(question?.time_signature || "").trim();
    const family = displayCase(question?.metre_family || "");
    if (timeSignature === "6/8") return "6/8 and compound duple";
    if (timeSignature === "12/8") return "12/8 and compound quadruple";
    if (timeSignature === "5/4") return "5/4 and irregular quintuple";
    if (timeSignature === "2/2") return "2/2 and simple duple";
    if (timeSignature === "2/4") return "2/4 and simple duple";
    if (timeSignature === "3/4") return "3/4 and simple triple";
    if (timeSignature === "4/4") return "4/4 and simple quadruple";
    return family;
  }

  function notationFeatureChoice(question) {
    const timeSignature = String(question?.time_signature || "").trim();
    if (timeSignature === "6/8") return "Two dotted-crotchet beats";
    if (timeSignature === "12/8") return "Four dotted-crotchet beats";
    if (timeSignature === "5/4") return "Five crotchets grouped unevenly";
    if (timeSignature === "2/2") return "Two minim beats";
    if (timeSignature === "2/4") return "Two crotchet beats";
    if (timeSignature === "3/4") return "Three crotchet beats";
    if (timeSignature === "4/4") return "Four crotchet beats";
    return displayCase(question?.correct_answer || "");
  }

  function chooseDistractors(correctChoice, sourceChoices, questionId, maximumChoices = 4) {
    const correctKey = normaliseText(correctChoice);
    const unique = uniqueChoices(sourceChoices);
    const distractors = stableShuffle(unique.filter((choice) => normaliseText(choice) !== correctKey), questionId);
    return stableShuffle([correctChoice, ...distractors.slice(0, Math.max(0, maximumChoices - 1))], `${questionId}:final`);
  }

  function buildChoiceSet(question) {
    const rowOptions = Array.isArray(question?.options) ? question.options.filter(Boolean) : [];
    const rawCorrect = String(question?.correct_answer || "").trim();
    const responseType = String(question?.response_type || "");
    const mode = String(question?.mode || "");
    let correctChoice = findMatchingChoice(rawCorrect, rowOptions) || displayCase(rawCorrect);
    let choices = rowOptions;

    if (!choices.length || !findMatchingChoice(correctChoice, choices)) {
      if (/numeric/i.test(responseType)) {
        choices = BEAT_COUNT_CHOICES;
      } else if (/time signature/i.test(responseType)) {
        choices = TIME_SIGNATURE_CHOICES;
      } else if (/Full metre/i.test(mode) || /two-part written/i.test(responseType)) {
        choices = FULL_METRE_CHOICES;
      } else if (/Explain notation/i.test(mode)) {
        correctChoice = notationFeatureChoice(question);
        choices = NOTATION_FEATURE_CHOICES;
      } else if (/Rhythm and metre/i.test(mode)) {
        correctChoice = metreFeatureChoice(question);
        choices = RHYTHM_FEATURE_CHOICES;
      } else if (/Irregular metre/i.test(mode)) {
        correctChoice = "5/4 and irregular quintuple";
        choices = RHYTHM_FEATURE_CHOICES;
      } else if (/compound duple/i.test(rawCorrect) || /divided into threes/i.test(rawCorrect)) {
        correctChoice = "Two main beats divided into threes";
        choices = COMPOUND_EXPLANATION_CHOICES;
      } else {
        choices = [correctChoice, ...FULL_METRE_CHOICES, ...BEAT_UNIT_CHOICES, ...TIME_SIGNATURE_CHOICES];
      }
    }

    if (!findMatchingChoice(correctChoice, choices)) choices = [correctChoice, ...choices];

    return {
      correctChoice,
      choices: chooseDistractors(correctChoice, choices, question?.id || rawCorrect, 4)
    };
  }

  function questionUsesScore(question) {
    return question?.requires_score === true || String(question?.requires_score || "").trim().toLowerCase() === "true";
  }

  function deriveQuestionLevel(question) {
    const mode = String(question?.mode || "");
    const timeSignature = String(question?.time_signature || "");
    const marks = Number(question?.marks || 1);
    if (timeSignature === "5/4" || timeSignature === "12/8" || /Irregular|Rhythm and metre features|Explain notation/i.test(mode)) {
      return "Mastering";
    }
    // Kept in sync with meter-master/script.js's deriveQuestionLevel.
    if (questionUsesScore(question)) {
      return mode === "Skeleton-score completion" ? "Developing" : "Securing";
    }
    if (marks >= 2) return "Securing";
    if (/Pulse analysis|Beat-unit analysis|Discrimination|Regularity|Notation vocabulary/i.test(mode)) return "Developing";
    return "Foundation";
  }

  function cleanAudioPath(audioPath) {
    const raw = String(audioPath || "").trim();
    if (!raw) return "";
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return raw;
    return raw.replace(/^modules\/meter-master\//, "");
  }

  function cleanScoreAssetPath(scoreAsset) {
    const raw = String(scoreAsset || "").trim();
    if (!raw) return "";
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) return raw;
    if (raw.includes("/")) return raw.replace(/^modules\/meter-master\//, "");
    return `scores/${raw}`;
  }

  function prepareQuestion(rawQuestion, index) {
    const choiceSet = buildChoiceSet(rawQuestion);
    return {
      ...rawQuestion,
      id: rawQuestion.id || `MMX${String(index + 1).padStart(3, "0")}`,
      level: deriveQuestionLevel(rawQuestion),
      audio: cleanAudioPath(rawQuestion.audio_path || ""),
      scoreAsset: cleanScoreAssetPath(rawQuestion.score_asset || ""),
      usesScore: questionUsesScore(rawQuestion),
      maxMarks: Number(rawQuestion.marks || 1),
      correctChoice: choiceSet.correctChoice,
      choices: choiceSet.choices
    };
  }

  const state = {
    activeIndex: 0,
    filter: "all",
    levelFilter: "all",
    search: "",
    revealed: true,
    reviews: loadReviews()
  };

  let questions = [];

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
    scoreContextCard: document.getElementById("scoreContextCard"),
    scoreExtractImage: document.getElementById("scoreExtractImage"),
    scoreExtractMeta: document.getElementById("scoreExtractMeta"),
    answerChoicePreview: document.getElementById("answerChoicePreview"),
    playClipButton: document.getElementById("playClipButton"),
    audioStatus: document.getElementById("audioStatus"),
    audioPlayer: document.getElementById("audioPlayer"),
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
    renderCurrentQuestion({ keepAudio: true });
  }

  function reviewIsComplete(review = {}) {
    return Boolean(review.decision || review.difficulty || review.notes || (review.issues || []).length);
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
        if (state.filter === "score" && !question.usesScore) return false;
        if (!search) return true;
        const haystack = [
          question.id, question.mode, question.question, question.level,
          question.response_type, question.correct_answer, question.time_signature,
          question.metre_family, question.board_style
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
      const scoredCount = questions.filter((question) => question.usesScore).length;
      elements.levelCountSummary.textContent = LEVELS
        .map((level) => `${level}: ${questions.filter((question) => question.level === level).length}`)
        .join(" · ") + ` · With score: ${scoredCount}`;
    }
  }

  function renderQuestionList() {
    const rows = getFilteredQuestions();
    elements.questionList.innerHTML = rows.length
      ? rows.map(({ question, index }) => {
        const review = state.reviews[question.id] || {};
        const decisionClass = review.decision ? `decision-${review.decision}` : "";
        const decisionLabel = review.decision || "unreviewed";
        const activeClass = index === state.activeIndex ? " is-active" : "";
        return `
          <button class="question-button${activeClass}" type="button" data-index="${index}">
            <strong>${escapeHtml(question.id)} · ${escapeHtml(question.mode || "Untitled question")}</strong>
            <small>${escapeHtml(question.question || "Meter Master question")}</small>
            <span class="question-tags">
              <span class="${decisionClass}">${escapeHtml(decisionLabel)}</span>
              <span>${escapeHtml(question.level || "level unset")}</span>
              <span>${escapeHtml(question.response_type || "")}</span>
              ${question.usesScore ? "<span>score</span>" : ""}
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

  function renderScoreContext(question) {
    if (!elements.scoreContextCard) return;
    if (!question.usesScore) {
      elements.scoreContextCard.hidden = true;
      return;
    }
    elements.scoreContextCard.hidden = false;
    elements.scoreExtractImage.src = question.scoreAsset || "";
    elements.scoreExtractImage.alt = `${question.id} score extract`;
    elements.scoreExtractMeta.textContent = `${question.metre_family || "Metre focus"} · ${question.time_signature || ""}`;
  }

  function renderAnswerChoicePreview(question) {
    if (!elements.answerChoicePreview) return;
    const isChoiceType = /radio|multiple choice|single choice/i.test(`${question.app_control} ${question.response_type}`);
    if (!isChoiceType) {
      elements.answerChoicePreview.innerHTML = `
        <span class="answer-mode-label">${escapeHtml(displayCase(question.response_type))}</span>
        <p>Written/entry answer expected: ${escapeHtml(listText(question.accepted_answers) || question.correct_answer || "—")}</p>
      `;
      return;
    }
    elements.answerChoicePreview.innerHTML = `
      <span class="answer-mode-label">Multiple-choice answers (as generated live)</span>
      <div class="choice-preview-grid">
        ${question.choices.map((choice) => `
          <span class="choice-pill${normaliseText(choice) === normaliseText(question.correctChoice) ? " is-correct" : ""}">
            ${escapeHtml(choice)}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderCurrentQuestion(options = {}) {
    const question = currentQuestion();
    if (!question) return;
    const review = getReview(question);
    elements.questionPosition.textContent = `Question ${state.activeIndex + 1} / ${questions.length}`;
    elements.questionLevelBadge.textContent = `${question.level || "Level unset"} · ${displayCase(question.response_type)}`;
    elements.questionId.textContent = question.id;
    elements.questionTitle.textContent = question.mode || "Untitled Meter Master question";
    elements.questionPrompt.textContent = question.question || "Listen and answer the question.";
    elements.questionDetails.textContent = `${question.maxMarks} ${question.maxMarks === 1 ? "mark" : "marks"} · ${question.board_style || "Board style unset"} · ${question.time_signature || ""}`;

    if (!options.keepAudio || elements.audioPlayer.dataset.questionId !== question.id) {
      elements.audioPlayer.pause();
      elements.audioPlayer.src = question.audio;
      elements.audioPlayer.dataset.questionId = question.id;
      elements.audioPlayer.load();
      updatePlaybackUi("Ready to play.");
    }

    renderScoreContext(question);
    renderAnswerChoicePreview(question);

    elements.reviewNotes.value = review.notes || "";
    elements.prevButton.disabled = state.activeIndex <= 0;
    elements.nextButton.textContent = state.activeIndex >= questions.length - 1 ? "Finish review" : "Next question";
    elements.revealButton.textContent = state.revealed ? "Hide mark scheme" : "Reveal mark scheme";
    elements.markscheme.hidden = !state.revealed;

    setCheckedRadio("decision", review.decision);
    setCheckedRadio("difficulty", review.difficulty);
    setCheckedIssues(review.issues || []);
    renderMarkscheme(question);
    renderSourceSummary(question);
  }

  function renderMarkscheme(question) {
    const sections = [
      ["Correct answer", question.correct_answer],
      ["Accepted answers", listText(question.accepted_answers)],
      ["Mark scheme", question.mark_scheme],
      ["Feedback", question.feedback],
      ["Score instruction", question.score_instruction]
    ].filter(([, value]) => String(value || "").trim());
    elements.markschemeContent.innerHTML = sections.map(([label, value]) => `
      <div class="markscheme-section">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(value)}</p>
      </div>
    `).join("");
  }

  function renderSourceSummary(question) {
    if (!elements.sourceSummaryContent) return;
    const rows = [
      ["ID", question.id],
      ["Audio ID", question.audio_id],
      ["Audio path", question.audio],
      ["Board style", question.board_style],
      ["Mode", question.mode],
      ["Response type", question.response_type],
      ["App control", question.app_control],
      ["Time signature", question.time_signature],
      ["Metre family", question.metre_family],
      ["Requires score", question.usesScore ? "Yes" : "No"],
      ["Score asset", question.score_asset],
      ["Score source URL", question.score_url]
    ].filter(([, value]) => String(value || "").trim());
    elements.sourceSummaryContent.innerHTML = rows.map(([label, value]) => `
      <div class="source-row">
        <span>${escapeHtml(label)}</span>
        <p>${label === "Score source URL" ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>` : escapeHtml(value)}</p>
      </div>
    `).join("");
  }

  function listText(values) {
    return Array.isArray(values) ? values.join("; ") : "";
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
        mode: question.mode || "",
        prompt: question.question || "",
        audio: question.audio || "",
        currentLevel: question.level || "",
        responseType: question.response_type || "",
        correctAnswer: question.correct_answer || "",
        currentMaxMarks: question.maxMarks || "",
        requiresScore: question.usesScore ? "yes" : "no",
        scoreAsset: question.score_asset || "",
        decision: review.decision || "",
        reviewedDifficulty: review.difficulty || "",
        issues: (review.issues || []).join("; "),
        notes: review.notes || "",
        reviewedAt: review.reviewedAt || ""
      };
    });
  }

  function downloadJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "Meter Master review.html",
      questionCount: questions.length,
      reviewedCount: exportRows().filter((row) => row.decision || row.reviewedDifficulty || row.issues || row.notes).length,
      rows: exportRows()
    };
    downloadFile(`meter-master-review-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function downloadCsv() {
    const rows = exportRows();
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
    ].join("\n");
    downloadFile(`meter-master-review-${dateStamp()}.csv`, csv, "text/csv");
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
      now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0"),
      String(now.getHours()).padStart(2, "0"), String(now.getMinutes()).padStart(2, "0")
    ].join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function updatePlaybackUi(status) {
    const isPlaying = elements.audioPlayer && !elements.audioPlayer.paused;
    elements.playClipButton.textContent = isPlaying ? "Pause Clip" : "Play Clip";
    elements.audioStatus.textContent = status || (isPlaying ? "Playing clip…" : "Ready to play.");
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
      const playAttempt = elements.audioPlayer.play();
      updatePlaybackUi("Playing clip…");
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(() => updatePlaybackUi("Audio could not play. Try the small audio controls below."));
      }
    });

    elements.audioPlayer.addEventListener("play", () => updatePlaybackUi("Playing clip…"));
    elements.audioPlayer.addEventListener("pause", () => { if (!elements.audioPlayer.ended) updatePlaybackUi("Paused."); });
    elements.audioPlayer.addEventListener("ended", () => updatePlaybackUi("Clip finished."));
    elements.audioPlayer.addEventListener("error", () => updatePlaybackUi("Audio failed to load."));

    elements.revealButton.addEventListener("click", () => {
      state.revealed = !state.revealed;
      renderCurrentQuestion({ keepAudio: true });
    });

    elements.downloadJsonButton.addEventListener("click", downloadJson);
    elements.downloadCsvButton.addEventListener("click", downloadCsv);
    elements.clearReviewButton.addEventListener("click", () => {
      if (!window.confirm("Clear all locally saved Meter Master review notes?")) return;
      state.reviews = {};
      localStorage.removeItem(STORAGE_KEY);
      state.revealed = true;
      setSaveStatus("Local review cleared.");
      render();
    });
  }

  function render() {
    renderSummary();
    renderQuestionList();
    renderCurrentQuestion();
  }

  async function init() {
    try {
      const response = await fetch(DATA_URL, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Meter Master data failed to load (${response.status}).`);
      const data = await response.json();
      const sourceQuestions = Array.isArray(data.questions) ? data.questions : [];
      questions = sourceQuestions
        .filter((question) => (Number(String(question.id || "").replace(/^MMX/, "")) || 0) <= ALREADY_REVIEWED_MAX_ID)
        .map(prepareQuestion);
    } catch (error) {
      document.body.innerHTML = `<main class="panel"><h1>Meter Master questions could not be loaded.</h1><p>${escapeHtml(error?.message || "")}</p></main>`;
      return;
    }

    if (!questions.length) {
      document.body.innerHTML = "<main class=\"panel\"><h1>Meter Master questions could not be loaded.</h1></main>";
      return;
    }

    bindEvents();
    render();
  }

  init();
}());
