const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const jsonPath = path.join(root, "modules/melody-master/data/melody-master-melodic-devices-50.json");
const csvPath = path.join(root, "modules/melody-master/data/melody-master-melodic-devices-50.csv");
const iiPath = path.join(root, "modules/melody-master/review-ii-candidates.json");
const bank = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const iiById = new Map(JSON.parse(fs.readFileSync(iiPath, "utf8")).questions.map((question) => [question.id, question]));

const keepIds = new Set([
  "MDV001", "MDV002", "MDV004", "MDV005", "MDV006", "MDV008", "MDV011", "MDV013", "MDV016", "MDV018", "MDV020",
  "MDV023", "MDV025", "MDV026", "MDV027", "MDV028", "MDV029", "MDV030", "MDV033", "MDV037", "MDV038", "MDV039", "MDV040"
]);

const mc = (question, answer, choices, level, feedback) => ({
  ...question,
  question: "Which option best describes the melody in this extract?",
  correctAnswer: answer,
  acceptedAnswers: [answer],
  choices,
  marks: 1,
  responseType: "Multiple choice",
  ...(level ? { level } : {}),
  feedback
});

const reviewed = {
  MDV001: (question) => ({
    ...question,
    question: "Describe the movement of the melody in this extract. (2)",
    choices: [],
    correctAnswer: "It begins with broken-chord or arpeggio movement, then moves by step in a scale.",
    acceptedAnswers: ["broken chord then scale", "arpeggio then scalic", "triadic then stepwise"],
    marks: 2,
    responseType: "Written response",
    level: "Mastering",
    markPoints: [
      { label: "Opening", acceptedAnswers: ["broken chord", "broken-chord", "arpeggio", "arpeggiated", "triadic", "notes of a chord"] },
      { label: "Later movement", acceptedAnswers: ["scale", "scalic", "by step", "stepwise", "conjunct", "consecutive notes"] }
    ],
    feedback: "The opening outlines a chord; the later melody moves by step through a scale."
  }),
  MDV002: (question) => mc(question, "Sequence", ["Sequence", "Ostinato", "Imitation", "Repetition"], "Developing", "A melodic idea is repeated starting on a different pitch."),
  MDV004: (question) => question,
  MDV005: (question) => mc(question, "In leaps", ["In leaps", "By step", "Scalic", "Ostinato"], question.level, "The melody moves mainly in leaps, creating a disjunct outline."),
  MDV006: (question) => question,
  MDV008: (question) => mc(question, "Ascending", ["Ascending", "Descending", "Scalic", "Static"], "Foundation", "The melody moves upwards in pitch."),
  MDV011: (question) => question,
  MDV013: (question) => mc(question, "Descending sequence", ["Descending sequence", "Ascending sequence", "Ostinato", "Imitation"], "Securing", "The repeated melodic pattern begins successively lower in pitch."),
  MDV016: (question) => mc(question, "Ascending", ["Ascending", "Descending", "Ostinato", "Static"], question.level, "The melody moves upwards in pitch; there is no clear ostinato."),
  MDV018: (question) => mc({ ...question, question: "Identify the melodic device used at the start of the extract." }, "Ostinato", ["Ostinato", "Sequence", "Imitation", "Repetition"], question.level, "A short melodic pattern is repeated persistently at the start."),
  MDV020: (question) => mc(question, "Ostinato", ["Ostinato", "Sequence", "Imitation", "Repetition"], "Securing", "A short melodic pattern is repeated persistently."),
  MDV023: (question) => mc({ ...question, clipStartSeconds: "8", clipEndSeconds: "19", clipDurationSeconds: "11" }, "Ostinato", ["Ostinato", "Sequence", "Imitation", "Repetition"], "Securing", "A short melodic pattern is repeated persistently after the opening gesture."),
  MDV025: (question) => mc(question, "In leaps", ["In leaps", "By step", "Scalic", "Ostinato"], "Securing", "The melody moves mainly in leaps, creating a disjunct outline."),
  MDV026: (question) => question,
  MDV027: (question) => mc(question, "Scalic", ["Scalic", "Broken chord", "Chromatic", "In leaps"], question.level, "The melody moves mainly by step through the notes of a scale."),
  MDV028: (question) => mc(question, "Scalic", ["Scalic", "Broken chord", "Repetition", "Imitation"], "Developing", "The melody moves mainly by step through the notes of a scale."),
  MDV029: (question) => question,
  MDV030: (question) => question,
  MDV033: (question) => question,
  MDV037: (question) => mc(question, "Ascending sequence", ["Ascending sequence", "Descending sequence", "Ostinato", "Imitation"], question.level, "The melodic idea is repeated successively higher in pitch."),
  MDV038: (question) => question,
  MDV039: (question) => mc(question, "Broken chord", ["Broken chord", "Scalic", "Repetition", "Imitation"], question.level, "The melody outlines the notes of chords one after another."),
  MDV040: (question) => ({ ...question, level: "Foundation" })
};

const questions = bank.questions.filter((question) => keepIds.has(question.id)).map((question) => reviewed[question.id](question));
if (!questions.some((question) => question.id === "MDV023")) {
  questions.push({
    id: "MDV023",
    audioId: "MDA023",
    audio: "audio/melodic-devices/MDA023.mp3",
    sourceId: "MTR015",
    mode: "melodic_device_recognition",
    category: "Melodic device",
    question: "Which option best describes the melody in this extract?",
    choices: ["Ostinato", "Sequence", "Imitation", "Repetition"],
    correctAnswer: "Ostinato",
    acceptedAnswers: ["Ostinato"],
    marks: 1,
    responseType: "Multiple choice",
    feedback: "A short melodic pattern is repeated persistently after the opening gesture.",
    level: "Securing",
    composer: "Edvard Grieg",
    work: "Peer Gynt Suite No. 1, Op. 46",
    movement: "III. Anitra’s Dance",
    performer: "Musopen Symphony Orchestra",
    instrumentation: "",
    sourceProvider: "Musopen Collection hosted by Internet Archive",
    licenceType: "Public Domain Mark 1.0 / Musopen public-domain recording collection",
    rightsNote: "Public-domain recording from the Musopen Collection hosted by Internet Archive.",
    diagnosticTags: "Ostinato after the opening triangle gesture",
    sourceGroup: "Musopen Collection hosted by Internet Archive",
    clarityConfidence: "Reviewed",
    closestGcseBoards: "Cambridge IGCSE",
    clipStartSeconds: "8",
    clipEndSeconds: "19",
    clipDurationSeconds: "11",
    buildStatus: "MP3 bundled",
    finalListeningReview: "Reviewed and recut for the ostinato on 2026-08-06."
  });
}
if (!questions.some((question) => question.id === "MDV034")) {
  questions.push({
    id: "MDV034",
    audioId: "MDA034",
    audio: "audio/melodic-devices/MDA034.mp3",
    sourceId: "MTR026",
    mode: "melodic_device_recognition",
    category: "Melody",
    question: "Which option best describes the melody in this extract?",
    choices: ["Chromatic", "Melismatic", "Triadic", "Pentatonic"],
    correctAnswer: "Chromatic",
    acceptedAnswers: ["Chromatic"],
    marks: 1,
    responseType: "Multiple choice",
    feedback: "The melody includes notes outside the prevailing diatonic scale, producing chromatic movement.",
    level: "Securing",
    composer: "Wolfgang Amadeus Mozart",
    work: "Symphony No. 40 in G minor, K. 550",
    movement: "II. Andante",
    performer: "Musopen Symphony Orchestra",
    instrumentation: "Orchestra",
    sourceProvider: "Musopen Collection hosted by Internet Archive",
    licenceType: "Public Domain Mark 1.0 / Musopen public-domain recording collection",
    rightsNote: "Public-domain recording from the Musopen Collection hosted by Internet Archive.",
    diagnosticTags: "Chromatic melodic movement",
    sourceGroup: "Musopen Collection hosted by Internet Archive",
    clarityConfidence: "Teacher reviewed",
    closestGcseBoards: "Cambridge IGCSE",
    clipStartSeconds: "0",
    clipEndSeconds: "11",
    clipDurationSeconds: "11",
    buildStatus: "MP3 bundled",
    finalListeningReview: "Restored and answer choices revised on 2026-08-06."
  });
}

const iiSpecs = [
  ["II225", "MDA041", "Developing", "Trill", "ornament", "mc"],
  ["II335", "MDA042", "Securing", "Descending sequence", "sequence", "written"],
  ["II340", "MDA043", "Securing", "Ascending sequence", "sequence", "written"],
  ["II341", "MDA044", "Securing", "Descending sequence", "sequence", "written"],
  ["II344", "MDA045", "Securing", "Descending sequence", "sequence", "written"],
  ["II352", "MDA046", "Securing", "Descending sequence", "sequence", "written"],
  ["II355", "MDA047", "Securing", "Descending sequence", "sequence", "mc"],
  ["II356", "MDA048", "Developing", "Trill", "ornament", "mc"],
  ["II359", "MDA049", "Developing", "Descending sequence", "sequence", "mc"],
  ["II366", "MDA050", "Developing", "Ascending sequence", "sequence", "mc"],
  ["II367", "MDA051", "Developing", "Descending sequence", "sequence", "mc"],
  ["II369", "MDA052", "Securing", "Descending sequence", "sequence", "mc"],
  ["II370", "MDA053", "Securing", "Descending sequence", "sequence", "written"]
];

for (const [sourceId, audioId, level, answer, category, type] of iiSpecs) {
  const source = iiById.get(sourceId);
  const isSequence = category === "sequence";
  const isWritten = type === "written";
  questions.push({
    id: `MDV${audioId.slice(3)}`,
    audioId,
    audio: `audio/melodic-devices/${audioId}.mp3`,
    sourceId,
    mode: "melodic_device_recognition",
    category: isSequence ? "Melodic device" : "Ornament",
    question: isWritten
      ? "Describe the melodic device used in this extract. (2)"
      : isSequence
        ? "Which melodic device is most clearly used in this extract?"
        : "Identify the ornament used in this extract.",
    choices: isWritten ? [] : isSequence
      ? [answer, answer.startsWith("Ascending") ? "Descending sequence" : "Ascending sequence", "Ostinato", "Imitation"]
      : ["Trill", "Mordent", "Turn", "Acciaccatura"],
    correctAnswer: answer,
    acceptedAnswers: [answer],
    marks: isWritten ? 2 : 1,
    responseType: isWritten ? "Written response" : "Multiple choice",
    ...(isWritten ? { markPoints: [
      { label: "Direction", acceptedAnswers: [answer.split(" ")[0].toLowerCase(), `${answer.split(" ")[0].toLowerCase()} movement`, `moves ${answer.startsWith("Ascending") ? "up" : "down"}`] },
      { label: "Device", acceptedAnswers: ["sequence", "sequential", "pattern repeated at different pitches", "repeated at a different pitch"] }
    ] } : {}),
    feedback: isSequence
      ? `The melodic pattern is repeated at different pitch levels, moving ${answer.startsWith("Ascending") ? "upwards" : "downwards"}.`
      : "A rapid alternation between the main note and the note above creates a trill.",
    level,
    composer: source.composer,
    work: source.work,
    movement: "",
    performer: "",
    instrumentation: source.instrument,
    sourceProvider: source.source,
    licenceType: source.rights,
    rightsNote: `Recovered from Instrument Identifier ${sourceId}; ${source.source}; rights: ${source.rights}.`,
    diagnosticTags: answer,
    sourceGroup: "Reviewed Instrument Identifier melodic-device tag",
    clarityConfidence: "Reviewed",
    closestGcseBoards: "Cambridge IGCSE",
    buildStatus: "MP3 bundled",
    finalListeningReview: "Approved in MM Devices review on 2026-08-06."
  });
}

bank.pack = "EchoAural Melody Master – Reviewed Cambridge Melodic Devices Bank";
bank.questionCount = questions.length;
bank.sourceQuestionCount = 50;
bank.audioClipCount = questions.length;
bank.omittedAudioIds = [];
bank.omittedReason = "Candidates excluded by the completed MM Devices review are not served to students.";
bank.responseType = "Multiple choice and written response";
bank.sourceNote = "Parsed from the completed MM Devices review. Only aurally approved, Cambridge-relevant melodic concepts are included.";
bank.questions = questions;
fs.writeFileSync(jsonPath, `${JSON.stringify(bank, null, 2)}\n`);

const headers = ["Question ID", "Audio ID", "Audio Path", "Source ID", "Question", "Options", "Correct Answer", "Accepted Answers", "Marks", "Response Type", "Feedback / Teaching Point", "Difficulty", "Composer", "Work", "Instrument", "Source / Provider", "Licence Type", "Review Status"];
const quote = (value) => { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
const rows = questions.map((question) => [question.id, question.audioId, question.audio, question.sourceId, question.question, question.choices.join(" | "), question.correctAnswer, question.acceptedAnswers.join("; "), question.marks, question.responseType, question.feedback, question.level, question.composer, question.work, question.instrumentation, question.sourceProvider, question.licenceType, "Reviewed 2026-08-06"]);
fs.writeFileSync(csvPath, `${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}\n`);

console.log(`Wrote ${questions.length} reviewed MM Devices questions.`);
