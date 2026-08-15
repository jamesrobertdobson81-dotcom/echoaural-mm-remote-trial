'use strict';

module.exports = function createMeterMasterTeacherAdapter(context = {}) {
  const path = context.path || require('path');
  const fs = context.fs || require('fs');
  const projectRoot = context.projectRoot || path.resolve(__dirname, '..', '..');
  let cachedQuestions = null;

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9/]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function display(value) {
    const text = String(value || '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  // Mirrors modules/meter-master/script.js's own cleanAudioPath exactly: most
  // rows write audio_path repo-root-relative ("modules/meter-master/audio/
  // MTR007.mp3"), stripped back down to a path relative to this module. A
  // few rows instead reuse another module's clip directly with a "../"
  // prefix relative to modules/meter-master/ itself (e.g. MMX061 borrows
  // texture-trainer's TT097.mp3) — resolving that "../" against the repo
  // root instead (as a bare path.join(projectRoot, audio_path) does) walks
  // outside the repo entirely and always misses, which is what silently
  // dropped MMX061 from every Live Session pool.
  function audioPathRelativeToModule(rawPath) {
    const raw = String(rawPath || '').trim();
    if (!raw) return '';
    return raw.replace(/^modules\/meter-master\//, '');
  }

  function resolveAudioPath(rawPath) {
    const relativeToModule = audioPathRelativeToModule(rawPath);
    if (!relativeToModule) return '';
    return path.join(projectRoot, 'modules', 'meter-master', relativeToModule);
  }

  function resolveAudioUrl(rawPath) {
    const relativeToModule = audioPathRelativeToModule(rawPath);
    if (!relativeToModule) return '';
    return `/${path.posix.normalize(path.posix.join('modules/meter-master', relativeToModule))}`;
  }

  function getQuestions() {
    if (cachedQuestions) return cachedQuestions;
    const data = require(path.join(projectRoot, 'modules', 'meter-master', 'data', 'meter-master-exam-style-60.json'));
    cachedQuestions = (data.questions || []).filter((question) => (
      fs.existsSync(resolveAudioPath(question.audio_path))
    )).map((question) => ({
      ...question,
      level: '',
      musicalElement: 'Meter and rhythm',
      skillCode: /time signature/i.test(question.response_type || question.question) ? 'RHY.TIME_SIGNATURE' : 'RHY.METRE',
      skillName: /time signature/i.test(question.response_type || question.question) ? 'Time signature' : 'Metre classification'
    }));
    return cachedQuestions;
  }

  return {
    id: 'meter-master',
    title: 'Meter Master',
    description: 'Recognise metre, pulse and time signatures from listening extracts.',
    studentMode: 'generic',
    mixedCompatible: true,
    getQuestions,
    prepareQuestion(question = {}, options = {}) {
      const visual = question.score_asset
        ? `/modules/meter-master/${String(question.score_asset).includes('/') ? String(question.score_asset).replace(/^modules\/meter-master\//, '') : `scores/${question.score_asset}`}`
        : '';
      // app_control (not options.length, which some typed rows leave
      // non-empty as leftover/unused data) is the reliable signal for
      // whether this question is answered by picking a choice or by typing
      // — see the response_type/app_control breakdown this was checked
      // against: "radio" is the only choice-style control; numeric, two-
      // field-written and time-signature-entry rows are all free text.
      const isChoice = question.app_control === 'radio';
      return {
        moduleId: 'meter-master',
        moduleTitle: 'Meter Master',
        id: question.id,
        index: Number(options.index || 0),
        title: `${question.id} · ${question.mode || 'Metre'}`,
        prompt: question.question || (isChoice ? 'Choose the best metre answer.' : 'Answer in your own words.'),
        answerType: isChoice ? 'choice' : 'text',
        responseType: isChoice ? 'multiple-choice' : 'typed',
        choices: isChoice ? question.options.map(display) : [],
        audio: resolveAudioUrl(question.audio_path),
        visual,
        visualAlt: question.score_instruction || 'Score extract',
        maxMarks: Number(question.marks || 1)
      };
    },
    checkAnswer(question = {}, answer = '') {
      const accepted = [question.correct_answer, ...(question.accepted_answers || [])].map(normalise);
      const correct = accepted.includes(normalise(answer));
      const total = Number(question.marks || 1);
      return {
        score: correct ? total : 0,
        total,
        correct,
        feedback: correct ? (question.feedback || 'Correct.') : `Not quite. ${question.mark_scheme || `The answer is ${display(question.correct_answer)}.`}`,
        modelAnswer: display(question.correct_answer),
        answerData: {
          skillCode: question.skillCode,
          skillName: question.skillName,
          musicalElement: 'Meter and rhythm',
          timeSignature: question.time_signature,
          metreFamily: question.metre_family
        }
      };
    }
  };
};
