"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const moduleRoot = path.resolve(__dirname, "..");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSet() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl010.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl010.js" });
  return context.window.EXAM_LAB_QUESTION_SET;
}

const exl010 = loadQuestionSet();
const question = (number) => exl010.questions[number - 1];
const score = (answers) => exl010.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL010 packages the supplied audio and skeleton score exactly", () => {
  const packagedAudio = fs.readFileSync(path.join(moduleRoot, "assets", "EXL010.mp3"));
  const packagedScore = fs.readFileSync(path.join(moduleRoot, "assets", "EXL010-skeleton-score.png"));
  assert.equal(crypto.createHash("sha256").update(packagedAudio).digest("hex"), "02d17ba46438cb786319f2e85d2ebce069d901ec48347d9517b452a184109cf8");
  assert.equal(crypto.createHash("sha256").update(packagedScore).digest("hex"), "7b3cd8ce1da9332a361ebdb93ecd63f1c37442765779994e2ff5309e3e02ef76");
  assert.equal(packagedScore.readUInt32BE(16), 2289);
  assert.equal(packagedScore.readUInt32BE(20), 976);
  assert.equal(exl010.audio, "assets/EXL010.mp3");
  assert.equal(exl010.score, "assets/EXL010-skeleton-score.png");
});

test("EXL010 has nine questions worth ten marks, four plays and a skeleton score", () => {
  assert.equal(exl010.questions.length, 9);
  assert.equal(exl010.questions.reduce((total, item) => total + item.marks, 0), 10);
  assert.equal(exl010.totalMarks, 10);
  assert.equal(exl010.maxPlays, 4);
  assert.equal(exl010.scoreRequired, true);
  assert.equal(exl010.lyricsRequired, false);
  assert.deepEqual(Array.from(exl010.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("pre-submission labels and score alt text do not reveal assessed answers", () => {
  const visibleMetadata = `${exl010.title} ${exl010.subtitle} ${exl010.scoreAlt}`;
  ["pizzicato", "celesta", "bass clarinet", "chromatic", "Andante", "Romantic", "Tchaikovsky"].forEach((term) => {
    assert.doesNotMatch(visibleMetadata, new RegExp(term, "i"));
  });
});

test("short-text questions accept valid precise names and reject broad answers", () => {
  ["pizzicato", "pizz", "plucked", "pizzacato"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 1));
  ["arco", "staccato", "strings", "pizzicato and arco"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 0));
  ["celesta", "celeste", "celseta"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 1));
  ["piano", "glockenspiel", "keyboard", "celesta and piano"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 0));
  ["bass clarinet", "bass clarinet in B-flat", "bass clarinet in Bb"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 1));
  ["clarinet", "bassoon", "oboe", "bass clarinet and bassoon"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 0));
});

test("Q5 awards two distinct valid observations and does not credit pizzicato again", () => {
  assert.equal(marking.markQuestion(question(5), "The strings are soft.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "The strings are soft and quiet.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "They play off-beat quavers in a low register.").marks, 2);
  assert.equal(marking.markQuestion(question(5), "Quavers alternate with rests and the two-bar pattern is repeated.").marks, 2);
  assert.equal(marking.markQuestion(question(5), "They play pizzicato.").marks, 0);
  assert.equal(marking.markQuestion(question(5), "They play pizzicato in a low register.").marks, 1);
  assert.equal(marking.markQuestion(question(5), "They are loud and play legato.").marks, 0);
});

test("multiple-choice questions preserve the supplied option order and correct answers", () => {
  assert.deepEqual(Array.from(question(4).options), ["Chromatic", "Diatonic", "Pentatonic", "Whole-tone"]);
  assert.deepEqual(Array.from(question(6).options), ["Imitation", "Melody and accompaniment", "Monophonic", "Unison"]);
  assert.deepEqual(Array.from(question(7).options), ["Adagio", "Allegro", "Andante", "Presto"]);
  assert.deepEqual(Array.from(question(8).options), ["Baroque period", "Classical period", "Romantic period", "Twentieth Century"]);
  assert.deepEqual(Array.from(question(9).options), ["Johannes Brahms", "Edvard Grieg", "Nikolai Rimsky-Korsakov", "Pyotr Ilyich Tchaikovsky"]);
  [[4, "A"], [6, "B"], [7, "C"], [8, "C"], [9, "D"]].forEach(([number, answer]) => {
    assert.equal(marking.markQuestion(question(number), answer).marks, 1);
  });
  [[4, "B"], [6, "A"], [7, "D"], [8, "D"], [9, "A"]].forEach(([number, answer]) => {
    assert.equal(marking.markQuestion(question(number), answer).marks, 0);
  });
});

test("complete correct and incorrect fixtures score ten and zero", () => {
  assert.equal(score([
    "Pizzicato",
    "Celesta",
    "Bass clarinet",
    "Chromatic",
    "Soft dynamics and off-beat quavers",
    "Melody and accompaniment",
    "Andante",
    "Romantic period",
    "Pyotr Ilyich Tchaikovsky"
  ]), 10);
  assert.equal(score([
    "Arco",
    "Piano",
    "Bassoon",
    "Diatonic",
    "Loud legato playing",
    "Imitation",
    "Presto",
    "Twentieth Century",
    "Johannes Brahms"
  ]), 0);
});

test("EXL010 skill-map CSV contains all nine questions", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL010_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n");
  assert.equal(rows.length, 10);
  exl010.questions.forEach((item) => assert.match(csv, new RegExp(item.id)));
});
