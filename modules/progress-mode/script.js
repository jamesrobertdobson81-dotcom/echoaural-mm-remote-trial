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

  // Reverse of the grouping above, at the app-group (page) level rather
  // than the source level, keyed by area rather than group — built from
  // APP_GROUPS so a group shared across several areas (Musical Language's
  // 4 topics span melody/texture/rhythm) legitimately appears in more than
  // one area's list, rather than being "owned" by just one. This is what
  // buildQueueFromAreas below cycles through, instead of raw app groups —
  // see its own comment for why that distinction matters.
  var AREA_TO_GROUPS = {};
  AREA_ORDER.forEach(function (areaKey) { AREA_TO_GROUPS[areaKey] = []; });
  APP_GROUP_KEYS.forEach(function (groupKey) {
    var areasSeen = {};
    APP_GROUPS[groupKey].forEach(function (sourceKey) {
      var areaKey = Drivers[sourceKey].area;
      if (!areasSeen[areaKey]) {
        areasSeen[areaKey] = true;
        AREA_TO_GROUPS[areaKey].push(groupKey);
      }
    });
  });

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

  // Same reasoning as EAProgressModeGetRoundProgress above, for marks
  // instead of position: every embedded app's own "Mark: X / Y" (#scoreText)
  // reflects that one app's own single-slot sub-round, never Progress
  // Mode's actual round score. state.correctTotal/state.position are
  // updated together in advanceSlot() right before the next slot loads, so
  // reading them here always gives "marks earned / questions attempted so
  // far this round" — see installRoundScoreFix in app-drivers.js.
  window.EAProgressModeGetRoundScore = function () {
    return { correct: state.correctTotal, attempted: state.position };
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
    // against that signature's schedule once it resolves.
    currentSlotSignature: null,
    // Date.now() stamped in rememberSlotSignature, the moment this slot's
    // question was actually revealed to the student — advanceSlot subtracts
    // this from its own Date.now() to get responseTimeMs (captured only,
    // like Anki's revlog.time; not used in the scheduling formula). Null
    // outside an active, revealed slot.
    currentSlotRevealedAt: null,
    // This round's answered-question events, collected as they happen
    // (each carrying the resulting ease/interval/repetitions from
    // Store.recordQuestionOutcome) and POSTed as a batch at finishRound —
    // see postReviewsToServer.
    pendingReviews: [],
    // The level actually used to configure the current slot (area's current
    // level, or slotLevelOverride if this slot was escalated) — stashed here
    // so advanceSlot/finishRound can bank this question's outcome against
    // the level it was really asked at, not assumed to be the area's current
    // one. Set once per slot in loadCurrentSlotFrame, before any reroll.
    currentSlotLevelIndex: null,
    // How many times the current slot's SOURCE has been swapped out for a
    // different one after failing to ever produce a visible question (see
    // replaceCurrentSlotAndRetry) — capped so a genuinely broken app can't
    // hang the round forever. Reset to 0 for every new slot.
    emptySlotReplacements: 0,
    // The versioned iframe contract is the primary readiness/result path.
    // These fields isolate every navigation so late messages from a
    // discarded iframe cannot resolve the current slot.
    currentSlotId: "",
    contractQuestionAccepted: false,
    contractPendingQuestion: null,
    framePrepared: false,
    slotResolved: false
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
    syncStateFromServer();
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

  // Gamification: correct-answer streak + daily play streak (Phase 1 of the
  // Progress Mode gamification plan). Rendered as part of renderAreaBarsHTML
  // so it appears on both the idle dashboard and the round-summary view via
  // one shared path; also given stable child ids so advanceSlot can update
  // just the correct-streak numbers live, every question, without having to
  // re-render the whole RHS panel mid-round (the one place a live-updating
  // counter is safe to build — see updateStreakChipLive below).
  function renderStreakChipHTML() {
    var snapshot = Store.getStreakSnapshot(state.studentId);
    return (
      "<div class=\"pm-streak-chip\" id=\"pmStreakChip\">" +
      "<div class=\"pm-streak-chip-item\">" +
      "<span class=\"pm-streak-chip-icon\" aria-hidden=\"true\"><img src=\"../../assets/icons/progress-mode/streak.png\" alt=\"\"></span>" +
      "<span class=\"pm-streak-chip-text\">" +
      "<span class=\"pm-streak-chip-label\">Streak</span>" +
      "<strong id=\"pmStreakCorrectCurrent\">" + snapshot.correctCurrent + "</strong>" +
      "<span class=\"pm-streak-chip-best\">best <span id=\"pmStreakCorrectBest\">" + snapshot.correctBest + "</span></span>" +
      "</span>" +
      "</div>" +
      "<div class=\"pm-streak-chip-item\">" +
      "<span class=\"pm-streak-chip-icon\" aria-hidden=\"true\"><img src=\"../../assets/icons/progress-mode/daily-streak.png\" alt=\"\"></span>" +
      "<span class=\"pm-streak-chip-text\">" +
      "<span class=\"pm-streak-chip-label\">Day streak</span>" +
      "<strong id=\"pmStreakDailyCurrent\">" + snapshot.dailyCurrent + "</strong>" +
      "<span class=\"pm-streak-chip-best\">best <span id=\"pmStreakDailyBest\">" + snapshot.dailyBest + "</span></span>" +
      "</span>" +
      "</div>" +
      "</div>"
    );
  }

  // Called after every answered question (see advanceSlot). Targets the
  // chip's own numbers directly rather than re-rendering renderAreaBarsHTML
  // wholesale — the RHS panel's per-area bars are deliberately round-scoped
  // (only updated via renderSummary at round end), and this must not
  // disturb that. A no-op if the chip isn't mounted yet (e.g. the very first
  // slot of a student's first-ever round, before renderDashboard has run —
  // in practice setIdentity always runs first, so this is just a safety
  // guard, not an expected path).
  function updateStreakChipLive() {
    var correctCurrentEl = document.getElementById("pmStreakCorrectCurrent");
    if (!correctCurrentEl) return;
    var snapshot = Store.getStreakSnapshot(state.studentId);
    correctCurrentEl.textContent = snapshot.correctCurrent;
    document.getElementById("pmStreakCorrectBest").textContent = snapshot.correctBest;
  }

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
      var progressPercentage = Store.getAreaOverallProgressPercentage(state.studentId, areaKey, areaTracksConcepts(areaKey));

      rows +=
        "<div class=\"pm-element-row\" data-area=\"" + areaKey + "\">" +
        "<div class=\"pm-element-row-label\">" + AREA_LABELS[areaKey] + "</div>" +
        "<div class=\"pm-element-bar-track\"><div class=\"pm-element-bar-fill" + (questions ? "" : " is-empty") + "\" style=\"width:" + progressPercentage + "%\"></div></div>" +
        "<div class=\"pm-element-row-value\">" + correct + "/" + questions + "</div>" +
        "</div>";
    });

    return (
      renderStreakChipHTML() +
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

  function hasAdjacentRepeat(arr) {
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] === arr[i - 1]) return true;
    }
    return false;
  }

  // Same as shuffle(), but repairs any adjacent duplicate left by chance —
  // needed once buildAreaCycleDeck() below has repeated entries (a plain
  // shuffle of 6 always-distinct areas could never land two of the same
  // side by side, but a weighted deck with e.g. two "melody" entries
  // occasionally can). A single forward-swap pass normally fixes this, but
  // it can fail outright if every copy of a repeated area happens to land
  // clustered at the very end of the shuffle (no differing element left
  // to swap in) — a real possibility now that an area's adaptive bonus
  // (see ADAPTIVE_WEIGHT_BONUS_CAP) can push its deck count above the old
  // "never more than twice" ceiling the single-pass version relied on. So
  // this retries the shuffle+repair a bounded number of times whenever a
  // repair pass still leaves an adjacent duplicate, falling back to its
  // best attempt if genuinely unlucky every time — matching the deck
  // model's own "no long unlucky droughts" spirit rather than ever
  // silently shipping a run of back-to-back same-area questions.
  var SHUFFLE_REPAIR_ATTEMPTS = 10;
  function shuffleNoAdjacentRepeats(arr) {
    var best = null;
    for (var attempt = 0; attempt < SHUFFLE_REPAIR_ATTEMPTS; attempt++) {
      var result = shuffle(arr.slice());
      for (var i = 1; i < result.length; i++) {
        if (result[i] === result[i - 1]) {
          for (var j = i + 1; j < result.length; j++) {
            if (result[j] !== result[i - 1]) {
              var tmp = result[i]; result[i] = result[j]; result[j] = tmp;
              break;
            }
          }
        }
      }
      if (!hasAdjacentRepeat(result)) return result;
      best = best || result;
    }
    return best;
  }

  // Real CIE exam weighting: Context is a minor bolt-on (typically a
  // single 1-mark question at the end of an extract) rather than a full
  // skill area on par with Melody/Texture/Harmony/Instrumentation/Rhythm
  // — so it shouldn't get an equal share of round slots the way those five
  // do among themselves. Represented as a weighted multiset ("deck")
  // rather than a per-slot probability, so the existing shuffle-and-cycle
  // machinery (guaranteed even coverage per cycle, no long unlucky
  // droughts) keeps working unchanged — buildQueueFromAreas just cycles
  // through this expanded list instead of the plain 6-item AREA_ORDER.
  // 2:1 for the five main areas vs. Context lands Context at 1/11 ≈ 9% of
  // all slots — a deliberate choice (not a bug), matching Context's real
  // exam weighting rather than the other five's.
  // Rebuilt fresh on every buildRoundQueue() call (below) rather than a
  // load-time constant, so an area's slot share can respond to how the
  // student is actually doing — not just sit at a fixed exam-weighting
  // ratio forever regardless of a struggling area never catching up. Base
  // weights are exactly the ones above (context=1, others=2) and still
  // reflect the real CIE exam weighting; adaptiveBonus is added on top,
  // driven by how far this area's own overall progress sits below the
  // student's own average across all their areas — never a fixed target,
  // so a student who's uniformly behind everywhere gets no bonus anywhere,
  // only a RELATIVELY lagging area does — capped so no single area can
  // crowd out the others' base share. Self-correcting: as a lagging area's
  // progress rises toward the average, its gap (and bonus) shrinks back
  // toward 0 on its own, no manual reset needed. A brand-new student has
  // every area at 0% progress (gap = 0 everywhere), so their very first
  // deck is byte-identical to the old fixed ratio — this only kicks in
  // once there's real evidence of an imbalance to correct.
  var ADAPTIVE_WEIGHT_BONUS_CAP = 2;
  function areaTracksConcepts(areaKey) {
    return AREA_TO_SOURCES[areaKey].some(function (sourceKey) { return !!Drivers[sourceKey].getSignature; });
  }
  function buildAreaCycleDeck() {
    var progress = {};
    var sum = 0;
    AREA_ORDER.forEach(function (areaKey) {
      var percentage = Store.getAreaOverallProgressPercentage(state.studentId, areaKey, areaTracksConcepts(areaKey));
      progress[areaKey] = percentage;
      sum += percentage;
    });
    var average = sum / AREA_ORDER.length;

    var deck = [];
    AREA_ORDER.forEach(function (areaKey) {
      var baseWeight = areaKey === "context" ? 1 : 2;
      var gap = Math.max(0, average - progress[areaKey]);
      // 25 points is "one level" on Store's own progress scale (see
      // getAreaOverallProgressPercentage) — reusing that unit rather than
      // inventing a new arbitrary one.
      var bonus = Math.min(ADAPTIVE_WEIGHT_BONUS_CAP, Math.round(gap / 25));
      var weight = baseWeight + bonus;
      for (var i = 0; i < weight; i++) deck.push(areaKey);
    });
    return deck;
  }

  // Which source within an app group actually fills a slot when that
  // group's turn comes up — favours whichever of the group's sources sits
  // in the area currently flagged weakest (the "progress dependent" part),
  // else picks randomly so a multi-topic app like ScoreDecoder still varies
  // across rounds even with no data yet.
  //
  // `requiredAreaKey` (optional) constrains the choice to only that group's
  // sources belonging to that one area — essential whenever a specific
  // area's turn/focus is already decided (buildQueueFromAreas, and a
  // focused round in buildRoundQueue), since some groups genuinely serve
  // several areas at once (Musical Language's 4 topics span melody/
  // texture/rhythm). Without this filter, "rhythm's turn" landing on that
  // shared group could silently hand back a melody or texture question 3
  // times out of 4 — which would both break area-fair round-building and
  // mean a student who deliberately picks "Focus: Rhythm" could still get
  // served melody/texture questions from that same shared app. Left
  // undefined (the pre-existing call site in buildQueueFromGroups' generic
  // form) it behaves exactly as before — any source in the group is fair
  // game.
  function pickSourceForGroup(groupKey, requiredAreaKey) {
    var sources = APP_GROUPS[groupKey];
    if (requiredAreaKey) {
      sources = sources.filter(function (sourceKey) { return Drivers[sourceKey].area === requiredAreaKey; });
    }
    if (sources.length === 1) return sources[0];

    // Exploration floor: weakestSourceInArea only ever trusts a source once
    // it clears ADAPTIVE_MIN_QUESTIONS, so a sibling still below that bar
    // can never be compared on percentage — without this check, the FIRST
    // sibling to cross the bar becomes the group's only "reliable" source
    // and so trivially wins "weakest" by elimination forever, permanently
    // locking out any sibling that never gets picked again to earn its own
    // sample (confirmed against real data: context-coach-composer reaching
    // 5 questions before context-coach-period left period essentially
    // unplayed for good). Forcing the least-sampled unproven sibling here
    // is bounded and self-terminating — it only fires while at least one
    // sibling is short of the bar, and never fires again once every
    // sibling has cleared it, so it can't turn into a permanent forced
    // 50/50 split once real performance data exists for both.
    var cumulative = Store.getCumulativeStats(state.studentId, sources);
    var unproven = sources.filter(function (sourceKey) { return cumulative[sourceKey].questions < ADAPTIVE_MIN_QUESTIONS; });
    if (unproven.length) {
      var minQuestions = Math.min.apply(null, unproven.map(function (sourceKey) { return cumulative[sourceKey].questions; }));
      var leastSampled = unproven.filter(function (sourceKey) { return cumulative[sourceKey].questions === minQuestions; });
      return leastSampled[Math.floor(Math.random() * leastSampled.length)];
    }

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
  // same logic over a narrowed-down set of groups. `requiredAreaKey`
  // (optional) is threaded straight through to pickSourceForGroup — a
  // focused round passes its one focus area here, so a shared group
  // (Musical Language) drawn during a "Focus: Rhythm" round can only ever
  // hand back rhythm's own topic (tempo), never melody's or texture's.
  function buildQueueFromGroups(groupKeys, length, requiredAreaKey) {
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
      queue.push(pickSourceForGroup(groupKey, requiredAreaKey));
      lastGroupKey = groupKey;
      i++;
    }
    return queue;
  }

  // Which of an area's own app groups fills a slot when that area's turn
  // comes up in buildQueueFromAreas — picked uniformly among the area's
  // groups (pickSourceForGroup already applies the adaptive weakest-source
  // bias one level down, once a specific group's turn is chosen here).
  function pickGroupForArea(areaKey) {
    var groups = AREA_TO_GROUPS[areaKey];
    return groups.length === 1 ? groups[0] : groups[Math.floor(Math.random() * groups.length)];
  }

  // Round-robin through a freshly-shuffled pass of `areaDeck` (normally
  // buildAreaCycleDeck()'s output — see its own comment for why Context is
  // deliberately under-weighted there, and appGroupKeysForArea/buildQueueFromGroups for
  // the focused-round path, which stays a plain single-area cycle since
  // area-fairness isn't a question when only one area is in play). Cycling
  // by AREA first, then picking one of that area's own groups via
  // pickGroupForArea, is what fixed areas served by only one app page
  // (Context Coach, entirely on era-explorer) being structurally starved
  // under the old pure group-level round-robin: Harmony has 3 app groups
  // feeding it, Context has exactly 1, so cycling by raw group gave
  // Harmony 3x Context's turn frequency by pure accident of how many pages
  // happen to serve each area, regardless of whatever weighting was
  // actually intended. Uses shuffleNoAdjacentRepeats rather than plain
  // shuffle because a weighted deck can contain the same area twice.
  function buildQueueFromAreas(areaDeck, length) {
    var queue = [];
    var lastAreaKey = null;
    var cycle = shuffleNoAdjacentRepeats(areaDeck);
    var i = 0;
    while (queue.length < length) {
      if (i >= cycle.length) {
        var next = shuffleNoAdjacentRepeats(areaDeck);
        if (lastAreaKey && next[0] === lastAreaKey && next.length > 1) {
          var swapWith = 1 + Math.floor(Math.random() * (next.length - 1));
          var tmp = next[0]; next[0] = next[swapWith]; next[swapWith] = tmp;
        }
        cycle = next;
        i = 0;
      }
      var areaKey = cycle[i];
      queue.push(pickSourceForGroup(pickGroupForArea(areaKey), areaKey));
      lastAreaKey = areaKey;
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
      queue = buildQueueFromGroups(focusGroups, roundLength, focusAreaKey);
      for (var idx = FOCUS_BREADTH_INTERVAL - 1; idx < queue.length; idx += FOCUS_BREADTH_INTERVAL) {
        queue[idx] = buildQueueFromAreas(buildAreaCycleDeck(), 1)[0];
      }
    } else {
      queue = buildQueueFromAreas(buildAreaCycleDeck(), roundLength);
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
    if (!state.studentId || els.startRoundButton.disabled) return;

    var checkedCount = document.querySelector('input[name="pmQuestionCount"]:checked');
    roundLength = checkedCount ? parseInt(checkedCount.value, 10) : 10;

    state.queue = buildRoundQueue();
    state.position = 0;
    state.correctTotal = 0;
    state.pendingReviews = [];
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

  function rememberSlotSignature(signature) {
    if (!signature) return;
    var sourceKey = state.queue[state.position];
    var SR = window.EchoAuralSpacedRepetition;
    var seenKey = spacedRepKey(sourceKey);
    var slotLevelKey = state.currentSlotLevelIndex;
    if (SR) SR.markShown([signature], { key: seenKey, idOf: function (value) { return value; } });
    state.currentSlotSignature = signature;
    state.currentSlotRevealedAt = Date.now();
    if (!state.perSourceSignatures[sourceKey][slotLevelKey]) state.perSourceSignatures[sourceKey][slotLevelKey] = [];
    state.perSourceSignatures[sourceKey][slotLevelKey].push(signature);
  }

  function shouldRerollSignature(signature) {
    if (!signature) return false;
    var sourceKey = state.queue[state.position];
    var SR = window.EchoAuralSpacedRepetition;
    var seenKey = spacedRepKey(sourceKey);
    var alreadySeen = SR ? SR.getSeenIds(seenKey).indexOf(signature) !== -1 : false;
    var coolingDown = Store.isSignatureCoolingDown(state.studentId, sourceKey, signature);

    if ((alreadySeen || coolingDown) && state.rerollsThisSlot < MAX_DUPLICATE_REROLLS) {
      state.rerollsThisSlot += 1;
      return true;
    }
    if (alreadySeen && SR) SR.resetCycle(seenKey);
    return false;
  }

  function acceptContractQuestion(message) {
    if (state.contractQuestionAccepted || state.slotResolved) return;
    var payload = message.payload || {};
    var signature = String(payload.signature || payload.id || "").trim() || null;
    pauseFrameMedia(els.appFrame.contentDocument);
    if (shouldRerollSignature(signature)) {
      loadCurrentSlotFrame();
      return;
    }

    clearTimers();
    state.contractQuestionAccepted = true;
    state.contractPendingQuestion = null;
    rememberSlotSignature(signature);
    revealQuestion();
    resumeFrameMedia(els.appFrame.contentDocument);
    // This is only a recovery guard. Normal completion arrives immediately
    // from the app's answer-complete event rather than a DOM polling loop.
    state.safetyTimer = setTimeout(function () { advanceSlot(false, true); }, 90000);
  }

  function handleContractMessage(event) {
    if (event.origin !== window.location.origin || event.source !== els.appFrame.contentWindow) return;
    var message = event.data || {};
    if (message.namespace !== "echoaural-progress" || message.version !== 1) return;
    if (message.slotId !== state.currentSlotId || message.sourceKey !== state.queue[state.position]) return;

    if (message.type === "question-ready") {
      if (!state.framePrepared) state.contractPendingQuestion = message;
      else acceptContractQuestion(message);
    } else if (message.type === "answer-complete" && state.contractQuestionAccepted) {
      advanceSlot(Boolean(message.payload && message.payload.correct), false, message.payload);
    } else if (message.type === "pool-empty" && !state.contractQuestionAccepted) {
      retryAtHigherLevelOrSkip(Drivers[state.queue[state.position]], state.currentSlotLevelIndex);
    }
  }

  window.addEventListener("message", handleContractMessage);

  function loadSlot() {
    state.rerollsThisSlot = 0;
    state.slotLevelOverride = null;
    state.currentSlotSignature = null;
    state.currentSlotRevealedAt = null;
    state.emptySlotReplacements = 0;
    state.slotResolved = false;
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
    state.currentSlotId = String(state.studentId) + ":" + state.position + ":" + mmScoreGeneration;
    state.contractQuestionAccepted = false;
    state.contractPendingQuestion = null;
    state.framePrepared = false;
    state.slotResolved = false;

    var frame = els.appFrame;
    var loadGeneration = mmScoreGeneration;
    frame.onload = function () {
      // A newer navigation superseded this load.
      if (loadGeneration !== mmScoreGeneration) return;
      frame.onload = null;
      var doc = frame.contentDocument;
      if (!doc) return;
      window.EAProgressModeApplyFocusMode(doc);
      state.framePrepared = true;
      if (state.contractPendingQuestion) {
        acceptContractQuestion(state.contractPendingQuestion);
        return;
      }
      if (driver.autoStarts) {
        waitForAutoStartedQuestion(doc, driver);
      } else {
        waitForReady(doc, driver, levelIndex);
      }
    };
    var baseUrl = driver.buildUrl ? driver.buildUrl(levelIndex) : driver.path;
    var separator = baseUrl.indexOf("?") === -1 ? "?" : "&";
    frame.src = baseUrl + separator + new URLSearchParams({
      _pm: Date.now(),
      eaProgressHost: "1",
      eaProgressSlot: state.currentSlotId,
      eaProgressSource: sourceKey
    }).toString();
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
          replaceCurrentSlotAndRetry(state.queue[state.position]);
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
        replaceCurrentSlotAndRetry(state.queue[state.position]);
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

  // Swaps the current slot's source for a different one and retries the
  // SAME position, rather than accepting a skip that never showed the
  // student a question at all. Called only from the three failure points
  // that can be reached before revealQuestion() ever runs for this slot
  // (waitForReady's two bail branches, waitForAutoStartedQuestion's bail,
  // and retryAtHigherLevelOrSkip's final give-up once every level has been
  // tried) — i.e. exactly the cases where "give up" would otherwise consume
  // one of the round's N slots without ever giving the student a real
  // question. This is what makes "a round always has exactly N questions"
  // true in practice, not just in the initially-built queue: a 10-question
  // round always ends with 10 questions actually SHOWN, even if one or two
  // sources along the way turned out to have nothing available. The
  // post-reveal skip paths in beginAnsweredPolling (signature mismatch, 90s
  // safety timeout) are deliberately left alone — a question WAS already
  // shown there, so that slot has already delivered on the "N questions
  // given" promise even though it isn't scored.
  //
  // Capped at MAX_EMPTY_SLOT_REPLACEMENTS per slot so a catastrophically
  // broken app roster can't hang a round forever — past the cap this falls
  // back to a genuine skip, same as the old behaviour, rather than looping.
  var MAX_EMPTY_SLOT_REPLACEMENTS = 4;

  function replaceCurrentSlotAndRetry(excludeSourceKey) {
    state.emptySlotReplacements = (state.emptySlotReplacements || 0) + 1;
    if (state.emptySlotReplacements > MAX_EMPTY_SLOT_REPLACEMENTS) {
      advanceSlot(false, true);
      return;
    }

    var focusAreaKey = getFocusAreaKey();
    var candidateGroupKeys = focusAreaKey ? appGroupKeysForArea(focusAreaKey) : APP_GROUP_KEYS;
    if (!candidateGroupKeys.length) candidateGroupKeys = APP_GROUP_KEYS;

    var replacement = null;
    for (var attempt = 0; attempt < 8 && !replacement; attempt++) {
      var candidate = buildQueueFromGroups(candidateGroupKeys, 1)[0];
      if (candidate !== excludeSourceKey) replacement = candidate;
    }
    if (!replacement) replacement = buildQueueFromGroups(APP_GROUP_KEYS, 1)[0];

    state.queue[state.position] = replacement;
    state.slotLevelOverride = null;
    loadCurrentSlotFrame();
  }

  // An empty pool at this level doesn't mean the source has nothing for
  // this student — content only ever gets richer at higher levels, never
  // sparser (a topic can be locked UNTIL a level, never locked ABOVE one).
  // So rather than abandon the slot to a completely different app, retry
  // the same source one level up, escalating as far as Mastering before
  // finally handing off to a different source entirely (see
  // replaceCurrentSlotAndRetry above). An escalated question is answered at
  // a higher level than the area's own current level, and its result is
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
      replaceCurrentSlotAndRetry(state.queue[state.position]);
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
        replaceCurrentSlotAndRetry(state.queue[state.position]);
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
  // still within its scheduled cooldown (Store.isSignatureCoolingDown). Caps at
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

    if (shouldRerollSignature(signature)) {
      loadCurrentSlotFrame();
      return;
    }
    rememberSlotSignature(signature);
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

  function advanceSlot(wasCorrect, wasSkipped, payload) {
    if (state.slotResolved) return;
    state.slotResolved = true;
    clearTimers();
    var sourceKey = state.queue[state.position];

    if (!wasSkipped) {
      // Concept-level evidence (e.g. chord-identifier's inversion/extension
      // tier), when the app proactively reported it in its answer-complete
      // payload — the DOM-polling fallback path (beginAnsweredPolling) has
      // no payload at all, so this is simply skipped there, same as it
      // already skips score/feedback capture today. Guarded defensively:
      // an app not yet sending concept fields, or a sourceKey with no
      // PM_REGISTRY entry or no configured extractor, just yields an empty
      // array and records nothing — never blocks the round from advancing.
      try {
        var conceptModuleId = window.EchoAuralPMRegistry && window.EchoAuralPMRegistry.get(sourceKey) && window.EchoAuralPMRegistry.get(sourceKey).moduleId;
        var conceptValues = (conceptModuleId && payload && window.EchoAuralConceptExtractors)
          ? window.EchoAuralConceptExtractors.extractConceptValues(conceptModuleId, payload)
          : [];
        if (conceptValues.length) {
          Store.recordConceptOutcome(state.studentId, conceptModuleId, conceptValues, wasCorrect);
        }
      } catch (err) {
        /* never let concept-capture break round advancement */
      }
      var slotLevelKey = state.currentSlotLevelIndex;
      if (!state.perSourceTally[sourceKey][slotLevelKey]) state.perSourceTally[sourceKey][slotLevelKey] = { correct: 0, total: 0 };
      state.perSourceTally[sourceKey][slotLevelKey].total += 1;
      if (wasCorrect) {
        state.perSourceTally[sourceKey][slotLevelKey].correct += 1;
        state.correctTotal += 1;
      }
      if (state.currentSlotSignature) {
        var responseTimeMs = typeof state.currentSlotRevealedAt === "number"
          ? Date.now() - state.currentSlotRevealedAt
          : null;
        var reviewResult = Store.recordQuestionOutcome(
          state.studentId, sourceKey, state.currentSlotSignature, wasCorrect, responseTimeMs
        );
        if (reviewResult) {
          state.pendingReviews.push({
            clientReviewId: createClientReviewId(),
            sourceKey: sourceKey,
            questionSignature: state.currentSlotSignature,
            correct: Boolean(wasCorrect),
            levelIndex: state.currentSlotLevelIndex || 0,
            easeFactor: reviewResult.easeFactor,
            intervalDraws: reviewResult.intervalDraws,
            repetitions: reviewResult.repetitions,
            responseTimeMs: reviewResult.responseTimeMs,
            completedAt: reviewResult.completedAt
          });
        }
      }
      // Sibling of the recordQuestionOutcome call above, not nested inside
      // its signature check — the correct-answer streak only needs
      // wasCorrect, not a signature (some drivers can't fingerprint
      // questions at all, and the streak should still count for those).
      Store.recordStreakOutcome(state.studentId, wasCorrect);
      updateStreakChipLive();
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
    var sourcesPlayedThisRound = [];

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
          if (sourcesPlayedThisRound.indexOf(sourceKey) === -1) sourcesPlayedThisRound.push(sourceKey);
          if (result && result.advanced && leveledUpAreas.indexOf(driver.area) === -1) {
            leveledUpAreas.push(driver.area);
          }
        }
      });
    });

    var roundTotalCorrect = 0;
    var roundTotalQuestions = 0;
    AREA_ORDER.forEach(function (areaKey) {
      roundTotalCorrect += roundAreaStats[areaKey].correct;
      roundTotalQuestions += roundAreaStats[areaKey].total;
    });
    var roundPercentage = roundTotalQuestions > 0 ? Math.round((roundTotalCorrect / roundTotalQuestions) * 100) : null;

    Store.recordRoundComplete(state.studentId, roundPercentage === null ? undefined : roundPercentage);
    // Read fresh, AFTER recordRoundComplete, so the daily-streak number the
    // popup celebrates reflects today's round (recordRoundComplete is what
    // actually advances it) — the correct-answer streak was already kept
    // current throughout via advanceSlot's own recordStreakOutcome calls.
    var streakSnapshot = Store.getStreakSnapshot(state.studentId);
    postProgressSummaryBestEffort();
    postStateToServer();
    postReviewsToServer();

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
    showRoundCompletePopup(roundAreaStats, leveledUpAreas, streakSnapshot, sourcesPlayedThisRound);
  }

  // ---------- Server-sync (spaced-repetition continuity across devices) ----------
  //
  // A SEPARATE, purely internal mechanism from postProgressSummaryBestEffort
  // below. Three independent pieces:
  // - Per-area level/level-progress, via accounts/account-server.js's
  //   /api/student/progress-mode-state (merge-on-sync, unchanged).
  // - Per-question scheduling, via the new
  //   /api/student/progress-mode-reviews — an append-only log of answered
  //   questions (db/progress-mode-reviews-schema.sql), each event already
  //   carrying its own resulting ease/interval/repetitions, so merging is
  //   just "keep whichever of local/incoming is newer, per signature" (see
  //   Store.applyIncomingReviews). SR "seen this cycle" continuity is
  //   derived straight from the fetched reviews themselves (every
  //   sourceKey/questionSignature pair in the log has, by definition, been
  //   seen) rather than synced as a separate field.
  // - Cumulative per-source correct/questions, via
  //   /api/student/progress-mode-summary (the same table a teacher's
  //   dashboard reads, now also read back here — see
  //   Store.mergeIncomingSummary), so level-advancement and adaptive
  //   next-round weighting don't reset to zero on a new device.
  //
  // localStorage remains authoritative for gameplay throughout; all three
  // are synced at the two natural checkpoints: once on identity resolution
  // (GET + merge, gating round-start so a round can never begin on stale
  // pre-merge data) and once per finished round (POST, right alongside the
  // existing summary mirror).
  function syncStateFromServer() {
    els.startRoundButton.disabled = true;
    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      els.startRoundButton.disabled = false;
    }
    // Never let a slow/failed sync leave Progress Mode unusable — same
    // best-effort philosophy as postProgressSummaryBestEffort below.
    setTimeout(finish, 4000);

    try {
      Promise.all([
        fetch("/api/student/progress-mode-state", { credentials: "same-origin" })
          .then(function (response) { return response.ok ? response.json() : null; })
          .catch(function () { return null; }),
        fetch("/api/student/progress-mode-reviews", { credentials: "same-origin" })
          .then(function (response) { return response.ok ? response.json() : null; })
          .catch(function () { return null; }),
        fetch("/api/student/progress-mode-summary", { credentials: "same-origin" })
          .then(function (response) { return response.ok ? response.json() : null; })
          .catch(function () { return null; })
      ])
        .then(function (results) {
          var statePayload = results[0];
          var reviewsPayload = results[1];
          var summaryPayload = results[2];
          var SR = window.EchoAuralSpacedRepetition;

          if (statePayload && statePayload.ok) {
            var areas = statePayload.areas || {};
            Object.keys(areas).forEach(function (areaKey) {
              Store.mergeIncomingAreaState(state.studentId, areaKey, areas[areaKey]);
            });
          }

          if (summaryPayload && summaryPayload.ok) {
            Store.mergeIncomingSummary(state.studentId, summaryPayload);
          }

          if (reviewsPayload && reviewsPayload.ok && Array.isArray(reviewsPayload.reviews) && reviewsPayload.reviews.length) {
            Store.applyIncomingReviews(state.studentId, reviewsPayload.reviews);
            if (SR) {
              var seenBySource = {};
              reviewsPayload.reviews.forEach(function (review) {
                if (!review || !review.sourceKey || !review.questionSignature) return;
                if (!seenBySource[review.sourceKey]) seenBySource[review.sourceKey] = [];
                seenBySource[review.sourceKey].push(review.questionSignature);
              });
              Object.keys(seenBySource).forEach(function (sourceKey) {
                var seenKey = spacedRepKey(sourceKey);
                SR.setSeenIds(seenKey, SR.getSeenIds(seenKey).concat(seenBySource[sourceKey]));
              });
            }
          }

          renderDashboard();
        })
        .then(finish);
    } catch (err) {
      finish();
    }
  }

  // Fire-and-forget mirror of this round's per-area level state to the
  // server. Never awaited, any failure is silently ignored — same
  // rationale as postProgressSummaryBestEffort below: localStorage already
  // has this round's outcome regardless of whether this POST succeeds.
  function postStateToServer() {
    try {
      var areas = {};
      AREA_ORDER.forEach(function (areaKey) {
        areas[areaKey] = Store.getAreaSyncState(state.studentId, areaKey);
      });

      fetch("/api/student/progress-mode-state", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas: areas })
      }).catch(function () { /* offline or no session — ignored on purpose */ });
    } catch (err) {
      /* never let a sync-side failure here break finishing the round */
    }
  }

  function createClientReviewId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return "pm-review-" + window.crypto.randomUUID();
    }
    return "pm-review-" + Date.now() + "-" + Math.random().toString(36).slice(2, 12);
  }

  // Fire-and-forget batch POST of this round's answered-question events
  // (collected in state.pendingReviews by advanceSlot) to the append-only
  // review log — read back by syncStateFromServer above on a future
  // device. Each event's clientReviewId makes the insert idempotent
  // server-side, so a retried/duplicate POST is harmless. Never awaited;
  // localStorage already has every one of these outcomes regardless of
  // whether this POST succeeds.
  function postReviewsToServer() {
    try {
      if (!state.pendingReviews.length) return;
      fetch("/api/student/progress-mode-reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews: state.pendingReviews })
      }).catch(function () { /* offline or no session — ignored on purpose */ });
    } catch (err) {
      /* never let a sync-side failure here break finishing the round */
    }
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

      var sources = SOURCE_ORDER.map(function (sourceKey) {
        var driver = Drivers[sourceKey] || {};
        var sourceStats = cumulative[sourceKey] || { correct: 0, questions: 0 };
        return {
          sourceKey: sourceKey,
          areaKey: driver.area || "",
          label: driver.label || sourceKey,
          correct: sourceStats.correct,
          questions: sourceStats.questions
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
          areas: areas,
          sources: sources
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

  // Cumulative, phrase-bank-driven coaching — deliberately separate from
  // buildRoundFeedbackText above, which only ever looks at this one round.
  // This looks at all-time evidence for whichever sources were actually
  // played this round, via feedback.js's own builders (the same
  // concept-first-then-source fallback chain account/student-home/
  // student-home.js already uses), so a student sees a real, specific
  // coaching sentence — not just a percentage — as soon as a source or
  // concept clears feedback.js's own EARLY_SIGNAL_MIN_QUESTIONS bar (3),
  // not just PM's own multi-question rounds. Picks the single lowest-
  // percentage source among those played, mirroring buildRoundFeedbackText's
  // own "worst" logic one level more specific. Returns "" (nothing shown)
  // whenever every source played this round is still below that bar, or
  // feedback.js failed to load for any reason — never a forced or
  // placeholder-feeling tile.
  function buildCoachingFeedbackText(sourcesPlayedThisRound) {
    var Feedback = window.EAProgressModeFeedback;
    if (!Feedback) return "";
    var best = null;
    var bestPercentage = Infinity;
    sourcesPlayedThisRound.forEach(function (sourceKey) {
      var driver = Drivers[sourceKey];
      var cumulative = Store.getCumulativeStats(state.studentId, [sourceKey])[sourceKey];
      var registryEntry = window.EchoAuralPMRegistry && window.EchoAuralPMRegistry.get(sourceKey);
      var moduleId = registryEntry && registryEntry.moduleId;
      var text = (driver.getSignature && moduleId)
        ? Feedback.buildConceptFeedback(moduleId, Store.getConceptStats(state.studentId, moduleId))
        : null;
      text = text || Feedback.buildSourceFeedback(sourceKey, cumulative.correct, cumulative.questions);
      if (!text || /complete a few more/i.test(text)) return;
      if (cumulative.percentage !== null && cumulative.percentage < bestPercentage) {
        bestPercentage = cumulative.percentage;
        best = text;
      }
    });
    return best || "";
  }

  // Level-up badge (Phase 2 gamification, mechanic #5 in the plan) — a
  // visually distinct celebration ALONGSIDE the existing inline "🎉 You've
  // moved up a level…" sentence in buildRoundFeedbackText below, not a
  // replacement for it. Deliberately the lowest-risk gamification surface:
  // leveledUpAreas can only be non-empty once Store.recordSourceResult's
  // existing volume/accuracy/variety/floor gates have already cleared, so
  // this badge is downstream of anti-guessing checks that were already
  // there — it adds no new incentive of its own.
  function renderLevelUpBadgeHTML(leveledUpAreas) {
    if (!leveledUpAreas.length) return "";
    var body;
    if (leveledUpAreas.length === 1) {
      var areaKey = leveledUpAreas[0];
      var newLevelLabel = Store.LEVEL_LABELS[Store.getAreaLevel(state.studentId, areaKey)];
      body = "<strong>" + escapeHtml(AREA_LABELS[areaKey]) + "</strong> is now <strong>" + escapeHtml(newLevelLabel) + "</strong>";
    } else {
      var labels = leveledUpAreas.map(function (key) { return "<strong>" + escapeHtml(AREA_LABELS[key]) + "</strong>"; });
      body = joinList(labels) + " moved up a level";
    }
    return (
      "<div class=\"pm-levelup-badge\">" +
      "<span class=\"pm-levelup-badge-icon\" aria-hidden=\"true\">🎉</span>" +
      "<span class=\"pm-levelup-badge-text\">Level up! " + body + "</span>" +
      "</div>"
    );
  }

  // Streak milestone line(s) — only shown for a run genuinely worth
  // celebrating (not every single correct answer or every single day),
  // and always positively framed: a broken streak simply shows nothing
  // here rather than a loss-framed message, per the gamification plan's
  // explicit "framing over punishment" rule.
  var CORRECT_STREAK_MILESTONE_MIN = 3;
  var DAILY_STREAK_MILESTONE_MIN = 2;

  function renderStreakMilestoneHTML(streakSnapshot) {
    if (!streakSnapshot) return "";
    var lines = "";
    if (streakSnapshot.correctCurrent >= CORRECT_STREAK_MILESTONE_MIN) {
      lines += "<div class=\"pm-milestone-line\"><img class=\"pm-milestone-icon\" src=\"../../assets/icons/progress-mode/streak.png\" alt=\"\">" + streakSnapshot.correctCurrent + " correct in a row!</div>";
    }
    if (streakSnapshot.dailyCurrent >= DAILY_STREAK_MILESTONE_MIN) {
      lines += "<div class=\"pm-milestone-line\"><img class=\"pm-milestone-icon\" src=\"../../assets/icons/progress-mode/daily-streak.png\" alt=\"\">" + streakSnapshot.dailyCurrent + "-day streak — nice consistency!</div>";
    }
    return lines;
  }

  function renderRoundCompletePanel(roundAreaStats, leveledUpAreas, streakSnapshot, sourcesPlayedThisRound) {
    var percentage = roundLength ? Math.round((state.correctTotal / roundLength) * 100) : 0;
    var coachingText = buildCoachingFeedbackText(sourcesPlayedThisRound || []);
    var coachingTileHTML = coachingText
      ? "<div class=\"diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile\">" +
        "<span>Coaching tip</span>" +
        "<strong>" + escapeHtml(coachingText) + "</strong>" +
        "</div>"
      : "";

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
      renderLevelUpBadgeHTML(leveledUpAreas) +
      renderStreakMilestoneHTML(streakSnapshot) +
      "<div class=\"pm-element-chart-block\">" +
      "<h3>Coverage this round</h3>" +
      "<p class=\"pm-element-chart-sub\">Marks earned out of marks attempted, by area — just this round.</p>" +
      "<div class=\"pm-element-chart\">" + areaRows + "</div>" +
      "</div>" +
      "<div class=\"diagnostic-card diagnostic-feedback-tile mm-compiled-feedback-tile\">" +
      "<span>Feedback</span>" +
      "<strong>" + escapeHtml(buildRoundFeedbackText(roundAreaStats, leveledUpAreas)) + "</strong>" +
      "</div>" +
      coachingTileHTML +
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

  function showRoundCompletePopup(roundAreaStats, leveledUpAreas, streakSnapshot, sourcesPlayedThisRound) {
    closeRoundCompletePopup();
    document.body.classList.add("ii-round-review-open");
    document.querySelector(".app-shell")?.classList.add("is-round-feedback-open");
    els.gameScreen.classList.add("is-round-feedback-open");

    roundCompleteOverlay = document.createElement("div");
    roundCompleteOverlay.className = "ii-round-feedback-overlay";
    roundCompleteOverlay.setAttribute("role", "dialog");
    roundCompleteOverlay.setAttribute("aria-modal", "true");
    roundCompleteOverlay.setAttribute("aria-label", "Progress Mode round feedback");
    roundCompleteOverlay.innerHTML = renderRoundCompletePanel(roundAreaStats, leveledUpAreas, streakSnapshot, sourcesPlayedThisRound);
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

  // Pre-selects the focus-area/question-count pills from URL params (see
  // account/student-home/student-home.js's focusRoundHref, which the
  // dashboard's "Start Focus Round"/"Start recommended round" buttons
  // build) so a student arriving that way lands here with their weakest
  // area and a 10-question round already queued up — one click (Start
  // Progressing) away, instead of having to open Advanced Settings and
  // pick it manually. Deliberately still requires that click rather than
  // auto-starting: matches how every other launch into this page already
  // works, and opening the settings popover here lets the student actually
  // see what got pre-selected before committing to it.
  function applyLaunchFocusParams(launchParams) {
    var focusArea = launchParams.get("focusArea");
    var appliedFocusArea = false;
    if (focusArea && AREA_ORDER.indexOf(focusArea) !== -1) {
      var areaRadio = document.querySelector('input[name="pmFocusArea"][value="' + focusArea + '"]');
      if (areaRadio) {
        areaRadio.checked = true;
        appliedFocusArea = true;
      }
    }

    var questions = launchParams.get("questions");
    var appliedQuestions = false;
    if (questions) {
      var countRadio = document.querySelector('input[name="pmQuestionCount"][value="' + questions + '"]');
      if (countRadio) {
        countRadio.checked = true;
        appliedQuestions = true;
      }
    }

    if (appliedFocusArea || appliedQuestions) setAdvancedSettingsOpen(true);
  }

  // ---------- Init ----------

  (function init() {
    var launchParams = new URLSearchParams(window.location.search);
    applyLaunchFocusParams(launchParams);

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
