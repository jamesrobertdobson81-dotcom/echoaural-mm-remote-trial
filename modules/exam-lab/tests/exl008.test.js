"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const moduleRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(moduleRoot, "../..");
const desktopRoot = path.resolve(projectRoot, "..");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSet() {
  const context = vm.createContext({ window: {} });
  const source = fs.readFileSync(path.join(moduleRoot, "data", "exl008.js"), "utf8");
  vm.runInContext(source, context, { filename: "exl008.js" });
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

const exl008 = loadQuestionSet();
const question = (number) => exl008.questions[number - 1];
const score = (answers) => exl008.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

test("EXL008 packages the supplied longer extract and skeleton score", () => {
  const packagedAudio = fs.readFileSync(path.join(moduleRoot, "assets", "EXL008.mp3"));
  const suppliedAudio = fs.readFileSync(path.join(desktopRoot, "EXL008.mp3"));
  const packagedScore = fs.readFileSync(path.join(moduleRoot, "assets", "EXL008-skeleton-score.png"));
  const suppliedScore = fs.readFileSync(path.join(desktopRoot, "EXL008.png"));
  assert.deepEqual(packagedAudio, suppliedAudio);
  assert.deepEqual(packagedScore, suppliedScore);
  assert.equal(crypto.createHash("sha256").update(packagedAudio).digest("hex"), "69d95004f01a154ca49b2852b67d5ebc9c5a561bd754d317bd15cc7a46712ff2");
  assert.equal(crypto.createHash("sha256").update(packagedScore).digest("hex"), "501df4df4d31e2082c029bb1506833e158d27a6efc6c291ec123e059744139bf");
  assert.equal(packagedScore.readUInt32BE(16), 2289);
  assert.equal(packagedScore.readUInt32BE(20), 916);
  assert.equal(exl008.audio, "assets/EXL008.mp3");
  assert.equal(exl008.score, "assets/EXL008-skeleton-score.png");
});

test("EXL008 has twelve one-mark questions, four plays and a skeleton score", () => {
  assert.equal(exl008.questions.length, 12);
  assert.equal(exl008.questions.reduce((total, item) => total + item.marks, 0), 12);
  assert.equal(exl008.totalMarks, 12);
  assert.equal(exl008.maxPlays, 4);
  assert.equal(exl008.scoreRequired, true);
  assert.equal(exl008.lyricsRequired, false);
  assert.deepEqual(Array.from(exl008.questions, (item) => item.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("pre-submission labels and score alt text do not reveal assessed answers", () => {
  const visibleMetadata = `${exl008.title} ${exl008.subtitle} ${exl008.scoreAlt}`;
  ["Beethoven", "Symphony No. 8", "Allegretto", "violin", "woodwind", "homophonic", "staccato", "2/4", "ostinato", "Classical"].forEach((term) => {
    assert.doesNotMatch(visibleMetadata, new RegExp(term, "i"));
  });
});

test("Q1 accepts violin variants but not broad or contradictory responses", () => {
  ["violin", "violins", "first violin", "first violins", "violin section", "viollin"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 1));
  ["strings", "string family", "viola", "cello", "woodwind", "violin and viola", "not violin"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 0));
});

test("Q2 requires the woodwind family and handles the horn wording", () => {
  ["woodwind", "woodwinds", "woodwind family", "wind instruments", "woodwind and horns", "winds and horns", "woodind"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 1));
  ["strings", "brass", "horns", "percussion", "woodwind and strings", "not woodwind"].forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, 0));
});

test("Q3 accepts homophony descriptions and rejects other textures", () => {
  ["homophonic", "homophnic", "melody and accompaniment", "melody with accompaniment", "accompanied melody", "a melody accompanied by chords", "one main melody with accompaniment"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 1));
  ["polyphonic", "contrapuntal", "monophonic", "unison", "heterophonic", "homophonic and polyphonic"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 0));
});

test("Q4 uses complete normalised responses for the opening dynamic", () => {
  ["piano", "p", "soft", "softly", "quiet", "quietly", " P. "].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 1));
  ["mezzo piano", "forte", "fortissimo", "mezzo forte", "loud", "p and forte", "not p"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 0));
});

test("Q5 marks only sfz for the dynamic at bar 9", () => {
  assert.deepEqual(Array.from(question(5).options), ["ff", "sfz", "cresc.", "mf"]);
  ["B", "sfz"].forEach((answer) => assert.equal(marking.markQuestion(question(5), answer).marks, 1));
  ["A", "C", "D", "ff", "cresc.", "mf", "not sfz"].forEach((answer) => assert.equal(marking.markQuestion(question(5), answer).marks, 0));
});

test("Q6 accepts staccato descriptions and rejects sustained articulation", () => {
  ["staccato", "stacato", "detached", "short and detached", "short notes", "separated", "crisply articulated"].forEach((answer) => assert.equal(marking.markQuestion(question(6), answer).marks, 1));
  ["legato", "tenuto", "smooth", "sustained", "slurred", "staccato and legato"].forEach((answer) => assert.equal(marking.markQuestion(question(6), answer).marks, 0));
});

test("Q7 marks only option B, Allegretto", () => {
  assert.deepEqual(Array.from(question(7).options), ["Allegro", "Allegretto", "Largo", "Presto"]);
  ["B", "Allegretto"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 1));
  ["A", "C", "D", "Allegro", "Largo", "Presto", "not Allegretto"].forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, 0));
});

test("Q8 accepts only precise 2/4 variants", () => {
  ["2/4", "two four", "two-four"].forEach((answer) => assert.equal(marking.markQuestion(question(8), answer).marks, 1));
  ["4/4", "3/4", "6/8", "duple", "simple duple", "compound duple", "two beats in a bar", "2/4 and 4/4"].forEach((answer) => assert.equal(marking.markQuestion(question(8), answer).marks, 0));
});

test("Q9 marks only option A, step", () => {
  assert.deepEqual(Array.from(question(9).options), ["step", "leap", "arpeggio", "chromatic movement"]);
  ["A", "step"].forEach((answer) => assert.equal(marking.markQuestion(question(9), answer).marks, 1));
  ["B", "C", "D", "leap", "arpeggio", "chromatic movement", "step and leap"].forEach((answer) => assert.equal(marking.markQuestion(question(9), answer).marks, 0));
});

test("Q10 accepts ostinato descriptions and rejects unrelated features", () => {
  ["ostinato", "ostinatto", "rhythmic ostinato", "repeated rhythmic pattern", "repeated rhythm", "ticking pattern", "metronomic rhythm", "repeated chords", "repeated staccato chords"].forEach((answer) => assert.equal(marking.markQuestion(question(10), answer).marks, 1));
  ["sequence", "canon", "imitation", "pedal", "drone", "syncopation", "ostinato and sequence"].forEach((answer) => assert.equal(marking.markQuestion(question(10), answer).marks, 0));
});

test("Q11 uses complete normalised responses for the Classical period", () => {
  ["classical", "classcal", "Classical period", "Classical era", "late Classical", "Viennese Classical"].forEach((answer) => assert.equal(marking.markQuestion(question(11), answer).marks, 1));
  ["Baroque", "Romantic", "twentieth century", "modern", "Renaissance", "Beethoven", "Classical and Romantic", "not Classical"].forEach((answer) => assert.equal(marking.markQuestion(question(11), answer).marks, 0));
});

test("Q12 marks only option A, Beethoven", () => {
  assert.deepEqual(Array.from(question(12).options), ["Ludwig van Beethoven", "Joseph Haydn", "Michael Tippett", "Johann Sebastian Bach"]);
  ["A", "Beethoven", "Ludwig van Beethoven"].forEach((answer) => assert.equal(marking.markQuestion(question(12), answer).marks, 1));
  ["B", "C", "D", "Joseph Haydn", "Michael Tippett", "Johann Sebastian Bach", "not Beethoven"].forEach((answer) => assert.equal(marking.markQuestion(question(12), answer).marks, 0));
});

test("all-correct and all-incorrect EXL008 submissions total 12/12 and 0/12", () => {
  const correctAnswers = ["violin", "woodwind", "homophonic", "p", "sfz", "staccato", "Allegretto", "2/4", "step", "ostinato", "Classical", "Beethoven"];
  const incorrectAnswers = ["strings", "horns", "polyphonic", "forte", "ff", "legato", "Presto", "4/4", "leap", "sequence", "Romantic", "Bach"];
  assert.equal(score(correctAnswers), 12);
  assert.equal(score(incorrectAnswers), 0);
});

test("EXL008 is the default standalone extract and is available in the selector", () => {
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(html, /<option value="EXL008">EXL008<\/option>/);
  assert.match(html, /data\/exl008\.js/);
  assert.match(html, /<link rel="preload" href="assets\/EXL008\.mp3"/);
  assert.match(html, /<span id="extractIdBadge">EXL008<\/span>/);
  assert.match(html, /<span id="extractMarksBadge">12 marks<\/span>/);
  assert.match(html, /<strong id="answerCount">0\/12<\/strong>/);
});

test("EXL008 CSV has one valid 13-column row per question", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL008_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n").map(parseCsvRow);
  assert.equal(rows.length, 13);
  rows.forEach((row) => assert.equal(row.length, 13));
  exl008.questions.forEach((item, index) => {
    assert.equal(rows[index + 1][1], item.id);
    assert.equal(Number(rows[index + 1][2]), item.number);
    assert.equal(rows[index + 1][3], item.prompt);
    assert.equal(Number(rows[index + 1][4]), item.marks);
  });
});
