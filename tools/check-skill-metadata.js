"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "shared", "data");
const CANONICAL_QUESTION_FIELDS = [
  "question_id",
  "clip_id",
  "musical_element",
  "primary_skill_code",
  "primary_skill_name",
  "secondary_skill_codes",
  "learning_stage",
  "difficulty_band",
  "period",
  "genre",
  "ensemble",
  "metadata_confidence",
  "metadata_review_status"
];
const ENUMS = {
  learning_stage: new Set(["identify", "apply"]),
  difficulty_band: new Set([
    "Foundation",
    "Developing",
    "Securing",
    "Mastering",
    "Exam application",
    "Ungraded"
  ]),
  metadata_confidence: new Set(["high", "medium"]),
  metadata_review_status: new Set(["Tagged", "Review"])
};
const EXL008_EXPECTED = {
  "EXL008-Q01": ["INS.INDIVIDUAL", "INS.ROLE"],
  "EXL008-Q02": ["INS.FAMILY", ""],
  "EXL008-Q03": ["TEX.TYPE", "TEX.ROLE"],
  "EXL008-Q04": ["DYN.LEVEL", ""],
  "EXL008-Q05": ["DYN.LEVEL", "NOT.SCORE_READING"],
  "EXL008-Q06": ["ART.TYPE", ""],
  "EXL008-Q07": ["RHY.TEMPO", ""],
  "EXL008-Q08": ["RHY.TIME_SIGNATURE", "NOT.SCORE_READING"],
  "EXL008-Q09": ["MEL.DIRECTION", "NOT.SCORE_READING"],
  "EXL008-Q10": ["RHY.DEVICE", ""],
  "EXL008-Q11": ["CTX.PERIOD", ""],
  "EXL008-Q12": ["CTX.PERIOD", ""]
};

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseCsv(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const text = fs.readFileSync(filePath, "utf8");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) {
    throw new Error(`${filename}: unterminated quoted field`);
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) {
    throw new Error(`${filename}: CSV is empty`);
  }

  rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  const headers = rows[0];
  if (new Set(headers).size !== headers.length) {
    throw new Error(`${filename}: duplicate CSV header`);
  }

  const records = rows.slice(1).filter((values) => values.some(Boolean)).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(
        `${filename}:${index + 2}: expected ${headers.length} columns, found ${values.length}`
      );
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });

  return { headers, records };
}

function splitSkillCodes(value) {
  return String(value || "")
    .split("|")
    .map((code) => code.trim())
    .filter(Boolean);
}

function main() {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const taxonomy = readJson("skill-taxonomy.json");
  const questionMap = readJson("question-skill-map.json");
  const clipCatalogue = readJson("clip-catalogue.json");
  const examLabExtracts = require(path.join(ROOT, "modules", "exam-lab", "server-data.js"))
    .loadRegistry({ reload: true });
  const taxonomyCsv = parseCsv("skill-taxonomy.csv");
  const questionCsv = parseCsv("question-skill-map.csv");
  const clipCsv = parseCsv("clip-catalogue.csv");
  parseCsv("metadata-review-needed.csv");

  check(Array.isArray(taxonomy.skills), "skill-taxonomy.json: skills must be an array");
  check(
    questionMap.questions && typeof questionMap.questions === "object",
    "question-skill-map.json: questions must be an object"
  );
  check(Array.isArray(clipCatalogue.clips), "clip-catalogue.json: clips must be an array");
  check(taxonomyCsv.records.length > 0, "skill-taxonomy.csv: no records");
  check(clipCsv.records.length > 0, "clip-catalogue.csv: no records");

  const taxonomyByCode = new Map();
  for (const skill of taxonomy.skills || []) {
    const code = String(skill.skill_code || "").trim();
    check(Boolean(code), "skill-taxonomy.json: every skill must have a skill_code");
    check(!taxonomyByCode.has(code), `skill-taxonomy.json: duplicate skill code ${code}`);
    if (code && !taxonomyByCode.has(code)) taxonomyByCode.set(code, skill);
  }

  const csvQuestionById = new Map();
  for (const row of questionCsv.records) {
    const id = String(row.question_id || "").trim();
    check(Boolean(id), "question-skill-map.csv: every row must have a question_id");
    check(!csvQuestionById.has(id), `question-skill-map.csv: duplicate question_id ${id}`);
    if (id && !csvQuestionById.has(id)) csvQuestionById.set(id, row);
  }

  for (const field of CANONICAL_QUESTION_FIELDS) {
    check(
      questionCsv.headers.includes(field),
      `question-skill-map.csv: missing canonical field ${field}`
    );
  }

  const questions = questionMap.questions || {};
  for (const [questionId, metadata] of Object.entries(questions)) {
    check(Boolean(questionId.trim()), "question-skill-map.json: empty question ID");
    check(Boolean(String(metadata.clip_id || "").trim()), `${questionId}: missing clip_id`);

    const primaryCode = String(metadata.primary_skill_code || "").trim();
    const primarySkill = taxonomyByCode.get(primaryCode);
    check(Boolean(primaryCode), `${questionId}: missing primary_skill_code`);
    check(Boolean(primarySkill), `${questionId}: unknown primary skill code ${primaryCode}`);
    for (const secondaryCode of splitSkillCodes(metadata.secondary_skill_codes)) {
      check(
        taxonomyByCode.has(secondaryCode),
        `${questionId}: unknown secondary skill code ${secondaryCode}`
      );
    }
    if (primarySkill) {
      check(
        metadata.primary_skill_name === primarySkill.skill_name,
        `${questionId}: primary skill name disagrees with ${primaryCode}`
      );
      check(
        metadata.musical_element === primarySkill.musical_element,
        `${questionId}: musical element disagrees with ${primaryCode}`
      );
    }

    for (const [field, validValues] of Object.entries(ENUMS)) {
      check(validValues.has(metadata[field]), `${questionId}: invalid ${field} ${metadata[field]}`);
    }

    const csvRecord = csvQuestionById.get(questionId);
    check(Boolean(csvRecord), `${questionId}: missing from question-skill-map.csv`);
    if (csvRecord) {
      for (const field of CANONICAL_QUESTION_FIELDS.filter((name) => name !== "question_id")) {
        check(
          String(csvRecord[field] ?? "") === String(metadata[field] ?? ""),
          `${questionId}: CSV/JSON mismatch for ${field}`
        );
      }
    }
  }

  check(
    csvQuestionById.size === Object.keys(questions).length,
    "question-skill-map.csv and .json contain different question counts"
  );
  const liveExamLabIds = new Set(
    examLabExtracts.flatMap((extract) => extract.questions.map((question) => question.id))
  );
  const mappedExamLabIds = new Set(
    Object.keys(questions).filter((questionId) => /^EXL\d+-Q\d+$/i.test(questionId))
  );
  for (const questionId of liveExamLabIds) {
    check(mappedExamLabIds.has(questionId), `${questionId}: live Exam Lab question has no canonical mapping`);
  }
  for (const questionId of mappedExamLabIds) {
    check(liveExamLabIds.has(questionId), `${questionId}: canonical mapping has no live Exam Lab question`);
  }

  const clipIds = new Set();
  for (const clip of clipCatalogue.clips || []) {
    const clipId = String(clip.clip_id || "").trim();
    check(Boolean(clipId), "clip-catalogue.json: every clip must have a clip_id");
    check(!clipIds.has(clipId), `clip-catalogue.json: duplicate clip_id ${clipId}`);
    if (clipId) clipIds.add(clipId);
    check(
      ENUMS.metadata_confidence.has(clip.metadata_confidence),
      `${clipId || "unknown clip"}: invalid metadata_confidence ${clip.metadata_confidence}`
    );
  }
  const csvClipIds = new Set();
  for (const [index, row] of clipCsv.records.entries()) {
    const clipId = String(row.clip_id || "").trim();
    check(Boolean(clipId), `clip-catalogue.csv:${index + 2}: missing clip_id`);
    check(!csvClipIds.has(clipId), `clip-catalogue.csv: duplicate clip_id ${clipId}`);
    if (clipId) csvClipIds.add(clipId);
  }
  check(csvClipIds.size === clipIds.size, "clip-catalogue.csv and .json contain different clip counts");
  for (const clipId of clipIds) {
    check(csvClipIds.has(clipId), `${clipId}: missing from clip-catalogue.csv`);
  }
  for (const [questionId, metadata] of Object.entries(questions)) {
    check(
      clipIds.has(String(metadata.clip_id || "").trim()),
      `${questionId}: unknown clip_id ${metadata.clip_id || "(blank)"}`
    );
  }

  for (const [questionId, [primaryCode, secondaryCodes]] of Object.entries(EXL008_EXPECTED)) {
    const metadata = questions[questionId];
    check(Boolean(metadata), `${questionId}: expected EXL008 mapping is missing`);
    if (metadata) {
      check(
        metadata.primary_skill_code === primaryCode,
        `${questionId}: expected primary skill ${primaryCode}`
      );
      check(
        metadata.secondary_skill_codes === secondaryCodes,
        `${questionId}: expected secondary skills ${secondaryCodes || "(none)"}`
      );
    }
  }

  if (errors.length) {
    console.error(`Skill metadata validation failed with ${errors.length} error(s):`);
    for (const error of errors.slice(0, 20)) console.error(`- ${error}`);
    if (errors.length > 20) console.error(`- ...and ${errors.length - 20} more`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Skill metadata validation passed: ${taxonomyByCode.size} skills, ` +
      `${Object.keys(questions).length} questions, ${clipIds.size} clips, ` +
      `${Object.keys(EXL008_EXPECTED).length} EXL008 mappings.`
  );
}

try {
  main();
} catch (error) {
  console.error(`Skill metadata validation failed: ${error.message}`);
  process.exitCode = 1;
}
