"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const moduleRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(moduleRoot, "../..");
const desktopRoot = path.resolve(projectRoot, "..");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSet() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl005.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl005.js" });
  return context.window.EXAM_LAB_QUESTION_SET;
}

function parseCsvRow(row) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '"' && quoted && row[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

const exl005 = loadQuestionSet();
const question = (number) => exl005.questions[number - 1];
const score = (answers) => exl005.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL005 uses the supplied audio and is explicitly score-free", () => {
  const packagedAudio = fs.readFileSync(path.join(moduleRoot, "assets", "EXL005.mp3"));
  const suppliedAudio = fs.readFileSync(path.join(desktopRoot, "EXL005.mp3"));
  assert.deepEqual(packagedAudio, suppliedAudio);
  assert.equal(exl005.audio, "assets/EXL005.mp3");
  assert.equal(exl005.scoreRequired, false);
  assert.equal(exl005.score, "");
  assert.equal(exl005.lyricsRequired, false);
  assert.equal(fs.existsSync(path.join(moduleRoot, "assets", "EXL005-skeleton-score.png")), false);
});

test("EXL005 has eight questions, ten marks and four plays", () => {
  assert.equal(exl005.questions.length, 8);
  assert.equal(exl005.questions.reduce((total, item) => total + item.marks, 0), 10);
  assert.equal(exl005.totalMarks, 10);
  assert.equal(exl005.maxPlays, 4);
  assert.deepEqual(Array.from(exl005.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("Q1 uses the supplied tempo options and marks only 144 BPM", () => {
  assert.deepEqual(Array.from(question(1).options), ["72 BPM", "96 BPM", "120 BPM", "144 BPM"]);
  question(1).options.forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, answer === "144 BPM" ? 1 : 0));
});

test("Q2 uses the supplied metre options and marks only simple quadruple", () => {
  assert.deepEqual(Array.from(question(2).options), ["Simple duple", "Simple triple", "Simple quadruple", "Compound duple"]);
  question(2).options.forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, answer === "Simple quadruple" ? 1 : 0));
});

test("Q3 accepts loop variants and rejects the supplied non-credit terms", () => {
  ["loop", "loops", "looping", "looped", "looped pattern", "looped patterns"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 1));
  ["repetition", "ostinato", "sample", "delay", "multi-tracking", "not a loop"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 0));
});

test("Q4 accepts build-up variants and rejects other structural sections", () => {
  ["build up", "buildup", "build-up", "the build up"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 1));
  ["breakdown", "drop", "introduction", "outro", "not a build up"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 0));
});

test("Q5 marks only the drop", () => {
  ["drop", "the drop"].forEach((answer) => assert.equal(marking.markQuestion(question(5), answer).marks, 1));
  ["build up", "breakdown", "introduction", "transition", "not the drop"].forEach((answer) => assert.equal(marking.markQuestion(question(5), answer).marks, 0));
});

test("Q6 awards distinct changes and applies every duplicate rule", () => {
  assert.equal(marking.markQuestion(question(6), "More layers are added and a rising electronic sweep is heard.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "The intensity increases and the rhythm becomes busier.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "It becomes louder and the dynamics increase.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "The texture becomes thicker and more layers are added.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "The pitch rises with a rising electronic sweep.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "There is a pause and a brief silence.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "The tempo becomes faster and accelerates.").marks, 0);
  assert.equal(marking.markQuestion(question(6), "It becomes EDM, the drop begins and it becomes exciting.").marks, 0);
  assert.equal(marking.markQuestion(question(6), "It changes and builds up.").marks, 0);
});

test("Q7 accepts breakdown variants and rejects other sections", () => {
  ["breakdown", "break down", "the breakdown"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 1));
  ["build up", "drop", "outro", "introduction", "not a breakdown"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 0));
});

test("Q8 requires paired comparisons and prevents duplicate density marks", () => {
  assert.equal(marking.markQuestion(question(8), question(8).modelAnswer).marks, 2);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds the texture is thick and layered with full percussion.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds it is thicker, more layered and has more sounds. At 65 seconds it is thinner, sparser and has fewer sounds.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds there is full electronic percussion. At 65 seconds the percussion is reduced.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds it is rhythmically busier and brighter. At 65 seconds it is less active and less bright.").marks, 2);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds there is full bass and percussion. At 65 seconds the sound is more exposed.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "The texture is thicker at 30 seconds than at 65 seconds.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds it is thinner. At 65 seconds it is thicker.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "At 30 seconds it is louder. At 65 seconds it is quieter.").marks, 0);
});

test("all-correct and all-incorrect EXL005 submissions total 10/10 and 0/10", () => {
  const correctAnswers = [
    "144 BPM",
    "Simple quadruple",
    "looped patterns",
    "build-up",
    "the drop",
    "More layers are added and a rising electronic sweep is heard.",
    "break down",
    "At 30 seconds the texture is thick and layered, with full electronic percussion. At 65 seconds it is thinner, with fewer layers and reduced percussion."
  ];
  const incorrectAnswers = [
    "120 BPM",
    "Simple duple",
    "ostinato",
    "drop",
    "transition",
    "The tempo gets faster and the drop begins.",
    "outro",
    "At 30 seconds it is louder. At 65 seconds it is quieter."
  ];
  assert.equal(score(correctAnswers), 10);
  assert.equal(score(incorrectAnswers), 0);
});

test("EXL005 uses the aural-only layout and requested feedback modes", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(html, /<option value="EXL005">EXL005<\/option>/);
  assert.match(html, /data\/exl005\.js/);
  assert.equal(question(6).markingFeedbackMode, "two-change");
  assert.equal(question(8).markingFeedbackMode, "paired-comparison");
  assert.match(script, /<strong>Change \$\{index \+ 1\}:<\/strong>/);
  assert.match(script, /Two distinct paired comparisons credited/);
});

test("EXL005 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL005_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n").map(parseCsvRow);
  assert.equal(rows.length, 9);
  rows.forEach((row) => assert.equal(row.length, 13));
  exl005.questions.forEach((item, index) => {
    assert.equal(rows[index + 1][1], item.id);
    assert.equal(Number(rows[index + 1][2]), item.number);
    assert.equal(rows[index + 1][3], item.prompt);
    assert.equal(Number(rows[index + 1][4]), item.marks);
  });
});
