/**
 * Transposition Dictation — script.js
 *
 * UI orchestration only. Question CONTENT lives in data/questions.js (a
 * fixed set — not generated); stave layout math lives in js/stave-engine.js.
 * This file wires the two together: play the real recording, render the
 * source excerpt in its original clef, render 4 candidate transcriptions in
 * the target clef as clickable options, and score the round.
 */
(function () {
  'use strict';

  var Stave = window.EATranspositionStave;
  var KeysData = window.EAChordKeys;
  var QUESTIONS = window.EATranspositionQuestions;

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    start: $('startButton'),
    ready: $('readyState'),
    play: $('playState'),
    results: $('resultsState'),
    sourceNotation: $('sourceNotation'),
    sourceCaption: $('sourceCaption'),
    answers: $('answers'),
    next: $('nextButton'),
    question: $('questionText'),
    round: $('roundText'),
    score: $('scoreText'),
    progress: $('progressBar'),
    insight: $('insightContent'),
    playClip: $('playClipButton'),
    panel: $('questionPanel')
  };

  var shuffle = function (items) {
    var arr = items.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  var escapeHTML = function (value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  };

  var CLEF_LABEL = { treble: 'treble clef', alto: 'alto clef', bass: 'bass clef' };

  var state = null;
  var audioEl = null;

  function renderStaveInto(container, clef, keyId, notes) {
    var plan = Stave.buildRenderPlan({ clef: clef, keyId: keyId, notes: notes.map(function (p) { return { pitch: p }; }) }, KeysData);
    var html = '';
    if (plan.mode === 'grand') {
      html += '<img class="td-stave-bg" src="' + plan.staveAsset + '" alt="" draggable="false">';
    } else {
      plan.lineYs.forEach(function (y) {
        html += '<div class="td-stave-line" style="top:' + (y / plan.canvasHeight * 100) + '%"></div>';
      });
      html += '<img class="td-clef-glyph" src="' + plan.clefSrc + '" alt="" style="left:' + plan.clefGlyph.xPct + '%;top:' + plan.clefGlyph.yPct + '%;width:' + plan.clefGlyph.widthPct + '%;height:' + plan.clefGlyph.heightPct + '%;">';
    }
    plan.notes.forEach(function (note) {
      note.ledgers.forEach(function (ledger) {
        html += '<span class="td-note-ledger" style="left:' + ledger.xPct + '%;top:' + ledger.yPct + '%;width:' + ledger.widthPct + '%;"></span>';
      });
      if (note.accidental) {
        html += '<img class="td-note-accidental" src="' + note.accidental.src + '" alt="" style="left:' + note.accidental.xPct + '%;top:' + note.accidental.yPct + '%;width:' + note.accidental.widthPct + '%;height:' + note.accidental.heightPct + '%;">';
      }
      html += '<img class="td-note-head" src="' + note.src + '" alt="" style="left:' + note.xPct + '%;top:' + note.yPct + '%;width:' + note.widthPct + '%;height:' + note.heightPct + '%;">';
    });
    container.innerHTML = html;
  }

  function buildAnswerChoices(question) {
    var correct = { notes: question.answerNotes, isCorrect: true, label: 'Correct' };
    var wrong = question.distractors.map(function (d) { return { notes: d.notes, isCorrect: false, label: d.label }; });
    return shuffle([correct].concat(wrong));
  }

  function showQuestion() {
    var question = QUESTIONS[state.index];
    state.current = question;
    state.answered = false;

    els.question.querySelector('.question-prompt').textContent =
      'Which option correctly transcribes this into ' + CLEF_LABEL[question.targetClef] + '?';
    els.sourceCaption.textContent = question.title + ' — ' + question.performer;

    els.sourceNotation.parentElement.classList.toggle('td-stave-stage-alto', question.sourceClef === 'alto');
    renderStaveInto(els.sourceNotation, question.sourceClef, question.keyId, question.sourceNotes);

    audioEl = new Audio(question.audioSrc);
    els.playClip.disabled = false;

    var choices = buildAnswerChoices(question);
    state.currentChoices = choices;
    els.answers.innerHTML = '';
    choices.forEach(function (choice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'td-answer-stave-button';
      var staveHost = document.createElement('div');
      staveHost.className = 'td-stave-stage td-stave-stage-small' + (question.targetClef === 'alto' ? ' td-stave-stage-alto' : '');
      var staveInner = document.createElement('div');
      staveInner.className = 'td-stave-inner';
      staveHost.appendChild(staveInner);
      button.appendChild(staveHost);
      button.addEventListener('click', function () { mark(choice, button); });
      els.answers.appendChild(button);
      renderStaveInto(staveInner, question.targetClef, question.keyId, choice.notes);
    });

    els.round.textContent = 'Question ' + (state.index + 1) + ' of ' + QUESTIONS.length;
    els.progress.style.width = (state.index / QUESTIONS.length * 100) + '%';
    els.next.disabled = true;
  }

  function renderInsight(question, correct, chosenLabel) {
    var questionsAnswered = state.index + 1;
    els.insight.innerHTML =
      '<div class="answer-reveal ' + (correct ? 'is-correct' : 'is-wrong') + '">' +
        '<div class="diagnostic-metrics">' +
          '<div class="diagnostic-metric is-focus"><span>Round score</span><strong>' + state.correct + ' / ' + questionsAnswered + '</strong></div>' +
        '</div>' +
        '<div class="diagnostic-card diagnostic-feedback-tile">' +
          '<span>Feedback</span>' +
          '<strong>' + (correct
            ? 'Correct — that’s the same pitches, correctly respelled in ' + CLEF_LABEL[question.targetClef] + '.'
            : escapeHTML('Not quite — that option was: ' + chosenLabel + '.')) + '</strong>' +
        '</div>' +
        '<div class="diagnostic-card round-score-tile">' +
          '<span>Source</span>' +
          '<strong>' + escapeHTML(question.title) + '</strong>' +
          '<small>' + escapeHTML(question.performer) + '</small>' +
        '</div>' +
      '</div>';
  }

  function mark(choice, button) {
    if (state.answered) return;
    state.answered = true;
    var question = state.current;

    if (choice.isCorrect) { state.correct++; }

    var buttons = els.answers.querySelectorAll('.td-answer-stave-button');
    Array.prototype.forEach.call(buttons, function (b, i) {
      b.disabled = true;
      if (state.currentChoices[i].isCorrect) b.classList.add('is-correct');
    });
    if (!choice.isCorrect) button.classList.add('is-incorrect');

    els.score.textContent = 'Mark: ' + state.correct + ' / ' + (state.index + 1);
    els.next.disabled = false;
    els.next.focus();

    renderInsight(question, choice.isCorrect, choice.label);
  }

  function next() {
    if (state.index + 1 >= QUESTIONS.length) return finish();
    state.index++;
    showQuestion();
  }

  function finish() {
    els.panel.classList.remove('is-active'); els.panel.classList.add('is-complete');
    els.play.hidden = true; els.results.hidden = false;
    els.progress.style.width = '100%';
    els.round.textContent = 'Session complete';

    var percent = Math.round((state.correct / QUESTIONS.length) * 100);
    els.results.innerHTML =
      '<p class="eyebrow">SESSION SUMMARY</p><h2>Session complete</h2>' +
      '<div class="result-score">' + percent + '%</div>' +
      '<div class="result-grid">' +
        '<div><strong>' + state.correct + '/' + QUESTIONS.length + '</strong>Correct</div>' +
      '</div>' +
      '<div class="result-actions"><button id="playAgainButton" class="primary-button" type="button">Play Again</button></div>';

    $('playAgainButton').addEventListener('click', start);
  }

  function start() {
    state = { index: 0, correct: 0, current: null, answered: false };
    els.panel.classList.remove('is-ready', 'is-complete'); els.panel.classList.add('is-active');
    els.score.textContent = 'Mark: 0 / 0';
    els.ready.hidden = true; els.results.hidden = true; els.play.hidden = false;
    showQuestion();
  }

  els.start.addEventListener('click', start);
  els.next.addEventListener('click', next);
  els.playClip.addEventListener('click', function () {
    if (!audioEl) return;
    audioEl.currentTime = 0;
    audioEl.play();
  });

  // Skill grid is decorative branding (matches Chord Identifier's own
  // sidebar) except "Chords", which is a real, different app — clicking it
  // navigates there. "Transposition" stays checked since it's this app.
  var chordsSkillInput = document.querySelector('[name="skill"][value="chord-identifier"]');
  if (chordsSkillInput) {
    chordsSkillInput.addEventListener('change', function () {
      window.location.href = '../chord-identifier/index.html';
    });
  }
})();
