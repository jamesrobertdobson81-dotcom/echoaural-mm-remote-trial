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
  'modules/melody-master/index.html',
  'modules/melody-master/script.js',
  'modules/melody-master/clips.js',
  'modules/melody-master/teacher-mode.html',
  'modules/melody-master/teacher-mode.js',
  'modules/texture-trainer/index.html',
  'modules/texture-trainer/style.css',
  'modules/texture-trainer/script.js',
  'modules/texture-trainer/data/texture-questions.js'
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

const textureData = read('modules/texture-trainer/data/texture-questions.js');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(textureData, sandbox, { filename: 'modules/texture-trainer/data/texture-questions.js' });
const questions = sandbox.window.textureQuestions;
if (!Array.isArray(questions) || questions.length < 6) {
  fail('Texture Trainer needs at least 6 starter questions.');
}

for (const question of questions) {
  const required = ['id', 'module', 'title', 'audio', 'prompt', 'maxMarks', 'acceptedAnswers', 'partialAnswers', 'incorrectAnswers', 'modelAnswer'];
  for (const key of required) {
    if (!question[key] || (Array.isArray(question[key]) && !question[key].length)) {
      fail(`${question.id || 'Texture question'} is missing ${key}.`);
    }
  }
}

console.log(`EchoAural project check passed. Texture Trainer questions validated: ${questions.length}.`);
