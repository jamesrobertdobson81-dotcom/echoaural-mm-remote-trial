const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'index.html',
  'server.js',
  'modules/instrument-identifier/index.html',
  'modules/instrument-identifier/script.js',
  'modules/instrument-identifier/progression.js',
  'modules/instrument-identifier/clips.js',
  'modules/melodic-intervals/index.html',
  'modules/melodic-intervals/interval-data.js',
  'modules/melodic-intervals/script.js',
  'modules/melodic-intervals/teacher-adapter.js',
  'modules/melody-master/index.html',
  'modules/melody-master/script.js',
  'modules/melody-master/clips.js',
  'modules/melody-master/teacher-mode.html',
  'modules/melody-master/teacher-mode.js',
  'modules/texture-trainer/index.html',
  'modules/texture-trainer/style.css',
  'modules/texture-trainer/texture-question-system.js',
  'modules/texture-trainer/script.js',
  'modules/texture-trainer/data/texture-questions.js',
  'tools/check-texture-marking.js',
  'modules/meter-master/index.html',
  'modules/meter-master/style.css',
  'modules/meter-master/script.js',
  'modules/meter-master/data/meter-master-exam-style-60.json'
];

function fail(message) {
  console.error(`Project check failed: ${message}`);
  process.exit(1);
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) fail(`Missing ${relativePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

for (const file of requiredFiles) read(file);

for (const file of requiredFiles.filter((name) => name.endsWith('.js'))) {
  try {
    new vm.Script(read(file), { filename: file });
  } catch (error) {
    fail(`${file} has a JavaScript syntax error: ${error.message}`);
  }
}

const home = read('index.html');
if (!home.includes('modules/texture-trainer/index.html')) {
  fail('Home page does not link to Texture Trainer.');
}
if (!home.includes('modules/meter-master/index.html')) {
  fail('Home page does not link to Meter Master.');
}

const textureData = read('modules/texture-trainer/data/texture-questions.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(textureData, sandbox, { filename: 'modules/texture-trainer/data/texture-questions.js' });
const questions = sandbox.window.textureQuestions;
if (!Array.isArray(questions) || questions.length < 6) {
  fail('Texture Trainer needs at least 6 starter questions.');
}
const textureQuestionSystem = require(path.join(root, 'modules/texture-trainer/texture-question-system.js'));
const { runTextureTrainerMarkingChecks } = require(path.join(root, 'tools/check-texture-marking.js'));
const textureQuestions = questions.map((question, index) => textureQuestionSystem.normaliseQuestion(question, index));

for (const question of textureQuestions) {
  const required = ['id', 'module', 'title', 'audio', 'prompt', 'maxMarks', 'acceptedAnswers', 'partialAnswers', 'incorrectAnswers', 'modelAnswer'];
  for (const key of required) {
    if (!question[key] || (Array.isArray(question[key]) && !question[key].length)) {
      fail(`${question.id || 'Texture question'} is missing ${key}.`);
    }
  }
  if (!['Foundation', 'Developing', 'Securing', 'Mastering'].includes(question.level)) fail(`${question.id} has invalid Texture Trainer level.`);
  if (!['multiple-choice', 'short-text', 'extended-text'].includes(question.responseType)) fail(`${question.id} has invalid Texture Trainer response type.`);
  if (!question.preferredAnswer || !question.broadTextureCategory || !question.specificTextureTerm) fail(`${question.id} is missing preferred/broad/specific texture metadata.`);
  if (question.responseType === 'multiple-choice') {
    if (!Array.isArray(question.answerChoices) || question.answerChoices.length < 3 || question.answerChoices.length > 4) fail(`${question.id} has invalid multiple-choice options.`);
    if (!question.answerChoices.some((choice) => textureQuestionSystem.sameAnswer(choice, question.correctChoice))) fail(`${question.id} multiple-choice options omit the correct answer.`);
    if (question.level === 'Foundation' && question.answerChoices.length !== 3) fail(`${question.id} Foundation question must have exactly three choices.`);
  }
}

const textureByLevel = textureQuestions.reduce((acc, question) => {
  acc[question.level] = acc[question.level] || [];
  acc[question.level].push(question);
  return acc;
}, {});
if (textureByLevel.Foundation.some((question) => question.responseType !== 'multiple-choice')) fail('Texture Trainer Foundation must be multiple-choice only.');
if (!textureByLevel.Developing.some((question) => question.responseType === 'multiple-choice') || !textureByLevel.Developing.some((question) => question.responseType === 'short-text')) fail('Texture Trainer Developing must mix multiple-choice and short-text questions.');
if (!textureByLevel.Securing.some((question) => question.responseType === 'multiple-choice') || !textureByLevel.Securing.some((question) => question.responseType === 'short-text')) fail('Texture Trainer Securing must mix multiple-choice and short-text questions.');
if (!textureByLevel.Mastering.some((question) => question.responseType === 'extended-text') || !textureByLevel.Mastering.some((question) => question.responseType === 'short-text')) fail('Texture Trainer Mastering must mix terminology and extended-description questions.');

const foundationTexture = textureByLevel.Foundation.find((question) => question.responseType === 'multiple-choice');
if (!foundationTexture) fail('Texture Trainer needs a Foundation multiple-choice question.');
if (!textureQuestionSystem.markAnswer(foundationTexture, foundationTexture.correctChoice).marksAwarded) fail('Texture Trainer multiple-choice correct answer did not score.');
if (textureQuestionSystem.markAnswer(foundationTexture, foundationTexture.answerChoices.find((choice) => !textureQuestionSystem.sameAnswer(choice, foundationTexture.correctChoice))).marksAwarded) fail('Texture Trainer multiple-choice wrong answer scored.');
const shuffledChoices = Array.from({ length: 12 }, () => textureQuestionSystem.shuffleChoices(foundationTexture.answerChoices).join('|'));
if (new Set(shuffledChoices).size < 2 && foundationTexture.answerChoices.length > 1) fail('Texture Trainer choice randomisation did not vary order.');

const monophonicQuestion = textureQuestions.find((question) => question.preferredAnswer === 'Monophonic' && question.responseType !== 'multiple-choice');
if (monophonicQuestion && !textureQuestionSystem.markAnswer(monophonicQuestion, 'monofonic').marksAwarded) fail('Texture Trainer spelling tolerance failed for monophonic.');

const polyphonicQuestion = textureQuestions.find((question) => question.acceptedWrittenAnswers.some((answer) => /contrapuntal/i.test(answer)) && question.responseType !== 'multiple-choice');
if (polyphonicQuestion && !textureQuestionSystem.markAnswer(polyphonicQuestion, 'contrapuntal').marksAwarded) fail('Texture Trainer accepted synonym failed for contrapuntal.');

const preciseQuestion = textureQuestions.find((question) => question.preferredAnswer === 'Melody and accompaniment' && question.responseType !== 'multiple-choice');
if (preciseQuestion && textureQuestionSystem.markAnswer(preciseQuestion, 'homophonic').marksAwarded) fail('Texture Trainer accepted an overly broad answer for a precise melody-and-accompaniment question.');

const extendedTexture = textureByLevel.Mastering.find((question) => question.responseType === 'extended-text');
if (extendedTexture) {
  const result = textureQuestionSystem.markAnswer(extendedTexture, `${extendedTexture.preferredAnswer}. ${extendedTexture.modelAnswer}`);
  if (!(result.marksAwarded > 0 && result.marksAwarded <= result.maxMarks)) fail('Texture Trainer concept-based marking failed for Mastering.');
}

runTextureTrainerMarkingChecks({ textureQuestions, textureQuestionSystem, fail });

const { buildLeaderboard } = require(path.join(root, 'classroom/scoring.js'));
const leaderboard = buildLeaderboard([
  { name: 'Raw Mark', cumulativeScore: 3, cumulativePercentage: 60, questionsSubmitted: 1 },
  { name: 'Normalised', cumulativeScore: 2, cumulativePercentage: 100, questionsSubmitted: 1 }
]);
if (leaderboard[0].name !== 'Normalised') fail('Classroom leaderboard must rank by normalised percentage before raw marks.');

const meterData = JSON.parse(read('modules/meter-master/data/meter-master-exam-style-60.json'));
const meterQuestions = Array.isArray(meterData.questions) ? meterData.questions : [];
if (meterQuestions.length < 60) {
  fail('Meter Master needs the 60-question exam-style bank.');
}

for (const question of meterQuestions) {
  if (!question.id || !question.audio_id || !question.question || !question.correct_answer) {
    fail(`${question.id || 'Meter Master question'} is missing required data.`);
  }
  const audioPath = String(question.audio_path || '').replace(/^modules\/meter-master\//, '');
  if (!audioPath || !fs.existsSync(path.join(root, 'modules/meter-master', audioPath))) {
    fail(`${question.id} is missing copied audio ${audioPath || '(blank)'}.`);
  }
}

const intervalData = require(path.join(root, 'modules/melodic-intervals/interval-data.js'));
const intervalLevels = intervalData.levelDefinitionsList();
if (!Array.isArray(intervalLevels) || intervalLevels.length !== 4) {
  fail('Melodic Intervals must expose four progression levels.');
}

function directionSet(items) {
  return new Set(items.map((item) => item.direction));
}

function answerSet(items) {
  return new Set(items.map((item) => item.correctAnswer));
}

function qualitySet(items) {
  return new Set(items.map((item) => item.intervalQuality));
}

function assertChoicesContainAnswers(items, label) {
  for (const question of items) {
    if (!Array.isArray(question.choices) || !question.choices.some((choice) => intervalData.sameInterval(choice, question.correctAnswer))) {
      fail(`${label} question ${question.id} does not include its correct answer choice.`);
    }
  }
}

const intervalQuestionsByLevel = Object.fromEntries(intervalLevels.map((level) => [
  level.key,
  intervalData.buildQuestions({ level: level.key })
]));

for (const [levelKey, questionsForLevel] of Object.entries(intervalQuestionsByLevel)) {
  if (questionsForLevel.some((question) => question.hasAccidentals || /[♯♭♮]/.test(`${question.startNoteLabel}${question.targetNoteLabel}`))) {
    fail(`Melodic Intervals ${levelKey} generated written-note accidentals.`);
  }
}

const foundation = intervalQuestionsByLevel.foundation;
if (!foundation.length) fail('Melodic Intervals Foundation generated no questions.');
if ([...answerSet(foundation)].some((answer) => answer === '6th' || answer === '7th')) fail('Foundation generated 6ths or 7ths.');
if ([...directionSet(foundation)].some((direction) => direction !== 'ascending')) fail('Foundation generated descending intervals.');
if ([...qualitySet(foundation)].some((quality) => quality === 'Augmented' || quality === 'Diminished')) {
  fail('Foundation generated augmented or diminished intervals.');
}
if (foundation.some((question) => question.answerMode !== 'number' || question.hasAccidentals || question.keySignatureId !== 'c-major')) {
  fail('Foundation generated accidentals, key signatures or quality-answer questions.');
}
assertChoicesContainAnswers(foundation, 'Foundation');

const developing = intervalQuestionsByLevel.developing;
if (!developing.length) fail('Melodic Intervals Developing generated no questions.');
for (const answer of ['Unison', '2nd', '3rd', '4th', '5th', '6th', '7th', 'Octave']) {
  if (!answerSet(developing).has(answer)) fail(`Developing did not generate ${answer}.`);
}
if (!directionSet(developing).has('ascending') || !directionSet(developing).has('descending')) fail('Developing must generate both directions.');
if (developing.some((question) => question.answerMode !== 'number' || question.keySignatureAccidentals > 2)) {
  fail('Developing generated quality-answer questions or key signatures beyond two accidentals.');
}
assertChoicesContainAnswers(developing, 'Developing');

const securing = intervalQuestionsByLevel.securing;
if (!securing.length) fail('Melodic Intervals Securing generated no questions.');
if (!directionSet(securing).has('ascending') || !directionSet(securing).has('descending')) fail('Securing must generate both directions.');
if (securing.some((question) => question.answerMode !== 'quality' || question.keySignatureAccidentals > 4)) {
  fail('Securing generated number-only questions or key signatures beyond four accidentals.');
}
if ([...qualitySet(securing)].some((quality) => quality === 'Augmented' || quality === 'Diminished')) {
  fail('Securing generated augmented or diminished intervals.');
}
for (const quality of ['Major', 'Minor', 'Perfect']) {
  if (!qualitySet(securing).has(quality)) fail(`Securing did not generate ${quality} intervals.`);
}
assertChoicesContainAnswers(securing, 'Securing');

const mastering = intervalQuestionsByLevel.mastering;
if (!mastering.length) fail('Melodic Intervals Mastering generated no questions.');
if (!directionSet(mastering).has('ascending') || !directionSet(mastering).has('descending')) fail('Mastering must generate both directions.');
for (const quality of ['Major', 'Minor', 'Perfect', 'Augmented', 'Diminished']) {
  if (!qualitySet(mastering).has(quality)) fail(`Mastering did not generate ${quality} intervals.`);
}
if (mastering.some((question) => question.chromatic)) {
  fail('Mastering generated chromatic questions.');
}
assertChoicesContainAnswers(mastering, 'Mastering');

const spellingExamples = [
  ['C4', 'Ef4', 'Minor 3rd'],
  ['C4', 'Ds4', 'Augmented 2nd'],
  ['C4', 'Fs4', 'Augmented 4th'],
  ['C4', 'Gf4', 'Diminished 5th'],
  [
    { id: 'B4-test', label: 'B4', letter: 'B', octave: 4, midi: 71 },
    { id: 'F5-test', label: 'F5', letter: 'F', octave: 5, midi: 77 },
    'Diminished 5th'
  ],
  ['Cs4', 'G4', 'Diminished 5th']
];

for (const [start, target, expected] of spellingExamples) {
  const result = intervalData.calculateInterval(
    typeof start === 'string' ? intervalData.findNote(start) : start,
    typeof target === 'string' ? intervalData.findNote(target) : target,
    intervalData.findKeySignature('c-major')
  );
  if (!result || !intervalData.sameInterval(result.intervalFullLabel, expected)) {
    fail(`Interval spelling example ${expected} was calculated incorrectly.`);
  }
}

console.log(`EchoAural project check passed. Texture Trainer questions validated: ${questions.length}. Meter Master questions validated: ${meterQuestions.length}. Melodic Intervals levels validated: ${intervalLevels.length}.`);
