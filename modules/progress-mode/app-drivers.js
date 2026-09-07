// Progress Mode — per-app driver configuration.
//
// Each driver describes how to (a) pre-configure a real, unmodified app page
// loaded in an <iframe> to the student's current level for that app, and
// (b) detect — purely by reading the iframe's DOM — when the FIRST question
// has been answered and whether it was correct. No app file is edited; this
// is all done from outside via iframe.contentDocument after the iframe loads.
//
// questionCount is always set to that app's smallest available option: a
// round-slot only ever uses the first question the app generates, then the
// iframe is discarded and reloaded fresh for the next slot (possibly a
// different app), so a full "round" inside the target app is never needed.
//
// Some sources are sibling apps reached the same way the source app itself
// links to them (melody-master's "Intervals" mode and instrument-identifier's
// "Ensembles" skill both do a full-page redirect rather than being an
// in-page mode) — those are driven as their own standalone targets below
// (melodic-intervals, ensemble-recognition) rather than through the app that
// merely links to them.
(function (global) {
  "use strict";

  function setRadio(doc, name, value) {
    var input = doc.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (!input) return false;
    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // Best-effort "what question is this" fingerprint used to avoid repeating
  // the same question twice in one round. These apps are almost all
  // listening exercises — the audio itself is the only truly unique part of
  // a question, and that isn't readable from outside — so this reads the
  // visible answer-choice text (which changes with the underlying content
  // far more often than not) as a practical stand-in, not a perfect one.
  function textSignature(doc, selector) {
    var els = doc.querySelectorAll(selector);
    if (!els.length) return null;
    var texts = Array.prototype.map.call(els, function (el) { return (el.textContent || "").trim(); });
    return texts.sort().join("|");
  }

  // Shared across the 4 musical-language (ScoreDecoder) topic drivers below:
  // Foundation/Developing render multiple-choice `.answer-button`s inside
  // #answers (same disabled/.correct/.incorrect idiom as other drivers);
  // Securing/Mastering render a typed #typedAnswer input instead, with no
  // correctness class — only #feedback text distinguishes right from wrong,
  // and only full marks ("Correct") count as correct for this app's binary
  // scoring.
  function msLanguageIsAnswered(doc) {
    var mc = doc.querySelectorAll("#answers .answer-button");
    if (mc.length && Array.prototype.every.call(mc, function (b) { return b.disabled; })) return true;
    var typed = doc.getElementById("typedAnswer");
    if (typed && typed.disabled) return true;
    // #nextButton is enabled unconditionally by submitAnswer() regardless of
    // MC vs typed — a third, independent signal (same proven pattern as
    // chord-identifier's driver, which uses this alone) that doesn't depend
    // on correctly guessing every answer-UI variant this app might render.
    var nextButton = doc.getElementById("nextButton");
    return !!nextButton && !nextButton.disabled;
  }

  // #feedback is only ever cleared in modules/musical-language/script.js —
  // renderFeedback() writes the real "Correct · N/M" / "Not quite · N/M"
  // status into #answerCard .ml-feedback-status instead (same split as
  // Structure Spotter's #answerCard .ss-feedback-status below, which
  // ssIsCorrect already reads correctly). This means the #feedback-text
  // branch this used to have was dead code that could only ever fall
  // through to its final `return false` — every genuinely correct
  // ScoreDecoder answer (MC or typed) was silently scored as wrong in both
  // Progress Mode and Live Session. At least half marks counts as correct
  // for Progress Mode's binary scoring — otherwise the Securing/Mastering
  // typed-answer tier (the only place partial credit is possible here)
  // would under-count real partial understanding as failure, exactly where
  // a student is trying to clear the harder levels.
  function msLanguageIsCorrect(doc) {
    if (doc.querySelector("#answers .answer-button.incorrect")) return false;
    if (doc.querySelector("#answers .answer-button.correct")) return true;
    var status = doc.querySelector("#answerCard .ml-feedback-status");
    if (!status) return true;
    var text = (status.textContent || "").trim();
    var match = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(text);
    if (match) return parseFloat(match[1]) >= parseFloat(match[2]) / 2;
    return text.indexOf("Not quite") === -1;
  }

  // #questionKicker only ever shows "ELEMENT · SUBSKILL" (e.g. "TEMPO ·
  // TEMPO-MARKINGS") — identical for every question in that subskill, not a
  // real per-question fingerprint. That collision meant the dedup check in
  // script.js's checkSignatureThenPoll treated almost every question as
  // "already seen" after the first one, triggering a reroll — and since the
  // signature never changed, EVERY reroll attempt hit the same collision
  // too, burning through all of MAX_DUPLICATE_REROLLS on nearly every
  // question. Prefer the actual answer-button text (unique per question,
  // same as every other MC driver) or, for typed questions, the question
  // prompt text (also genuinely per-question — see displayedPrompt() in
  // musical-language/script.js) — falling back to the kicker only if
  // neither is present.
  function msLanguageSignature(doc) {
    var choices = textSignature(doc, "#answers .answer-button");
    if (choices) return choices;
    var prompt = doc.querySelector(".he-question-prompt");
    if (prompt) {
      var promptText = (prompt.textContent || "").trim();
      if (promptText) return promptText;
    }
    var kicker = doc.getElementById("questionKicker");
    return kicker ? (kicker.textContent || "").trim() : null;
  }

  // Structure Spotter (modules/structure-spotter/) reuses ScoreDecoder's DOM
  // idiom (#answers .answer-button for MC, #typedAnswer for typed tiers,
  // #nextButton enabled on submit) with one deliberate fix: ScoreDecoder's
  // own #feedback element is only ever cleared, never populated with
  // "Correct"/"N of M marks" text (renderFeedback() writes into #answerCard
  // instead) — so msLanguageIsCorrect's text-matching branch is dead code
  // for typed tiers there. Structure Spotter's script.js has the same split
  // (renderFeedback() writes into #answerCard, not #feedback), so this
  // reads the real status text from #answerCard .ss-feedback-status
  // ("Correct · 1/1" / "Partly correct · 1/2" / "Not quite · 0/1") instead.
  function ssIsAnswered(doc) {
    var mc = doc.querySelectorAll("#answers .answer-button");
    if (mc.length && Array.prototype.every.call(mc, function (b) { return b.disabled; })) return true;
    var typed = doc.getElementById("typedAnswer");
    if (typed && typed.disabled) return true;
    var nextButton = doc.getElementById("nextButton");
    return !!nextButton && !nextButton.disabled;
  }

  function ssIsCorrect(doc) {
    if (doc.querySelector("#answers .answer-button.incorrect")) return false;
    if (doc.querySelector("#answers .answer-button.correct")) return true;
    var status = doc.querySelector("#answerCard .ss-feedback-status");
    if (!status) return true;
    var text = (status.textContent || "").trim();
    var match = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(text);
    if (match) return parseFloat(match[1]) >= parseFloat(match[2]) / 2;
    return text.indexOf("Not quite") === -1;
  }

  function ssSignature(doc) {
    var choices = textSignature(doc, "#answers .answer-button");
    if (choices) return choices;
    var prompt = doc.querySelector(".he-question-prompt");
    if (prompt) {
      var promptText = (prompt.textContent || "").trim();
      if (promptText) return promptText;
    }
    var kicker = doc.getElementById("questionKicker");
    return kicker ? (kicker.textContent || "").trim() : null;
  }

  // Shared by the harmony-key-signatures driver below. Answer buttons follow
  // the usual disabled-on-submit idiom (#answers .answer-button); the typed
  // fallback (#typedInput, used when answers=choice isn't respected) mirrors
  // melodic-intervals' idiom of adding an is-correct/is-wrong class rather
  // than relying on #feedback text.
  function keySignatureIsAnswered(doc) {
    var mc = doc.querySelectorAll("#answers .answer-button");
    if (mc.length && Array.prototype.every.call(mc, function (b) { return b.disabled; })) return true;
    var typed = doc.getElementById("typedInput");
    return !!typed && typed.disabled;
  }

  function keySignatureIsCorrect(doc) {
    if (doc.querySelector("#answers .answer-button.incorrect")) return false;
    var typed = doc.getElementById("typedInput");
    if (typed && typed.classList.contains("is-wrong")) return false;
    return true;
  }

  // The key-signature stave image IS the question (which specific key
  // signature is being asked about) — a stronger fingerprint than the
  // text-based fallback most other drivers are limited to. Empty/absent
  // until a question actually loads (confirmed: #notation starts as an
  // empty div), so also safe to use as this driver's readiness signal.
  function keySignatureSignature(doc) {
    var img = doc.querySelector("#notation img");
    return img && img.src ? img.src : null;
  }

  // Shared by the cadence-coach driver below. MC buttons follow the usual
  // idiom (#cadenceAnswers .answer-button); the typed fallback
  // (#cadenceTypedInput) has no correctness class of its own, only
  // #feedback text ("Correct" for a right answer) — same idiom as
  // ScoreDecoder's typed tier, since cadence-coach doesn't expose an
  // explicit "always multiple choice" mode to force instead.
  function cadenceIsAnswered(doc) {
    var mc = doc.querySelectorAll("#cadenceAnswers .answer-button");
    if (mc.length && Array.prototype.every.call(mc, function (b) { return b.disabled; })) return true;
    var typed = doc.getElementById("cadenceTypedInput");
    return !!typed && typed.disabled;
  }

  function cadenceIsCorrect(doc) {
    if (doc.querySelector("#cadenceAnswers .answer-button.incorrect")) return false;
    var feedback = doc.getElementById("feedback");
    return feedback ? feedback.textContent.trim() === "Correct" : true;
  }

  // <audio> (unlike <img>) never defaults .src/.currentSrc to the document's
  // own URL when no source is set — currentSrc is guaranteed "" until
  // showQuestion() actually assigns one, so this is safe as both the
  // readiness signal and a strong per-question fingerprint (the real audio
  // asset path, not a guess based on visible text).
  function cadenceSignature(doc) {
    var audio = doc.getElementById("cadenceAudio");
    return audio && audio.currentSrc ? audio.currentSrc : null;
  }

  // Shared across the 2 ContextCoach (era-explorer/) topic drivers below.
  // Its buttons follow the same disabled-on-submit idiom as most other
  // drivers, but flag the wrong pick with class "wrong" rather than
  // "incorrect" — its own naming, not a typo.
  function contextCoachIsAnswered(doc) {
    var buttons = doc.querySelectorAll("#answers button");
    return buttons.length > 0 && Array.prototype.every.call(buttons, function (b) { return b.disabled; });
  }

  function contextCoachIsCorrect(doc) {
    return !doc.querySelector("#answers button.wrong");
  }

  function contextCoachSignature(doc) {
    return textSignature(doc, "#answers button");
  }

  // Every app shares the same house layout (.topbar + .three-panel-layout
  // with .setup-panel / .quiz-panel / .info-panel). Progress Mode already
  // has its own topbar, settings panel and progress panel, so the embedded
  // app only needs to contribute its centre quiz-panel — the actual
  // question, answer buttons, score/streak/XP stats and gameplay chrome,
  // unmodified. This is a runtime style injection into the iframe's own
  // document (nothing is written to any app file on disk).
  var FOCUS_MODE_CSS =
    // Critical: an iframe's own internal scrollbar (unlike a real browser
    // window's) eats into the CONTENT width, not just the page. If a tall
    // question ever nudges body content past 100vh, that scrollbar narrows
    // .quiz-panel, which wraps answer-button text onto an extra line, which
    // makes the buttons taller, which increases the overflow further —
    // compounding until the last answer choices get clipped off entirely.
    // Forcing overflow:hidden at the root breaks that feedback loop so the
    // panel always keeps the exact width (and therefore text-wrap/sizing)
    // it would have standalone, matching it "sized, positioned and
    // function exactly like the individual sub app."
    "html, body { overflow: hidden !important; }" +
    ".topbar { display: none !important; }" +
    // .app-shell reserves its own ~28px of page-edge breathing room
    // (width: min(1540px, calc(100% - 28px))) for a real full-page visit.
    // That's redundant once already confined to Progress Mode's centre
    // column (the outer 3-panel grid already provides edge spacing), and
    // narrowing the iframe by 28px is exactly what causes answer-button
    // text to wrap onto an extra line it wouldn't standalone.
    ".app-shell { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; }" +
    ".three-panel-layout { display: block !important; height: 100vh !important; max-height: 100vh !important; min-height: 0 !important; padding: 0 !important; border: none !important; border-radius: 0 !important; background: none !important; }" +
    ".setup-panel, .info-panel, aside.panel { display: none !important; }" +
    ".quiz-panel { width: 100% !important; height: 100vh !important; max-height: 100vh !important; min-height: 0 !important; padding: 22px !important; border-radius: 0 !important; }" +
    "body { padding: 0 !important; }" +
    // Every app has @media(max-width:980px)-and-below rules that collapse
    // its answer-choice grid down to 1-2 columns and stretch .quiz-panel's
    // min-height — written assuming a narrow VIEWPORT means the whole
    // browser window is narrow. An iframe IS its own viewport though, so
    // at the slot's real on-screen width (~700px) those rules always fire,
    // even though the app's own desktop/standalone rendering never hits
    // them (its quiz-panel is just as narrow, but @media checks the whole
    // page's width, and that page is 1500px+). Restoring each app's base
    // (desktop) column count directly is more reliable here than trying
    // to widen the iframe itself, since the affected grids are hardcoded
    // per-app rather than viewport-relative.
    ".instruments-options, .instruments-options[data-answer-count=\"4\"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    ".melodic-devices-options, .melodic-devices-options[data-answer-count=\"4\"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    ".texture-options, .texture-options[data-answer-count=\"4\"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    ".ci-answer-grid, .ci-answer-grid.is-roman, .ci-answer-grid.is-inversion { grid-template-columns: repeat(4, minmax(90px, 1fr)) !important; }" +
    ".score-stage-card { width: min(100%, 360px) !important; }" +
    ".ensemble-options, .ensemble-options[data-answer-count=\"4\"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    ".mi-answer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    // ScoreDecoder's #answers already shares .instruments-options with
    // instrument-identifier (see rule above), so it's covered without a
    // dedicated selector here. Meter Master's #choiceGrid uses its own
    // .meter-options class instead.
    ".meter-options, .meter-options[data-answer-count=\"4\"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    // harmony-key-signatures' #answers already shares .mi-answer-grid with
    // melodic-intervals (see rule above). cadence-coach's #cadenceAnswers
    // uses its own .cadence-answer-grid class, a 4-column grid at its real
    // desktop width that only narrows to 2 columns past a max-width
    // breakpoint the iframe's real width triggers unreliably.
    ".cadence-answer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }" +
    // Cadence Coach's standalone layout offsets the play state downward and
    // gives its score splice a 45vh budget. In a Live Session the iframe is
    // already the centre tile, so that offset pushes the final MC row below
    // the tile edge. Keep the same cadence artwork, but reclaim the vertical
    // space so all four choices remain visible and clickable.
    ".cadence-play { transform: none !important; gap: clamp(4px, .55vh, 8px) !important; }" +
    ".cadence-play { align-content: center !important; }" +
    ".cadence-score-card { width: min(96%, 700px, calc(40vh * 1.64)) !important; }" +
    ".cadence-answer-grid { align-self: end !important; }" +
    ".cadence-answer-grid .answer-button { min-height: 44px !important; padding: 7px 9px !important; }" +
    // .listening-console (the shared central quiz card every one of these
    // apps uses — instrument-identifier, ensemble-recognition, musical-
    // language, meter-master, texture-trainer, harmony-explorer, era-
    // explorer) is `overflow: hidden` with an all-`auto` grid-template-rows,
    // sized to fit ITS OWN standalone layout, not the fixed 100vh this
    // frame forces .quiz-panel into above. A longer-than-usual prompt (most
    // often a typed/short-answer question, since those carry the real
    // question text verbatim rather than a short canned MC prompt — see
    // e.g. musical-language's displayedPrompt()) can push later rows —
    // including the answer input itself — past the bottom edge, where they
    // get silently clipped rather than wrapped or scrolled to: invisible,
    // unclickable, and un-Tab-reachable, while the underlying app logic
    // (and Progress Mode's own answered-detection) is otherwise completely
    // unaffected — this was very likely the real cause behind repeated
    // "stuck on a written question" reports, not a JS bug at all. Letting
    // this ONE inner container scroll vertically (rather than touching the
    // outer html/body overflow:hidden above, which exists for an unrelated,
    // real reason — see its own comment) means anything that doesn't fit
    // becomes reachable by scrolling the card, instead of vanishing.
    ".listening-console { overflow-y: auto !important; overflow-x: hidden !important; }" +
    // Live Session transport is teacher-controlled. Keep answer controls in
    // the embedded PM app, but remove student-facing replay/start/next and
    // local-play actions that would let a student change the class sequence.
    "#replayButton, #replayIntervalButton, #nextButton, #startButton, #restartButton, #manualPlayButton, #playButton, #roundFinishButton, #finishQuizButton, #finishRoundButton, .replay-button, .next-question-button, .start-round-button, .restart-round-button, [data-action=\"replay\"], [data-action=\"next\"], .console-actions-replay button { display: none !important; }" +
    // Melody Master dictation: the expanded score popup is sized with
    // 100vw / @media(max-width:760|1100) rules and a 3-panel translate
    // offset. Inside Progress Mode the iframe is only the centre column
    // and .setup-panel/.info-panel are display:none, so those rules
    // collapse the popup (~230px tall) and shift it off-centre. Force the
    // same desktop expanded size/layout MM uses standalone; Progress Mode
    // also lifts the iframe to a full-viewport overlay while expanded
    // (see EAProgressModeSetMmScoreExpanded). Inline !important overrides
    // in installMmDictationScoreFix win the cascade against MM's many
    // later duplicate rules.
    "html:has(.quiz-panel.is-score-expanded), body:has(.quiz-panel.is-score-expanded) { overflow: visible !important; }" +
    // Melody Master's own body carries an opaque full-bleed gradient (plus
    // two decorative glow circles on ::before/::after) — fine standalone,
    // but #roundActiveWrap lifts to a full-viewport overlay while the score
    // is expanded (see below), so that opaque body paints over Progress
    // Mode's own setup/info panels sitting underneath, blanking them out
    // completely instead of just the score tile floating above them like it
    // does standalone. Scoped to the expanded state only — every other
    // question type relies on this body background peeking through
    // .quiz-panel's own padding exactly as it does today.
    "body:has(.quiz-panel.is-score-expanded) { background: transparent !important; }" +
    "body:has(.quiz-panel.is-score-expanded)::before, body:has(.quiz-panel.is-score-expanded)::after," +
    "body:has(.quiz-panel.is-score-expanded) .app-shell::before, body:has(.quiz-panel.is-score-expanded) .app-shell::after {" +
      "display: none !important;" +
    "}" +
    ".quiz-panel.is-score-expanded, .quiz-panel.is-score-expanded .listening-console, .quiz-panel.is-score-expanded .dictation-console { overflow: visible !important; }" +
    // The console card itself (.listening-console/.dictation-console) also
    // carries its own translucent fill + radial-gradient glow, normally
    // sized to just the centre quiz column. When expanded, MM stretches its
    // whole .quiz-panel "LH console edge to RH console edge" (i.e. edge to
    // edge of MM's own, standalone, side panels) — with those panels hidden
    // in Progress Mode there's nothing to stop it stretching to the full
    // viewport, so this fill paints over Progress Mode's real panels too.
    // Same treatment as the body background above. .quiz-panel and
    // .listening-console also carry their own backdrop-filter blur, and
    // .three-panel-layout itself carries a further blur(22px) on top of
    // that — with Progress Mode's real panels now showing through the
    // transparent background above, that blur smears them into an unreadable
    // frosted haze instead of leaving them crisp, so all of it goes too.
    ".quiz-panel.is-score-expanded, .quiz-panel.is-score-expanded .listening-console, .quiz-panel.is-score-expanded .dictation-console," +
    ".three-panel-layout:has(.quiz-panel.is-score-expanded) {" +
      "background: none !important;" +
      "backdrop-filter: none !important;" +
      "-webkit-backdrop-filter: none !important;" +
    "}" +
    // The "Question X of Y" progress bar (.quiz-header) is a direct child of
    // .quiz-panel, so it stretches edge-to-edge right along with it once
    // expanded — every other Progress Mode question shows it at the real
    // (un-expanded) .quiz-panel width instead. --pm-normal-quiz-width is set
    // live in forceExpandedLayout() below.
    // A definite width, not max-width: .quiz-header is a CSS Grid container
    // with a 1fr track for the progress bar, and that track only distributes
    // remaining space correctly against a definite container width — paired
    // with margin:auto and only a max-width, the browser falls back to
    // shrink-to-fit sizing, collapsing the 1fr track (and the whole header)
    // down to little more than the "Question X of Y" text's own width.
    ".quiz-panel.is-score-expanded .quiz-header {" +
      "width: var(--pm-normal-quiz-width, 900px) !important;" +
      "margin-left: auto !important;" +
      "margin-right: auto !important;" +
    "}" +
    "html body .quiz-panel.is-active.is-score-expanded .dictation-workspace.no-drag-workspace," +
    "html body .quiz-panel.is-complete.is-score-expanded .dictation-workspace.no-drag-workspace," +
    "html body .quiz-panel.is-active.is-score-expanded .no-drag-workspace," +
    "html body .quiz-panel.is-complete.is-score-expanded .no-drag-workspace {" +
      "--mm-wide-score-width: var(--mm-score-expanded-width, min(calc(100vw - 28px), 1480px)) !important;" +
      "--mm-wide-score-height: clamp(320px, 42vh, 490px) !important;" +
      "left: 50% !important;" +
      "right: auto !important;" +
      "top: auto !important;" +
      "bottom: var(--mm-score-expanded-bottom, 14px) !important;" +
      "width: var(--mm-wide-score-width) !important;" +
      "min-width: var(--mm-wide-score-width) !important;" +
      "max-width: var(--mm-wide-score-width) !important;" +
      "height: var(--mm-wide-score-height) !important;" +
      "min-height: var(--mm-wide-score-height) !important;" +
      "--mm-score-expanded-translate-x: -50% !important;" +
      "transform: translateX(-50%) !important;" +
      "z-index: 500 !important;" +
    "}" +
    "html body .quiz-panel.is-active.is-score-expanded .score-shell.no-drag-score-shell," +
    "html body .quiz-panel.is-active.is-score-expanded .score-shell," +
    "html body .quiz-panel.is-complete.is-score-expanded .score-shell.no-drag-score-shell," +
    "html body .quiz-panel.is-complete.is-score-expanded .score-shell," +
    "html body .score-shell.is-score-expanded {" +
      "height: var(--mm-wide-score-height, clamp(320px, 42vh, 490px)) !important;" +
      "min-height: var(--mm-wide-score-height, clamp(320px, 42vh, 490px)) !important;" +
    "}";

  // Melody Master dictation score popup — enlarge Progress Mode's iframe in
  // place (never reparent it: moving an iframe reloads the document and was
  // resetting MM back to .is-ready). Only expand once the quiz is active.
  function installMmDictationScoreFix(doc) {
    if (!doc || doc.getElementById("pmMmDictationScoreFix")) return;
    // Only relevant on Melody Master pages that can expand a score tile.
    if (!doc.querySelector(".score-shell, .dictation-console, .dictation-workspace")) return;

    var marker = doc.createElement("meta");
    marker.id = "pmMmDictationScoreFix";
    doc.head.appendChild(marker);

    var win = doc.defaultView;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      var quizPanel = doc.querySelector(".quiz-panel");
      if (!quizPanel && tries < 120) return;
      clearInterval(timer);
      if (!quizPanel || !win) return;

      var forcedWorkspace = null;
      var forcedShell = null;
      var lastExpanded = null;
      var pollTimer = null;
      var generation = null;
      try {
        if (win.parent && typeof win.parent.EAProgressModeMmScoreGeneration === "function") {
          generation = win.parent.EAProgressModeMmScoreGeneration();
        }
      } catch (err) { generation = null; }

      function alive() {
        try {
          return !!(win.parent && win.parent !== win && win.frameElement && doc.defaultView === win);
        } catch (err) {
          return false;
        }
      }

      function notifyParent(expanded) {
        if (!alive()) return;
        try {
          if (typeof win.parent.EAProgressModeSetMmScoreExpanded === "function") {
            win.parent.EAProgressModeSetMmScoreExpanded(expanded, generation);
          }
        } catch (err) { /* ignore */ }
      }

      function clearForcedLayout() {
        if (forcedWorkspace) {
          [
            "left", "right", "top", "bottom", "width", "min-width", "max-width",
            "height", "min-height", "transform", "z-index"
          ].forEach(function (prop) {
            forcedWorkspace.style.removeProperty(prop);
          });
          forcedWorkspace = null;
        }
        if (forcedShell) {
          forcedShell.style.removeProperty("height");
          forcedShell.style.removeProperty("min-height");
          forcedShell = null;
        }
      }

      function isLiveExpanded() {
        // Never lift the parent overlay on the MM ready/home screen.
        return quizPanel.classList.contains("is-score-expanded")
          && !quizPanel.classList.contains("is-ready")
          && (quizPanel.classList.contains("is-active") || quizPanel.classList.contains("is-complete"));
      }

      function forceExpandedLayout() {
        if (!isLiveExpanded()) return;
        var workspace = quizPanel.querySelector(".dictation-workspace.no-drag-workspace, .no-drag-workspace");
        if (!workspace) return;

        var width = Math.min(1480, Math.max(640, win.innerWidth - 28));
        var height = Math.min(490, Math.max(320, Math.round(win.innerHeight * 0.42)));
        quizPanel.style.setProperty("--mm-score-expanded-width", width + "px");
        quizPanel.style.setProperty("--mm-score-expanded-bottom", "14px");
        quizPanel.style.setProperty("--mm-score-expanded-left", (win.innerWidth / 2) + "px");
        quizPanel.style.setProperty("--mm-wide-score-height", height + "px");

        // .quiz-header (the "Question X of Y" progress bar) shouldn't stretch
        // edge-to-edge with the rest of the expanded tile — every other app
        // in Progress Mode shows it at the real, un-expanded .quiz-panel
        // width, so read that live from the parent document (same origin)
        // and constrain it to match, instead of it ballooning to the full
        // viewport just because its ancestor did.
        var outerQuizPanel = null;
        try {
          outerQuizPanel = win.parent && win.parent.document && win.parent.document.querySelector(".quiz-panel");
        } catch (err) { outerQuizPanel = null; }
        var normalWidth = outerQuizPanel ? Math.round(outerQuizPanel.getBoundingClientRect().width) : width;
        quizPanel.style.setProperty("--pm-normal-quiz-width", normalWidth + "px");

        // Inline !important beats Melody Master's later stylesheet duplicates.
        workspace.style.setProperty("left", "50%", "important");
        workspace.style.setProperty("right", "auto", "important");
        workspace.style.setProperty("top", "auto", "important");
        workspace.style.setProperty("bottom", "14px", "important");
        workspace.style.setProperty("width", width + "px", "important");
        workspace.style.setProperty("min-width", width + "px", "important");
        workspace.style.setProperty("max-width", width + "px", "important");
        workspace.style.setProperty("height", height + "px", "important");
        workspace.style.setProperty("min-height", height + "px", "important");
        workspace.style.setProperty("transform", "translateX(-50%)", "important");
        workspace.style.setProperty("z-index", "500", "important");
        forcedWorkspace = workspace;

        var shell = workspace.querySelector(".score-shell") || doc.querySelector(".score-shell.is-score-expanded");
        if (shell) {
          shell.style.setProperty("height", height + "px", "important");
          shell.style.setProperty("min-height", height + "px", "important");
          forcedShell = shell;
        }
      }

      function sync() {
        if (!alive()) {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          return;
        }
        var expanded = isLiveExpanded();
        if (expanded !== lastExpanded) {
          lastExpanded = expanded;
          notifyParent(expanded);
        }
        if (!expanded) {
          clearForcedLayout();
          return;
        }
        // Parent enlarges the iframe first; measure afterward.
        requestAnimationFrame(function () {
          forceExpandedLayout();
          requestAnimationFrame(function () {
            forceExpandedLayout();
            try { win.dispatchEvent(new Event("resize")); } catch (err) { /* ignore */ }
            requestAnimationFrame(forceExpandedLayout);
          });
        });
      }

      if (typeof MutationObserver !== "undefined") {
        new MutationObserver(sync).observe(quizPanel, { attributes: true, attributeFilter: ["class"] });
      }
      win.addEventListener("resize", function () {
        if (isLiveExpanded()) forceExpandedLayout();
      });
      win.addEventListener("pagehide", function () {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        notifyParent(false);
      });
      // Expand often happens on Start before this installer finishes its
      // first 50ms tick — sync once now, then poll briefly as a backstop.
      sync();
      var pollCount = 0;
      pollTimer = setInterval(function () {
        pollCount += 1;
        sync();
        if (pollCount >= 40 || !alive()) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 100);
    }, 50);
  }

  // Every embedded app's own "Question X of Y" (#roundText, plus a progress
  // fill element — #progressInner on most apps, #progressBar on a few)
  // reflects that app's own internal per-slot sub-round, never Progress
  // Mode's real round position: every driver's questionCount is configured
  // to that app's smallest option (see this file's own header comment —
  // "a round-slot only ever uses the first question the app generates"),
  // and Progress Mode's poll (isAnswered) advances to the next slot the
  // moment that FIRST question is checked, so "of 3"/"of 5" never
  // corresponds to anything the student can actually reach — for every
  // app, not just Melody Master dictation (where this technique was first
  // built). Overwrite it with Progress Mode's own real round position (see
  // EAProgressModeGetRoundProgress in script.js) instead, continuously —
  // most apps set roundText/progress themselves at several points
  // (question load, answer, replay), so a one-off write would just get
  // clobbered by the next one.
  function installRoundLabelFix(doc) {
    if (!doc || doc.getElementById("pmRoundLabelFix")) return;

    var marker = doc.createElement("meta");
    marker.id = "pmRoundLabelFix";
    doc.head.appendChild(marker);

    var win = doc.defaultView;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      var quizPanel = doc.querySelector(".quiz-panel");
      var roundTextEl = doc.getElementById("roundText");
      if ((!quizPanel || !roundTextEl) && tries < 120) return;
      clearInterval(timer);
      if (!quizPanel || !roundTextEl || !win) return;

      var progressFillEl = doc.getElementById("progressInner") || doc.getElementById("progressBar");
      var applying = false;

      function alive() {
        try {
          return !!(win.parent && win.parent !== win && win.frameElement && doc.defaultView === win);
        } catch (err) {
          return false;
        }
      }

      function applyLabel() {
        if (applying || !alive()) return;
        if (quizPanel.classList.contains("is-ready")) return;

        var progress = null;
        try {
          if (typeof win.parent.EAProgressModeGetRoundProgress === "function") {
            progress = win.parent.EAProgressModeGetRoundProgress();
          }
        } catch (err) { progress = null; }
        if (!progress || !progress.total) return;

        var label = "Question " + (progress.position + 1) + " of " + progress.total;
        var pct = Math.max(0, Math.min(100, Math.round((progress.position / progress.total) * 100)));

        applying = true;
        if (roundTextEl.textContent !== label) roundTextEl.textContent = label;
        if (progressFillEl && progressFillEl.style.width !== pct + "%") {
          progressFillEl.style.width = pct + "%";
        }
        applying = false;
      }

      applyLabel();
      if (typeof win.MutationObserver !== "undefined") {
        var observer = new win.MutationObserver(applyLabel);
        observer.observe(roundTextEl, { characterData: true, childList: true, subtree: true });
        observer.observe(quizPanel, { attributes: true, attributeFilter: ["class"] });
        if (progressFillEl) observer.observe(progressFillEl, { attributes: true, attributeFilter: ["style"] });

        var aliveCheck = setInterval(function () {
          if (!alive()) {
            observer.disconnect();
            clearInterval(aliveCheck);
          }
        }, 1000);
      }
    }, 50);
  }

  // Same reasoning and shape as installRoundLabelFix above, for the "Mark:
  // X / Y" tile (#scoreText) instead of the "Question X of Y" one: every
  // embedded app tracks marks for its own single-slot sub-round only, so
  // left alone it shows something like "Mark: 0 / 1" or "Mark: 1 / 1" for
  // whichever one question is currently loaded, never Progress Mode's real
  // running round score. Overwrite it with EAProgressModeGetRoundScore's
  // real correct/attempted count instead, continuously (same clobber risk
  // as the round label — most apps set scoreText themselves on question
  // load, answer and replay).
  function installRoundScoreFix(doc) {
    if (!doc || doc.getElementById("pmRoundScoreFix")) return;

    var marker = doc.createElement("meta");
    marker.id = "pmRoundScoreFix";
    doc.head.appendChild(marker);

    var win = doc.defaultView;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      var quizPanel = doc.querySelector(".quiz-panel");
      var scoreTextEl = doc.getElementById("scoreText");
      if ((!quizPanel || !scoreTextEl) && tries < 120) return;
      clearInterval(timer);
      if (!quizPanel || !scoreTextEl || !win) return;

      var applying = false;

      function alive() {
        try {
          return !!(win.parent && win.parent !== win && win.frameElement && doc.defaultView === win);
        } catch (err) {
          return false;
        }
      }

      function applyScore() {
        if (applying || !alive()) return;
        if (quizPanel.classList.contains("is-ready")) return;

        var score = null;
        try {
          if (typeof win.parent.EAProgressModeGetRoundScore === "function") {
            score = win.parent.EAProgressModeGetRoundScore();
          }
        } catch (err) { score = null; }
        if (!score) return;

        var label = "Mark: " + score.correct + " / " + score.attempted;

        applying = true;
        if (scoreTextEl.textContent !== label) scoreTextEl.textContent = label;
        applying = false;
      }

      applyScore();
      if (typeof win.MutationObserver !== "undefined") {
        var observer = new win.MutationObserver(applyScore);
        observer.observe(scoreTextEl, { characterData: true, childList: true, subtree: true });
        observer.observe(quizPanel, { attributes: true, attributeFilter: ["class"] });

        var aliveCheck = setInterval(function () {
          if (!alive()) {
            observer.disconnect();
            clearInterval(aliveCheck);
          }
        }, 1000);
      }
    }, 50);
  }

  function applyFocusMode(doc) {
    if (!doc.getElementById("pmFocusModeStyle")) {
      var style = doc.createElement("style");
      style.id = "pmFocusModeStyle";
      style.textContent = FOCUS_MODE_CSS;
      doc.head.appendChild(style);
    }
    installMmDictationScoreFix(doc);
    installRoundLabelFix(doc);
    installRoundScoreFix(doc);
  }

  var LEVEL_VALUES = ["Foundation", "Developing", "Securing", "Mastering"];
  var LEVEL_VALUES_LOWER = ["foundation", "developing", "securing", "mastering"];

  // harmony-explorer's two apps (key-signature-sprint, and era-explorer's
  // "Context Coach" mode) predate the rest of the app's canonical
  // Foundation/Developing/Securing/Mastering vocabulary and still use their
  // own "foundation/developing/secure/exam" naming for their own URL params
  // and radio values (cadence-coach shares that same UI convention, but has
  // no per-question level data at all yet, so nothing here changes what it
  // shows). A driver's own levelValues has two different jobs — matching
  // against the canonical question.level the server sends (student.js's
  // liveActiveLevelIndex), and feeding whatever value the embedded app
  // itself expects — so it can't be the app-native array for one of those
  // sources and canonical for the other; this translates canonical to
  // app-native right where each driver actually talks to its own page,
  // keeping levelValues itself canonical (and so correctly matchable).
  function toHarmonyExplorerAppLevel(canonicalLevel) {
    var level = String(canonicalLevel || "").toLowerCase();
    if (level === "securing") return "secure";
    if (level === "mastering") return "exam";
    return level || "foundation";
  }

  // Every driver belongs to exactly one of these main areas — this is what
  // Progress Mode now reports levels/feedback against, not individual
  // drivers/sub-apps. A driver's own `label` still identifies it, but only
  // ever surfaces inside written feedback text, never as its own scored row.
  var AREA_ORDER = ["melody", "texture", "harmony", "instrumentation", "rhythm", "context", "structure"];
  var AREA_LABELS = {
    melody: "Melody",
    texture: "Texture",
    harmony: "Harmony",
    instrumentation: "Instrumentation",
    rhythm: "Meter",
    context: "Context",
    structure: "Structure"
  };
  // Coloured per-area app icons for the student dashboard Progress Mode
  // "Detailed feedback" tiles — falls back to Progress Mode's own icon for
  // any area without an entry here.
  var AREA_ICONS = {
    melody: "/assets/icons/modules/melody-master.png",
    texture: "/assets/icons/modules/texture-trainer.png",
    harmony: "/assets/icons/modules/harmony-explorer.png",
    instrumentation: "/assets/icons/modules/instrument-identifier.png",
    rhythm: "/assets/icons/modules/meter-master.png",
    context: "/assets/icons/modules/context-coach.png",
    structure: "/assets/icons/modules/structure-spotter.png"
  };

  var DRIVERS = {
    "instrument-identifier": {
      label: "Instrument Identifier",
      area: "instrumentation",
      path: "../instrument-identifier/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        // Start stays disabled until both skill and level are explicitly
        // checked (neither has a default `checked` attribute in the HTML).
        setRadio(doc, "iiSkill", "instruments");
        setRadio(doc, "iiLevel", this.levelValues[levelIndex]);
        setRadio(doc, "questionCount", "3");
      },
      startButtonId: "startButton",
      // Some clips (responseType:"typed") render a typed-answer textarea
      // (#iiStudentAnswer) instead of #answers buttons — question-level, not
      // level-gated, and with no "always multiple choice" mode to force.
      // Left undetected, isAnswered never returns true for one of these, so
      // Progress Mode polls forever until the 90s safety timeout while the
      // app's own round keeps running underneath unnoticed.
      isAnswered: function (doc) {
        var buttons = doc.querySelectorAll("#answers button");
        if (buttons.length > 0 && Array.prototype.every.call(buttons, function (b) { return b.disabled; })) return true;
        var typed = doc.getElementById("iiStudentAnswer");
        return !!typed && typed.disabled;
      },
      isCorrect: function (doc) {
        var reveal = doc.querySelector("#answerCard .answer-reveal");
        if (reveal) return reveal.classList.contains("is-correct");
        var selected = doc.querySelector('#answers button[aria-checked="true"]');
        return !!selected && selected.classList.contains("correct");
      },
      getSignature: function (doc) {
        var choices = textSignature(doc, "#answers button");
        if (choices) return choices;
        var prompt = doc.getElementById("questionText");
        return prompt ? (prompt.textContent || "").trim() : null;
      }
    },

    "ensemble-recognition": {
      label: "Ensemble Recognition",
      area: "instrumentation",
      path: "../ensemble-recognition/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "ensSkill", "ensembles");
        setRadio(doc, "ensLevel", this.levelValues[levelIndex]);
        setRadio(doc, "questionCount", "3");
      },
      startButtonId: "startButton",
      // Same typed-answer gap as instrument-identifier above (some questions
      // are responseType:"typed", rendering #ensStudentAnswer instead of
      // .ensemble-option buttons) — this was the actual bug behind Progress
      // Mode appearing to "repeat 3 times then hang on a weird feedback
      // screen": isAnswered never returned true for a typed question, so
      // Progress Mode never noticed it was answered and never moved on,
      // while the app's own 3-question round (questionCount=3) kept running
      // underneath — through question 2, question 3, and finally its own
      // round-complete summary screen — until the 90s safety timeout
      // eventually gave up and force-advanced.
      isAnswered: function (doc) {
        var buttons = doc.querySelectorAll(".ensemble-option");
        if (buttons.length > 0 && Array.prototype.every.call(buttons, function (b) { return b.disabled; })) return true;
        var typed = doc.getElementById("ensStudentAnswer");
        return !!typed && typed.disabled;
      },
      isCorrect: function (doc) {
        var reveal = doc.querySelector("#answerCard .answer-reveal");
        if (reveal) return reveal.classList.contains("is-correct");
        var selected = doc.querySelector('.ensemble-option[aria-checked="true"]');
        return !!selected && selected.classList.contains("correct");
      },
      getSignature: function (doc) {
        var choices = textSignature(doc, ".ensemble-option");
        if (choices) return choices;
        var prompt = doc.getElementById("questionText");
        return prompt ? (prompt.textContent || "").trim() : null;
      }
    },

    "melody-master-devices": {
      label: "Melody Master · Melodic Devices",
      area: "melody",
      path: "../melody-master/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "quizMode", "devices");
        setRadio(doc, "mmLevel", this.levelValues[levelIndex]);
        setRadio(doc, "questionCount", "3");
      },
      startButtonId: "startButton",
      // A per-question responseType ("Multiple choice" vs "Written
      // response" — a handful of Securing/Mastering questions) renders a
      // #melodicDevicesWrittenAnswer textarea instead of any
      // .melodic-devices-option buttons at all — the old MC-only check
      // never returned true for one of these, so Progress Mode never
      // noticed it was answered (same class of bug found and fixed for
      // instrument-identifier/ensemble-recognition). setFeedback() stamps
      // #feedback's className to "good"/"bad" unconditionally either way
      // (the same signal melody-master-dictation's driver already relies
      // on below), so it's a reliable fallback here too.
      isAnswered: function (doc) {
        var buttons = doc.querySelectorAll(".melodic-devices-option");
        if (buttons.length > 0 && Array.prototype.every.call(buttons, function (b) { return b.disabled; })) return true;
        var feedback = doc.getElementById("feedback");
        return !!feedback && (feedback.classList.contains("good") || feedback.classList.contains("bad"));
      },
      isCorrect: function (doc) {
        var selected = doc.querySelector('.melodic-devices-option[aria-checked="true"]');
        if (selected) return selected.classList.contains("correct");
        var feedback = doc.getElementById("feedback");
        return !!feedback && feedback.classList.contains("good");
      },
      getSignature: function (doc) { return textSignature(doc, ".melodic-devices-option"); }
    },

    "melody-master-dictation": {
      label: "Melody Master · Melodic Dictation",
      area: "melody",
      path: "../melody-master/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "quizMode", "dictation");
        setRadio(doc, "mmLevel", this.levelValues[levelIndex]);
        setRadio(doc, "questionCount", "3");
      },
      startButtonId: "startButton",
      // Dragging notes onto the stave is real interaction a student does
      // themselves — there's nothing here to auto-click. #feedback starts
      // with no class and setFeedback() stamps className to "good"/"bad"
      // only once checkAnswer() runs, so it doubles as the answered signal.
      isAnswered: function (doc) {
        var feedback = doc.getElementById("feedback");
        return !!feedback && (feedback.classList.contains("good") || feedback.classList.contains("bad"));
      },
      isCorrect: function (doc) {
        var feedback = doc.getElementById("feedback");
        return !!feedback && feedback.classList.contains("good");
      },
      // The shared embed contract supplies Melody Master's stable question
      // ID on the normal path. The live question image remains a safe,
      // read-only fingerprint for legacy fallback mode; never execute code
      // inside the child window to reach its private lexical bindings.
      getSignature: function (doc) {
        var quizPanel = doc.querySelector(".quiz-panel");
        if (quizPanel && quizPanel.classList.contains("is-ready")) return null;

        var img = doc.getElementById("scoreImage");
        var src = img && (img.currentSrc || img.getAttribute("src") || "");
        if (!src) return null;
        return "mm-dictation-img:" + String(src).replace(/^.*\/modules\/melody-master\//, "").split("?")[0];
      }
    },

    "melodic-intervals": {
      label: "Melodic Intervals",
      area: "melody",
      path: "../melodic-intervals/index.html",
      levelValues: LEVEL_VALUES_LOWER,
      // This app is normally reached via melody-master's own "Intervals"
      // mode, which does a full-page redirect carrying level/count/etc as
      // URL params and auto-starts on load (see melody-master/script.js's
      // getMelodicIntervalLaunchUrl / melodic-intervals/script.js's launch
      // param handling, gated on source=melody-master). Progress Mode
      // targets it directly with the same params rather than bouncing
      // through melody-master first.
      buildUrl: function (levelIndex) {
        var params = new URLSearchParams({
          mode: "recognition",
          count: "3",
          level: this.levelValues[levelIndex],
          autostart: "1",
          source: "melody-master"
        });
        return this.path + "?" + params.toString();
      },
      autoStarts: true,
      isAnswered: function (doc) {
        var buttons = doc.querySelectorAll("#answers .mi-answer-button");
        if (buttons.length > 0 && Array.prototype.every.call(buttons, function (b) { return b.disabled; })) return true;
        var written = doc.getElementById("miWrittenAnswer");
        return !!written && written.disabled;
      },
      isCorrect: function (doc) {
        if (doc.querySelector("#answers .mi-answer-button.wrong")) return false;
        var written = doc.getElementById("miWrittenAnswer");
        if (written && written.classList.contains("is-wrong")) return false;
        return true;
      },
      // Some questions are written-input (per-question data, not level-
      // gated — isWrittenInputQuestion() in melodic-intervals/script.js),
      // rendering no .mi-answer-button at all. This driver is autoStarts,
      // so waitForAutoStartedQuestion uses getSignature truthiness as its
      // ONLY readiness signal (there's no Start-button/.is-ready flow to
      // fall back on) — a written question returning null here meant
      // readiness was never detected, so Progress Mode would wait out the
      // full timeout and silently skip it. Falls back to the stave's own
      // start/target note IDs (data-note-id), rendered unconditionally by
      // renderStave() alongside the answer UI either way (see
      // renderStave/renderAnswerInput both firing together for every
      // question), so this is both a real readiness AND signature fix.
      getSignature: function (doc) {
        var choices = textSignature(doc, "#answers .mi-answer-button");
        if (choices) return choices;
        var start = doc.querySelector(".mi-start-note");
        var target = doc.querySelector(".mi-target-note, .mi-drag-note");
        if (!start && !target) return null;
        return "notes:" +
          (start ? start.getAttribute("data-note-id") || "" : "") + "|" +
          (target ? target.getAttribute("data-note-id") || "" : "");
      }
    },

    "texture-trainer": {
      label: "Texture Trainer",
      area: "texture",
      path: "../texture-trainer/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        // Start stays disabled until both skill and level are explicitly
        // chosen; skill has only one option (Textural Devices) but it still
        // must be clicked, same as level.
        setRadio(doc, "ttSkill", "textural-devices");
        var target = this.levelValues[levelIndex];
        var buttons = doc.querySelectorAll(".level-button[data-level]");
        for (var i = 0; i < buttons.length; i++) {
          if (buttons[i].dataset.level === target) { buttons[i].click(); break; }
        }
        setRadio(doc, "textureQuestionCount", "5");
      },
      startButtonId: "startButton",
      isAnswered: function (doc) {
        var nextButton = doc.getElementById("nextButton");
        return !!nextButton && !nextButton.hidden;
      },
      // result.status is "correct" | "partial" | "missed" (see
      // modules/texture-trainer/script.js), rendered as
      // .answer-reveal.is-<status>. Partial credit counts as correct for
      // Progress Mode's binary scoring, same reasoning as ScoreDecoder's
      // typed-answer tier — otherwise genuine partial understanding on a
      // free-text answer is counted as an outright miss.
      isCorrect: function (doc) {
        var reveal = doc.querySelector("#answerCard .answer-reveal");
        if (reveal) return reveal.classList.contains("is-correct") || reveal.classList.contains("is-partial");
        var selected = doc.querySelector(".tt-choice-button.is-selected");
        return !!selected && selected.classList.contains("is-correct");
      },
      getSignature: function (doc) {
        var choices = textSignature(doc, ".tt-choice-button");
        if (choices) return choices;
        var prompt = doc.getElementById("questionPrompt");
        return prompt ? (prompt.textContent || "").trim() : null;
      }
    },

    "chord-identifier": {
      label: "Chord Identifier",
      area: "harmony",
      path: "../chord-identifier/index.html",
      levelValues: LEVEL_VALUES_LOWER,
      configure: function (doc, levelIndex) {
        // Start stays disabled until both skill and level are explicitly
        // checked (neither has a default `checked` attribute in the HTML).
        setRadio(doc, "skill", "chord-identifier");
        setRadio(doc, "difficulty", this.levelValues[levelIndex]);
        setRadio(doc, "questionCount", "5");
        // Force multiple-choice so answers are always auto-detectable via
        // button classes rather than a free-text form.
        setRadio(doc, "answerMode", "choice");
      },
      startButtonId: "startButton",
      isAnswered: function (doc) {
        var nextButton = doc.getElementById("nextButton");
        return !!nextButton && nextButton.disabled === false;
      },
      isCorrect: function (doc) {
        if (doc.querySelector(".answer-button.incorrect")) return false;
        var typed = doc.getElementById("typedInput");
        if (typed && typed.classList.contains("is-wrong")) return false;
        return true;
      },
      getSignature: function (doc) { return textSignature(doc, ".answer-button"); }
    },

    // Harmony has 2 more real skills beyond Chord Identifier: Key
    // Signatures and Cadences. Both are reached, in the app itself, via
    // modules/harmony-explorer/index.html's own skill-picker/redirector
    // (same pattern as melodic-intervals bypassing melody-master's own
    // picker) — driven here by targeting their real destination pages
    // directly rather than going through that picker.
    "harmony-key-signatures": {
      label: "Harmony Explorer · Key Signatures",
      area: "harmony",
      path: "../harmony-explorer/key-signature-sprint/index.html",
      levelValues: LEVEL_VALUES_LOWER,
      buildUrl: function (levelIndex) {
        var params = new URLSearchParams({
          level: toHarmonyExplorerAppLevel(this.levelValues[levelIndex]),
          questions: "5",
          answers: "choice",
          autostart: "1"
        });
        return this.path + "?" + params.toString();
      },
      autoStarts: true,
      isAnswered: keySignatureIsAnswered,
      isCorrect: keySignatureIsCorrect,
      getSignature: keySignatureSignature
    },

    "cadence-coach": {
      label: "Cadence Coach",
      area: "harmony",
      path: "../cadence-coach/index.html",
      levelValues: ["foundation", "developing", "secure", "exam"],
      buildUrl: function (levelIndex) {
        var params = new URLSearchParams({
          level: this.levelValues[levelIndex],
          autostart: "1"
        });
        return this.path + "?" + params.toString();
      },
      autoStarts: true,
      isAnswered: cadenceIsAnswered,
      isCorrect: cadenceIsCorrect,
      getSignature: cadenceSignature
    },

    // ScoreDecoder (modules/musical-language/) has 4 topics that route to 3
    // different main areas, so it's driven as one entry per topic (all
    // pointed at the same app page) rather than one entry for the whole
    // app — each entry just pins the app's own already-working
    // `elementFocus` filter to its one topic. Foundation/Developing render
    // multiple-choice `.answer-button`s; Securing/Mastering render a typed
    // `#typedAnswer` input instead with no correctness class, only a
    // "Correct"/"N of M marks" #feedback text — only full marks count as
    // correct here, matching every other driver's binary scoring.
    "musical-language-ornamentation": {
      label: "Musical Language · Ornamentation",
      area: "melody",
      path: "../musical-language/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "languageLevel", this.levelValues[levelIndex]);
        setRadio(doc, "elementFocus", "Ornamentation");
        setRadio(doc, "questionCount", "5");
      },
      startButtonId: "startButton",
      isAnswered: msLanguageIsAnswered,
      isCorrect: msLanguageIsCorrect,
      getSignature: msLanguageSignature
    },

    "musical-language-articulation": {
      label: "Musical Language · Articulation",
      area: "melody",
      path: "../musical-language/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "languageLevel", this.levelValues[levelIndex]);
        setRadio(doc, "elementFocus", "Articulation");
        setRadio(doc, "questionCount", "5");
      },
      startButtonId: "startButton",
      isAnswered: msLanguageIsAnswered,
      isCorrect: msLanguageIsCorrect,
      getSignature: msLanguageSignature
    },

    "musical-language-dynamics": {
      label: "Musical Language · Dynamics",
      area: "texture",
      path: "../musical-language/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "languageLevel", this.levelValues[levelIndex]);
        setRadio(doc, "elementFocus", "Dynamics");
        setRadio(doc, "questionCount", "5");
      },
      startButtonId: "startButton",
      isAnswered: msLanguageIsAnswered,
      isCorrect: msLanguageIsCorrect,
      getSignature: msLanguageSignature
    },

    "musical-language-tempo": {
      label: "Musical Language · Tempo",
      area: "rhythm",
      path: "../musical-language/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "languageLevel", this.levelValues[levelIndex]);
        setRadio(doc, "elementFocus", "Tempo");
        setRadio(doc, "questionCount", "5");
      },
      startButtonId: "startButton",
      isAnswered: msLanguageIsAnswered,
      isCorrect: msLanguageIsCorrect,
      getSignature: msLanguageSignature
    },

    // Structure Spotter is one unified topic (unlike ScoreDecoder's 4-way
    // split) — a single entry, pinning level and a fixed 5-question count;
    // "elementFocus" is deliberately left on its default "Mixed" so a
    // Progress Mode round can draw from any of the 3 structure groups.
    "structure-spotter": {
      label: "Structure Spotter",
      area: "structure",
      path: "../structure-spotter/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "structureLevel", this.levelValues[levelIndex]);
        setRadio(doc, "questionCount", "5");
      },
      startButtonId: "startButton",
      isAnswered: ssIsAnswered,
      isCorrect: ssIsCorrect,
      getSignature: ssSignature
    },

    "meter-master": {
      label: "Meter Master",
      area: "rhythm",
      path: "../meter-master/index.html",
      levelValues: LEVEL_VALUES,
      configure: function (doc, levelIndex) {
        setRadio(doc, "meterSkill", "rhythmic-devices");
        var target = this.levelValues[levelIndex];
        var buttons = doc.querySelectorAll(".level-button[data-level]");
        for (var i = 0; i < buttons.length; i++) {
          if (buttons[i].dataset.level === target) { buttons[i].click(); break; }
        }
        setRadio(doc, "meterQuestionCount", "3");
      },
      startButtonId: "startButton",
      isAnswered: function (doc) {
        var buttons = doc.querySelectorAll("#choiceGrid .choice-button");
        return buttons.length > 0 && Array.prototype.every.call(buttons, function (b) { return b.disabled; });
      },
      isCorrect: function (doc) {
        var selected = doc.querySelector('#choiceGrid .choice-button[aria-checked="true"]');
        return !!selected && selected.classList.contains("is-correct");
      },
      getSignature: function (doc) { return textSignature(doc, "#choiceGrid .choice-button"); }
    },

    // ContextCoach (era-explorer/) covers composer and period identification
    // — both squarely "Context" rather than any other area, so unlike
    // ScoreDecoder these 2 topics share one area, not several. Split into
    // one driver per topic anyway (same underlying page) purely for round-
    // building breadth, matching Melody Master's devices/dictation split.
    // Its own level radio uses different values ("secure"/"exam" rather
    // than "securing"/"mastering") than every other driver.
    "context-coach-composer": {
      label: "ContextCoach · Composers",
      area: "context",
      path: "../../era-explorer/index.html",
      levelValues: LEVEL_VALUES_LOWER,
      configure: function (doc, levelIndex) {
        setRadio(doc, "ccSkill", "composer");
        setRadio(doc, "ccLevel", toHarmonyExplorerAppLevel(this.levelValues[levelIndex]));
        setRadio(doc, "questionCount", "3");
      },
      startButtonId: "startButton",
      isAnswered: contextCoachIsAnswered,
      isCorrect: contextCoachIsCorrect,
      getSignature: contextCoachSignature
    },

    "context-coach-period": {
      label: "ContextCoach · Periods",
      area: "context",
      path: "../../era-explorer/index.html",
      levelValues: LEVEL_VALUES_LOWER,
      configure: function (doc, levelIndex) {
        setRadio(doc, "ccSkill", "period");
        setRadio(doc, "ccLevel", toHarmonyExplorerAppLevel(this.levelValues[levelIndex]));
        setRadio(doc, "questionCount", "3");
      },
      startButtonId: "startButton",
      isAnswered: contextCoachIsAnswered,
      isCorrect: contextCoachIsCorrect,
      getSignature: contextCoachSignature
    }
  };

  global.EAProgressModeDrivers = DRIVERS;
  global.EAProgressModeApplyFocusMode = applyFocusMode;
  global.EAProgressModeAreaOrder = AREA_ORDER;
  global.EAProgressModeAreaIcons = AREA_ICONS;
  global.EAProgressModeAreaLabels = AREA_LABELS;
})(window);
