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
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl006.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl006.js" });
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

const exl006 = loadQuestionSet();
const question = (number) => exl006.questions[number - 1];
const score = (answers) => exl006.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL006 packages the supplied score and matching audio extract", () => {
  const packagedAudio = fs.readFileSync(path.join(moduleRoot, "assets", "EXL006.mp3"));
  const packagedScore = fs.readFileSync(path.join(moduleRoot, "assets", "EXL006-skeleton-score.png"));
  assert.equal(crypto.createHash("sha256").update(packagedAudio).digest("hex"), "90b35b1a17eea0ca0f7aab361c230267583fe56827057a9c0ab68a2d2af8f80f");
  assert.equal(crypto.createHash("sha256").update(packagedScore).digest("hex"), "a73cc7dd96271c4b6381d13353408220e4ee58dab45c979b90c066e40c46a4e4");
  assert.equal(packagedScore.readUInt32BE(16), 2289);
  assert.equal(packagedScore.readUInt32BE(20), 1653);
  assert.equal(exl006.audio, "assets/EXL006.mp3");
  assert.equal(exl006.score, "assets/EXL006-skeleton-score.png");
});

test("EXL006 has eight questions, ten marks, four plays and a skeleton score", () => {
  assert.equal(exl006.questions.length, 8);
  assert.equal(exl006.questions.reduce((total, item) => total + item.marks, 0), 10);
  assert.equal(exl006.totalMarks, 10);
  assert.equal(exl006.maxPlays, 4);
  assert.equal(exl006.scoreRequired, true);
  assert.equal(exl006.lyricsRequired, false);
  assert.deepEqual(Array.from(exl006.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("pre-submission labels and score alt text do not reveal assessed answers", () => {
  const visibleMetadata = `${exl006.title} ${exl006.subtitle} ${exl006.scoreAlt}`;
  ["Mozart", "Symphony No. 36", "Menuetto", "Minuet", "C major", "perfect cadence", "trill", "3/4"].forEach((term) => {
    assert.doesNotMatch(visibleMetadata, new RegExp(term, "i"));
  });
});

test("Q1 accepts the time signature but not a generic metre description", () => {
  ["3/4", "three-four", "three four", "three-four time"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 1));
  ["triple metre", "6/8", "3/8", "not 3/4"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 0));
});

test("Q2 accepts approved anacrusis variants and rejects unrelated features", () => {
  ["anacrusis", "upbeat", "up-beat", "pickup", "pick-up note"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 1));
  ["syncopation", "anticipation", "appoggiatura", "incomplete bar", "not an anacrusis"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 0));
});

test("Q3 presents the supplied ornaments and marks only Trill", () => {
  assert.deepEqual(Array.from(question(3).options), ["Appoggiatura", "Mordent", "Trill", "Turn"]);
  question(3).options.forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, answer === "Trill" ? 1 : 0));
});

test("Q4 requires a sudden or otherwise approved loud-to-soft change", () => {
  ["The music suddenly becomes quieter", "forte to piano", "loud to soft", "a sudden decrease in dynamics", "it becomes much quieter", "subito piano"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 1));
  ["diminuendo", "gradually becomes quieter", "the tempo becomes slower", "the texture becomes thinner"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 0));
});

test("Q5 uses four complete notated options and a stable answer ID", () => {
  assert.equal(question(5).responseType, "rhythm-choice");
  assert.equal(question(5).options.length, 4);
  question(5).options.forEach((option) => assert.equal(option.pattern.length, 3));
  assert.deepEqual(Array.from(question(5).options[0].pattern), ["q-ss", "crotchet", "dq-s"]);
  assert.deepEqual(Array.from(question(5).options[1].pattern), ["ssss", "crotchet", "dq-s"]);
  assert.deepEqual(Array.from(question(5).options[2].pattern), ["q-ss", "qq", "dq-s"]);
  assert.deepEqual(Array.from(question(5).options[3].pattern), ["dq-s", "crotchet", "q-ss"]);
  question(5).options.forEach((option) => assert.equal(marking.markQuestion(question(5), option.id).marks, option.id === "correct" ? 1 : 0));
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(script, /Math\.random\(\)/);
  assert.match(script, /String\.fromCharCode\(65 \+ index\)/);
});

test("Q6 awards one mark each for C major and a perfect cadence", () => {
  assert.equal(marking.markQuestion(question(6), "C major; perfect cadence").marks, 2);
  assert.equal(marking.markQuestion(question(6), "C major").marks, 1);
  assert.equal(marking.markQuestion(question(6), "V-I").marks, 1);
  assert.equal(marking.markQuestion(question(6), "C major; dominant to tonic").marks, 2);
  assert.equal(marking.markQuestion(question(6), "C major; authentic cadence").marks, 1);
  assert.equal(marking.markQuestion(question(6), "G major; imperfect cadence").marks, 0);
});

test("Q7 uses the supplied movement options and approved Minuet variants", () => {
  assert.deepEqual(Array.from(question(7).options), ["Cadenza", "Minuet", "Rondo", "Theme and variations"]);
  ["Minuet", "menuet", "menuetto"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 1));
  ["trio", "waltz", "scherzo", "ternary form"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 0));
});

test("Q8 awards two distinct reasons and enforces duplicate groups", () => {
  assert.equal(marking.markQuestion(question(8), question(8).modelAnswer).marks, 2);
  assert.equal(marking.markQuestion(question(8), "The metre is 3/4 with three beats in each bar.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "The phrases are balanced and symmetrical.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "There is a steady pulse and a regular dance pulse.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "There are clear cadences and phrases end with cadences.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "There is a strong first beat and a stately tempo.").marks, 2);
  assert.equal(marking.markQuestion(question(8), "It is by Mozart and the score says Menuetto.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "It comes from a symphony and sounds Classical.").marks, 0);
});

test("all-correct and all-incorrect EXL006 submissions total 10/10 and 0/10", () => {
  const correctAnswers = ["3/4", "anacrusis", "Trill", "forte to piano", "correct", "C major; perfect cadence", "Minuet", "Triple metre and balanced phrases."];
  const incorrectAnswers = ["6/8", "syncopation", "Turn", "diminuendo", "distractor-1", "G major; imperfect cadence", "Rondo", "It is by Mozart and sounds Classical."];
  assert.equal(score(correctAnswers), 10);
  assert.equal(score(incorrectAnswers), 0);
});

test("EXL006 remains available in the standalone selector and masks supplied score giveaways", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  assert.match(html, /<option value="EXL006">EXL006<\/option>/);
  assert.match(html, /data\/exl006\.js/);
  assert.equal(exl006.scoreMasks.some((mask) => mask.type === "plain"), false);
  assert.equal(exl006.scoreMasks.some((mask) => mask.type === "blank-stave"), true);
  assert.match(script, /renderScoreMasks/);
});

test("the bar 22 blank stave aligns only with the existing five staff lines", () => {
  const blank = exl006.scoreMasks.find((mask) => mask.type === "blank-stave");
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  const imageWidth = 2289;
  const imageHeight = 1653;
  const renderedStaffLines = [31, 43, 55, 67, 79].map((position) => (
    (blank.top / 100 * imageHeight) + (position / 100 * blank.height / 100 * imageHeight)
  ));
  const originalStaffLines = [1199, 1220, 1241, 1262, 1283];
  renderedStaffLines.forEach((line, index) => assert.ok(Math.abs(line - originalStaffLines[index]) < 0.05));
  assert.ok((blank.left + blank.width) / 100 * imageWidth < 576, "the original right-hand barline remains untouched");
  assert.ok((blank.top + blank.height) / 100 * imageHeight < 1320, "the mask does not reach the following system");
  assert.doesNotMatch(script, /score-mask-barline/);
});

test("EXL006 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL006_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n").map(parseCsvRow);
  assert.equal(rows.length, 9);
  rows.forEach((row) => assert.equal(row.length, 13));
  exl006.questions.forEach((item, index) => {
    assert.equal(rows[index + 1][1], item.id);
    assert.equal(Number(rows[index + 1][2]), item.number);
    assert.equal(rows[index + 1][3], item.prompt);
    assert.equal(Number(rows[index + 1][4]), item.marks);
  });
});
