// EchoAural Progress Mode registry — the one canonical list of PM "sources"
// (the same granularity Progress Mode itself schedules rounds against, in
// modules/progress-mode/app-drivers.js — e.g. ScoreDecoder's 4 topics are 4
// separate sources, not 1 "musical-language"). Dashboard HTML, the
// classroom server, and student/Live Session JS should all read from here
// instead of each keeping their own hardcoded app list.
//
// Two halves, deliberately:
//   1. Static identity metadata (sourceKey/moduleId/area/label/path/icon/
//      levelValues/hasClassroomAdapter/rendererBridgeCapability) — this is
//      genuinely fixed per source and mirrors app-drivers.js's own DRIVERS
//      object, so it's authored once here, the same way app-drivers.js
//      authors it once for Progress Mode itself.
//   2. Live content metadata (responseTypes/questionCount/
//      mixedRoundCompatible/skills) — this comes from actually loading each
//      module's real question bank, which classroom/question-catalogue.js
//      knows how to do for all registered fixed-bank and deterministic
//      procedural sources. mergeWithCatalogue() folds that in
//      without this file ever calling require()/fetch() itself, so the
//      exact same code runs server-side (passed questionCatalogue.modules()
//      directly) and client-side (passed the response of the already-
//      existing GET /api/classroom/modules).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EchoAuralPMRegistry = factory();
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this), function createPMRegistry() {
  "use strict";

  var AREAS = {
    melody: { label: "Melody", icon: "/assets/icons/modules/melody-master.png" },
    texture: { label: "Texture", icon: "/assets/icons/modules/texture-trainer.png" },
    harmony: { label: "Harmony", icon: "/assets/icons/modules/harmony-explorer.png" },
    instrumentation: { label: "Instrumentation", icon: "/assets/icons/modules/instrument-identifier.png" },
    rhythm: { label: "Meter", icon: "/assets/icons/modules/meter-master.png" },
    context: { label: "Context", icon: "/assets/icons/modules/context-coach.png" }
  };

  var LEVEL_VALUES = ["Foundation", "Developing", "Securing", "Mastering"];
  var LEVEL_VALUES_LOWER = ["foundation", "developing", "securing", "mastering"];
  // cadence-coach, harmony-key-signatures and both context-coach sources
  // use this shorter, differently-named level set in app-drivers.js itself
  // (not a typo here — "secure"/"exam" instead of "securing"/"mastering").
  var LEVEL_VALUES_SHORT = ["foundation", "developing", "secure", "exam"];

  function entry(sourceKey, moduleId, area, subAppLabel, appUrl, levelValues, hasClassroomAdapter, rendererBridgeCapability, questionSelectionMode) {
    var areaInfo = AREAS[area] || { label: area, icon: "/assets/icons/modules/progress-mode.png" };
    return {
      sourceKey: sourceKey,
      moduleId: moduleId,
      musicalElement: areaInfo.label,
      subAppLabel: subAppLabel,
      // Relative to modules/progress-mode/ — the one place this convention
      // is actually resolved today (app-drivers.js's iframe src).
      appUrl: appUrl,
      icon: areaInfo.icon,
      levelValues: levelValues.slice(),
      // Every source here is a listening exercise built around one audio
      // clip per question — true for all of them as of this writing, but
      // kept as an explicit field (not an assumption baked into behaviour)
      // so a future non-audio source doesn't silently inherit it. Not
      // independently re-verified per source in this pass.
      audioContract: true,
      // True only where classroom/classroom-server.js registers a real
      // adapter. Procedural sources qualify only when that adapter and the
      // browser share the same deterministic generator.
      hasClassroomAdapter: hasClassroomAdapter,
      // "legacy-dom-polling": nobody accepts host-selected questions yet —
      // Progress Mode drives it the old way (app-drivers.js DOM-polling).
      // "contract-question-injection": this source's script.js now accepts
      // an exact question id via EAProgressEmbed.registerQuestionHandler
      // (see that source's own tests under modules/<id>/tests/ for proof —
      // this flag is only ever flipped alongside a passing test, never on
      // its own). This is the flag the Live Session host and teacher
      // dashboard gate on, per the migration plan's tiered rollout.
      rendererBridgeCapability: rendererBridgeCapability || "legacy-dom-polling",
      // "id": the host picks a specific question from a fixed, enumerable
      // bank and tells the app to load exactly that id (instrument-
      // identifier, texture-trainer, cadence-coach, ...).
      // "seed": the source generates questions procedurally with no fixed
      // bank to enumerate (chord-identifier's Math.random()-driven chord
      // generator) — the host instead sends a reproducible seed and the
      // app deterministically generates the same question from it. "id" is
      // the default/assumption for every not-yet-migrated source too,
      // since that's what most of them need — only overridden where a
      // source's own migration found it actually needs seed-mode instead.
      questionSelectionMode: questionSelectionMode || "id",
      // Populated by mergeWithCatalogue() where a classroom adapter exists;
      // left null otherwise so callers can tell "not merged yet" apart from
      // "merged, and there genuinely are none" (e.g. an empty skills list).
      responseTypes: null,
      questionCount: null,
      mixedRoundCompatible: null,
      skills: null
    };
  }

  // One row per Progress Mode source key, in the same order as
  // modules/progress-mode/app-drivers.js's DRIVERS object, with the same
  // label/area/path/levelValues (cross-checked against that file directly —
  // not re-derived or guessed).
  var SOURCES = [
    entry("instrument-identifier", "instrument-identifier", "instrumentation", "Instrument Identifier", "../instrument-identifier/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("ensemble-recognition", "ensemble-recognition", "instrumentation", "Ensemble Recognition", "../ensemble-recognition/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("melody-master-devices", "melody-master", "melody", "Melody Master · Melodic Devices", "../melody-master/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("melody-master-dictation", "melody-master", "melody", "Melody Master · Melodic Dictation", "../melody-master/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("melodic-intervals", "melodic-intervals", "melody", "Melodic Intervals", "../melodic-intervals/index.html", LEVEL_VALUES_LOWER, true, "contract-question-injection"),
    entry("texture-trainer", "texture-trainer", "texture", "Texture Trainer", "../texture-trainer/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("chord-identifier", "chord-identifier", "harmony", "Chord Identifier", "../chord-identifier/index.html", LEVEL_VALUES_LOWER, true, "contract-question-injection", "seed"),
    // PM's own sourceKey is "harmony-key-signatures", but the classroom
    // teacher-adapter for this app registers itself under the id
    // "key-signature-sprint" (modules/harmony-explorer/key-signature-sprint/
    // teacher-adapter.js) — exactly the kind of drift this registry exists
    // to stop hiding.
    entry("harmony-key-signatures", "key-signature-sprint", "harmony", "Harmony Explorer · Key Signatures", "../harmony-explorer/key-signature-sprint/index.html", LEVEL_VALUES_SHORT, true, "contract-question-injection", "seed"),
    entry("cadence-coach", "cadence-coach", "harmony", "Cadence Coach", "../cadence-coach/index.html", LEVEL_VALUES_SHORT, true, "contract-question-injection"),
    entry("musical-language-ornamentation", "musical-language", "melody", "Musical Language · Ornamentation", "../musical-language/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("musical-language-articulation", "musical-language", "melody", "Musical Language · Articulation", "../musical-language/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("musical-language-dynamics", "musical-language", "texture", "Musical Language · Dynamics", "../musical-language/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("musical-language-tempo", "musical-language", "rhythm", "Musical Language · Tempo", "../musical-language/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    entry("meter-master", "meter-master", "rhythm", "Meter Master", "../meter-master/index.html", LEVEL_VALUES, true, "contract-question-injection"),
    // era-explorer's underlying folder/classroom-module id is "era-explorer"
    // even though both PM sources for it are branded/keyed "context-coach-*".
    entry("context-coach-composer", "era-explorer", "context", "ContextCoach · Composers", "../../era-explorer/index.html", LEVEL_VALUES_SHORT, true, "contract-question-injection", "seed"),
    entry("context-coach-period", "era-explorer", "context", "ContextCoach · Periods", "../../era-explorer/index.html", LEVEL_VALUES_SHORT, true, "contract-question-injection", "seed")
  ];

  function clone(source) {
    var copy = {};
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      copy[key] = Array.isArray(value) ? value.slice() : value;
    });
    return copy;
  }

  function all() {
    return SOURCES.map(clone);
  }

  function get(sourceKey) {
    var found = SOURCES.filter(function (source) { return source.sourceKey === sourceKey; })[0];
    return found ? clone(found) : null;
  }

  function byModule(moduleId) {
    return SOURCES.filter(function (source) { return source.moduleId === moduleId; }).map(clone);
  }

  function mixedCompatibleSources() {
    return SOURCES.filter(function (source) { return source.hasClassroomAdapter; }).map(clone);
  }

  // catalogueModules is whatever classroom/question-catalogue.js's
  // QuestionCatalogue#modules() returns — passed in directly server-side,
  // or fetched from the already-existing GET /api/classroom/modules
  // client-side. This function never calls require()/fetch() itself, so
  // the exact same code runs unmodified in both environments.
  function mergeWithCatalogue(catalogueModules) {
    var byModuleId = {};
    (catalogueModules || []).forEach(function (module) { byModuleId[module.id] = module; });
    return SOURCES.map(function (source) {
      var merged = clone(source);
      var module = byModuleId[source.moduleId];
      if (module) {
        merged.responseTypes = module.responseTypes || [];
        merged.questionCount = Number(module.questionCount || 0);
        merged.mixedRoundCompatible = Boolean(module.mixedCompatible);
        merged.skills = module.skills || [];
      }
      return merged;
    });
  }

  return {
    all: all,
    get: get,
    byModule: byModule,
    mixedCompatibleSources: mixedCompatibleSources,
    mergeWithCatalogue: mergeWithCatalogue
  };
});
