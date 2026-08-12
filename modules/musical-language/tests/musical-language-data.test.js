const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ""; }
    else if (char === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

const csvPath = path.join(__dirname, "../data/EA_Musical_Language_v1.csv");
const questions = parseCsv(fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, ""));

test("question bank preserves the supplied progression", () => {
  assert.equal(questions.length, 128);
  assert.deepEqual([...new Set(questions.map((question) => question.level))].sort(), ["Developing", "Foundation", "Mastering", "Securing"]);
  for (const level of ["Foundation", "Developing", "Securing", "Mastering"]) {
    assert.equal(questions.filter((question) => question.level === level).length, 32);
  }
});

test("active questions contain the fields required by gameplay", () => {
  const active = questions.filter((question) => question.status === "active");
  assert.equal(active.length, 107);
  assert.equal(new Set(questions.map((question) => question.question_id)).size, questions.length);
  active.forEach((question) => {
    assert.ok(question.prompt, `${question.question_id} needs a prompt`);
    assert.ok(question.correct_answer, `${question.question_id} needs a correct answer`);
    assert.ok(Number(question.marks) > 0, `${question.question_id} needs marks`);
    if (question.question_type.startsWith("multiple_choice")) {
      assert.equal(question.options.split(" | ").length, 4, `${question.question_id} needs four options`);
    }
  });
});

test("question type follows level progression", () => {
  const expected = {
    Foundation: "multiple_choice",
    Developing: "multiple_choice_reverse",
    Securing: "short_answer",
    Mastering: "exam_style_short_answer"
  };
  questions.forEach((question) => assert.equal(question.question_type, expected[question.level], question.question_id));
});

test("every vocabulary concept has a supplied PNG marking", () => {
  const concepts = new Map(questions.map((question) => [question.concept_code, question.term]));
  assert.equal(concepts.size, 32);
  for (const [concept, term] of concepts) {
    const filename = `${term.toLowerCase().trim().replace(/\s+/g, "-")}.png`;
    assert.ok(fs.existsSync(path.join(__dirname, "../assets/markings", filename)), `${concept} is missing ${filename}`);
  }
});

test("reverse multiple-choice term options resolve to marking PNGs where available", () => {
  const terms = new Set(questions.map((question) => question.term.toLowerCase()));
  const reverseOptions = questions
    .filter((question) => question.status === "active" && question.question_type === "multiple_choice_reverse")
    .flatMap((question) => question.options.split(" | "));
  assert.equal(reverseOptions.filter((option) => terms.has(option.toLowerCase())).length, 101);
  assert.deepEqual(
    reverseOptions.filter((option) => !terms.has(option.toLowerCase())).sort(),
    ["beat unit", "tie", "time signature"]
  );
});
