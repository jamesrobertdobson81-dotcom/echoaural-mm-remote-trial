(function initCadenceTrimReview() {
  "use strict";

  const STORAGE_KEY = "echoaural.cadenceTrimReview.v2";
  const questions = [
    ...(window.EchoAuralCadenceQuestions || []),
    ...(window.EchoAuralCadenceReviewCandidates || [])
  ];
  const list = document.getElementById("reviewList");
  const template = document.getElementById("reviewCardTemplate");
  const downloadButton = document.getElementById("downloadButton");
  let trims = loadTrims();
  let activeAudio = null;

  function loadTrims() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (_error) { return {}; }
  }

  function saveTrims() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trims));
  }

  function seconds(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
  }

  function format(value) {
    return Number.isFinite(value) ? `${value.toFixed(2)}s` : "end";
  }

  function configuredLabel(question) {
    if (question.reviewOnly) return `Reviewer starting point: ${format(question.audioStart || 0)} → ${format(question.audioEnd)}`;
    return `Gameplay trim: ${format(question.audioStart || 0)} → ${format(question.audioEnd)}`;
  }

  function scoreMarkup(question) {
    if (question.scoreDisplay === "contained") return `<img src="${question.score}" alt="Shortened score for ${question.id}" />`;
    return `<div class="score-splice" role="img" aria-label="Shortened score for ${question.id}"><span class="score-pane score-opening"><img src="${question.score}" alt="" /></span><span class="score-pane score-bars"><img src="${question.score}" alt="" /></span></div>`;
  }

  function reviewFor(question) {
    return trims[question.id] || { start: question.audioStart || 0, stop: Number.isFinite(question.audioEnd) ? question.audioEnd : null };
  }

  function setStatus(card, text) {
    card.querySelector(".save-status").textContent = text;
  }

  function updateReview(question, card) {
    const start = seconds(card.querySelector(".start-input").value) ?? 0;
    const stop = seconds(card.querySelector(".stop-input").value);
    trims[question.id] = { start, stop, reviewedAt: new Date().toISOString() };
    saveTrims();
    setStatus(card, `Saved locally · ${format(start)} → ${format(stop)}`);
  }

  function renderQuestion(question) {
    const card = template.content.firstElementChild.cloneNode(true);
    const review = reviewFor(question);
    const audio = card.querySelector(".audio-player");
    const startInput = card.querySelector(".start-input");
    const stopInput = card.querySelector(".stop-input");
    card.dataset.questionId = question.id;
    card.querySelector(".question-id").textContent = question.id;
    card.querySelector("h2").textContent = `${question.answer} cadence · ${question.key}`;
    card.querySelector(".configured-trim").textContent = configuredLabel(question);
    card.querySelector(".score-frame").innerHTML = scoreMarkup(question);
    audio.src = question.audio;
    startInput.value = review.start ?? 0;
    stopInput.value = Number.isFinite(review.stop) ? review.stop : "";

    audio.addEventListener("play", () => {
      if (activeAudio && activeAudio !== audio) activeAudio.pause();
      activeAudio = audio;
    });
    audio.addEventListener("loadedmetadata", () => {
      card.querySelector(".duration").textContent = `Duration ${audio.duration.toFixed(2)}s`;
    });
    audio.addEventListener("timeupdate", () => {
      card.querySelector(".playhead").textContent = `${audio.currentTime.toFixed(2)}s`;
      if (audio.dataset.previewing === "true") {
        const stop = seconds(stopInput.value);
        if (Number.isFinite(stop) && audio.currentTime >= stop) {
          audio.pause();
          audio.dataset.previewing = "false";
        }
      }
    });

    card.querySelector(".set-start").addEventListener("click", () => {
      startInput.value = audio.currentTime.toFixed(2);
      updateReview(question, card);
    });
    card.querySelector(".set-stop").addEventListener("click", () => {
      stopInput.value = audio.currentTime.toFixed(2);
      updateReview(question, card);
    });
    card.querySelector(".preview-button").addEventListener("click", () => {
      const start = seconds(startInput.value) ?? 0;
      const stop = seconds(stopInput.value);
      if (Number.isFinite(stop) && stop <= start) {
        setStatus(card, "Stop must be later than start.");
        return;
      }
      audio.currentTime = start;
      audio.dataset.previewing = "true";
      audio.play().catch(() => setStatus(card, "Press play in the audio controls to enable playback."));
    });
    card.querySelector(".save-button").addEventListener("click", () => updateReview(question, card));
    card.querySelector(".reset-button").addEventListener("click", () => {
      delete trims[question.id];
      saveTrims();
      startInput.value = question.audioStart || 0;
      stopInput.value = Number.isFinite(question.audioEnd) ? question.audioEnd : "";
      setStatus(card, "Reset to current gameplay timing.");
    });
    [startInput, stopInput].forEach((input) => {
      input.addEventListener("input", () => updateReview(question, card));
      input.addEventListener("change", () => updateReview(question, card));
    });
    if (trims[question.id]) setStatus(card, `Saved locally · ${format(review.start)} → ${format(review.stop)}`);
    list.appendChild(card);
  }

  function downloadJson() {
    document.querySelectorAll(".review-card").forEach((card) => {
      const question = questions.find((item) => item.id === card.dataset.questionId);
      if (question) updateReview(question, card);
    });
    const payload = {
      source: "Cadence Coach audio trim review",
      exportedAt: new Date().toISOString(),
      questions: questions.map((question) => {
        const review = reviewFor(question);
        return { id: question.id, key: question.key, answer: question.answer, audioStart: review.start ?? 0, audioEnd: Number.isFinite(review.stop) ? review.stop : null };
      })
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cadence-trim-review-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  questions.forEach(renderQuestion);
  downloadButton.addEventListener("click", downloadJson);
})();
