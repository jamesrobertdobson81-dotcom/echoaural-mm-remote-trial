const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../../..");
const bridgeSource = fs.readFileSync(path.join(root, "shared/js/progress-embed-contract.js"), "utf8");

function runBridge(search) {
  const messages = [];
  const listeners = {};
  const parent = { postMessage: (message, origin) => messages.push({ message, origin }) };
  const window = {
    location: { search, origin: "https://echoaural.test" },
    parent,
    document: { querySelectorAll: () => [] },
    addEventListener: (type, handler) => { listeners[type] = handler; }
  };
  vm.runInNewContext(bridgeSource, { window, URLSearchParams, Object, String, Number, Boolean, Math });
  return { window, messages, listeners };
}

test("embed bridge is dormant during normal standalone app use", () => {
  const { window, messages } = runBridge("");
  assert.equal(window.EAProgressEmbed.enabled, false);
  assert.equal(window.EAProgressEmbed.questionReady({ id: "Q1" }), false);
  assert.equal(window.EAProgressEmbed.answerComplete({ correct: true }), false);
  assert.deepEqual(messages, []);
});

test("embed bridge sends versioned question and result events", () => {
  const { window, messages } = runBridge("?eaProgressHost=1&eaProgressSlot=slot-4&eaProgressSource=meter-master");
  assert.equal(window.EAProgressEmbed.questionReady({ id: "MTR001", level: "foundation" }), true);
  assert.equal(window.EAProgressEmbed.answerComplete({ questionId: "MTR001", score: 1, maximumScore: 1 }), true);
  assert.equal(messages.length, 2);
  // version stays 1 and every original v1 field keeps its exact old value —
  // that's what makes the new fields (contractVersion, roomId, roundId,
  // questionId) additive rather than breaking. Progress Mode's own host
  // (script.js) only ever reads the original v1 fields, so it never
  // notices these extra properties exist.
  assert.deepEqual(JSON.parse(JSON.stringify(messages[0].message)), {
    namespace: "echoaural-progress",
    version: 1,
    contractVersion: 2,
    type: "question-ready",
    slotId: "slot-4",
    sourceKey: "meter-master",
    roomId: "",
    roundId: "",
    questionId: "MTR001",
    payload: { id: "MTR001", level: "foundation", signature: "MTR001" }
  });
  assert.equal(messages[1].message.type, "answer-complete");
  assert.equal(messages[1].message.payload.correct, true);
  // answer-complete doesn't change the tracked questionId — it's reporting
  // the result of the question already announced by question-ready above.
  assert.equal(messages[1].message.questionId, "MTR001");
});

test("embed bridge carries room/round identity for Live Session hosts and rejects mismatched rounds", () => {
  const { window, messages, listeners } = runBridge(
    "?eaProgressHost=1&eaProgressSlot=slot-9&eaProgressSource=texture-trainer&eaProgressRoom=ROOM1&eaProgressRound=7"
  );
  assert.equal(window.EAProgressEmbed.questionReady({ id: "TT042" }), true);
  assert.deepEqual(
    { roomId: messages[0].message.roomId, roundId: messages[0].message.roundId },
    { roomId: "ROOM1", roundId: "7" }
  );

  const received = [];
  window.EAProgressEmbed.registerQuestionHandler((payload) => received.push(payload));

  // Wrong room: ignored entirely, even though slotId matches.
  listeners.message({
    origin: "https://echoaural.test",
    source: window.parent,
    data: {
      namespace: "echoaural-progress", version: 1, type: "teacher-load-question",
      slotId: "slot-9", roomId: "ROOM-OTHER", roundId: "7", payload: { id: "TT099" }
    }
  });
  assert.equal(received.length, 0);

  // Wrong round, same room: also ignored.
  listeners.message({
    origin: "https://echoaural.test",
    source: window.parent,
    data: {
      namespace: "echoaural-progress", version: 1, type: "teacher-load-question",
      slotId: "slot-9", roomId: "ROOM1", roundId: "3", payload: { id: "TT099" }
    }
  });
  assert.equal(received.length, 0);

  // Matching room and round: accepted.
  listeners.message({
    origin: "https://echoaural.test",
    source: window.parent,
    data: {
      namespace: "echoaural-progress", version: 1, type: "teacher-load-question",
      slotId: "slot-9", roomId: "ROOM1", roundId: "7", payload: { id: "TT099" }
    }
  });
  assert.deepEqual(received, [{ id: "TT099" }]);
});

test("embed bridge's new teacher-* commands are additive: teacher-reset/teacher-close only fire if an app registers for them", () => {
  const { window, listeners } = runBridge("?eaProgressHost=1&eaProgressSlot=slot-1&eaProgressSource=cadence-coach");
  const message = (type) => ({
    origin: "https://echoaural.test",
    source: window.parent,
    data: { namespace: "echoaural-progress", version: 1, type, slotId: "slot-1", payload: {} }
  });

  // No handler registered yet — must not throw, must simply do nothing.
  assert.doesNotThrow(() => listeners.message(message("teacher-reset")));
  assert.doesNotThrow(() => listeners.message(message("teacher-close")));

  let resetCalls = 0;
  let closeCalls = 0;
  window.EAProgressEmbed.registerResetHandler(() => { resetCalls += 1; });
  window.EAProgressEmbed.registerCloseHandler(() => { closeCalls += 1; });
  listeners.message(message("teacher-reset"));
  listeners.message(message("teacher-close"));
  assert.equal(resetCalls, 1);
  assert.equal(closeCalls, 1);
});

test("every Progress Mode source app loads and emits the shared contract", () => {
  const apps = [
    ["modules/instrument-identifier/index.html", "modules/instrument-identifier/script.js"],
    ["modules/ensemble-recognition/index.html", "modules/ensemble-recognition/script.js"],
    ["modules/melody-master/index.html", "modules/melody-master/script.js"],
    ["modules/melodic-intervals/index.html", "modules/melodic-intervals/script.js"],
    ["modules/texture-trainer/index.html", "modules/texture-trainer/script.js"],
    ["modules/chord-identifier/index.html", "modules/chord-identifier/script.js"],
    ["modules/harmony-explorer/key-signature-sprint/index.html", "modules/harmony-explorer/key-signature-sprint/script.js"],
    ["modules/cadence-coach/index.html", "modules/cadence-coach/script.js"],
    ["modules/meter-master/index.html", "modules/meter-master/script.js"],
    ["modules/musical-language/index.html", "modules/musical-language/script.js"],
    ["era-explorer/index.html", "era-explorer/script.js"]
  ];

  apps.forEach(([htmlPath, scriptPath]) => {
    const html = fs.readFileSync(path.join(root, htmlPath), "utf8");
    const script = fs.readFileSync(path.join(root, scriptPath), "utf8");
    assert.match(html, /progress-embed-contract\.js/, htmlPath);
    assert.match(script, /EAProgressEmbed\?\.questionReady/, scriptPath);
    assert.match(script, /EAProgressEmbed\?\.answerComplete/, scriptPath);
  });
});

test("Progress Mode prefers contract events but retains its legacy fallback", () => {
  const script = fs.readFileSync(path.join(root, "modules/progress-mode/script.js"), "utf8");
  assert.match(script, /message\.type === "question-ready"/);
  assert.match(script, /message\.type === "answer-complete"/);
  assert.match(script, /eaProgressHost: "1"/);
  assert.match(script, /beginAnsweredPolling\(doc, driver\)/);
});
