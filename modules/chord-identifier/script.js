/**
 * Chord Identifier — script.js
 *
 * UI orchestration only: settings, session state, rendering, scoring. All
 * music theory lives in js/chord-engine.js, js/notation-engine.js,
 * js/audio-engine.js and js/answer-engine.js — this file just wires DOM
 * events to those engines and never re-derives correctness itself.
 */
(function () {
  'use strict';

  var Keys = window.EAChordKeys;
  var Notation = window.EAChordNotation;
  var Audio = window.EAChordAudio;
  var Core = window.EAChordIdentifierCore;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    panel: $('questionPanel'),
    start: $('startButton'),
    advanced: $('advancedSettings'),
    advancedToggle: $('advancedToggle'),
    ready: $('readyState'),
    play: $('playState'),
    results: $('resultsState'),
    notation: $('notation'),
    answers: $('answers'),
    typedForm: $('typedForm'),
    typedInput: $('typedInput'),
    next: $('nextButton'),
    question: $('questionText'),
    questionMarks: $('questionMarks'),
    round: $('roundText'),
    score: $('scoreText'),
    progress: $('progressBar'),
    insight: $('insightContent'),
    playChord: $('playChordButton'),
    arpeggiate: $('arpeggiateButton')
  };

  var escapeHTML = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  };

  var state = null;
  var contractQuestionId = '';

  function checkedValue(name, fallback) {
    var el = document.querySelector('[name="' + name + '"]:checked');
    return el ? el.value : fallback;
  }

  /** Linear difficulty progression (section 31 revision): Foundation/Developing
   *  are MC-only and major-only; Securing/Mastering add minor keys, sevenths,
   *  inversions and written answers. See js/chord-engine.js for note-count/
   *  voicing progression and the distractor-count table below. */
  function settings() {
    var difficulty = checkedValue('difficulty', 'foundation');
    var count = Number(checkedValue('questionCount', '5'));
    var tonality = checkedValue('tonality', 'major');
    var recognition = checkedValue('recognition', 'name');
    var answerMode = checkedValue('answerMode', 'adaptive');

    return Core.settingsForLevel(difficulty, {
      count: count,
      tonality: tonality,
      recognition: recognition,
      answerMode: answerMode
    });
  }

  /** Enable/disable settings that don't make sense at the chosen difficulty (section 31). */
  function syncSettingsAvailability() {
    var difficulty = checkedValue('difficulty', 'foundation');
    var isFoundation = difficulty === 'foundation';
    var isSecuring = difficulty === 'securing';
    var forceMajorAndMC = isFoundation || difficulty === 'developing';

    document.querySelectorAll('[name="tonality"]').forEach(function (input) {
      // Securing forces "Mixed" (see settings()) — lock the picker to match
      // so it never shows "Major" selected while actually generating minor
      // keys too.
      input.disabled = (forceMajorAndMC && input.value !== 'major') || (isSecuring && input.value !== 'mixed');
      if (forceMajorAndMC && input.value === 'major') input.checked = true;
      if (isSecuring && input.value === 'mixed') input.checked = true;
    });
    document.querySelectorAll('[name="answerMode"]').forEach(function (input) {
      input.disabled = forceMajorAndMC && input.value !== 'choice';
      if (forceMajorAndMC && input.value === 'choice') input.checked = true;
    });
    document.querySelectorAll('[name="recognition"]').forEach(function (input) {
      input.disabled = isFoundation && input.value !== 'name';
      if (isFoundation && input.value === 'name') input.checked = true;
    });
  }

  function questionMarkTotal(question) {
    return Core.questionMarkTotal(question);
  }

  function setQuestionPrompt(question) {
    var promptEl = els.question.querySelector('.question-prompt') || els.question;
    var prompts = {
      name: 'What is the name of this chord?',
      roman: 'What is the Roman numeral of this chord in ' + question.key.label + '?',
      inversion: 'What inversion is this chord in?'
    };
    promptEl.textContent = prompts[question.recognitionType] || 'Identify the chord';
    var marks = questionMarkTotal(question);
    if (els.questionMarks) {
      els.questionMarks.textContent = ' (' + marks + ')';
      els.questionMarks.hidden = false;
      els.questionMarks.setAttribute('aria-label', marks + ' mark' + (marks === 1 ? '' : 's'));
    }
  }

  function renderNotation(question) {
    var key = Keys.findKey(question.key.id);
    var plan = Notation.buildRenderPlan(question, key);
    var html = '<img class="stave-bg" src="' + plan.staveAsset + '" alt="" draggable="false">';
    plan.notes.forEach(function (note, noteIndex) {
      note.ledgers.forEach(function (ledger) {
        html += '<span class="note-ledger" style="left:' + ledger.xPct + '%;top:' + ledger.yPct + '%;width:' + ledger.widthPct + '%;"></span>';
      });
      if (note.accidental) {
        html += '<img class="note-accidental" src="' + note.accidental.src + '" alt="" style="left:' + note.accidental.xPct + '%;top:' + note.accidental.yPct + '%;width:' + note.accidental.widthPct + '%;height:' + note.accidental.heightPct + '%;">';
      }
      var maskId = 'note-hole-mask-' + noteIndex;
      html += '<svg class="note-head" viewBox="0 0 44 22" style="left:' + note.xPct + '%;top:' + note.yPct + '%;width:' + note.widthPct + '%;height:' + note.heightPct + '%;">' +
        '<mask id="' + maskId + '">' +
        '<ellipse cx="22" cy="11" rx="20.9" ry="10.5" fill="#fff"/>' +
        '<ellipse cx="22" cy="11" rx="8.2" ry="8.36" fill="#000" transform="rotate(21.2 22 11)"/>' +
        '</mask>' +
        '<ellipse cx="22" cy="11" rx="20.9" ry="10.5" fill="#000" mask="url(#' + maskId + ')"/>' +
        '</svg>';
    });
    els.notation.innerHTML = html;
    els.notation.setAttribute('aria-label', question.chordLabel + ', ' + question.inversionLabel);
  }

  function renderMultipleChoice(question, roundSettings) {
    els.answers.hidden = false;
    els.typedForm.hidden = true;
    var choices = Core.buildChoices(question, state.currentSeed);
    var correctValue = Core.modelAnswer(question);
    var cssClass;

    if (question.recognitionType === 'roman') {
      cssClass = 'is-roman';
    } else if (question.recognitionType === 'inversion') {
      // Always all 4 labels, even for triads (which only ever have 3 valid
      // positions) — "Third inversion" then serves as a same-type distractor.
      cssClass = 'is-inversion';
    } else {
      cssClass = '';
    }

    els.answers.className = 'answer-grid ci-answer-grid' + (cssClass ? ' ' + cssClass : '');
    els.answers.innerHTML = '';
    choices.forEach(function (choice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer-button';
      button.textContent = choice;
      button.addEventListener('click', function () { mark(choice, correctValue, button); });
      els.answers.appendChild(button);
    });
  }

  function renderTypedForm(question) {
    els.answers.hidden = true;
    els.typedForm.hidden = false;
    els.typedInput.value = '';
    els.typedInput.classList.remove('is-correct', 'is-wrong');
    els.typedInput.placeholder = question.recognitionType === 'roman' ? 'e.g. V' : 'e.g. D major';
    setTimeout(function () { els.typedInput.focus(); }, 0);
  }

  function renderAnswerControls(question, roundSettings) {
    var typed = roundSettings.answerMode === 'typed';
    if (roundSettings.answerMode === 'adaptive') {
      typed = state.streak >= 3 || (state.index > 2 && Math.random() < 0.4);
      if (state.typedErrors >= 2) typed = false;
    }
    // Roman-numeral and inversion answers always use buttons (spec section 21-22).
    if (question.recognitionType !== 'name') typed = false;

    if (typed) renderTypedForm(question);
    else renderMultipleChoice(question, roundSettings);
  }

  function showQuestion(forcedQuestion, seed) {
    // Chord questions are generated procedurally rather than drawn from a
    // fixed pool, so avoiding a repeat answer within the round means
    // retrying generation rather than removing an item from a list.
    var question = forcedQuestion || Core.buildQuestion(state.settings, state.results, Math.random);
    var attempts = 0;
    while (!forcedQuestion && state.usedAnswerSignatures.indexOf(Core.answerSignature(question)) !== -1 && attempts < 20) {
      question = Core.buildQuestion(state.settings, state.results, Math.random);
      attempts += 1;
    }
    state.usedAnswerSignatures.push(Core.answerSignature(question));
    state.current = question;
    state.currentSeed = seed || '';
    state.currentQuestionId = contractQuestionId || Core.questionId(question);
    state.answered = false;

    window.EAProgressEmbed?.questionReady({
      id: state.currentQuestionId,
      signature: Core.questionId(question),
      generatedQuestionId: Core.questionId(question),
      level: state.settings.difficulty
    });

    setQuestionPrompt(question);
    renderNotation(question);
    renderAnswerControls(question, state.settings);

    els.round.textContent = 'Question ' + (state.index + 1) + ' of ' + state.settings.count;
    els.progress.style.width = (state.index / state.settings.count * 100) + '%';
    els.next.disabled = true;

    // Auto-play the chord once as soon as the question appears, so students
    // hear it immediately rather than having to press Play Chord first. Not
    // chained onto anything else — a blocked/failed autoplay (e.g. no user
    // gesture yet on first load) should never stop the question from
    // rendering, so failures are swallowed here; Play Chord remains as a
    // manual fallback either way.
    Audio.playChord(question.displayPitches).catch(function () {});
  }

  function feedbackText(question, correct) {
    if (correct) {
      if (question.recognitionType === 'inversion') return 'Correct — ' + question.inversionLabel + '.';
      return 'Correct — ' + question.chordLabel + ' (' + question.romanNumeral + ' in ' + question.key.label + ').';
    }
    if (question.recognitionType === 'roman') return 'Not quite — the answer is ' + question.romanNumeral + '.';
    if (question.recognitionType === 'inversion') return 'Not quite — this is ' + question.inversionLabel + '.';
    return 'Not quite — the answer is ' + question.chordLabel + '.';
  }

  function ruleFor(question) {
    var toneNames = question.category === 'seventh' ? ['Root', 'Third', 'Fifth', 'Seventh'] : ['Root', 'Third', 'Fifth'];
    var bass = question.chordTones[question.inversion];
    var explain = question.inversion === 0
      ? 'The root (' + question.chordTones[0] + ') is the lowest sounding note, so this is root position.'
      : 'The ' + toneNames[question.inversion].toLowerCase() + ' (' + bass + ') is the lowest sounding note, so this is ' + question.inversionLabel + '.';
    return 'In ' + question.key.label + ', ' + question.root + ' is scale degree matching ' + question.romanNumeral + '. ' + explain;
  }

  function correctAnswerLabel(question) {
    if (question.recognitionType === 'roman') return question.romanNumeral;
    if (question.recognitionType === 'inversion') return question.inversionLabel;
    return question.chordLabel;
  }

  function renderInsight(question, correct, given) {
    var marksTotal = questionMarkTotal(question);
    var marksEarned = correct ? marksTotal : 0;
    var questionsAnswered = state.index + 1;
    var percent = Math.round((state.correct / questionsAnswered) * 100);

    els.insight.innerHTML =
      '<div class="answer-reveal ' + (correct ? 'is-correct' : 'is-wrong') + '">' +
        '<div class="diagnostic-metrics">' +
          '<div class="diagnostic-metric is-focus"><span>Chord mark</span><strong>' + marksEarned + ' / ' + marksTotal + '</strong></div>' +
          '<div class="diagnostic-metric is-focus"><span>Round score</span><strong>' + state.correct + ' / ' + questionsAnswered + '</strong></div>' +
        '</div>' +
        '<div class="diagnostic-card diagnostic-feedback-tile">' +
          '<span>Feedback</span>' +
          '<strong>' + escapeHTML(feedbackText(question, correct) + ' ' + ruleFor(question)) + '</strong>' +
        '</div>' +
        '<div class="diagnostic-card round-score-tile">' +
          '<span>Round score</span>' +
          '<strong>' + state.correct + ' / ' + questionsAnswered + '</strong>' +
          '<small>' + percent + '% · Question ' + questionsAnswered + ' of ' + state.settings.count + '</small>' +
          '<p>Your answer: ' + escapeHTML(given == null ? '—' : given) + ' · Correct: ' + escapeHTML(correctAnswerLabel(question)) + ' · ' + escapeHTML(question.chordTones.join(' ')) + ' · ' + escapeHTML(question.key.label) + '</p>' +
        '</div>' +
      '</div>';
  }

  function mark(givenValue, correctValue, button) {
    if (state.answered) return;
    state.answered = true;
    var question = state.current;
    var correct = Core.checkAnswer(question, givenValue);

    if (correct) {
      state.correct++; state.streak++; state.best = Math.max(state.best, state.streak);
      var isWritten = els.typedForm.hidden === false;
      state.xp += (isWritten ? 14 : 10) + Math.min(state.streak, 5) * 2;
      state.typedErrors = 0;
    } else {
      state.streak = 0;
      if (els.typedForm.hidden === false) state.typedErrors++;
    }

    state.results.push({
      correct: correct,
      recognitionType: question.recognitionType,
      category: question.category,
      mode: question.key.mode,
      isTriad: question.chordTones.length === 3,
      inversion: question.inversion,
      key: question.key.label,
      chordLabel: question.chordLabel
    });

    if (button) {
      Array.prototype.forEach.call(els.answers.querySelectorAll('.answer-button'), function (b) {
        b.disabled = true;
        if (b.textContent === correctValue) b.classList.add('correct');
      });
      if (!correct) button.classList.add('incorrect');
    } else {
      els.typedInput.disabled = true;
      els.typedInput.classList.add(correct ? 'is-correct' : 'is-wrong');
    }

    els.score.textContent = 'Mark: ' + state.correct + ' / ' + (state.index + 1);
    els.next.disabled = false;
    els.next.focus();

    renderInsight(question, correct, givenValue);
    window.EAProgressEmbed?.answerComplete({
      questionId: state.currentQuestionId,
      generatedQuestionId: Core.questionId(question),
      score: correct ? questionMarkTotal(question) : 0,
      maximumScore: questionMarkTotal(question),
      correct: correct,
      responseType: els.typedForm.hidden === false ? 'typed' : 'multiple-choice',
      answerData: givenValue,
      modelAnswer: correctValue,
      feedback: feedbackText(question, correct),
      inversionLabel: question.inversionLabel,
      quality: question.quality,
      recognitionType: question.recognitionType,
      category: question.category,
      keyMode: question.key.mode
    });
  }

  function next() {
    if (state.index + 1 >= state.settings.count) return finish();
    state.index++;
    els.typedInput.disabled = false;
    showQuestion();
  }

  // True once a Live Session host has loaded its first question through the
  // contract — distinguishes "boot the round" from "load another question
  // into an already-running round."
  var contractSessionStarted = false;

  function loadQuestionBySeed(payload) {
    var details = payload && typeof payload === 'object' ? payload : {};
    var seed = details.seed !== undefined ? details.seed : details.questionId;
    if (seed === undefined || seed === null || seed === '') return false;
    var level = details.level || details.difficulty || (state && state.settings && state.settings.difficulty) || 'foundation';
    var roundSettings = Core.settingsForLevel(level, details.settings || details);
    var question = Core.buildQuestionFromSeed(seed, roundSettings, []);
    contractQuestionId = String(details.questionId || Core.questionId(question));
    if (!contractSessionStarted) {
      contractSessionStarted = true;
      beginRound(roundSettings, question, seed);
    } else {
      state.settings = roundSettings;
      showQuestion(question, seed);
    }
    return true;
  }

  window.EAProgressEmbed?.registerQuestionHandler(function (payload) {
    loadQuestionBySeed(payload);
  });

  function breakdownBy(keyFn) {
    var groups = {};
    state.results.forEach(function (r) {
      var key = keyFn(r);
      groups[key] = groups[key] || { right: 0, total: 0 };
      groups[key].total++;
      if (r.correct) groups[key].right++;
    });
    return groups;
  }

  function summariseGroups(groups) {
    return Object.keys(groups).map(function (key) {
      var g = groups[key];
      return key + ': ' + Math.round((g.right / g.total) * 100) + '%';
    }).join(' · ');
  }

  function weaknessSummary() {
    var byCategory = breakdownBy(function (r) { return r.category === 'primary' ? 'primary chords' : r.category === 'seventh' ? 'seventh chords' : 'secondary chords'; });
    var byMode = breakdownBy(function (r) { return r.mode === 'minor' ? 'minor-key chords' : 'major-key chords'; });
    var byInversion = breakdownBy(function (r) { return r.inversion === 0 ? 'root position' : 'inversions'; });
    var weak = [];
    [byCategory, byMode, byInversion].forEach(function (groups) {
      Object.keys(groups).forEach(function (key) {
        var g = groups[key];
        if (g.total >= 2 && g.right / g.total < 0.6) weak.push(key);
      });
    });
    return weak;
  }

  function finish() {
    els.panel.classList.remove('is-active'); els.panel.classList.add('is-complete');
    els.play.hidden = true; els.results.hidden = false;
    els.progress.style.width = '100%';
    els.round.textContent = 'Session complete';

    var percent = Math.round((state.correct / state.settings.count) * 100);
    var byRecognition = breakdownBy(function (r) { return r.recognitionType; });
    var byQuality = breakdownBy(function (r) { return r.isTriad ? 'triads' : 'seventh chords'; });
    var weak = weaknessSummary();

    els.results.innerHTML =
      '<p class="eyebrow">SESSION SUMMARY</p><h2>Session complete</h2>' +
      '<div class="result-score">' + percent + '%</div>' +
      '<div class="result-grid">' +
        '<div><strong>' + state.correct + '/' + state.settings.count + '</strong>Correct</div>' +
        '<div><strong>' + state.best + '</strong>Best streak</div>' +
        '<div><strong>' + state.xp + '</strong>XP gained</div>' +
        '<div><strong>' + (summariseGroups(byRecognition) || '—') + '</strong>By question type</div>' +
        '<div><strong>' + (summariseGroups(byQuality) || '—') + '</strong>Triads vs sevenths</div>' +
      '</div>' +
      (weak.length ? '<div class="weakness-box"><strong>Needs practice:</strong><br>' + weak.map(escapeHTML).join(', ') + '</div>' : '') +
      '<div class="result-actions"><button id="playAgainButton" class="primary-button" type="button">Play Again</button><button id="changeSettingsButton" class="secondary-button" type="button">Change Settings</button></div>';

    $('playAgainButton').addEventListener('click', start);
    $('changeSettingsButton').addEventListener('click', function () {
      els.results.hidden = true; els.ready.hidden = false;
      els.panel.classList.remove('is-complete'); els.panel.classList.add('is-ready');
      setSettingsLocked(false);
    });
  }

  /**
   * Freeze the LHS skill + level selection while a round is active/complete
   * (matches Instrument Identifier's setup-panel.is-settings-locked pattern,
   * section: Harmony Explorer parity). Snapshotting `.is-selected` BEFORE
   * disabling the inputs means the purple "selected" chrome doesn't depend
   * only on `:has(input:checked)`, which is the same reasoning II's own
   * comment gives for why it does this instead of just `disabled = true`.
   */
  function setSettingsLocked(locked) {
    var setupPanel = document.querySelector('.setup-panel');
    if (setupPanel) {
      setupPanel.classList.toggle('is-settings-locked', locked);
      if (locked) setupPanel.setAttribute('aria-disabled', 'true');
      else setupPanel.removeAttribute('aria-disabled');
    }
    if (locked) {
      document.querySelectorAll('[name="skill"], [name="difficulty"]').forEach(function (input) {
        var label = input.closest('label');
        if (label) label.classList.toggle('is-selected', input.checked);
      });
    }
    document.querySelectorAll('[name="skill"], [name="difficulty"]').forEach(function (input) { input.disabled = locked; });
  }

  function beginRound(roundSettings, initialQuestion, seed) {
    state = { settings: roundSettings, index: 0, correct: 0, streak: 0, best: 0, xp: 0, typedErrors: 0, results: [], current: null, currentSeed: '', currentQuestionId: '', answered: false, usedAnswerSignatures: [] };

    setSettingsLocked(true);
    els.panel.classList.remove('is-ready', 'is-complete'); els.panel.classList.add('is-active');
    els.score.textContent = 'Mark: 0 / 0';
    els.ready.hidden = true; els.results.hidden = true; els.play.hidden = false;
    els.typedInput.disabled = false;
    Audio.unlock();
    showQuestion(initialQuestion, seed);
  }

  function start() {
    contractQuestionId = '';
    beginRound(settings());
  }

  function setAdvancedOpen(open) {
    els.advanced.hidden = !open;
    els.advancedToggle.setAttribute('aria-expanded', String(open));
  }

  els.advancedToggle.addEventListener('click', function (event) { event.stopPropagation(); setAdvancedOpen(els.advanced.hidden); });
  els.advanced.addEventListener('click', function (event) { event.stopPropagation(); });
  document.addEventListener('click', function () { setAdvancedOpen(false); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !els.advanced.hidden) { setAdvancedOpen(false); els.advancedToggle.focus(); }
  });

  var CONSOLE_SKILL_ICONS = {
    'key-signatures': 'assets/ui/key-signatures-transparent.png',
    'chord-identifier': 'assets/ui/chord-identifier-skill-transparent.png'
  };
  var DEFAULT_CONSOLE_ICON = 'assets/ui/harmony-explorer.png';
  var consoleSkillIcon = $('consoleSkillIcon');

  function syncConsoleSkillIcon() {
    if (!consoleSkillIcon) return;
    var checked = document.querySelector('[name="skill"]:checked');
    consoleSkillIcon.src = checked ? (CONSOLE_SKILL_ICONS[checked.value] || DEFAULT_CONSOLE_ICON) : DEFAULT_CONSOLE_ICON;
  }

  /** Start cannot begin until the user has explicitly picked both a skill and a level. */
  function updateStartAvailability() {
    var hasSkill = !!document.querySelector('[name="skill"]:checked');
    var hasLevel = !!document.querySelector('[name="difficulty"]:checked');
    els.start.disabled = !(hasSkill && hasLevel);
  }

  /** Centre-panel heading: "Learning" until a skill is chosen, then that
   *  skill's short name (matching its own skill-button label). */
  var SKILL_HEADING_LABELS = {
    'key-signatures': 'Keys',
    'chord-identifier': 'Chords'
  };
  var centreHeadingLabel = $('centreHeadingLabel');
  function updateCentreHeading() {
    if (!centreHeadingLabel) return;
    var checked = document.querySelector('[name="skill"]:checked');
    centreHeadingLabel.textContent = checked ? (SKILL_HEADING_LABELS[checked.value] || 'Learning') : 'Learning';
  }

  /** Big console title text: the suite wordmark ("Harmony"/"Explorer") until
   *  a skill is chosen, then that skill's short name in the app's own accent
   *  colour (matching the console icon's swap behaviour). */
  var consoleTitleMain = $('consoleTitleMain');
  var consoleTitleGradient = $('consoleTitleGradient');
  var DEFAULT_TITLE_MAIN = consoleTitleMain ? consoleTitleMain.textContent : '';
  var DEFAULT_TITLE_GRADIENT = consoleTitleGradient ? consoleTitleGradient.textContent : '';
  function updateConsoleTitle() {
    if (!consoleTitleMain || !consoleTitleGradient) return;
    var checked = document.querySelector('[name="skill"]:checked');
    if (checked) {
      consoleTitleMain.textContent = '';
      consoleTitleGradient.textContent = SKILL_HEADING_LABELS[checked.value] || checked.value;
      consoleTitleGradient.classList.add('is-skill-active');
    } else {
      consoleTitleMain.textContent = DEFAULT_TITLE_MAIN;
      consoleTitleGradient.textContent = DEFAULT_TITLE_GRADIENT;
      consoleTitleGradient.classList.remove('is-skill-active');
    }
  }

  // Launched from Harmony Explorer's "Chord Identifier" skill tile: pre-select
  // the skill and whatever level was chosen on that screen BEFORE the sync/
  // autostart calls below run — without this, arriving via Harmony Explorer
  // always silently started at Foundation regardless of the level picked
  // there, since neither skill nor difficulty was ever actually checked here.
  // Harmony Explorer's own level values ("secure"/"exam") don't match this
  // app's own difficulty radio values ("securing"/"mastering"), hence the map.
  (function applyHarmonyExplorerLaunchParams() {
    var launchParams = new URLSearchParams(window.location.search);
    if (launchParams.get('autostart') !== '1') return;
    var skillInput = document.querySelector('[name="skill"][value="chord-identifier"]');
    if (skillInput) skillInput.checked = true;
    var LEVEL_MAP = { foundation: 'foundation', developing: 'developing', secure: 'securing', exam: 'mastering' };
    var requestedLevel = LEVEL_MAP[launchParams.get('level')];
    var levelInput = requestedLevel && document.querySelector('[name="difficulty"][value="' + requestedLevel + '"]');
    if (levelInput) levelInput.checked = true;
  })();

  document.querySelectorAll('[name="difficulty"]').forEach(function (input) {
    input.addEventListener('change', function () { syncSettingsAvailability(); updateStartAvailability(); });
  });
  document.querySelectorAll('[name="skill"]').forEach(function (input) {
    input.addEventListener('change', function () {
      // Locked mid-round: inputs are disabled/inert — no-op if a change slips through.
      var setupPanel = document.querySelector('.setup-panel');
      if (setupPanel && setupPanel.classList.contains('is-settings-locked')) {
        var chordInput = document.querySelector('[name="skill"][value="chord-identifier"]');
        if (chordInput) chordInput.checked = true;
        return;
      }
      // "Keys" isn't implemented here — it's Harmony Explorer's other skill,
      // same cross-link pattern as Instrument Identifier <-> Ensemble Recognition.
      if (input.value === 'key-signatures' && input.checked) {
        window.location.href = '../harmony-explorer/key-signature-sprint/index.html';
        return;
      }
      updateStartAvailability(); syncConsoleSkillIcon(); updateCentreHeading(); updateConsoleTitle();
    });
  });
  syncSettingsAvailability();
  updateStartAvailability();
  syncConsoleSkillIcon();
  updateCentreHeading();
  updateConsoleTitle();

  els.start.addEventListener('click', start);
  els.next.addEventListener('click', next);
  els.typedForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = els.typedInput.value.trim();
    if (!value) return;
    var question = state.current;
    var correctValue = question.recognitionType === 'roman' ? question.romanNumeral : question.chordLabel;
    mark(value, correctValue, null);
  });

  els.playChord.addEventListener('click', function () {
    if (!state || !state.current) return;
    Audio.playChord(state.current.displayPitches);
  });
  els.arpeggiate.addEventListener('click', function () {
    if (!state || !state.current) return;
    Audio.arpeggiateChord(state.current.displayPitches);
  });

  // Launched from Harmony Explorer's "Chord Identifier" skill tile: skip the
  // extra manual Start click, matching key-signature-sprint's own pattern.
  if (new URLSearchParams(window.location.search).get('autostart') === '1') start();
})();
