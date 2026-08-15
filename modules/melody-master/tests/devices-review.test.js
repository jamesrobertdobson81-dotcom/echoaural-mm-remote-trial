"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const moduleRoot = path.resolve(__dirname, "..");
const current = JSON.parse(fs.readFileSync(path.join(moduleRoot, "data", "melody-master-melodic-devices-50.json"), "utf8"));
const recovered = JSON.parse(fs.readFileSync(path.join(moduleRoot, "review-ii-candidates.json"), "utf8"));

test("reviewed bank contains only approved Cambridge-facing questions", () => {
  assert.equal(current.questions.length, 75);
  assert.equal(new Set(current.questions.map((question) => question.id)).size, 75);
  assert.equal(current.questions.some((question) => ["Conjunct", "Disjunct", "Triadic"].includes(question.correctAnswer)), false);
  assert.equal(current.questions.filter((question) => question.responseType === "Written response").length, 16);
  assert.equal(current.questions.filter((question) => question.sourceGroup === "Reviewed Instrument Identifier melodic-device tag").length, 13);
  current.questions.forEach((question) => {
    assert.equal(fs.existsSync(path.resolve(moduleRoot, question.audio)), true, `${question.id} audio is missing`);
  });
});

test("the eight original questions omitted from the reviewer remain live", () => {
  const restoredIds = ["MDV004", "MDV006", "MDV011", "MDV026", "MDV029", "MDV030", "MDV033", "MDV038"];
  restoredIds.forEach((id) => assert.ok(current.questions.some((question) => question.id === id), `${id} is missing`));
});

test("Anitra's Dance uses the later ostinato cut", () => {
  const question = current.questions.find((entry) => entry.id === "MDV023");
  assert.ok(question);
  assert.equal(question.correctAnswer, "Ostinato");
  assert.deepEqual(question.choices, ["Ostinato", "Sequence", "Imitation", "Repetition"]);
  assert.equal(question.clipStartSeconds, "8");
  assert.equal(question.clipEndSeconds, "19");
});

test("Mozart Symphony 40 Andante uses Melismatic instead of Scalic", () => {
  const question = current.questions.find((entry) => entry.id === "MDV034");
  assert.ok(question);
  assert.equal(question.correctAnswer, "Chromatic");
  assert.deepEqual(question.choices, ["Chromatic", "Melismatic", "Triadic", "Pentatonic"]);
  assert.equal(question.choices.includes("Scalic"), false);
});

test("review seed restores all nineteen manually tagged II candidates", () => {
  assert.equal(recovered.candidateCount, 19);
  assert.equal(recovered.questions.length, 19);
  assert.equal(new Set(recovered.questions.map((question) => question.id)).size, 19);
  assert.equal(recovered.questions.filter((question) => /sequence/i.test(question.originalAnswer)).length, 15);
  assert.equal(recovered.questions.filter((question) => /trill|turn/i.test(question.originalAnswer)).length, 4);
});

test("every recovered II candidate has reviewable audio", () => {
  recovered.questions.forEach((question) => {
    assert.equal(fs.existsSync(path.resolve(moduleRoot, question.audio)), true, `${question.id} audio is missing`);
  });
});

test("review page contains local decisions, source filters and exports", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "review.html"), "utf8");
  const script = fs.readFileSync(path.join(moduleRoot, "review.js"), "utf8");
  ["keep", "edit", "drop"].forEach((decision) => assert.match(html, new RegExp(`value="${decision}"`)));
  assert.match(html, /data-origin-filter="MM Devices"/);
  assert.match(html, /data-origin-filter="II tag"/);
  assert.match(script, /echoaural\.melodyMaster\.reviewedDevicesTesting\.v2/);
  assert.match(script, /downloadJson/);
  assert.match(script, /downloadCsv/);
  assert.match(script, /state\.questions = \(current\.questions \|\| \[\]\)\.map\(prepareExisting\)/);
  assert.doesNotMatch(script, /fetch\("review-ii-candidates\.json"\)/);
  assert.match(script, /cache: "no-store"/);
});

test("MM Devices displays the title immediately and full details when playback starts", () => {
  const appSource = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(appSource, /function showDevicesTrackTitle\(question = currentDeviceQuestion\)/);
  assert.match(appSource, /wireMelodicDevicesOptionButtons\(workspace\);\s*showDevicesTrackTitle\(question\);/);
  assert.match(appSource, /audio\.volume = 1;\s*revealDevicesTrackInfo\(currentDeviceQuestion\);/);
  assert.match(appSource, /revealDevicesTrackInfo\(currentDeviceQuestion\);/);
});

test("MM Dictation and Devices gameplay actions have a visible branded neutral state", () => {
  const styles = fs.readFileSync(path.join(moduleRoot, "style.css"), "utf8");
  assert.match(styles, /border: 1px solid rgba\(255, 93, 186, \.34\) !important;/);
  assert.match(styles, /rgba\(255, 93, 186, \.11\)/);
  assert.match(styles, /0 12px 30px rgba\(255, 93, 186, \.075\)/);
});
