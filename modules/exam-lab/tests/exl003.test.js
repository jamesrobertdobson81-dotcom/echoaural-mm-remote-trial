"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const moduleRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(moduleRoot, "../..");
const marking = require(path.join(moduleRoot, "marking.js"));

function loadQuestionSets() {
  const context = vm.createContext({ window: {} });
  ["exl001.js", "exl002.js", "exl003.js", "exl004.js", "exl005.js", "exl006.js", "exl007.js", "exl008.js", "exl010.js", "exl011.js", "exl012.js", "exl013.js", "exl014.js", "exl015.js", "exl016.js", "exl017.js", "exl018.js", "exl019.js", "exl020.js", "exl021.js", "exl022.js", "exl023.js"].forEach((file) => {
    const source = fs.readFileSync(path.join(moduleRoot, "data", file), "utf8");
    vm.runInContext(source, context, { filename: file });
  });
  return context.window.EXAM_LAB_QUESTION_SETS;
}

const sets = loadQuestionSets();
const exl003 = sets.EXL003;
const question = (number) => exl003.questions[number - 1];
const score = (answers) => exl003.questions.reduce((total, item, index) => total + marking.markQuestion(item, answers[index]).marks, 0);

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

test("registry and extract selector include EXL001 to EXL008 and EXL010 to EXL023", () => {
  assert.deepEqual(Object.keys(sets).sort(), [
    "EXL001", "EXL002", "EXL003", "EXL004", "EXL005", "EXL006", "EXL007", "EXL008", "EXL010",
    "EXL011", "EXL012", "EXL013", "EXL014", "EXL015", "EXL016", "EXL017", "EXL018",
    "EXL019", "EXL020", "EXL021", "EXL022", "EXL023"
  ]);
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(html, /id="extractSelector"/);
  [
    "EXL001", "EXL002", "EXL003", "EXL004", "EXL005", "EXL006", "EXL007", "EXL008", "EXL010",
    "EXL011", "EXL012", "EXL013", "EXL014", "EXL015", "EXL016", "EXL017", "EXL018",
    "EXL019", "EXL020", "EXL021", "EXL022", "EXL023"
  ].forEach((id) => assert.match(html, new RegExp(`<option value="${id}">${id}</option>`)));
  assert.match(html, /data\/exl023\.js/);
});

test("EXL001 and EXL002 retain their established question sets", () => {
  assert.equal(sets.EXL001.questions.length, 7);
  assert.equal(sets.EXL001.totalMarks, 9);
  assert.equal(sets.EXL002.questions.length, 8);
  assert.equal(sets.EXL002.totalMarks, 9);
  assert.equal(marking.markQuestion(sets.EXL001.questions[3], "perfect fifth").marks, 2);
  assert.equal(marking.markQuestion(sets.EXL002.questions[0], "E major").marks, 1);
});

test("EXL003 packaged assets retain their supplied checksums and dimensions", () => {
  const audio = fs.readFileSync(path.join(moduleRoot, "assets", "EXL003.mp3"));
  const image = fs.readFileSync(path.join(moduleRoot, "assets", "EXL003-skeleton-score.png"));
  assert.equal(crypto.createHash("sha256").update(audio).digest("hex"), "1b9ceb9a644f85ee6b3e17b58f4cafeeb4cb1c9a6485cdecfe50338699f1a7ac");
  assert.equal(crypto.createHash("sha256").update(image).digest("hex"), "6567edc0ebc37e01af83c44b7a4e8780ff8578b18b2e8170f295b08bc0cffc2e");
  assert.equal(image.readUInt32BE(16), 2289);
  assert.equal(image.readUInt32BE(20), 1609);
  assert.equal(exl003.audio, "assets/EXL003.mp3");
  assert.equal(exl003.score, "assets/EXL003-skeleton-score.png");
});

test("EXL003 has exactly eight cards, ten marks, four plays, one score and no lyrics", () => {
  assert.equal(exl003.questions.length, 8);
  assert.equal(exl003.questions.reduce((total, item) => total + item.marks, 0), 10);
  assert.equal(exl003.totalMarks, 10);
  assert.equal(exl003.maxPlays, 4);
  assert.equal(exl003.scoreRequired, true);
  assert.equal(exl003.lyricsRequired, false);
  assert.equal(exl003.questions.some((item) => /cadence/i.test(item.prompt)), false);
});

test("pre-submission labels and score alt text remain neutral", () => {
  const visibleMetadata = `${exl003.title} ${exl003.subtitle} ${exl003.scoreAlt}`;
  ["Edvard Grieg", "Peer Gynt", "Mountain King", "Romantic", "programme", "nineteenth century"].forEach((term) => {
    assert.doesNotMatch(visibleMetadata, new RegExp(term, "i"));
  });
  assert.match(exl003.scoreAlt, /24-bar skeleton score/i);
  assert.doesNotMatch(exl003.scoreAlt, /woodwind|accent|pizzicato|B minor/i);
});

test("Q1 accepts only the approved B minor variants", () => {
  ["B minor", "B min", "Bm", "B minor key"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 1));
  ["B major", "D major", "D minor", "minor", "not B minor"].forEach((answer) => assert.equal(marking.markQuestion(question(1), answer).marks, 0));
});

test("Q2 uses the approved ordered options and marks only Common", () => {
  assert.deepEqual(Array.from(question(2).options), ["Simple Duple", "Common", "Compound", "Irregular"]);
  question(2).options.forEach((answer) => assert.equal(marking.markQuestion(question(2), answer).marks, answer === "Common" ? 1 : 0));
});

test("Q3 is written and accepts controlled misspellings of Pizzicato", () => {
  assert.equal(question(3).responseType, "short-text");
  ["Pizzicato", "pizzacato", "pizzicatto", "pizzcato", "pizzicatoo"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 1));
  ["Arco", "Tremolo", "Glissando", "pizza", "not pizzacato"].forEach((answer) => assert.equal(marking.markQuestion(question(3), answer).marks, 0));
});

test("Q4 accepts accent variants, rejects unrelated terms and handles negation", () => {
  ["accent", "accents", "accented", "accented notes", "accent marks", "strongly accented"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 1));
  ["staccato", "legato", "slur", "slurred", "pizzicato", "tremolo", "glissando", "marcato", "the music is not accented", "the music isn't accented"].forEach((answer) => assert.equal(marking.markQuestion(question(4), answer).marks, 0));
});

test("Q5 accepts woodwind-family responses and rejects instruments and negation", () => {
  ["woodwind", "woodwinds", "woodwind family", "the woodwind", "the woodwind family", "woodwind instruments"].forEach((answer) => assert.equal(marking.markQuestion(question(5), answer).marks, 1));
  ["wind instruments", "bassoon", "flute", "clarinet", "oboe", "brass", "strings", "percussion", "orchestra", "not woodwind"].forEach((answer) => assert.equal(marking.markQuestion(question(5), answer).marks, 0));
});

test("Q6 awards independent tempo and dynamics points without duplicates", () => {
  assert.equal(marking.markQuestion(question(6), "It becomes more dramatic and exciting.").marks, 0);
  assert.equal(marking.markQuestion(question(6), "It gets slower and louder.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It gets faster but quieter.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It accelerates and crescendos.").marks, 2);
  assert.equal(marking.markQuestion(question(6), "It gets faster, accelerates and speeds up.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It does not get faster and it does not become louder.").marks, 0);
  assert.equal(marking.markQuestion(question(6), "It does not get faster but becomes louder.").marks, 1);
  assert.equal(marking.markQuestion(question(6), "It doesn't get faster but becomes louder.").marks, 1);
});

test("Q7 marks only Romantic", () => {
  assert.deepEqual(Array.from(question(7).options), ["Baroque", "Classical", "Romantic", "Modern"]);
  question(7).options.forEach((answer) => assert.equal(marking.markQuestion(question(7), answer).marks, answer === "Romantic" ? 1 : 0));
});

test("Q8 refers to Question 7 and awards distinct musical evidence only", () => {
  assert.equal(question(8).prompt, "Give two musical reasons for your answer to Question 7.");
  assert.equal(marking.markQuestion(question(8), "It is Romantic.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "Grieg was a Romantic composer in the nineteenth century.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "It tells a story and is programme music.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "There is a crescendo and it becomes louder.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "It accelerates and gets faster.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "More instruments join and the orchestra becomes fuller.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "There is no crescendo and it does not get faster.").marks, 0);
  assert.equal(marking.markQuestion(question(8), "The orchestration is colourful.").marks, 1);
  assert.equal(marking.markQuestion(question(8), "The repeated melody builds tension and the music moves into a higher register.").marks, 2);
  assert.equal(marking.markQuestion(question(8), "Changing instrumental colours create atmosphere and there is a large crescendo.").marks, 2);
  assert.equal(marking.markQuestion(question(8), "The music grows louder and faster.").marks, 2);
});

test("all-correct and all-incorrect EXL003 submissions total 10/10 and 0/10", () => {
  const correctAnswers = [
    "Bm",
    "Common",
    "Pizzicato",
    "accented notes",
    "woodwind family",
    "It accelerates and becomes louder.",
    "Romantic",
    "Colourful orchestration and a movement into a higher register."
  ];
  const incorrectAnswers = [
    "B major",
    "Simple Duple",
    "Arco",
    "legato",
    "flute",
    "It becomes slower and quieter.",
    "Classical",
    "It is from Peer Gynt."
  ];
  assert.equal(score(correctAnswers), 10);
  assert.equal(score(incorrectAnswers), 0);
});

test("shared UI keeps four-play enforcement, feedback gating, locking, retry, storage and completion event", () => {
  const script = fs.readFileSync(path.join(moduleRoot, "script.js"), "utf8");
  const html = fs.readFileSync(path.join(moduleRoot, "index.html"), "utf8");
  assert.match(script, /state\.playsUsed >= set\.maxPlays/);
  assert.match(script, /state\.playsUsed \+= 1/);
  assert.equal((script.match(/playsUsed:\s*0/g) || []).length, 1);
  assert.match(script, /class="question-feedback" id="feedback-\$\{q\.id\}" hidden/);
  assert.match(script, /querySelectorAll\("input, textarea"\).*field\.disabled = true/);
  assert.match(script, /function retry\(\)/);
  assert.match(script, /ea\.examLab\.results\.v1/);
  assert.match(script, /new CustomEvent\("examlab:completed", \{ detail: state\.lastResult \}\)/);
  assert.match(script, /questionSetId: set\.id/);
  assert.match(script, /maxScore: marked\.maximumScore/);
});

test("CSV mapping contains all eight questions and only requirement IDs already used by Exam Lab", () => {
  const csv = fs.readFileSync(path.join(moduleRoot, "ExamLab_EXL003_Cambridge_Skill_Map.csv"), "utf8");
  const rows = csv.trim().split("\n").map(parseCsvRow);
  assert.equal(rows.length, 9);
  rows.forEach((row) => assert.equal(row.length, rows[0].length));
  assert.equal(rows[0].length, 13);
  exl003.questions.forEach((item) => assert.match(csv, new RegExp(item.id)));
  const existingIds = new Set(
    [...sets.EXL001.questions, ...sets.EXL002.questions]
      .flatMap((item) => item.cambridgeRequirements)
      .concat(sets.EXL001.overarchingRequirements, sets.EXL002.overarchingRequirements)
  );
  exl003.questions.flatMap((item) => item.cambridgeRequirements).concat(exl003.overarchingRequirements).forEach((id) => assert.equal(existingIds.has(id), true, `${id} is not used by an existing Exam Lab set`));
});

test("removed question and stale numbering do not remain", () => {
  const files = ["index.html", "script.js", "data/exl003.js", "ExamLab_EXL003_Cambridge_Skill_Map.csv"]
    .map((file) => fs.readFileSync(path.join(moduleRoot, file), "utf8"))
    .join("\n");
  assert.equal(exl003.questions.some((item) => item.id === "EXL003-Q04"), false);
  assert.doesNotMatch(files, /EXL003-Q04/);
  assert.match(files, /EXL003-Q09[^\n]*Question 7/);
});
