'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const moduleDir = path.join(root, 'modules', 'exam-lab');
const core = require(path.join(moduleDir, 'core', 'exam-lab-core.js'));
const marking = require(path.join(moduleDir, 'marking.js'));
const { loadRegistry } = require(path.join(moduleDir, 'server-data.js'));
const createExamLabAdapter = require(path.join(moduleDir, 'teacher-adapter.js'));
const { RoomManager } = require(path.join(root, 'classroom', 'room-manager.js'));
const { startPlayback } = require(path.join(root, 'classroom', 'classroom-server.js'));
const { buildTeacherModeRoundPayload } = require(path.join(root, 'classroom', 'progress-recorder.js'));
const { buildExamLabSessions } = require(path.join(root, 'accounts', 'account-server.js'));

let checks = 0;

function check(value, message) {
  assert.ok(value, message);
  checks += 1;
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  checks += 1;
}

function throws(callback, pattern, message) {
  assert.throws(callback, pattern, message);
  checks += 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function correctAnswer(question) {
  if (question.responseType === 'multiple-choice') return question.correctChoice;
  const points = question.markPoints || question.markComponents || question.reasonCategories;
  if (Array.isArray(points)) {
    return points.slice(0, question.marks).map((point) => (
      point.acceptedAnswers?.[0] || point.keywords?.[0] || ''
    )).filter(Boolean).join('. ');
  }
  return question.acceptedAnswers?.[0] || question.modelAnswer || '';
}

function incorrectAnswer(question) {
  if (question.responseType === 'multiple-choice') {
    return question.options.find((option) => option !== question.correctChoice) || 'Incorrect';
  }
  return 'unrelated response';
}

function answerPayload(extract, answerFor = correctAnswer) {
  return extract.questions.map((question, index) => ({
    questionId: core.publicQuestionId(index),
    answer: answerFor(question)
  }));
}

function containsKey(value, blockedKeys) {
  if (Array.isArray(value)) return value.some((item) => containsKey(item, blockedKeys));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => blockedKeys.has(key) || containsKey(item, blockedKeys));
}

function buildExamManager(random = () => 0) {
  const adapter = createExamLabAdapter({
    moduleDir,
    random,
    getAudioDurationSeconds: () => 84
  });
  return {
    adapter,
    manager: new RoomManager({ adapters: [adapter], defaultModuleId: 'exam-lab' })
  };
}

function createStartedRoom(manager, options = {}) {
  const room = manager.createRoom({
    moduleId: 'exam-lab',
    baseUrl: 'http://localhost:3000',
    ownerTeacherId: options.teacherId || 'teacher-one',
    classId: options.classId || 'class-one',
    className: options.className || 'Year 10 Music'
  });
  manager.startQuestion(room, 0, { resetQuiz: true, quizLength: 9, maxListens: 8 });
  return room;
}

createExamLabAdapter.resetRecentHistory();
const extracts = loadRegistry({ moduleDir, reload: true });

equal(extracts.length, 3, 'Three production Exam Lab extracts should load.');
assert.deepEqual(extracts.map((extract) => extract.questions.length), [7, 8, 8]); checks += 1;
assert.deepEqual(extracts.map((extract) => extract.totalMarks), [9, 9, 10]); checks += 1;
check(extracts.every((extract) => extract.questions.reduce((sum, question) => sum + question.marks, 0) === extract.totalMarks), 'Every extract total must equal its question marks.');
check(extracts.every((extract) => fs.existsSync(path.join(moduleDir, extract.audio))), 'Every extract needs local audio.');
check(extracts.every((extract) => !extract.score || fs.existsSync(path.join(moduleDir, extract.score))), 'Every score reference must resolve.');
check(extracts.every((extract) => extract.maxPlays === 4), 'All current extracts retain four permitted playings.');

for (const extract of extracts) {
  const correct = core.markExtract(extract, answerPayload(extract));
  const incorrect = core.markExtract(extract, answerPayload(extract, incorrectAnswer));
  equal(correct.score, extract.totalMarks, `${extract.id} all-correct fixture should reach the maximum.`);
  equal(correct.maximumScore, extract.totalMarks, `${extract.id} maximum should be authoritative.`);
  equal(incorrect.score, 0, `${extract.id} all-incorrect fixture should score zero.`);
}

const exl001 = extracts[0];
const exl003 = extracts[2];
equal(marking.markQuestion(exl001.questions[3], 'perfect fifth').marks, 2, 'Perfect fifth should earn both cadence-question marks.');
equal(marking.markQuestion(exl001.questions[3], 'perfect').marks, 1, 'Perfect should earn the quality mark.');
equal(marking.markQuestion(exl001.questions[3], '5th').marks, 1, '5th should earn the number mark.');
equal(marking.markQuestion(exl003.questions[2], 'pizzacato').marks, 1, 'Pizzicato misspellings should remain accepted.');
equal(marking.markQuestion(exl003.questions[5], 'It gets faster.').marks, 1, 'One distinct written point should receive partial credit.');
equal(marking.markQuestion(exl003.questions[5], 'It gets faster, accelerates and speeds up.').marks, 1, 'Duplicate wording should not receive duplicate credit.');
equal(marking.markQuestion(exl003.questions[5], 'It does not get faster and it does not become louder.').marks, 0, 'Negated evidence should not receive credit.');
check(marking.markQuestion(exl003.questions[7], 'There is a crescendo and the music moves into a higher register.').marks === 2, 'Two distinct Romantic features should earn two marks.');

const publicExtract = core.serialisePublicExtract(exl003);
const blockedKeys = new Set(['correctChoice', 'acceptedAnswers', 'modelAnswer', 'feedback', 'markPoints', 'markComponents', 'reasonCategories', 'nonCreditRules', 'source', 'route', 'skills']);
check(!containsKey(publicExtract, blockedKeys), 'Public extract data must omit marking and route metadata.');
check(!Object.hasOwn(publicExtract, 'audio'), 'Student-safe public extract data must omit audio.');
check(!JSON.stringify(publicExtract).includes('EXL003'), 'Public extract data must omit internal extract IDs.');
check(publicExtract.questions.every((question, index) => question.id === `question-${index + 1}`), 'Public question IDs should be neutral and sequential.');
throws(() => core.normaliseAnswers(exl003, [{ questionId: 'EXL003-Q01', answer: 'B minor' }]), /invalid question reference/i, 'Internal question IDs must be rejected by the live core.');
throws(() => core.normaliseAnswers(exl003, [{ questionId: 'question-1', answer: 'B minor' }, { questionId: 'question-1', answer: 'B minor' }]), /invalid question reference/i, 'Duplicate question IDs must be rejected.');
throws(() => core.markExtract(exl003, answerPayload(exl003).slice(0, -1)), /answer every question/i, 'Incomplete submissions must be rejected.');
throws(() => core.markExtract(exl003, [{ questionId: 'question-99', answer: 'Injected' }]), /invalid question reference/i, 'Unknown question IDs must be rejected.');

createExamLabAdapter.resetRecentHistory();
const selectionManager = buildExamManager(() => 0).manager;
const selectionRooms = Array.from({ length: 4 }, () => selectionManager.createRoom({
  moduleId: 'exam-lab',
  baseUrl: 'http://localhost:3000',
  ownerTeacherId: 'teacher-repeat-test'
}));
assert.deepEqual(selectionRooms.slice(0, 3).map((room) => room.examLab.extractId), ['EXL001', 'EXL002', 'EXL003']); checks += 1;
check(extracts.some((extract) => extract.id === selectionRooms[3].examLab.extractId), 'Selection should degrade safely after all extracts are recent.');
const selectedBeforeStart = selectionRooms[0].examLab.extractId;
selectionManager.startQuestion(selectionRooms[0], 2, { resetQuiz: true, quizLength: 3, maxListens: 8 });
equal(selectionRooms[0].examLab.extractId, selectedBeforeStart, 'The room must retain one whole extract after start.');
equal(selectionRooms[0].quizTotal, 1, 'An Exam Lab room should contain one whole-extract round.');
equal(selectionRooms[0].maxListens, 4, 'Client settings must not increase the extract play limit.');
equal(selectionRooms[0].activeQuestion.audioDurationSeconds, 84, 'Playback state should use the actual server-side audio duration.');

createExamLabAdapter.resetRecentHistory();
const { manager } = buildExamManager(() => 0);
const room = createStartedRoom(manager);
const extract = extracts[room.examLab.extractIndex];
const firstJoin = manager.joinRoom(room, 'student-a', 'Amina', { studentId: 'student-account-a', teacherId: 'teacher-one' });
const secondJoin = manager.joinRoom(room, 'student-b', 'Ben', { studentId: 'student-account-b', teacherId: 'teacher-one' });
check(firstJoin.ok && secondJoin.ok, 'Account students should join the same room.');
const studentBefore = manager.createRoomState(room, 'student-a');
const teacherBefore = manager.createRoomState(room);
equal(studentBefore.question.totalMarks, extract.totalMarks, 'Every student should receive the same extract maximum.');
check(!Object.hasOwn(studentBefore.question, 'audio'), 'Student room state must not contain an audio path.');
check(!JSON.stringify(studentBefore).includes(room.examLab.extractId), 'Student room state must not expose the internal extract ID.');
equal(studentBefore.classroom.name, 'Year 10 Music', 'Students may see the safe selected-class name.');
check(!Object.hasOwn(studentBefore.classroom, 'id'), 'Student state must omit the internal class ID.');
equal(teacherBefore.classroom.id, 'class-one', 'The owning teacher may receive the selected class ID.');
check(!teacherBefore.examLabAnalysis, 'Class diagnosis must be withheld while the session is active.');

const activeSubmission = manager.submitAnswer(room, 'student-a', {
  answers: answerPayload(extract),
  score: 999,
  maximumScore: 999,
  extractId: 'EXL999'
});
equal(activeSubmission.score, extract.totalMarks, 'Client-supplied score and extract ID must not alter server marking.');
const activeStudentState = manager.createRoomState(room, 'student-a');
equal(activeStudentState.student.submission.score, undefined, 'A student score must be withheld before release.');
equal(activeStudentState.students[0].score, null, 'Class scores must be withheld from student room state.');
check(!JSON.stringify(activeStudentState).includes('correctResponse'), 'Correct responses must be withheld before release.');
check(!manager.createRoomState(room).examLabAnalysis, 'Teacher diagnosis must remain private until finish.');
throws(() => manager.submitAnswer(room, 'student-a', { answers: answerPayload(extract) }), /already submitted/i, 'Duplicate submission must be rejected.');

const invalidRoom = createStartedRoom(manager, { teacherId: 'teacher-two', classId: '', className: '' });
manager.joinRoom(invalidRoom, 'student-invalid', 'Ivy', { studentId: 'student-account-i', teacherId: 'teacher-two' });
throws(() => manager.submitAnswer(invalidRoom, 'student-invalid', { answers: [{ questionId: 'question-99', answer: 'Injected' }] }), /invalid question reference/i, 'Room submission must validate IDs against its selected extract.');

const playback = startPlayback(room, { leadInSeconds: 0 });
equal(playback.playback.audioDurationSeconds, 84, 'Teacher playback should publish the extract duration.');
equal(room.listens, 1, 'Teacher playback should increment the shared play count once.');
throws(() => startPlayback(room, { leadInSeconds: 0 }), /already playing/i, 'Double-click playback should be rejected while audio is active.');
while (room.listens < room.maxListens) {
  room.playback.endsAt = 0;
  startPlayback(room, { leadInSeconds: 0 });
}
room.playback.endsAt = 0;
throws(() => startPlayback(room, { leadInSeconds: 0 }), /already used all/i, 'The shared play limit must be enforced server-side.');
equal(manager.createRoomState(room, 'student-b').listens, 4, 'Polling or reconnecting must not reset the play count.');

manager.endQuiz(room);
const releasedA = manager.createRoomState(room, 'student-a');
const releasedB = manager.createRoomState(room, 'student-b');
const releasedTeacher = manager.createRoomState(room);
equal(releasedA.student.submission.examLabResult.score, extract.totalMarks, 'Finished students should receive their private total.');
check(releasedA.student.submission.examLabResult.outcomes.every((outcome) => outcome.correctResponse), 'Released private feedback should include accepted responses.');
equal(releasedB.student.submission, null, 'A student must never receive another student’s result.');
equal(releasedA.leaderboard.length, 0, 'Exam Lab student state must not contain a leaderboard.');
equal(releasedTeacher.leaderboard.length, 0, 'Exam Lab teacher state must not contain a leaderboard.');
equal(releasedTeacher.examLabAnalysis.submitted, 1, 'Teacher diagnosis should include submitted students after finish.');
equal(releasedTeacher.examLabAnalysis.individuals.length, 2, 'Teacher diagnosis should include submitted and unsubmitted students.');
equal(releasedTeacher.examLabAnalysis.classAverage, 100, 'Class average should use submitted results.');
check(releasedTeacher.examLabAnalysis.questions.every((question) => question.successPercentage === 100), 'Question analysis should aggregate awarded marks correctly.');
check(releasedTeacher.examLabAnalysis.skills.length > 0, 'Teacher diagnosis should include structured skill outcomes.');

const payload = buildTeacherModeRoundPayload(room, manager, room.students.get('student-a'));
const unsubmittedPayload = buildTeacherModeRoundPayload(room, manager, room.students.get('student-b'));
equal(payload.moduleId, 'exam-lab', 'Persistence payload should use the Exam Lab module.');
equal(payload.questions.length, extract.questions.length, 'Persistence should store one attempt row per extract question.');
equal(payload.metadata.attemptSource, 'classroom_live', 'Persistence should label Classroom Live attempts.');
equal(payload.metadata.classId, 'class-one', 'Persistence should retain the selected class ID.');
equal(payload.metadata.className, 'Year 10 Music', 'Persistence should retain the selected class name.');
equal(payload.maximumScore, extract.totalMarks, 'Persistence maximum must match server data.');
check(payload.questions.every((question) => typeof question.answerData.answer === 'string'), 'Persistence should retain raw answers for diagnosis.');
check(payload.questions.every((question) => Array.isArray(question.answerData.skills)), 'Persistence should retain structured skills.');
equal(unsubmittedPayload.metadata.submitted, false, 'Persistence should retain joined students who did not submit.');
check(unsubmittedPayload.questions.every((question) => question.answerData.submitted === false && question.score === 0), 'Unsubmitted participation should remain explicitly unanswered.');

const completedAt = new Date().toISOString();
const dashboardStudents = [
  { id: payload.studentId, display_name: 'Amina', class_name: 'Year 10 Music' },
  { id: unsubmittedPayload.studentId, display_name: 'Ben', class_name: 'Year 10 Music' }
];
const dashboardRounds = [{
  id: 'round-one',
  student_id: payload.studentId,
  module_id: 'exam-lab',
  score: payload.score,
  maximum_score: payload.maximumScore,
  metadata: payload.metadata,
  completed_at: completedAt
}, {
  id: 'round-two',
  student_id: unsubmittedPayload.studentId,
  module_id: 'exam-lab',
  score: unsubmittedPayload.score,
  maximum_score: unsubmittedPayload.maximumScore,
  metadata: unsubmittedPayload.metadata,
  completed_at: completedAt
}];
const dashboardAttempts = payload.questions.map((question, index) => ({
  id: `attempt-${index}`,
  student_id: payload.studentId,
  round_id: 'round-one',
  module_id: 'exam-lab',
  question_id: question.questionId,
  score: question.score,
  maximum_score: question.maximumScore,
  feedback: question.feedback,
  answer_data: question.answerData,
  completed_at: completedAt
})).concat(unsubmittedPayload.questions.map((question, index) => ({
  id: `unanswered-attempt-${index}`,
  student_id: unsubmittedPayload.studentId,
  round_id: 'round-two',
  module_id: 'exam-lab',
  question_id: question.questionId,
  score: question.score,
  maximum_score: question.maximumScore,
  feedback: question.feedback,
  answer_data: question.answerData,
  completed_at: completedAt
})));
const dashboardSessions = buildExamLabSessions(dashboardStudents, dashboardRounds, dashboardAttempts);
equal(dashboardSessions.length, 1, 'Teacher Dashboard should group one saved live session.');
equal(dashboardSessions[0].className, 'Year 10 Music', 'Dashboard summary should show the class.');
equal(dashboardSessions[0].questions.length, extract.questions.length, 'Dashboard summary should include a question heatmap row per question.');
equal(dashboardSessions[0].individuals.length, 2, 'Dashboard summary should include submitted and unsubmitted individuals.');
equal(dashboardSessions[0].participatingStudents, 2, 'Dashboard should retain all joined account students.');
equal(dashboardSessions[0].submittedStudents, 1, 'Dashboard should distinguish submitted students.');
check(dashboardSessions[0].questions.every((question) => question.unanswered === 1), 'Dashboard question analysis should count unsubmitted answers separately.');
check(Array.isArray(dashboardSessions[0].recommendations), 'Dashboard recommendations should be structured for teacher review.');

const fakeAdapter = {
  id: 'fake-module',
  title: 'Fake Module',
  getQuestions: () => [{ id: 'fake-1', answer: 'yes' }],
  prepareQuestion: () => ({ id: 'fake-1', moduleId: 'fake-module', prompt: 'Answer yes.', maxMarks: 1, audio: 'fake.mp3' }),
  checkAnswer: (_question, answer) => ({ score: answer === 'yes' ? 1 : 0, total: 1, feedback: 'Checked.' })
};
const genericManager = new RoomManager({ adapters: [fakeAdapter], defaultModuleId: 'fake-module' });
const genericRoom = genericManager.createRoom({ moduleId: 'fake-module', baseUrl: 'http://localhost:3000' });
genericManager.startQuestion(genericRoom, 0, { resetQuiz: true, quizLength: 1, maxListens: 2 });
genericManager.joinRoom(genericRoom, 'generic-student', 'Grace');
genericManager.submitAnswer(genericRoom, 'generic-student', { answer: 'yes' });
equal(genericManager.createRoomState(genericRoom).students[0].score, 1, 'Existing non-Exam-Lab live scoring should remain visible to teachers.');
equal(genericManager.createRoomState(genericRoom).leaderboard.length, 1, 'Existing non-Exam-Lab leaderboard behaviour should remain intact.');
equal(startPlayback(genericRoom, { leadInSeconds: 0 }).audio, 'fake.mp3', 'Existing non-Exam-Lab playback should remain available.');

const adapterContext = { path, fs, vm, projectRoot: root, getAudioDurationSeconds: () => 10, useLevelledQuestions: true };
const melodyAdapter = require(path.join(root, 'modules', 'melody-master', 'teacher-adapter.js'))(adapterContext);
const melodyManager = new RoomManager({ adapters: [melodyAdapter], defaultModuleId: 'melody-master' });
const melodyRoom = melodyManager.createRoom({ moduleId: 'melody-master', baseUrl: 'http://localhost:3000' });
melodyManager.startQuestion(melodyRoom, 0, { resetQuiz: true, quizLength: 1, maxListens: 2 });
check(Boolean(startPlayback(melodyRoom, { leadInSeconds: 0 }).audio), 'Melody Master Classroom Live playback should still start.');

const instrumentAdapter = require(path.join(root, 'modules', 'instrument-identifier', 'teacher-adapter.js'))(adapterContext);
const instrumentManager = new RoomManager({ adapters: [instrumentAdapter], defaultModuleId: 'instrument-identifier' });
const instrumentRoom = instrumentManager.createRoom({ moduleId: 'instrument-identifier', baseUrl: 'http://localhost:3000' });
instrumentManager.startQuestion(instrumentRoom, 0, { resetQuiz: true, quizLength: 1, maxListens: 2 });
check(instrumentRoom.activeQuestion.choices.length > 0, 'Instrument Identifier Classroom Live choices should still prepare.');

const standaloneHtml = read('modules/exam-lab/index.html');
const standaloneScript = read('modules/exam-lab/script.js');
const studentHtml = read('student/student-shell.html');
const teacherJs = read('teacher/teacher.js');
const dashboardHtml = read('account/teacher-dashboard/index.html');
const dashboardJs = read('account/teacher-dashboard/teacher-dashboard.js');
const home = read('index.html');
check(/id="extractSelector"/.test(standaloneHtml), 'Standalone mode should retain its extract selector.');
check(/ExamLabCore\.markExtract/.test(standaloneScript), 'Standalone mode should use the shared marking core.');
check(/ea\.examLab\.results\.v1/.test(standaloneScript) && /examlab:completed/.test(standaloneScript), 'Standalone persistence and completion events should remain intact.');
check(/Submit Answers/.test(studentHtml), 'Student live mode should use the approved submit label.');
check(/Score zoom controls/.test(studentHtml) && /tabindex="0"/.test(studentHtml), 'The live score should be zoomable and keyboard-scrollable.');
check(/Audio plays from the teacher.s device/.test(studentHtml), 'Student live mode should explain teacher-device playback.');
check(/Play Extract/.test(teacherJs) && /Lock Submissions/.test(teacherJs) && /Finish Session/.test(teacherJs), 'Teacher controls should use Exam Lab session wording.');
check(/moduleId:\s*DASHBOARD_LAUNCH_MODULE_IDS\.has\(requestedLaunchModuleId\)\s*\?\s*requestedLaunchModuleId\s*:\s*''/.test(teacherJs), 'Teacher Mode should validate and retain the Dashboard-selected app type.');
check(/dashboardLaunch\.enabled\s*&&\s*dashboardLaunch\.moduleId[\s\S]*return dashboardLaunch\.moduleId;/.test(teacherJs), 'Dashboard-launched rooms should keep their selected app type through room creation and start.');
check(/numberFromParam\('quizLength',\s*3,\s*\[1,\s*3,\s*5,\s*10,\s*15\]\)/.test(teacherJs), 'Teacher Mode should retain the one-question ExamLab launch setting.');
check(!/id="openExamLabLaunchDialog"/.test(dashboardHtml), 'Teacher Dashboard should not show a separate Start Exam Lab button.');
check((dashboardHtml.match(/data-launch-source=/g) || []).length === 3, 'Start Live Session should offer exactly three question-source choices.');
check(/data-launch-source="app"/.test(dashboardHtml) && /data-launch-source="mixed"/.test(dashboardHtml) && /data-launch-source="exam-lab"/.test(dashboardHtml), 'Question Source should offer App, Mixed Apps and ExamLab.');
check(/id="teacherLaunchApp"/.test(dashboardHtml) && /Instrument Identifier/.test(dashboardHtml) && /Melody Master/.test(dashboardHtml) && /Melodic Intervals/.test(dashboardHtml), 'The App source should provide an individual-app dropdown.');
check(/showsStandardChoices\s*=\s*selectedSource\s*===\s*"app"\s*\|\|\s*selectedSource\s*===\s*"mixed"/.test(dashboardJs), 'Questions, plays and level choices should appear only for App or Mixed Apps.');
check(!/EXL00[123]/.test(`${teacherJs}\n${dashboardHtml}\n${dashboardJs}\n${studentHtml}`), 'Classroom and dashboard UI source must not name internal extract IDs.');
check(/No work is assigned automatically/.test(dashboardJs), 'Dashboard recommendations must require teacher review.');
check(/assets\/icons\/modules\/exam-lab\.png/.test(home) && /Exam Lab/.test(home), 'The homepage should include the Exam Lab tile.');
check(extracts.every((extract) => read(`modules/exam-lab/ExamLab_${extract.id}_Cambridge_Skill_Map.csv`).includes(extract.questions[0].id)), 'Each migrated CSV should match its extract data.');

console.log(`Exam Lab integration check passed: ${checks} focused assertions.`);
