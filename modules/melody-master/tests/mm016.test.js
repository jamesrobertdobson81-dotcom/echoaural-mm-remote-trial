"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const moduleRoot = path.resolve(__dirname, "..");
const clipsSource = fs.readFileSync(path.join(moduleRoot, "clips.js"), "utf8");
const { melodyClips, melodyMasterLevelledClips } = vm.runInNewContext(
  `${clipsSource};({ melodyClips, melodyMasterLevelledClips });`
);
const devices = JSON.parse(fs.readFileSync(
  path.join(moduleRoot, "data", "melody-master-melodic-devices-50.json"),
  "utf8"
));

function readPngDimensions(relativePath) {
  const png = fs.readFileSync(path.resolve(moduleRoot, relativePath));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test("MM016 has the supplied pitches, rhythms and score-context notes", () => {
  const question = melodyClips.find((clip) => clip.id === "MM016");
  assert.ok(question);
  assert.deepEqual(Array.from(question.answerPitches), ["B5", "A5", "G5", "F5", "G5", "D5"]);
  assert.deepEqual(
    Array.from(question.dictationLayout.slots, (slot) => slot.rhythm),
    ["dotted crotchet", "crotchet", "quaver", "dotted crotchet", "crotchet", "quaver"]
  );
  assert.equal(question.hiddenMetadata.contextDiagnostics.preContextNotes[0].pitch, "G5");
  assert.equal(question.hiddenMetadata.contextDiagnostics.postContextNotes[0].pitch, "E5");
});

test("MM016 preserves the supplied score canvas without distortion", () => {
  [
    "questions/mm016/mm016-question.png",
    "questions/mm016/mm016-answer-restored.png",
    "questions/mm016/mm016-foundation-question.png",
    "questions/mm016/mm016-securing-question.png"
  ].forEach((artwork) => {
    assert.deepEqual(readPngDimensions(artwork), { width: 2289, height: 219 }, artwork);
  });
});

test("MM016 answer reveal uses the untouched supplied answer artwork", () => {
  const question = melodyClips.find((clip) => clip.id === "MM016");
  const answer = fs.readFileSync(path.resolve(moduleRoot, question.answerImage));
  assert.equal(
    crypto.createHash("sha256").update(answer).digest("hex"),
    "e233b88c15a86c661027c32805c6c2913146bd65877f1cd68b9fe54f976d56ee"
  );
});

test("MM016 pitch grid is calibrated to its five printed stave lines", () => {
  const question = melodyClips.find((clip) => clip.id === "MM016");
  const layout = question.dictationLayout;
  const expectedPrintedLines = [101, 122, 143, 164, 185];
  const calculatedLines = [0, 2, 4, 6, 8].map((steps) => (
    Math.round(((layout.staffTopY + (steps * layout.staffStepY)) / 100) * 219)
  ));
  assert.deepEqual(calculatedLines, expectedPrintedLines);

  const upperLedgerY = ((layout.staffTopY - (2 * layout.staffStepY)) / 100) * 219;
  const lowerLedgerY = ((layout.staffTopY + (10 * layout.staffStepY)) / 100) * 219;
  assert.ok(Math.abs((101 - upperLedgerY) - 21) < 0.05);
  assert.ok(Math.abs((lowerLedgerY - 185) - 21) < 0.05);
});

test("MM016 has only the two supplied manual level variants", () => {
  const variants = melodyMasterLevelledClips.filter((clip) => clip.sourceQuestionId === "MM016");
  assert.deepEqual(Array.from(variants, (clip) => clip.id), ["MM016-F", "MM016-S"]);
  assert.ok(variants.every((clip) => clip.manualLevelVariant === true));

  const foundation = variants.find((clip) => clip.id === "MM016-F");
  assert.equal(foundation.level, "Foundation");
  assert.deepEqual(Array.from(foundation.answerPitches), ["A5", "G5"]);
  assert.deepEqual(Array.from(foundation.dictationLayout.slots, (slot) => slot.sourceSlot), [2, 3]);

  const securing = variants.find((clip) => clip.id === "MM016-S");
  assert.equal(securing.level, "Securing");
  assert.deepEqual(Array.from(securing.answerPitches), ["A5", "G5", "F5", "G5"]);
  assert.deepEqual(Array.from(securing.dictationLayout.slots, (slot) => slot.sourceSlot), [2, 3, 4, 5]);

  variants.forEach((clip) => {
    assert.equal(clip.file, "questions/mm016/MM016-audio.mp3");
    assert.equal(clip.answerImage, "questions/mm016/mm016-answer-restored.png");
    assert.equal(clip.dictationLayout.staffTopY, 46.1187);
    assert.equal(clip.dictationLayout.staffStepY, 4.7945);
  });
});

test("dictation level selection substitutes only supplied manual variants", () => {
  const appSource = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(appSource, /MANUAL_LEVELLED_MELODY_CLIPS = LEVELLED_MELODY_CLIPS\.filter/);
  assert.match(appSource, /matchingManualVariants = MANUAL_LEVELLED_MELODY_CLIPS\.filter\(\(clip\) => clip\.level === selectedLevel\)/);
  assert.match(appSource, /manuallyReplacedSourceIds\.has\(clip\.id\)/);
});

test("MDV040 identifies the turn with bundled audio and score", () => {
  const question = devices.questions.find((entry) => entry.id === "MDV040");
  assert.ok(question);
  assert.equal(question.question, "Identify the ornament used in this extract.");
  assert.equal(question.correctAnswer, "Turn");
  assert.equal(fs.existsSync(path.resolve(moduleRoot, question.audio)), true);
  assert.equal(fs.existsSync(path.resolve(moduleRoot, question.score)), true);
});

test("temporary authoring order pins the newest dictation source first", () => {
  const appSource = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(appSource, /const newestQuestionIndex = pool\[pool\.length - 1\]/);
  assert.match(appSource, /return \[newestQuestionIndex, \.\.\.shuffleArray\(remainingPool\)\.slice\(0, count - 1\)\]/);
});

test("dragged MM notes keep ledger lines visible above and below the stave", () => {
  const appSource = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  const styles = fs.readFileSync(path.join(moduleRoot, "style.css"), "utf8");
  assert.match(appSource, /const upperLedgerPitches = \["C6", "B5", "A5", "G5"\]/);
  assert.match(appSource, /const lowerLedgerPitches = \["D4", "C4", "B3", "A3", "G3"\]/);
  assert.match(styles, /\.is-dragging \.dictation-ledger-line\.is-visible/);
  assert.match(styles, /\.dictation-ledger-line \{[\s\S]*?z-index: 11;/);
});
