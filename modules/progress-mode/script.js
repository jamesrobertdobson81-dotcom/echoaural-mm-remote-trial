(function () {
  "use strict";

  var Store = window.EAProgressModeStore;
  var Drivers = window.EAProgressModeDrivers;
  var AREA_ORDER = window.EAProgressModeAreaOrder;
  var AREA_LABELS = window.EAProgressModeAreaLabels;
  var SOURCE_ORDER = Object.keys(Drivers);

  var AREA_TO_SOURCES = {};
  AREA_ORDER.forEach(function (areaKey) { AREA_TO_SOURCES[areaKey] = []; });
  SOURCE_ORDER.forEach(function (sourceKey) { AREA_TO_SOURCES[Drivers[sourceKey].area].push(sourceKey); });

  // Several sources share one real underlying app page — e.g. ScoreDecoder's
  // 4 topics, or Melody Master's devices vs dictation — so "spread evenly
  // across apps" has to be judged at the page level (driver.path), not the
  // source level, or a multi-topic app could fill several slots in one
  // round while other apps sit out entirely.
  var APP_GROUPS = {};
  SOURCE_ORDER.forEach(function (sourceKey) {
    var groupKey = Drivers[sourceKey].path;
    if (!APP_GROUPS[groupKey]) APP_GROUPS[groupKey] = [];
    APP_GROUPS[groupKey].push(sourceKey);
  });
  var APP_GROUP_KEYS = Object.keys(APP_GROUPS);

  // Detailed per-area written feedback (strongest/weakest contributing
  // source) now lives only on the student dashboard's "Detailed feedback"
  // dialog for Progress Mode, which reads this folder's own store.js/
  // app-drivers.js/feedback.js directly — see account/student-home/
  // student-home.js's progressModeDetailMarkup(). This page's own RHS panel
  // shows only the per-area progress bars below.

  var CURRENT_STUDENT_KEY = "echoaural.progressmode.currentStudent";
  var roundLength = 10;
  var MAX_DUPLICATE_REROLLS = 4;

  var els = {
    setupMessage: document.getElementById("setupMessage"),
    identityBlock: document.getElementById("identityBlock"),
    loginForm: document.getElementById("loginForm"),
    studentNameInput: document.getElementById("studentName"),
    signedInAs: document.getElementById("signedInAs"),
    studentNameLabel: document.getElementById("studentNameLabel"),

    gameScreen: document.getElementById("gameScreen"),
    readyState: document.getElementById("readyState"),
    startRoundButton: document.getElementById("startRoundButton"),
    settingsToggle: document.getElementById("settingsToggle"),
    advancedSettings: document.getElementById("advancedSettings"),

    roundActiveWrap: document.getElementById("roundActiveWrap"),
    appFrame: document.getElementById("appFrame"),
    frameTransition: document.getElementById("frameTransition"),
    frameTransitionText: document.getElementById("frameTransitionText"),

    answerCard: document.getElementById("answerCard")
  };

  // Melody Master dictation expands its score PNG to a large fixed popup.
  // Inside the centre-column iframe that popup is tiny (narrow viewport +
  // hidden side panels). #gameScreen (.quiz-panel) also has overflow:hidden
  // and backdrop-filter, which clip / retarget position:fixed descendants.
  //
  // IMPORTANT: do NOT reparent #roundActiveWrap (it contains the iframe).
  // Moving an iframe in the DOM reloads it — that was resetting Melody Master
  // back to .is-ready while body.pm-mm-score-expanded stayed on, i.e. the
  // "stuck on MM home screen" hang. Instead, strip containing-block styles
  // from ancestors via CSS and fix-position the wrap in place.
  //
  // generation: iframe callbacks pass the slot generation so a destroyed
  // document's leftover poll cannot re-expand after navigation.
  var mmScoreGeneration = 0;

  function clearMmScoreWrapInlineStyles(wrap) {
    wrap.style.position = "";
    wrap.style.left = "";
    wrap.style.top = "";
    wrap.style.right = "";
    wrap.style.bottom = "";
    wrap.style.width = "";
    wrap.style.height = "";
    wrap.style.inset = "";
    wrap.style.zIndex = "";
    wrap.style.overflow = "";
    wrap.style.borderRadius = "";
    wrap.style.background = "";
  }

  function setMmScoreExpanded(expanded, generation) {
    var wrap = els.roundActiveWrap;
    if (!wrap) return;

    // Ignore stale expand requests from a previous iframe document. Collapse
    // is always honoured so navigation can reset cleanly.
    if (expanded && generation != null && Number(generation) !== mmScoreGeneration) {
      return;
    }

    if (!expanded) {
      document.body.classList.remove("pm-mm-score-expanded");
      clearMmScoreWrapInlineStyles(wrap);
      return;
    }

    document.body.classList.add("pm-mm-score-expanded");
    // Top-anchor below Progress Mode's own topbar, not the true viewport
    // top: the wrap needs the full viewport WIDTH so Melody Master's own
    // 100vw-based sizing math produces the same score size it uses
    // standalone, but starting it at y:0 would sit above the topbar's own
    // z-index and let MM's internal heading (rendered near the top of what
    // it thinks is its own page) visually collide with Progress Mode's real
    // nav once that nav is no longer hidden behind an opaque scrim.
    var topbarEl = document.querySelector(".topbar");
    var topOffset = topbarEl ? Math.round(topbarEl.getBoundingClientRect().bottom) : 0;
    wrap.style.position = "fixed";
    wrap.style.left = "0";
    wrap.style.top = topOffset + "px";
    wrap.style.right = "0";
    wrap.style.bottom = "0";
    wrap.style.width = "100vw";
    wrap.style.height = "calc(100vh - " + topOffset + "px)";
    wrap.style.zIndex = "10000";
    wrap.style.overflow = "visible";
    wrap.style.borderRadius = "0";
    // Transparent, not a dimming scrim: Progress Mode's own setup/info
    // panels should stay visible as the background behind the expanded
    // score, matching Melody Master's own standalone look (side panels
    // visible, score tile floating above them) — see the matching
    // body-transparency rule in app-drivers.js's FOCUS_MODE_CSS.
    wrap.style.background = "transparent";
  }

  window.EAProgressModeSetMmScoreExpanded = setMmScoreExpanded;
  window.EAProgressModeMmScoreGeneration = function () { return mmScoreGeneration; };

  // Melody Master's own dictation "Question X of Y" always reads its own
  // internal 3-question sub-round (see the melody-master-dictation driver's
  // configure() below, which always launches it with questionCount:"3") —
  // Progress Mode advances to the next slot the moment the first of those
  // three is answered, so the student never sees questions 2 or 3 and that
  // "of 3" never meant their actual position in this round. Expose the real
  // number so app-drivers.js can overwrite it inside the iframe.
  window.EAProgressModeGetRoundProgress = function () {
    return { position: state.position, total: state.queue ? state.queue.length : 0 };
  };

  var state = {
    studentId: null,
    studentName: null,
    queue: [],
    position: 0,
    correctTotal: 0,
    perSourceTally: {},
    perSourceSignatures: {},
    pollTimer: null,
    safetyTimer: null,
    readyTimer: null,
    confirmTimer: null,
    autoStartTimer: null,
    rerollsThisSlot: 0,
    // Set when the current slot's normal (area-level) attempt turned up no
    // questions at all and is being retried one level up instead — see
    // retryAtHigherLevelOrSkip. Reset to null for every new slot.
    slotLevelOverride: null,
    // The signature checkSignatureThenPoll accepted for the slot currently
    // being answered, so advanceSlot can record its right/wrong outcome
    // against the missed-question queue once it resolves.
    currentSlotSignature: null,
    // The level actually used to configure the current slot (area's current
    // level, or slotLevelOverride if this slot was escalated) — stashed here
    // so advanceSlot/finishRound can bank this question's outcome against
    // the level it was really asked at, not assumed to be the area's current
    // one. Set once per slot in loadCurrentSlotFrame, before any reroll.
    currentSlotLevelIndex: null
  };

  function slugify(name) {
    return String(name || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "student";
  }

  // Every source belonging to an area that has reached Mastering — the pool
  // Store.getReviewCandidate picks the most-overdue-for-review source from
  // (see buildRoundQueue). Round-robin alone keeps mixing this content in at
  // normal frequency forever, never starving it, but doesn't deliberately
  // SPACE it either — this is what adds the deliberate long-interval bias.
  function masteredAreaSources() {
    var keys = [];
    AREA_ORDER.forEach(function (areaKey) {
      if (Store.getAreaLevel(state.studentId, areaKey) === Store.LEVEL_IDS.length - 1) {
        keys = keys.concat(AREA_TO_SOURCES[areaKey]);
      }
    });
    return keys;
  }

  // The source currently flagged weakest within an area (enough sample to be
  // meaningful), used both to bias round-building and to pick which source
  // fills that area's guaranteed breadth slot. Null if there's not yet
  // enough data to judge. Once a source clears this bar, pickSourceForGroup
  // picks it deterministically (not just a soft bias) whenever its group's
  // turn comes up — so this threshold is the real lever controlling how
  // fast adaptive weighting actually kicks in. Was 8; lowered to 5 (a
  // student with e.g. 0/5 on one sub-skill was still being treated as
  // random-chance against its sibling until an 8th question came up, which
  // felt too slow to react to an already-clear weak spot).
  var ADAPTIVE_MIN_QUESTIONS = 5;
  function weakestSourceInArea(areaKey) {
    var sources = AREA_TO_SOURCES[areaKey];
    var cumulative = Store.getCumulativeStats(state.studentId, sources);
    var reliable = sources.filter(function (sourceKey) { return cumulative[sourceKey].questions >= ADAPTIVE_MIN_QUESTIONS; });
    if (!reliable.length) return null;
    return reliable.slice().sort(function (a, b) { return cumulative[a].percentage - cumulative[b].percentage; })[0];
  }

  // ---------- Identity ----------

  function setIdentity(id, name) {
    state.studentId = id;
    state.studentName = name;
    try { window.localStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify({ id: id, name: name })); } catch (err) {}

    els.loginForm.hidden = true;
    els.signedInAs.hidden = false;
    els.studentNameLabel.textContent = name;
    els.setupMessage.textContent = "";

    renderDashboard();
  }

  function showLoginState() {
    els.loginForm.hidden = false;
    els.signedInAs.hidden = true;
    els.setupMessage.textContent = "Enter your name to see your Progress Mode levels.";
    els.answerCard.innerHTML = "<p class=\"pm-app-grid-empty\">Sign in on the left to see your progress by area.</p>";
  }

  els.loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = els.studentNameInput.value.trim();
    if (!name) return;
    setIdentity(slugify(name), name);
  });

  // ---------- RHS: dashboard (per-area progress bars only — see the
  // student dashboard's Progress Mode "Detailed feedback" for levels,
  // level-progress metrics and written feedback per area) ----------

  var DASHBOARD_LINK_HTML =
    "<p class=\"pm-dashboard-link\">See your levels and personalised feedback on your " +
    "<a href=\"/account/student-home/\">dashboard</a>.</p>";

  function renderAreaBarsHTML() {
    var cumulative = Store.getCumulativeStats(state.studentId, SOURCE_ORDER);
    var rows = "";

    AREA_ORDER.forEach(function (areaKey) {
      var sources = AREA_TO_SOURCES[areaKey];
      var correct = 0;
      var questions = 0;
      sources.forEach(function (sourceKey) {
        correct += cumulative[sourceKey].correct;
        questions += cumulative[sourceKey].questions;
      });
      var tracksConcepts = sources.some(function (sourceKey) { return !!Drivers[sourceKey].getSignature; });
      var progressPercentage = Store.getAreaOverallProgressPercentage(state.studentId, areaKey, tracksConcepts);

      rows +=
        "<div class=\"pm-element-row\" data-area=\"" + areaKey + "\">" +
        "<div class=\"pm-element-row-label\">" + AREA_LABELS[areaKey] + "</div>" +
        "<div class=\"pm-element-bar-track\"><div class=\"pm-element-bar-fill" + (questions ? "" : " is-empty") + "\" style=\"width:" + progressPercentage + "%\"></div></div>" +
        "<div class=\"pm-element-row-value\">" + correct + "/" + questions + "</div>" +
        "</div>";
    });

    return (
      "<div class=\"pm-element-chart-block\">" +
      "<h3>Your progress by area</h3>" +
      "<p class=\"pm-element-chart-sub\">How far you are through Foundation → Mastering in each area, and marks earned out of marks attempted.</p>" +
      "<div class=\"pm-element-chart\">" + rows + "</div>" +
      "</div>" +
      DASHBOARD_LINK_HTML
    );
  }

  function renderDashboard() {
    els.answerCard.innerHTML = renderAreaBarsHTML();
  }

  // ---------- Round queue ----------

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // Which source within an app group actually fills a slot when that
  // group's turn comes up — favours whichever of the group's sources sits
  // in the area currently flagged weakest (the "progress dependent" part),
  // else picks randomly so a multi-topic app like ScoreDecoder still varies
  // across rounds even with no data yet.
  function pickSourceForGroup(groupKey) {
    var sources = APP_GROUPS[groupKey];
    if (sources.length === 1) return sources[0];

    var candidate = null;
    var candidatePercentage = Infinity;
    sources.forEach(function (sourceKey) {
      var areaKey = Drivers[sourceKey].area;
      if (weakestSourceInArea(areaKey) !== sourceKey) return;
      var stats = Store.getCumulativeStats(state.studentId, [sourceKey])[sourceKey];
      if (stats.percentage !== null && stats.percentage < candidatePercentage) {
        candidatePercentage = stats.percentage;
        candidate = sourceKey;
      }
    });
    return candidate || sources[Math.floor(Math.random() * sources.length)];
  }

  // Round-robin through a freshly-shuffled pass of the given app groups
  // before any of them repeats — "questions from different apps should be
  // spread as evenly as possible over a round." Several sources share one
  // app page (see APP_GROUPS above), so evenness is judged at the page
  // level; which source represents a repeat visit to a multi-topic app is
  // chosen adaptively via pickSourceForGroup. With more app groups than fit
  // evenly into `length`, this pulls from as many distinct apps as possible
  // and only repeats one once every app has had a turn. Factored out of
  // buildRoundQueue so a "focus area" round (see below) can run the exact
  // same logic over a narrowed-down set of groups.
  function buildQueueFromGroups(groupKeys, length) {
    var queue = [];
    var lastGroupKey = null;
    var cycle = shuffle(groupKeys.slice());
    var i = 0;
    while (queue.length < length) {
      if (i >= cycle.length) {
        var next = shuffle(groupKeys.slice());
        // Avoid the previous cycle's last app landing next to its own
        // first app again, which would otherwise read as back-to-back.
        if (lastGroupKey && next[0] === lastGroupKey && next.length > 1) {
          var swapWith = 1 + Math.floor(Math.random() * (next.length - 1));
          var tmp = next[0]; next[0] = next[swapWith]; next[swapWith] = tmp;
        }
        cycle = next;
        i = 0;
      }
      var groupKey = cycle[i];
      queue.push(pickSourceForGroup(groupKey));
      lastGroupKey = groupKey;
      i++;
    }
    return queue;
  }

  function getFocusAreaKey() {
    var checked = document.querySelector('input[name="pmFocusArea"]:checked');
    return checked && checked.value ? checked.value : null;
  }

  function appGroupKeysForArea(areaKey) {
    return APP_GROUP_KEYS.filter(function (groupKey) {
      return APP_GROUPS[groupKey].some(function (sourceKey) { return Drivers[sourceKey].area === areaKey; });
    });
  }

  // Every 4th slot in a focused round still draws from EVERY area, not just
  // the focused one — deliberately not a 100%-single-area round. Interleaving
  // across areas is a genuine strength of the normal round (see README) and
  // this keeps a minority of it even while biased toward one weak area a
  // student has chosen to drill.
  var FOCUS_BREADTH_INTERVAL = 4;

  function buildRoundQueue() {
    var focusAreaKey = getFocusAreaKey();
    var focusGroups = focusAreaKey ? appGroupKeysForArea(focusAreaKey) : null;

    var queue;
    if (focusGroups && focusGroups.length) {
      queue = buildQueueFromGroups(focusGroups, roundLength);
      for (var idx = FOCUS_BREADTH_INTERVAL - 1; idx < queue.length; idx += FOCUS_BREADTH_INTERVAL) {
        queue[idx] = buildQueueFromGroups(APP_GROUP_KEYS, 1)[0];
      }
    } else {
      queue = buildQueueFromGroups(APP_GROUP_KEYS, roundLength);
    }

    // Reserve one slot for deliberate long-interval review once at least one
    // area has reached Mastering — only on rounds long enough that losing a
    // slot to it doesn't dominate the mix. A best-effort bias, same spirit
    // as the missed-question retry: it can't guarantee this exact source
    // gets drawn, only that it's the one asked for.
    if (roundLength >= 5) {
      var reviewCandidate = Store.getReviewCandidate(state.studentId, masteredAreaSources());
      if (reviewCandidate) queue[queue.length - 1] = reviewCandidate;
    }

    return queue;
  }

  function startRound() {
    if (!state.studentId) return;

    var checkedCount = document.querySelector('input[name="pmQuestionCount"]:checked');
    roundLength = checkedCount ? parseInt(checkedCount.value, 10) : 10;

    state.queue = buildRoundQueue();
    state.position = 0;
    state.correctTotal = 0;
    // Both keyed by sourceKey, then by the level a question was actually
    // asked at (see currentSlotLevelIndex) — usually just one level per
    // source in a round, but a level-escalated retry mid-round can add a
    // second bucket for the same source.
    state.perSourceTally = {};
    state.perSourceSignatures = {};
    SOURCE_ORDER.forEach(function (sourceKey) {
      state.perSourceTally[sourceKey] = {};
      state.perSourceSignatures[sourceKey] = {};
    });

    els.readyState.hidden = true;
    els.gameScreen.classList.add("is-round-active");
    els.roundActiveWrap.hidden = false;
    loadSlot();
  }

  els.startRoundButton.addEventListener("click", startRound);

  // ---------- Slot loading ----------

  function clearTimers() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
    if (state.safetyTimer) { clearTimeout(state.safetyTimer); state.safetyTimer = null; }
    if (state.readyTimer) { clearInterval(state.readyTimer); state.readyTimer = null; }
    if (state.confirmTimer) { clearInterval(state.confirmTimer); state.confirmTimer = null; }
    if (state.autoStartTimer) { clearInterval(state.autoStartTimer); state.autoStartTimer = null; }
  }

  function loadSlot() {
    state.rerollsThisSlot = 0;
    state.slotLevelOverride = null;
    state.currentSlotSignature = null;
    els.frameTransition.hidden = false;
    els.frameTransitionText.textContent = "Loading your next question…";
    loadCurrentSlotFrame();
  }

  // The transition overlay stays up (never hidden here) for the entire
  // load → configure → focus-mode-CSS-injection sequence, since that raw
  // sequence is genuinely glitchy to see unmasked (blank iframe navigation,
  // then the target app's own full-brand topbar/setup screen before focus
  // mode hides it). It's only cleared once a real question is confirmed
  // ready — see revealQuestion(), called from checkSignatureThenPoll — so
  // this function is also safe to call again mid-retry (duplicate-signature
  // reroll, level-escalation retry) without it flickering open and shut.
  // Reassigning frame.src tears down the previous document, but not always
  // instantly — a pending audio/video element can keep playing for a beat
  // into the new navigation, audible even though the overlay above already
  // hides it visually (this is the "audio switches to another question and
  // plays more notes" bug — most noticeable on apps that autoplay
  // immediately, like Melodic Intervals, and especially right after a
  // duplicate/cooling-down reroll, which discards a question that may have
  // already started playing). Pausing explicitly, before every navigation,
  // closes that gap.
  function silenceCurrentFrame() {
    try {
      var doc = els.appFrame.contentDocument;
      if (!doc) return;
      pauseFrameMedia(doc);
    } catch (err) {
      /* cross-origin or not yet loaded — nothing to silence */
    }
  }

  // Many target apps autoplay their audio clip a short, fixed delay
  // (commonly ~180ms) after a question is set up — often sooner than
  // checkSignatureThenPoll gets a chance to run and decide reveal-vs-reroll,
  // so audio could start audibly while the transition overlay is still up.
  // Called the instant a question is detected (before that decision), so
  // anything already playing is muted immediately rather than being heard
  // first; resumeFrameMedia (called only once the question is actually kept
  // — see checkSignatureThenPoll) restarts it right as the overlay lifts,
  // keeping audio and reveal in sync instead of losing it outright.
  function pauseFrameMedia(doc) {
    try {
      var mediaEls = doc.querySelectorAll("audio, video");
      Array.prototype.forEach.call(mediaEls, function (media) {
        try { if (!media.paused) media.pause(); } catch (err) {}
      });
    } catch (err) {}
  }

  function resumeFrameMedia(doc) {
    try {
      var mediaEls = doc.querySelectorAll("audio, video");
      Array.prototype.forEach.call(mediaEls, function (media) {
        try {
          // Only resume media with real progress (currentTime > 0) — that's
          // the signal it was genuinely playing when pauseFrameMedia
          // stopped it. Media still at 0 was never actually started, so
          // there's nothing to resume; forcing .play() on it here would
          // just race the target app's own pending autoplay timer (many
          // apps fire it ~180ms after the question renders) and risk it
          // restarting/double-playing a moment later.
          if (media.paused && media.currentTime > 0) {
            var playPromise = media.play();
            if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
          }
        } catch (err) {}
      });
    } catch (err) {}
  }

  function loadCurrentSlotFrame() {
    clearTimers();
    silenceCurrentFrame();
    mmScoreGeneration += 1;
    setMmScoreExpanded(false);

    var sourceKey = state.queue[state.position];
    var driver = Drivers[sourceKey];
    var levelIndex = state.slotLevelOverride !== null
      ? state.slotLevelOverride
      : Store.getAreaLevel(state.studentId, driver.area);
    state.currentSlotLevelIndex = levelIndex;

    var frame = els.appFrame;
    var loadGeneration = mmScoreGeneration;
    frame.onload = function () {
      // A newer navigation superseded this load.
      if (loadGeneration !== mmScoreGeneration) return;
      frame.onload = null;
      var doc = frame.contentDocument;
      if (!doc) return;
      window.EAProgressModeApplyFocusMode(doc);
      if (driver.autoStarts) {
        waitForAutoStartedQuestion(doc, driver);
      } else {
        waitForReady(doc, driver, levelIndex);
      }
    };
    frame.src = driver.buildUrl
      ? driver.buildUrl(levelIndex) + "&_pm=" + Date.now()
      : driver.path + "?_pm=" + Date.now();
  }

  function waitForReady(doc, driver, levelIndex) {
    var attempts = 0;
    var configured = false;
    var isMelodyMaster = !!(driver.path && /melody-master/i.test(driver.path));
    if (state.readyTimer) clearInterval(state.readyTimer);
    state.readyTimer = setInterval(function () {
      attempts++;
      // Bail if this document was navigated away.
      if (!doc.defaultView || doc.defaultView !== els.appFrame.contentWindow) {
        clearInterval(state.readyTimer);
        state.readyTimer = null;
        return;
      }
      window.EAProgressModeApplyFocusMode(doc);
      var startButton = doc.getElementById(driver.startButtonId);
      if (!startButton) {
        if (attempts > 120) {
          clearInterval(state.readyTimer);
          state.readyTimer = null;
          advanceSlot(false, true);
        }
        return;
      }

      // Melody Master keeps Start disabled until skill + level are checked.
      // Re-apply configure every tick there — a one-shot pass can miss the
      // change listeners and leave the iframe on the MM ready/home screen.
      // Other apps keep the original one-shot configure.
      if (isMelodyMaster || !configured) {
        if (typeof driver.configure === "function") driver.configure(doc, levelIndex);
        configured = true;
      }

      if (startButton.disabled && isMelodyMaster) {
        var modeOk = !!doc.querySelector('input[name="quizMode"]:checked');
        var levelOk = !!doc.querySelector('input[name="mmLevel"]:checked');
        if (modeOk && levelOk) startButton.disabled = false;
      }

      if (!startButton.disabled) {
        clearInterval(state.readyTimer);
        state.readyTimer = null;
        startButton.click();
        confirmStartedThenPoll(doc, driver, levelIndex);
      } else if (attempts > 120) {
        clearInterval(state.readyTimer);
        state.readyTimer = null;
        advanceSlot(false, true);
      }
    }, 50);
  }

  // Clicking Start doesn't always produce a question — a driver can
  // configure a combination its target app itself has nothing for (e.g. a
  // ScoreDecoder topic not yet introduced at the student's current level —
  // several are locked until Developing or later),  which every app handles
  // the same way: show its own "no questions available" message and
  // silently stay on the ready screen rather than proceeding. Left alone,
  // that would hang until the 90s safety timeout in beginAnsweredPolling.
  // Every app shares the same house `.quiz-panel.is-ready` convention,
  // reliably removed (via its own start-round function — the exact code
  // differs per app, but all of them do it) the moment a round genuinely
  // starts, so give the click a short grace window to leave that state and
  // treat it as empty at this level if it never does.
  //
  // Deliberately does NOT also treat driver.getSignature(doc) as a
  // readiness signal: ScoreDecoder's #questionKicker element exists in the
  // static page with placeholder text ("SCORE DECODER") before any question
  // has loaded, so getSignature returns a truthy value even in the empty-
  // pool failure case — using it here would swallow exactly the failure
  // this check exists to catch.
  function confirmStartedThenPoll(doc, driver, levelIndex) {
    var attempts = 0;
    // Melody Master devices awaits a JSON fetch before leaving .is-ready;
    // dictation is sync but still allow a short retry-click window. Other
    // apps keep the original ~1.5s empty-pool grace.
    var maxAttempts = (driver.path && /melody-master/i.test(driver.path)) ? 100 : 30;
    var retriedClick = false;
    if (state.confirmTimer) clearInterval(state.confirmTimer);
    state.confirmTimer = setInterval(function () {
      attempts++;
      if (!doc.defaultView || doc.defaultView !== els.appFrame.contentWindow) {
        clearInterval(state.confirmTimer);
        state.confirmTimer = null;
        return;
      }
      var quizPanel = doc.querySelector(".quiz-panel");
      var stillOnReadyScreen = !!quizPanel && quizPanel.classList.contains("is-ready");

      if (!stillOnReadyScreen) {
        clearInterval(state.confirmTimer);
        state.confirmTimer = null;
        checkSignatureThenPoll(doc, driver);
        return;
      }

      // One retry if the first Start click was ignored while still on ready.
      if (!retriedClick && attempts === 20) {
        retriedClick = true;
        var startButton = doc.getElementById(driver.startButtonId);
        if (startButton && !startButton.disabled) {
          try { startButton.click(); } catch (err) { /* ignore */ }
        }
      }

      if (attempts > maxAttempts) {
        clearInterval(state.confirmTimer);
        state.confirmTimer = null;
        retryAtHigherLevelOrSkip(driver, levelIndex);
      }
    }, 50);
  }

  // An empty pool at this level doesn't mean the source has nothing for
  // this student — content only ever gets richer at higher levels, never
  // sparser (a topic can be locked UNTIL a level, never locked ABOVE one).
  // So rather than abandon the slot to a completely different app, retry
  // the same source one level up, escalating as far as Mastering before
  // finally giving up and moving on. An escalated question is answered at a
  // higher level than the area's own current level, and its result is
  // banked at THAT higher level (see currentSlotLevelIndex / Store.
  // recordSourceResult's levelIndex param) — never counted toward the
  // area's current-level pass bar, so a harder escalated question can never
  // drag down (or prematurely clear) a level the student isn't actually
  // being tested on.
  function retryAtHigherLevelOrSkip(driver, failedLevelIndex) {
    var maxLevelIndex = driver.levelValues.length - 1;
    if (failedLevelIndex < maxLevelIndex) {
      state.slotLevelOverride = failedLevelIndex + 1;
      loadCurrentSlotFrame();
    } else {
      advanceSlot(false, true);
    }
  }

  // melodic-intervals is reached via a direct URL launch (level/count/etc
  // as query params) and calls its own startRound() on load — there's no
  // Start button for us to wait on/click, so instead wait for the first
  // question's answer choices to actually exist before checking it.
  function waitForAutoStartedQuestion(doc, driver) {
    var attempts = 0;
    if (state.autoStartTimer) clearInterval(state.autoStartTimer);
    state.autoStartTimer = setInterval(function () {
      attempts++;
      if (!doc.defaultView || doc.defaultView !== els.appFrame.contentWindow) {
        clearInterval(state.autoStartTimer);
        state.autoStartTimer = null;
        return;
      }
      window.EAProgressModeApplyFocusMode(doc);
      var hasQuestion = false;
      try { hasQuestion = !!(driver.getSignature && driver.getSignature(doc)); } catch (err) {}

      if (hasQuestion) {
        clearInterval(state.autoStartTimer);
        state.autoStartTimer = null;
        checkSignatureThenPoll(doc, driver);
      } else if (attempts > 120) {
        clearInterval(state.autoStartTimer);
        state.autoStartTimer = null;
        advanceSlot(false, true);
      }
    }, 50);
  }

  // Per-source (not per-round) "already seen" set, persisted in
  // localStorage via the same shared/js/spaced-repetition.js utility other
  // apps already use for their own question cycling — reused here rather
  // than reimplemented. Scoped by student so two students sharing a browser
  // never share a cycle.
  function spacedRepKey(sourceKey) {
    return "progressmode:" + state.studentId + ":" + sourceKey;
  }

  // Reroll (silently reload the same slot, same source+level) if this exact
  // question has already been shown to this student for this source — not
  // just earlier in this round, but in any past round too, so "cycle
  // through all available questions before repeating" holds across
  // sessions, not just within one — OR if it's a previously-missed question
  // still within its retry cooldown (Store.isMissCoolingDown). Caps at
  // MAX_DUPLICATE_REROLLS; if every reroll still lands on something to
  // avoid, either the pool is fully cycled (reset it) or the cooldown just
  // hasn't cleared yet (left alone — it'll clear on its own schedule), and
  // the question is accepted rather than looping forever.
  function checkSignatureThenPoll(doc, driver) {
    // Mute first, decide second — see pauseFrameMedia's own comment. This
    // runs on every call, reroll or not, so a duplicate/cooling-down
    // question that had already started playing never gets a chance to be
    // heard at all, not just cut short once loadCurrentSlotFrame reloads.
    pauseFrameMedia(doc);

    var signature = null;
    try { signature = driver.getSignature ? driver.getSignature(doc) : null; } catch (err) { signature = null; }

    var sourceKey = state.queue[state.position];
    var SR = window.EchoAuralSpacedRepetition;
    var seenKey = spacedRepKey(sourceKey);

    if (signature) {
      var alreadySeen = SR ? SR.getSeenIds(seenKey).indexOf(signature) !== -1 : false;
      var coolingDown = Store.isMissCoolingDown(state.studentId, sourceKey, signature);

      if ((alreadySeen || coolingDown) && state.rerollsThisSlot < MAX_DUPLICATE_REROLLS) {
        state.rerollsThisSlot++;
        loadCurrentSlotFrame();
        return;
      }
      if (alreadySeen && SR) SR.resetCycle(seenKey);
      if (SR) SR.markShown([signature], { key: seenKey, idOf: function (s) { return s; } });
    }

    if (signature) {
      state.currentSlotSignature = signature;
      var slotLevelKey = state.currentSlotLevelIndex;
      if (!state.perSourceSignatures[sourceKey][slotLevelKey]) state.perSourceSignatures[sourceKey][slotLevelKey] = [];
      state.perSourceSignatures[sourceKey][slotLevelKey].push(signature);
    }
    revealQuestion();
    resumeFrameMedia(doc);
    beginAnsweredPolling(doc, driver);
  }

  // The one place the transition overlay actually comes down — a real
  // question has been confirmed ready underneath it (see the comment on
  // loadCurrentSlotFrame for why it's kept up until now).
  function revealQuestion() {
    els.frameTransition.hidden = true;
    // Several drivers rely on the target app's own `input.focus()` call
    // (e.g. musical-language's #typedAnswer, requestAnimationFrame(() =>
    // input.focus())) to put the caret in a typed-answer field. That only
    // reliably routes keyboard input if the IFRAME ITSELF already has real
    // browser focus at that moment — before this, the student has never
    // clicked inside it, so the parent page can still hold focus even
    // though document.activeElement inside the iframe reports the input as
    // focused. Explicitly focusing the frame here (same-origin, so this is
    // safe) closes that gap: typing/Enter then reaches the input reliably
    // without the student needing to click into it first.
    try { els.appFrame.contentWindow && els.appFrame.contentWindow.focus(); } catch (err) {}
  }

  function beginAnsweredPolling(doc, driver) {
    state.pollTimer = setInterval(function () {
      var answered;
      try {
        answered = driver.isAnswered(doc);
      } catch (err) {
        answered = false;
      }
      if (answered) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
        var correct = false;
        try { correct = !!driver.isCorrect(doc); } catch (err) { correct = false; }
        advanceSlot(correct, false);
        return;
      }

      // Some apps' typed-answer submit handlers synchronously focus their
      // OWN "Next question" button as part of the same keypress that
      // submitted the answer (e.g. ScoreDecoder/Key Signatures:
      // `els.next.disabled = false; els.next.focus();` inside their submit
      // function, still running as part of the same Enter keydown) — the
      // browser's native "Enter/Space activates the focused button"
      // behavior then clicks it immediately, auto-advancing to the next
      // question entirely within one native event, well before this
      // 350ms-interval poll can ever observe the brief "just answered"
      // state in between. Left unhandled, this module never notices and a
      // student ends up playing through the target app's own internal
      // multi-question round completely unsupervised — repeatedly, since
      // the same race repeats on every subsequent question — until it
      // finally lands on that app's own round-complete screen and this
      // module's 90s safety timeout is all that eventually recovers it.
      // If the driver can fingerprint questions, a signature that no
      // longer matches what was revealed is unambiguous proof the app
      // moved on regardless of what isAnswered currently reports.
      // Correctness for the question actually asked about can't be
      // reliably recovered at this point — isCorrect would now be reading
      // the NEW question's DOM, not the one that was answered — so this is
      // recorded as a skip rather than guessed at.
      if (driver.getSignature && state.currentSlotSignature) {
        var currentSignature = null;
        try { currentSignature = driver.getSignature(doc); } catch (err) { currentSignature = null; }
        if (currentSignature && currentSignature !== state.currentSlotSignature) {
          clearInterval(state.pollTimer);
          state.pollTimer = null;
          advanceSlot(false, true);
        }
      }
    }, 350);

    state.safetyTimer = setTimeout(function () {
      if (state.pollTimer) {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
        advanceSlot(false, true);
      }
    }, 90000);
  }

  function advanceSlot(wasCorrect, wasSkipped) {
    clearTimers();
    var sourceKey = state.queue[state.position];

    if (!wasSkipped) {
      var slotLevelKey = state.currentSlotLevelIndex;
      if (!state.perSourceTally[sourceKey][slotLevelKey]) state.perSourceTally[sourceKey][slotLevelKey] = { correct: 0, total: 0 };
      state.perSourceTally[sourceKey][slotLevelKey].total += 1;
      if (wasCorrect) {
        state.perSourceTally[sourceKey][slotLevelKey].correct += 1;
        state.correctTotal += 1;
      }
      if (state.currentSlotSignature) {
        Store.recordQuestionOutcome(state.studentId, sourceKey, state.currentSlotSignature, wasCorrect);
      }
    }

    state.position += 1;

    if (state.position >= roundLength) {
      finishRound();
      return;
    }

    els.frameTransition.hidden = false;
    els.frameTransitionText.textContent = wasSkipped
      ? "Skipping that one — moving on…"
      : (wasCorrect ? "Correct — nice work! Next question…" : "Moving to your next question…");

    setTimeout(loadSlot, 1400);
  }

  function finishRound() {
    // Per-area totals for THIS round only (not all-time) — used by the
    // round-complete popup's coverage bars/feedback below. Computed from
    // state.perSourceTally before it's reset by the next startRound().
    var roundAreaStats = {};
    AREA_ORDER.forEach(function (areaKey) { roundAreaStats[areaKey] = { correct: 0, total: 0 }; });
    var leveledUpAreas = [];

    SOURCE_ORDER.forEach(function (sourceKey) {
      var driver = Drivers[sourceKey];
      var tracksConcepts = !!driver.getSignature;
      var byLevel = state.perSourceTally[sourceKey];
      Object.keys(byLevel).forEach(function (levelKey) {
        var tally = byLevel[levelKey];
        if (tally.total > 0) {
          var signatures = state.perSourceSignatures[sourceKey][levelKey] || [];
          var result = Store.recordSourceResult(
            state.studentId, sourceKey, driver.area, tally.correct, tally.total,
            signatures, tracksConcepts, Number(levelKey), AREA_TO_SOURCES[driver.area]
          );
          roundAreaStats[driver.area].correct += tally.correct;
          roundAreaStats[driver.area].total += tally.total;
          if (result && result.advanced && leveledUpAreas.indexOf(driver.area) === -1) {
            leveledUpAreas.push(driver.area);
          }
        }
      });
    });
    Store.recordRoundComplete(state.studentId);
    postProgressSummaryBestEffort();

    // Hiding roundActiveWrap only hides the iframe visually — it doesn't
    // stop anything still playing inside it (the final question's audio
    // clip may not have finished). Without this, that audio could keep
    // playing audibly into the summary screen.
    silenceCurrentFrame();
    setMmScoreExpanded(false);

    els.roundActiveWrap.hidden = true;
    els.gameScreen.classList.remove("is-round-active");
    els.readyState.hidden = false;

    renderSummary();
    showRoundCompletePopup(roundAreaStats, leveledUpAreas);
  }

  // Best-effort mirror of this round's result to the server, so a teacher
  // can see real Progress Mode data (accounts/account-server.js's
  // /api/student/progress-mode-summary route) — the one deliberate
  // exception to this module's "touches nothing outside itself" rule (see
  // store.js's own header comment). Fire-and-forget: never awaited, any
  // failure (no login session for a direct/standalone visit, offline,
  // server down) is silently ignored, since localStorage remains the real
  // source of truth regardless of whether this succeeds.
  function postProgressSummaryBestEffort() {
    try {
      var snapshot = Store.getSnapshot(state.studentId, AREA_ORDER);
      var cumulative = Store.getCumulativeStats(state.studentId, SOURCE_ORDER);
      var totalCorrect = 0;
      var totalQuestions = 0;

      var areas = AREA_ORDER.map(function (areaKey) {
        var correct = 0;
        var questions = 0;
        AREA_TO_SOURCES[areaKey].forEach(function (sourceKey) {
          correct += cumulative[sourceKey].correct;
          questions += cumulative[sourceKey].questions;
        });
        totalCorrect += correct;
        totalQuestions += questions;
        var areaState = snapshot.areas[areaKey];
        return {
          areaKey: areaKey,
          label: AREA_LABELS[areaKey],
          level: areaState.level,
          levelLabel: areaState.levelLabel,
          correct: correct,
          questions: questions
        };
      });

      fetch("/api/student/progress-mode-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallLevelLabel: snapshot.overallLevelLabel,
          roundsCompleted: snapshot.roundsCompleted,
          totalCorrect: totalCorrect,
          totalQuestions: totalQuestions,
          areas: areas
        })
      }).catch(function () { /* offline or no session — ignored on purpose */ });
    } catch (err) {
      /* never let a sync-side failure here break finishing the round */
    }
  }

  // ---------- RHS: round summary — same bars-only view as the idle
  // dashboard (now updated with this round's results). `results` (from
  // finishRound()'s Store.recordSourceResult calls) has already been
  // persisted by the time this runs; it isn't needed for rendering since
  // level/feedback detail now lives on the dashboard, not here. ----------

  function renderSummary() {
    els.answerCard.innerHTML = renderAreaBarsHTML();
  }

  // ---------- Round-complete popup — a branded full-screen overlay, shown
  // once per finished round on top of the RHS summary above. Deliberately
  // reuses instrument-identifier's own round-feedback-window classes
  // verbatim (.ii-round-feedback-overlay/.ii-round-review-panel/
  // .mm-round-review-hero/etc. — index.html already loads
  // ../instrument-identifier/style.css in full, so these render fully
  // branded with zero new CSS needed for the shell) rather than inventing a
  // parallel set of "pm-" branded classes — matching how texture-trainer
  // does the same. Only the CONTENT differs: round-only per-area coverage
  // bars (reusing this page's own .pm-element-row/.pm-element-bar-fill,
  // not all-time cumulative like the idle dashboard's bars) and a short
  // feedback sentence, rather than instrument-identifier's medal/per-
  // question row list. ----------

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[ch];
    });
  }

  function joinList(items) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  // Short, round-scoped feedback — deliberately not feedback.js's
  // all-time buildAreaFeedback (that's cumulative, multi-sentence, and only
  // loaded on the dashboard); this is about what just happened in the
  // round the student is looking at right now, plus a concrete next step.
  function buildRoundFeedbackText(roundAreaStats, leveledUpAreas) {
    var covered = AREA_ORDER.filter(function (areaKey) { return roundAreaStats[areaKey].total > 0; });
    var sentence;

    if (!covered.length) {
      sentence = "Play a round to start building feedback here.";
    } else {
      var sorted = covered.slice().sort(function (a, b) {
        var pctA = roundAreaStats[a].correct / roundAreaStats[a].total;
        var pctB = roundAreaStats[b].correct / roundAreaStats[b].total;
        return pctB - pctA;
      });
      var best = sorted[0];
      var worst = sorted[sorted.length - 1];
      var bestPct = Math.round((roundAreaStats[best].correct / roundAreaStats[best].total) * 100);
      var worstPct = Math.round((roundAreaStats[worst].correct / roundAreaStats[worst].total) * 100);

      if (best === worst || covered.length === 1) {
        sentence = "You scored " + bestPct + "% in " + AREA_LABELS[best] + " this round — keep it up next round.";
      } else {
        sentence = "Strongest in " + AREA_LABELS[best] + " (" + bestPct + "%) this round. " +
          "Focus next on " + AREA_LABELS[worst] + " (" + worstPct + "%).";
      }
    }

    if (leveledUpAreas.length) {
      var labels = leveledUpAreas.map(function (areaKey) { return AREA_LABELS[areaKey]; });
      sentence = "🎉 You've moved up a level in " + joinList(labels) + "! " + sentence;
    }

    return sentence;
  }

  function renderRoundCompletePanel(roundAreaStats, leveledUpAreas) {
    var percentage = roundLength ? Math.round((state.correctTotal / roundLength) * 100) : 0;

    var areaRows = AREA_ORDER.map(function (areaKey) {
      var stat = roundAreaStats[areaKey];
      var covered = stat.total > 0;
      var pct = covered ? Math.round((stat.correct / stat.total) * 100) : 0;
      return (
        "<div class=\"pm-element-row\" data-area=\"" + areaKey + "\">" +
        "<div class=\"pm-element-row-label\">" + escapeHtml(AREA_LABELS[areaKey]) + "</div>" +
        "<div class=\"pm-element-bar-track\"><div class=\"pm-element-bar-fill" + (covered ? "" : " is-empty") + "\" style=\"width:" + pct + "%\"></div></div>" +
        "<div class=\"pm-element-row-value\">" + (covered ? (stat.correct + "/" + stat.total) : "—") + "</div>" +
        "</div>"
      );
    }).join("");

    return (
      "<div class=\"ii-round-review-panel\">" +
      "<p class=\"eyebrow\">ROUND COMPLETE</p>" +
      "<div class=\"mm-round-review-hero\">" +
      "<span>Your round</span>" +
      "<strong>" + state.correctTotal + "/" + roundLength + "</strong>" +
      "<small>" + percentage + "% correct</small>" +
      "</div>" +
      "<div class=\"pm-element-chart-block\">" +
      "<h3>Coverage this round</h3>" +
      "<p class=\"pm-element-chart-sub\">Marks earned out of marks attempted, by area — just this round.</p>" +
      "<div class=\"pm-element-chart\">" + areaRows + "</div>" +
      "</div>" +
      "<div class=\"diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile\">" +
      "<span>Feedback</span>" +
      "<strong>" + escapeHtml(buildRoundFeedbackText(roundAreaStats, leveledUpAreas)) + "</strong>" +
      "</div>" +
      "<button id=\"roundCompleteContinueButton\" class=\"primary-button mm-final-finish-button\" type=\"button\">Continue</button>" +
      "</div>"
    );
  }

  var roundCompleteOverlay = null;

  function closeRoundCompletePopup() {
    document.body.classList.remove("ii-round-review-open");
    document.querySelector(".app-shell")?.classList.remove("is-round-feedback-open");
    els.gameScreen.classList.remove("is-round-feedback-open");
    if (roundCompleteOverlay) {
      roundCompleteOverlay.remove();
      roundCompleteOverlay = null;
    }
  }

  function showRoundCompletePopup(roundAreaStats, leveledUpAreas) {
    closeRoundCompletePopup();
    document.body.classList.add("ii-round-review-open");
    document.querySelector(".app-shell")?.classList.add("is-round-feedback-open");
    els.gameScreen.classList.add("is-round-feedback-open");

    roundCompleteOverlay = document.createElement("div");
    roundCompleteOverlay.className = "ii-round-feedback-overlay";
    roundCompleteOverlay.setAttribute("role", "dialog");
    roundCompleteOverlay.setAttribute("aria-modal", "true");
    roundCompleteOverlay.setAttribute("aria-label", "Progress Mode round feedback");
    roundCompleteOverlay.innerHTML = renderRoundCompletePanel(roundAreaStats, leveledUpAreas);
    document.body.appendChild(roundCompleteOverlay);

    document.getElementById("roundCompleteContinueButton").addEventListener("click", closeRoundCompletePopup);
  }

  // ---------- Advanced settings popover (mirrors instrument-identifier/script.js) ----------

  function setAdvancedSettingsOpen(isOpen) {
    els.advancedSettings.style.display = isOpen ? "block" : "none";
    els.advancedSettings.classList.toggle("is-open", isOpen);
    els.advancedSettings.setAttribute("aria-hidden", String(!isOpen));
    els.settingsToggle.setAttribute("aria-expanded", String(isOpen));
  }

  els.settingsToggle.addEventListener("click", function (event) {
    event.stopPropagation();
    setAdvancedSettingsOpen(els.settingsToggle.getAttribute("aria-expanded") !== "true");
  });
  els.advancedSettings.addEventListener("click", function (event) { event.stopPropagation(); });
  document.addEventListener("click", function (event) {
    var isOpen = els.settingsToggle.getAttribute("aria-expanded") === "true";
    if (isOpen && !els.advancedSettings.contains(event.target) && !els.settingsToggle.contains(event.target)) {
      setAdvancedSettingsOpen(false);
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && els.settingsToggle.getAttribute("aria-expanded") === "true") {
      setAdvancedSettingsOpen(false);
      els.settingsToggle.focus();
    }
  });

  // ---------- Init ----------

  (function init() {
    var launchParams = new URLSearchParams(window.location.search);
    var launchStudentId = launchParams.get("studentId");
    if (launchStudentId) {
      setIdentity(launchStudentId, launchParams.get("studentName") || launchStudentId);
      return;
    }

    try {
      var saved = JSON.parse(window.localStorage.getItem(CURRENT_STUDENT_KEY) || "null");
      if (saved && saved.id) {
        setIdentity(saved.id, saved.name);
        return;
      }
    } catch (err) {}

    showLoginState();
  })();
})();
