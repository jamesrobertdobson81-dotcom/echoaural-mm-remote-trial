// Progress Mode — standalone localStorage store.
// Deliberately independent from shared/js/progression-store.js: this is a
// throwaway test build (see modules/progress-mode/README.md). store.js
// itself never touches any file outside modules/progress-mode/ — the one
// place this module reaches out at all is script.js's
// postProgressSummaryBestEffort (a small, best-effort, fire-and-forget POST
// so a teacher can see real data), which is deliberate and documented in
// the README, not something store.js does or needs to know about.
//
// Two-tier model: many "sources" (one per driver — a real sub-app, or one
// topic of ScoreDecoder) roll up into a handful of "areas" (Melody, Texture,
// Harmony, Instrumentation, Rhythm — see app-drivers.js's AREA_ORDER). A
// source only ever keeps lightweight cumulative stats, used for written
// feedback and adaptive next-round weighting; level-advancement is decided
// once per AREA, pooling every question from every source mapped to it, so
// "individual levels for each main app" means one level per area, not one
// per driver.
(function (global) {
  "use strict";

  var STORAGE_KEY = "echoaural.progressmode.v2";
  var LEVEL_IDS = ["foundation", "developing", "securing", "mastering"];
  var LEVEL_LABELS = ["Foundation", "Developing", "Securing", "Mastering"];
  // A single round only ever gives an area a few questions (10 slots split
  // across a dozen sources), so evaluating "did they pass" per-round let a
  // lucky pair of correct answers instantly advance a level. Advancement is
  // judged on a cumulative sample AT THE CURRENT LEVEL, pooled across every
  // source mapped to that area, built up across as many rounds as it takes:
  // a real minimum volume of questions, a high accuracy bar over that whole
  // sample (not one round), and a minimum spread of distinct questions
  // actually seen (approximating "shown all concepts in the level")
  // wherever at least one contributing source can recognise distinct
  // questions at all.
  var PASS_PERCENTAGE = 80;
  var MIN_QUESTIONS_PER_LEVEL = 10;
  var MIN_DISTINCT_CONCEPTS_PER_LEVEL = 6;
  // A pooled area average can hide one genuinely weak sub-skill behind
  // several strong ones (e.g. Melody pools 5 sources) — a source only vetoes
  // advancement once it has enough of its OWN sample to be meaningful
  // (FLOOR_MIN_QUESTIONS, all-time cumulative) and is still clearly below
  // par (FLOOR_THRESHOLD). Deliberately the same numbers feedback.js already
  // uses to decide "reliable enough to call a weakness in writing"
  // (FEEDBACK_MIN_QUESTIONS=8, WEAKNESS_THRESHOLD=60) — kept as separate
  // constants here rather than a cross-file import (store.js stays
  // dependency-free) — so advancement is gated on exactly the same signal
  // already shown to the student as feedback, not a second, different bar.
  var FLOOR_MIN_QUESTIONS = 8;
  var FLOOR_THRESHOLD = 60;

  // Weekly rounds goal (Phase 2 of the gamification plan) — a rolling
  // 7-day window ending now, not a Monday-start calendar week, so the goal
  // always reads "rounds in your last 7 days" regardless of what day a
  // student happens to check it. Rewards consistency of practice, not
  // performance: guessing fast doesn't finish a round any faster or more
  // than once, so this stays un-gameable the same way the daily streak is.
  var WEEKLY_ROUNDS_GOAL = 5;
  var ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  function readAll() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  function writeAll(data) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      /* storage unavailable — progress simply won't persist */
    }
  }

  function defaultProfile() {
    return { sources: {}, areas: {}, conceptStats: {}, roundsCompleted: 0, createdAt: Date.now(), streaks: defaultStreakState(), roundHistory: [], questionHistory: [] };
  }

  // Gamification state — a sibling of sources/areas, never read by either.
  // See store.js's own module header discussion in the gamification plan:
  // this key must never be passed into recordSourceResult/buildRoundQueue,
  // so a streak can never influence which question is asked or whether a
  // level advances. correctCurrent/correctBest track consecutive correct
  // answers (any source, any area — a genuine "current streak", not a
  // per-round counter). dailyCurrent/dailyBest track consecutive CALENDAR
  // DAYS on which at least one round was completed (gated on completion
  // only, never accuracy — see recordRoundComplete). roundLog is a capped
  // history of round-completion timestamps, kept for a future "rounds this
  // week" readout (not used by anything in Phase 1 yet).
  function defaultStreakState() {
    return {
      correctCurrent: 0,
      correctBest: 0,
      dailyCurrent: 0,
      dailyBest: 0,
      lastPlayedDateKey: null,
      roundLog: []
    };
  }

  var MAX_ROUND_LOG = 60;
  var MAX_ROUND_HISTORY = 20;
  var MAX_QUESTION_HISTORY = 2000;

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // Local-calendar-day key ("YYYY-MM-DD"), not a UTC one — a student playing
  // late at night should have "today" match their own clock, not UTC's.
  function dateKeyFromTimestamp(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  // Whole-day difference between two "YYYY-MM-DD" keys, via local midnights
  // (not raw timestamp subtraction) so a DST transition can't shift the
  // count by an hour and misjudge same-day/next-day/gap.
  function daysBetweenDateKeys(fromKey, toKey) {
    var a = fromKey.split("-").map(Number);
    var b = toKey.split("-").map(Number);
    var da = new Date(a[0], a[1] - 1, a[2]);
    var db = new Date(b[0], b[1] - 1, b[2]);
    return Math.round((db - da) / 86400000);
  }

  function getStreakState(profile) {
    if (!profile.streaks) profile.streaks = defaultStreakState();
    return profile.streaks;
  }

  function defaultSourceState() {
    return {
      attempts: 0,
      bestPercentage: 0,
      lastPercentage: null,
      history: [],
      cumulativeCorrect: 0,
      cumulativeQuestions: 0,
      // How many questions have been drawn from this source, ever — the
      // clock a signature's cooldown counts down against (see
      // recordQuestionOutcome/isSignatureCoolingDown). Rounds, not real
      // time: "a reasonable spaced interval in the deck" is naturally a
      // deck position here, not a calendar one. Deliberately per-DEVICE
      // (each device increments its own copy), not synced — see
      // applyIncomingReviews's comment on why an incoming intervalDraws is
      // re-anchored to this device's own drawCount on merge, not carried
      // over as an absolute value from another device's clock.
      drawCount: 0,
      // When this source last actually showed a question to the student
      // (Date.now(), stamped in recordQuestionOutcome) — null if never.
      // Used by getReviewCandidate to find the most-overdue-for-review
      // source once its area has reached Mastering; unrelated to drawCount/
      // the per-signature cooldown above.
      lastDrawnAt: null,
      // Per-question-signature scheduling state, SM-2-adapted: { [signature]:
      // { easeFactor, repetitions, intervalDraws, dueAtDraw, dueAtTime,
      // lastReviewedAt } }. Every signature ever answered gets an entry
      // (not just missed ones, unlike the old fixed-Leitner missedQueue this
      // replaced) — see computeNextSchedule/recordQuestionOutcome. Also the
      // server-sync unit here (see accounts/account-server.js's
      // /api/student/progress-mode-reviews and applyIncomingReviews below):
      // each answered question is separately POSTed as an immutable review
      // event, and this map is simply the locally-cached "most recent
      // review per signature" — the same relationship Anki's `cards` table
      // has to its `revlog`.
      schedule: {},
      // Stamped (Date.now()) at every write below — informational only now
      // (no longer compared by a merge function; that per-source merge was
      // replaced by the per-signature applyIncomingReviews below), kept for
      // any future need to know "when did this source's aggregate stats
      // last change locally."
      updatedAt: null
    };
  }

  // SM-2-adapted per-signature ease/interval model (binary correct/
  // incorrect, not SM-2's original 0-5 quality scale — a standard
  // simplification for binary-graded systems), in "draws" rather than
  // "days" (matching drawCount above, since Progress Mode has no fixed
  // daily cadence). A correct answer grows the interval (2 draws on the
  // first correct rep, 6 on the second, then interval x ease factor
  // beyond that) and nudges ease factor up a little (capped, so it can't
  // run away); an incorrect answer resets the repetition streak, drops the
  // interval back to a short relearn gap, and nudges ease factor down
  // (floored, so a hard question can't be scheduled arbitrarily far out).
  var DEFAULT_EASE_FACTOR = 2.5;
  var MIN_EASE_FACTOR = 1.3;
  var MAX_EASE_FACTOR = 2.8;
  var EASE_FACTOR_CORRECT_DELTA = 0.1;
  var EASE_FACTOR_INCORRECT_DELTA = 0.2;

  function computeNextSchedule(existing, wasCorrect) {
    var easeFactor = existing && typeof existing.easeFactor === "number" ? existing.easeFactor : DEFAULT_EASE_FACTOR;
    var repetitions = existing && typeof existing.repetitions === "number" ? existing.repetitions : 0;
    var intervalDraws;

    if (wasCorrect) {
      repetitions += 1;
      if (repetitions === 1) intervalDraws = 2;
      else if (repetitions === 2) intervalDraws = 6;
      else intervalDraws = Math.round((existing && existing.intervalDraws ? existing.intervalDraws : 6) * easeFactor);
      easeFactor = Math.min(MAX_EASE_FACTOR, easeFactor + EASE_FACTOR_CORRECT_DELTA);
    } else {
      repetitions = 0;
      intervalDraws = 1;
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - EASE_FACTOR_INCORRECT_DELTA);
    }

    return { easeFactor: easeFactor, repetitions: repetitions, intervalDraws: intervalDraws };
  }

  // Wall-clock floor alongside the draw-count-based interval above, same
  // reasoning the old fixed [3,10,30]-minute table existed for: draw-count
  // alone collapses to almost no real spacing if a student grinds several
  // rounds back-to-back in one sitting. Scales with the computed interval
  // instead of a fixed lookup table, capped at an hour; a miss always gets
  // a short, fixed relearn floor regardless of its (now-reset) interval.
  function computeMinMinutes(wasCorrect, intervalDraws) {
    return wasCorrect ? Math.min(60, intervalDraws * 3) : 3;
  }

  // True if any source in `sourcesInArea` has enough of its OWN cumulative
  // sample to judge and is still clearly below par — see FLOOR_MIN_QUESTIONS/
  // FLOOR_THRESHOLD above. `sourcesInArea` is optional (omitted call sites,
  // e.g. tests exercising recordSourceResult directly, simply skip floor
  // gating rather than erroring).
  function areaHasFloorViolation(profile, sourcesInArea) {
    if (!sourcesInArea) return false;
    for (var i = 0; i < sourcesInArea.length; i++) {
      var sourceState = profile.sources[sourcesInArea[i]];
      if (!sourceState) continue;
      var questions = sourceState.cumulativeQuestions || 0;
      if (questions < FLOOR_MIN_QUESTIONS) continue;
      var percentage = ((sourceState.cumulativeCorrect || 0) / questions) * 100;
      if (percentage < FLOOR_THRESHOLD) return true;
    }
    return false;
  }

  function defaultAreaState() {
    return {
      level: 0,
      // Per-level cumulative sample: { "0": {correct, total, concepts: {sig: true}}, "1": {...}, ... }.
      // Keyed by level index (as a string, for JSON-safety) so dropping back
      // to review a lower level never mixes with the level a student is
      // actively trying to clear.
      levelProgress: {}
    };
  }

  function getAreaLevelProgress(areaState, levelIndex) {
    var key = String(levelIndex);
    if (!areaState.levelProgress[key]) areaState.levelProgress[key] = { correct: 0, total: 0, concepts: {} };
    return areaState.levelProgress[key];
  }

  function getProfile(studentId) {
    var all = readAll();
    if (!all[studentId]) all[studentId] = defaultProfile();
    return all[studentId];
  }

  function getSourceState(profile, sourceKey) {
    if (!profile.sources[sourceKey]) profile.sources[sourceKey] = defaultSourceState();
    return profile.sources[sourceKey];
  }

  function getAreaState(profile, areaKey) {
    if (!profile.areas[areaKey]) profile.areas[areaKey] = defaultAreaState();
    return profile.areas[areaKey];
  }

  function saveProfile(studentId, profile) {
    var all = readAll();
    all[studentId] = profile;
    writeAll(all);
  }

  var Store = {
    LEVEL_IDS: LEVEL_IDS,
    LEVEL_LABELS: LEVEL_LABELS,
    PASS_PERCENTAGE: PASS_PERCENTAGE,
    WEEKLY_ROUNDS_GOAL: WEEKLY_ROUNDS_GOAL,

    getAreaLevel: function (studentId, areaKey) {
      var profile = getProfile(studentId);
      return getAreaState(profile, areaKey).level;
    },

    getSnapshot: function (studentId, areaKeys) {
      var profile = getProfile(studentId);
      var areas = {};
      var sum = 0;
      areaKeys.forEach(function (areaKey) {
        var state = getAreaState(profile, areaKey);
        areas[areaKey] = {
          level: state.level,
          levelLabel: LEVEL_LABELS[state.level],
          mastered: state.level >= LEVEL_IDS.length - 1
        };
        sum += state.level;
      });
      var overallLevelIndex = areaKeys.length ? sum / areaKeys.length : 0;
      return {
        areas: areas,
        overallLevelIndex: overallLevelIndex,
        overallLevelLabel: LEVEL_LABELS[Math.round(Math.min(overallLevelIndex, LEVEL_IDS.length - 1))],
        roundsCompleted: profile.roundsCompleted
      };
    },

    // Long-interval spaced review: given the set of source keys whose AREA
    // has reached Mastering (the caller works this out — script.js already
    // has both AREA_TO_SOURCES and getAreaLevel), returns whichever one was
    // drawn longest ago (or never drawn at all, which sorts first). Returns
    // null for an empty list, so callers can fall back to normal round-
    // building when nothing is Mastered yet. This is a bias applied once per
    // round, not a guarantee any specific source appears.
    getReviewCandidate: function (studentId, sourceKeys) {
      if (!sourceKeys || !sourceKeys.length) return null;
      var profile = getProfile(studentId);
      var best = null;
      var bestDrawnAt = Infinity;
      sourceKeys.forEach(function (sourceKey) {
        var sourceState = profile.sources[sourceKey];
        var drawnAt = sourceState && sourceState.lastDrawnAt ? sourceState.lastDrawnAt : 0;
        if (drawnAt < bestDrawnAt) {
          bestDrawnAt = drawnAt;
          best = sourceKey;
        }
      });
      return best;
    },

    // Cumulative (all-time, across every round ever played) correct/total per
    // SOURCE — the input to written feedback text and adaptive next-round
    // weighting. Never displayed as its own scored line; only referenced
    // inside an area's feedback paragraph.
    getCumulativeStats: function (studentId, sourceKeys) {
      var profile = getProfile(studentId);
      var sources = {};
      sourceKeys.forEach(function (sourceKey) {
        var state = getSourceState(profile, sourceKey);
        var questions = state.cumulativeQuestions || 0;
        var correct = state.cumulativeCorrect || 0;
        sources[sourceKey] = {
          correct: correct,
          questions: questions,
          percentage: questions > 0 ? Math.round((correct / questions) * 100) : null,
          attempts: state.attempts,
          lastPercentage: state.lastPercentage,
          bestPercentage: state.bestPercentage
        };
      });
      return sources;
    },

    // Cumulative (all-time) correct/questions per CONCEPT value within one
    // moduleId — e.g. chord-identifier's "first inversion"/"Extended
    // chords". Client-side counterpart to accounts/account-server.js's
    // server-side byConcept (Live Session/Homework evidence); the two are
    // combined by account/student-home/student-home.js's
    // getCombinedConceptStats, the same way getCumulativeStats above is
    // already combined with server source stats. Concept values themselves
    // come from shared/js/concept-extractors.js's extractConceptValues,
    // called by script.js — store.js just accumulates whatever value
    // strings it's given, same as it does for sourceKeys.
    getConceptStats: function (studentId, moduleId) {
      var profile = getProfile(studentId);
      if (!profile.conceptStats) profile.conceptStats = {};
      var moduleStats = profile.conceptStats[moduleId] || {};
      var result = {};
      Object.keys(moduleStats).forEach(function (conceptValue) {
        var entry = moduleStats[conceptValue];
        var questions = entry.questions || 0;
        var correct = entry.correct || 0;
        result[conceptValue] = {
          correct: correct,
          questions: questions,
          percentage: questions > 0 ? Math.round((correct / questions) * 100) : 0
        };
      });
      return result;
    },

    // Read-only lookup of a single signature's current scheduling state
    // (null if it's never been answered on this device). Mirrors the shape
    // recordQuestionOutcome/applyIncomingReviews both write.
    getSignatureSchedule: function (studentId, sourceKey, signature) {
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      return (sourceState.schedule && sourceState.schedule[signature]) || null;
    },

    // Full per-area state needed to build a server-sync POST payload —
    // getAreaLevel above only exposes the level, not levelProgress (which
    // the sync payload also needs for concept/variety continuity). Read-only.
    getAreaSyncState: function (studentId, areaKey) {
      var profile = getProfile(studentId);
      var state = getAreaState(profile, areaKey);
      return { level: state.level, levelProgress: state.levelProgress };
    },

    // Records the outcome of a single answered question (called once per
    // question, immediately, separately from the once-per-round
    // recordSourceResult below — the per-signature schedule needs to update
    // right away, not wait for the round to finish). Computes this
    // signature's new ease/interval/repetitions via computeNextSchedule
    // above and returns them (plus responseTimeMs passed through, and the
    // review's own timestamp) so the caller can log this as a review event
    // to the server (see accounts/account-server.js's
    // /api/student/progress-mode-reviews) — responseTimeMs is captured only
    // (like Anki's revlog.time), not used in the ease/interval formula
    // itself. Returns null if signature is falsy (nothing to schedule).
    recordQuestionOutcome: function (studentId, sourceKey, signature, wasCorrect, responseTimeMs) {
      if (!signature) return null;
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      if (!profile.questionHistory) profile.questionHistory = [];
      profile.questionHistory.push({
        sourceKey: sourceKey,
        questionId: signature,
        correct: Boolean(wasCorrect),
        score: wasCorrect ? 1 : 0,
        maximumScore: 1,
        timestamp: Date.now()
      });
      if (profile.questionHistory.length > MAX_QUESTION_HISTORY) {
        profile.questionHistory = profile.questionHistory.slice(-MAX_QUESTION_HISTORY);
      }

      sourceState.drawCount = (sourceState.drawCount || 0) + 1;
      sourceState.lastDrawnAt = Date.now();
      sourceState.updatedAt = Date.now();
      if (!sourceState.schedule) sourceState.schedule = {};

      var wasCorrectBool = Boolean(wasCorrect);
      var next = computeNextSchedule(sourceState.schedule[signature], wasCorrectBool);
      var reviewedAt = Date.now();
      var minMinutes = computeMinMinutes(wasCorrectBool, next.intervalDraws);
      sourceState.schedule[signature] = {
        easeFactor: next.easeFactor,
        repetitions: next.repetitions,
        intervalDraws: next.intervalDraws,
        dueAtDraw: sourceState.drawCount + next.intervalDraws,
        dueAtTime: reviewedAt + minMinutes * 60000,
        lastReviewedAt: reviewedAt
      };

      saveProfile(studentId, profile);

      return {
        easeFactor: next.easeFactor,
        intervalDraws: next.intervalDraws,
        repetitions: next.repetitions,
        responseTimeMs: typeof responseTimeMs === "number" && responseTimeMs >= 0 ? Math.round(responseTimeMs) : null,
        completedAt: reviewedAt
      };
    },

    // Records one answered question's concept-value evidence — separate
    // from recordQuestionOutcome above (which handles SM-2 scheduling by
    // signature) since a single question can contribute zero, one, or two
    // concept values (e.g. chord-identifier's inversion AND extension tier
    // from the same answer both land in this module's one flat pool,
    // mirroring the server's byConcept). conceptValues with no entries is a
    // no-op — most modules and many individual answers (e.g. a question
    // whose field didn't match any whitelist/bucket) contribute nothing.
    recordConceptOutcome: function (studentId, moduleId, conceptValues, wasCorrect) {
      if (!moduleId || !Array.isArray(conceptValues) || !conceptValues.length) return;
      var profile = getProfile(studentId);
      if (!profile.conceptStats) profile.conceptStats = {};
      if (!profile.conceptStats[moduleId]) profile.conceptStats[moduleId] = {};
      var moduleStats = profile.conceptStats[moduleId];
      var wasCorrectBool = Boolean(wasCorrect);
      conceptValues.forEach(function (conceptValue) {
        if (!conceptValue) return;
        if (!moduleStats[conceptValue]) moduleStats[conceptValue] = { correct: 0, questions: 0 };
        moduleStats[conceptValue].questions += 1;
        if (wasCorrectBool) moduleStats[conceptValue].correct += 1;
      });
      saveProfile(studentId, profile);
    },

    // True only while a signature is still within its scheduled cooldown —
    // i.e. it should currently be actively avoided, the same as an
    // already-seen one. Cools down only once BOTH the draw-count AND the
    // wall-clock minimum have been met (see computeMinMinutes above) —
    // whichever takes longer for this student's actual play pattern. Once
    // due, this returns false (not "yes, show it" — Progress Mode has no way
    // to force that, only to stop avoiding it). A signature with no schedule
    // entry yet (never answered) has nothing to cool down from.
    isSignatureCoolingDown: function (studentId, sourceKey, signature) {
      if (!signature) return false;
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      var entry = (sourceState.schedule || {})[signature];
      if (!entry) return false;
      var drawReady = (sourceState.drawCount || 0) >= entry.dueAtDraw;
      var timeReady = !entry.dueAtTime || Date.now() >= entry.dueAtTime;
      return !(drawReady && timeReady);
    },

    // Records one source's within-round tally (correctCount/totalCount) into
    // that source's lifetime stats, AND pools the same tally into its area's
    // cumulative sample at the level the questions were ACTUALLY asked at
    // (`levelIndex` — normally the area's current level, but a level-
    // escalated empty-pool retry, see script.js's retryAtHigherLevelOrSkip,
    // asks at a higher level than the area is currently sitting at) —
    // advancing the area only once the pool AT ITS OWN CURRENT LEVEL clears
    // every bar: enough questions, high enough accuracy over the WHOLE
    // sample, and (where at least one contributing source can recognise
    // distinct questions) enough variety seen. An escalated attempt still
    // banks its sample at the higher level it was actually asked at (a head
    // start for whenever the student naturally reaches it) but can never
    // itself trigger an advance, since only a result banked at the area's
    // own current level is eligible to. `signatures` is the array of
    // distinct question signatures observed this round for this source at
    // this level (may be empty); `tracksConcepts` says whether this source's
    // driver supports signature-based tracking at all (e.g. dictation
    // doesn't, since its content isn't readable as text) — such sources
    // still contribute correct/total without blocking the variety bar earned
    // by other sources sharing the same area. `sourcesInArea` (optional —
    // the full list of source keys mapped to this area, script.js already
    // has this via AREA_TO_SOURCES) additionally vetoes advancement if any
    // one of them is individually still below FLOOR_THRESHOLD despite having
    // enough of its own sample — stops a pooled area average from masking
    // one genuinely weak sub-skill behind several strong ones.
    recordSourceResult: function (studentId, sourceKey, areaKey, correctCount, totalCount, signatures, tracksConcepts, levelIndex, sourcesInArea) {
      if (totalCount <= 0) return null;
      var profile = getProfile(studentId);
      var sourceState = getSourceState(profile, sourceKey);
      var roundPercentage = Math.round((correctCount / totalCount) * 100);

      sourceState.attempts += 1;
      sourceState.lastPercentage = roundPercentage;
      sourceState.bestPercentage = Math.max(sourceState.bestPercentage, roundPercentage);
      sourceState.cumulativeCorrect = (sourceState.cumulativeCorrect || 0) + correctCount;
      sourceState.cumulativeQuestions = (sourceState.cumulativeQuestions || 0) + totalCount;
      sourceState.updatedAt = Date.now();
      sourceState.history.push({ percentage: roundPercentage, timestamp: Date.now() });
      if (sourceState.history.length > 20) sourceState.history = sourceState.history.slice(-20);

      var areaState = getAreaState(profile, areaKey);
      var targetLevelIndex = (typeof levelIndex === "number") ? levelIndex : areaState.level;
      var levelProgress = getAreaLevelProgress(areaState, targetLevelIndex);
      levelProgress.correct += correctCount;
      levelProgress.total += totalCount;
      (signatures || []).forEach(function (sig) {
        if (sig) levelProgress.concepts[sourceKey + ":" + sig] = true;
      });

      var distinctConcepts = Object.keys(levelProgress.concepts).length;
      var levelPercentage = levelProgress.total > 0 ? Math.round((levelProgress.correct / levelProgress.total) * 100) : 0;
      var hasEnoughVolume = levelProgress.total >= MIN_QUESTIONS_PER_LEVEL;
      var hasEnoughAccuracy = levelPercentage >= PASS_PERCENTAGE;
      var hasEnoughVariety = !tracksConcepts || distinctConcepts >= MIN_DISTINCT_CONCEPTS_PER_LEVEL;

      var isCurrentLevel = targetLevelIndex === areaState.level;
      var hasFloor = !areaHasFloorViolation(profile, sourcesInArea);
      var advanced = false;
      if (isCurrentLevel && hasEnoughVolume && hasEnoughAccuracy && hasEnoughVariety && hasFloor && areaState.level < LEVEL_IDS.length - 1) {
        areaState.level += 1;
        advanced = true;
      }

      saveProfile(studentId, profile);
      return {
        percentage: roundPercentage,
        areaLevel: areaState.level,
        advanced: advanced,
        levelProgress: {
          correct: levelProgress.correct,
          total: levelProgress.total,
          percentage: levelPercentage,
          distinctConcepts: distinctConcepts,
          questionsNeeded: Math.max(0, MIN_QUESTIONS_PER_LEVEL - levelProgress.total),
          conceptsNeeded: tracksConcepts ? Math.max(0, MIN_DISTINCT_CONCEPTS_PER_LEVEL - distinctConcepts) : 0,
          accuracyMet: hasEnoughAccuracy,
          floorMet: hasFloor,
          tracksConcepts: !!tracksConcepts
        }
      };
    },

    // A single 0-100 number representing overall progress toward *finishing*
    // Mastering in this area — not raw accuracy. Each of the 4 levels is
    // worth 25 points: fully cleared levels bank their 25 automatically,
    // and the current level contributes a fraction of its own 25 based on
    // how close its pooled sample is to clearing all 3 advancement bars
    // (volume/accuracy/variety — the same bars recordSourceResult checks).
    // At Mastering (the last level) that fraction instead measures how
    // close the student is to fully clearing Mastering itself, since there's
    // no further level to advance into.
    getAreaOverallProgressPercentage: function (studentId, areaKey, tracksConcepts) {
      var profile = getProfile(studentId);
      var areaState = getAreaState(profile, areaKey);
      var levelProgress = getAreaLevelProgress(areaState, areaState.level);
      var distinctConcepts = Object.keys(levelProgress.concepts).length;

      var volumeFraction = Math.min(1, levelProgress.total / MIN_QUESTIONS_PER_LEVEL);
      var accuracyFraction = levelProgress.total > 0
        ? Math.min(1, (levelProgress.correct / levelProgress.total) / (PASS_PERCENTAGE / 100))
        : 0;
      var varietyFraction = tracksConcepts ? Math.min(1, distinctConcepts / MIN_DISTINCT_CONCEPTS_PER_LEVEL) : 1;
      var withinLevelFraction = Math.min(volumeFraction, accuracyFraction, varietyFraction);

      var percentage = (areaState.level * 25) + (withinLevelFraction * 25);
      return Math.round(Math.min(100, percentage));
    },

    // Called once per answered question (same call site, same `!wasSkipped`
    // guard as recordQuestionOutcome — a technical skip is neither a hit nor
    // a miss, so it must not touch the streak either way). Correctness is
    // the ONLY input: no timing signal exists or is wanted here (see the
    // gamification plan's "explicitly not recommended" section) — rewarding
    // speed is exactly the rushing/guessing incentive this must avoid.
    recordStreakOutcome: function (studentId, wasCorrect) {
      var profile = getProfile(studentId);
      var streaks = getStreakState(profile);
      if (wasCorrect) {
        streaks.correctCurrent = (streaks.correctCurrent || 0) + 1;
        streaks.correctBest = Math.max(streaks.correctBest || 0, streaks.correctCurrent);
      } else {
        streaks.correctCurrent = 0;
      }
      saveProfile(studentId, profile);
      return { correctCurrent: streaks.correctCurrent, correctBest: streaks.correctBest };
    },

    // Read-only snapshot for the RHS chip / dashboard tile — mirrors
    // getSnapshot/getCumulativeStats's existing pattern (never mutates).
    getStreakSnapshot: function (studentId) {
      var profile = getProfile(studentId);
      var streaks = getStreakState(profile);
      return {
        correctCurrent: streaks.correctCurrent || 0,
        correctBest: streaks.correctBest || 0,
        dailyCurrent: streaks.dailyCurrent || 0,
        dailyBest: streaks.dailyBest || 0
      };
    },

    // `roundPercentage` (optional) is the WHOLE round's correct/total
    // across every source it touched — distinct from a source's own
    // history entries (recordSourceResult, one per source PER round), which
    // only cover that source's slice of the round's questions. Kept on
    // profile.roundHistory (capped, most-recent-last) so the dashboard's
    // "Recent activity" can show one row per round at that round's real
    // overall score, not one row per sub-app touched within it. Omitting
    // roundPercentage (existing tests) simply skips this bookkeeping —
    // the daily-streak logic below is unaffected either way.
    recordRoundComplete: function (studentId, roundPercentage) {
      var profile = getProfile(studentId);
      profile.roundsCompleted = (profile.roundsCompleted || 0) + 1;

      if (typeof roundPercentage === "number" && !isNaN(roundPercentage)) {
        profile.roundHistory = profile.roundHistory || [];
        profile.roundHistory.push({ percentage: roundPercentage, timestamp: Date.now() });
        if (profile.roundHistory.length > MAX_ROUND_HISTORY) profile.roundHistory = profile.roundHistory.slice(-MAX_ROUND_HISTORY);
      }

      // Daily play streak — gated purely on "a round was completed today",
      // never on accuracy. Gating this on performance would recreate the
      // exact rushing-to-protect-a-streak pressure the whole gamification
      // plan is designed to avoid; showing up is the only thing rewarded
      // here, and it's un-gameable by construction (finishing a round early
      // or badly doesn't finish it any faster or more than once).
      var streaks = getStreakState(profile);
      var todayKey = dateKeyFromTimestamp(Date.now());
      if (!streaks.lastPlayedDateKey) {
        streaks.dailyCurrent = 1;
      } else if (streaks.lastPlayedDateKey !== todayKey) {
        var dayGap = daysBetweenDateKeys(streaks.lastPlayedDateKey, todayKey);
        streaks.dailyCurrent = (dayGap === 1) ? (streaks.dailyCurrent || 0) + 1 : 1;
      }
      // Same-day repeat: dailyCurrent is left exactly as-is — a second round
      // in one day doesn't add a second day to the streak.
      streaks.dailyBest = Math.max(streaks.dailyBest || 0, streaks.dailyCurrent);
      streaks.lastPlayedDateKey = todayKey;

      streaks.roundLog = streaks.roundLog || [];
      streaks.roundLog.push(Date.now());
      if (streaks.roundLog.length > MAX_ROUND_LOG) streaks.roundLog = streaks.roundLog.slice(-MAX_ROUND_LOG);

      saveProfile(studentId, profile);
      return { dailyCurrent: streaks.dailyCurrent, dailyBest: streaks.dailyBest };
    },

    // Count of rounds completed within the trailing 7 days (read-only,
    // derived from roundLog — no separate storage). Never gated on
    // accuracy, same reasoning as the daily streak above.
    getRoundsThisWeek: function (studentId) {
      var profile = getProfile(studentId);
      var streaks = getStreakState(profile);
      var cutoff = Date.now() - ONE_WEEK_MS;
      return (streaks.roundLog || []).filter(function (ts) { return ts >= cutoff; }).length;
    },

    // Recent per-source history entries merged and sorted most-recent-first
    // — powers the student dashboard's "Recent evidence" list. Read-only,
    // derived entirely from data recordSourceResult already stores
    // (sourceState.history), same pattern as getCumulativeStats above —
    // just flattened across sources and time-sorted instead of summed.
    getRecentHistory: function (studentId, sourceKeys, limit) {
      var profile = getProfile(studentId);
      var entries = [];
      sourceKeys.forEach(function (sourceKey) {
        var sourceState = getSourceState(profile, sourceKey);
        (sourceState.history || []).forEach(function (entry) {
          entries.push({ sourceKey: sourceKey, percentage: entry.percentage, timestamp: entry.timestamp });
        });
      });
      entries.sort(function (a, b) { return b.timestamp - a.timestamp; });
      return typeof limit === "number" ? entries.slice(0, limit) : entries;
    },

    // Recent WHOLE-round completions, most-recent-first — powers the main
    // student dashboard's "Recent activity" list (one row per round, at
    // that round's overall percentage), as opposed to getRecentHistory
    // above (one row per sub-app touched within a round). Read-only,
    // derived from profile.roundHistory (recordRoundComplete's optional
    // roundPercentage argument).
    getRecentRounds: function (studentId, limit) {
      var profile = getProfile(studentId);
      var entries = (profile.roundHistory || []).slice().sort(function (a, b) { return b.timestamp - a.timestamp; });
      return typeof limit === "number" ? entries.slice(0, limit) : entries;
    },

    // Individual answered-question records for the student dashboard's
    // searchable history dialog. Kept separate from scoring/progression and
    // returned newest-first without mutating the stored profile.
    getQuestionHistory: function (studentId) {
      var profile = getProfile(studentId);
      return (profile.questionHistory || []).slice().sort(function (a, b) {
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    },

    reset: function (studentId) {
      var all = readAll();
      delete all[studentId];
      writeAll(all);
    },

    // ---- Server-sync reconciliation (see script.js's syncStateFromServer,
    // called once on identity resolution before any round can start) ----
    //
    // Merges server-fetched review events (accounts/account-server.js's
    // GET /api/student/progress-mode-reviews — this student's full log)
    // into the local per-signature schedule. Each event already carries the
    // RESULTING ease/interval/repetitions from whenever it was recorded (by
    // this device or another one), so merging is just "keep whichever of
    // local/incoming is more recent, independently PER SIGNATURE" — no
    // field-by-field reconciliation needed, since a review event is a
    // complete, self-contained snapshot rather than a partial update. This
    // is deliberately finer-grained than the old per-SOURCE merge it
    // replaced (a stale server review for one question can no longer
    // clobber fresher local progress on a different question in the same
    // source).
    //
    // intervalDraws/easeFactor/repetitions are portable across devices (a
    // property of how well this student knows this specific question), but
    // dueAtDraw is NOT — it was computed against whichever device's
    // drawCount was current at the time. So when an incoming event wins,
    // dueAtDraw is re-anchored to THIS device's own current drawCount for
    // the source, using the incoming intervalDraws as the (portable)
    // spacing distance; dueAtTime (wall-clock, device-independent) is
    // simply recomputed from the incoming event's own completedAt.
    applyIncomingReviews: function (studentId, reviews) {
      if (!Array.isArray(reviews) || !reviews.length) return;
      var profile = getProfile(studentId);

      reviews.forEach(function (review) {
        if (!review || !review.sourceKey || !review.questionSignature) return;
        var sourceState = getSourceState(profile, review.sourceKey);
        if (!sourceState.schedule) sourceState.schedule = {};

        var incomingReviewedAt = typeof review.completedAt === "number" ? review.completedAt : 0;
        var existing = sourceState.schedule[review.questionSignature];
        var existingReviewedAt = existing && typeof existing.lastReviewedAt === "number" ? existing.lastReviewedAt : 0;
        if (existing && existingReviewedAt >= incomingReviewedAt) return;

        var intervalDraws = typeof review.intervalDraws === "number" ? review.intervalDraws : 0;
        var minMinutes = computeMinMinutes(Boolean(review.correct), intervalDraws);
        sourceState.schedule[review.questionSignature] = {
          easeFactor: typeof review.easeFactor === "number" ? review.easeFactor : DEFAULT_EASE_FACTOR,
          repetitions: typeof review.repetitions === "number" ? review.repetitions : 0,
          intervalDraws: intervalDraws,
          dueAtDraw: (sourceState.drawCount || 0) + intervalDraws,
          dueAtTime: incomingReviewedAt + minMinutes * 60000,
          lastReviewedAt: incomingReviewedAt
        };
      });

      saveProfile(studentId, profile);
    },

    // Reconciles one area's server-synced level/levelProgress into the
    // local profile. Levels only ever advance in this app (see
    // recordSourceResult), so the merge is simply "never regress": local's
    // level can only move up to match a higher incoming level, never down.
    // At whatever level results, the two sides' levelProgress entries FOR
    // THAT LEVEL INDEX are merged: concept maps are unioned (the distinct-
    // question-variety bar), and correct/total each take the max of the
    // two sides rather than summing, so overlapping activity recorded on
    // both devices isn't double-counted (a documented simplification —
    // trades away crediting genuinely-disjoint simultaneous practice on
    // two devices at once, which isn't a realistic classroom scenario).
    mergeIncomingAreaState: function (studentId, areaKey, incoming) {
      if (!incoming) return;
      var profile = getProfile(studentId);
      var local = getAreaState(profile, areaKey);
      var incomingLevel = typeof incoming.level === "number" ? incoming.level : 0;
      local.level = Math.max(local.level, incomingLevel);

      var mergedLevelKey = String(local.level);
      var localEntry = getAreaLevelProgress(local, local.level);
      var incomingEntry = (incoming.levelProgress && incoming.levelProgress[mergedLevelKey]) || null;
      if (incomingEntry) {
        var mergedConcepts = {};
        Object.keys(localEntry.concepts || {}).forEach(function (key) { mergedConcepts[key] = true; });
        Object.keys(incomingEntry.concepts || {}).forEach(function (key) { mergedConcepts[key] = true; });
        localEntry.concepts = mergedConcepts;
        localEntry.correct = Math.max(localEntry.correct || 0, incomingEntry.correct || 0);
        localEntry.total = Math.max(localEntry.total || 0, incomingEntry.total || 0);
      }

      saveProfile(studentId, profile);
    }
  };

  global.EAProgressModeStore = Store;
})(window);
