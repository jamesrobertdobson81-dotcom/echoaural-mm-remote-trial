(function () {
  'use strict';
  const data = window.EAKeySignatureSprintData;
  const questionCore = window.EAKeySignatureSprintCore;
  const $ = (id) => document.getElementById(id);
  const els = { panel:$('questionPanel'), start:$('startButton'), advanced:$('advancedSettings'), advancedToggle:$('advancedToggle'), ready:$('readyState'), play:$('playState'), results:$('resultsState'), notation:$('notation'), answers:$('answers'), typedForm:$('typedForm'), typedInput:$('typedInput'), feedback:$('feedback'), next:$('nextButton'), question:$('questionText'), questionMarks:$('questionMarks'), round:$('roundText'), score:$('scoreText'), streak:$('streakText'), xp:$('xpText'), progress:$('progressBar'), insight:$('insightContent') };
  let state = null;
  const random = (items) => items[Math.floor(Math.random() * items.length)];
  const shuffle = (items) => items.slice().sort(() => Math.random() - .5);
  const selected = (name) => document.querySelector(`[name="${name}"]:checked`)?.value;
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[character]));

  const launchParams = new URLSearchParams(window.location.search);
  const requestedDifficulty = launchParams.get('level');
  if (data.LEVELS[requestedDifficulty]) {
    const requestedOption = document.querySelector(`[name="difficulty"][value="${requestedDifficulty}"]`);
    if (requestedOption) requestedOption.checked = true;
  }

  function applyLaunchSetting(name, value) {
    if (!value) return;
    const radio = document.querySelector(`[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  applyLaunchSetting('questionCount', launchParams.get('questions'));
  [['clefSetting','clef'],['keyFocus','focus'],['answerMode','answers'],['accidentalRange','accidentals']].forEach(([id,param]) => {
    const value = launchParams.get(param);
    if (value && Array.from($(id).options).some((option) => option.value === value)) $(id).value = value;
  });

  function settings() {
    const difficulty = selected('difficulty') || 'foundation';
    return { difficulty, count:Number(selected('questionCount') || 5), clef:$('clefSetting').value, focus:$('keyFocus').value, answerMode:$('answerMode').value, range:$('accidentalRange').value };
  }

  function buildSignatureDeck(pool, count, key) {
    const SR = window.EchoAuralSpacedRepetition;
    if (!SR) return Array.from({ length: count }, () => random(pool));
    let deck = SR.orderByLeastRecentlyShown(pool, { key, idOf: (signature) => signature.id });
    while (deck.length < count) deck = deck.concat(shuffle(pool));
    deck = deck.slice(0, count);
    SR.markShown(deck, { key, idOf: (signature) => signature.id });
    return deck;
  }

  function makeQuestion(index) {
    const config = data.LEVELS[state.settings.difficulty];
    const signature = state.signatureDeck[index];
    let types = config.types.slice();
    if (state.settings.focus === 'major') types = types.filter((type) => type !== 'minor');
    if (state.settings.focus === 'minor') types = types.filter((type) => type !== 'major');
    const type = random(types.length ? types : ['major']);
    const clefs = state.settings.clef === 'auto' ? config.clefs : [state.settings.clef];
    let typed = state.settings.answerMode === 'typed';
    if (state.settings.answerMode === 'adaptive') typed = state.streak >= 3 || (index > 2 && Math.random() < config.writtenChance);
    if (state.typedErrors >= 2) typed = false;

    let target = type;
    let prompt;
    if (type === 'relative') {
      target = state.settings.focus === 'major' ? 'major' : state.settings.focus === 'minor' ? 'minor' : random(['major','minor']);
      prompt = target === 'minor'
        ? `What is the relative minor of ${signature.majorLabel}?`
        : `What is the relative major of ${signature.minorLabel}?`;
    } else {
      prompt = target === 'major' ? 'What is this major key signature?' : 'What is this minor key signature?';
    }
    const answer = target === 'major' ? signature.majorLabel : signature.minorLabel;
    return { signature, type, target, clef:random(clefs), typed, prompt, answer };
  }

  // Each clef/key-signature combination is a real Sibelius export (clef + key
  // signature sat on a stave), cropped to a shared frame per clef so the card
  // never resizes or jitters as the signature changes.
  const KEYSIG_ASSET_BASE = '../../../assets/icons/notation/keysig/';

  function signatureAssetPath(signature, clef) {
    const clefName = clef === 'bass' ? 'bass' : 'treble';
    if (!signature.count) return `${KEYSIG_ASSET_BASE}${clefName}-natural-0.png`;
    return `${KEYSIG_ASSET_BASE}${clefName}-${signature.type}-${signature.count}.png`;
  }

  function signatureMarkup(signature, clef) {
    return `<img class="he-key-stave-img" src="${signatureAssetPath(signature, clef)}" alt="" draggable="false">`;
  }

  // Mirrors Melodic Intervals' question-marks display; every question here asks for
  // a single key name, so all are worth 1 mark.
  function questionMarkTotal() {
    return 1;
  }

  function setQuestionPrompt(question) {
    const promptEl = els.question.querySelector('.mi-question-prompt') || els.question;
    promptEl.textContent = question ? question.prompt : '';
    const marks = question ? questionMarkTotal(question) : 0;
    if (els.questionMarks) {
      if (marks > 0) {
        els.questionMarks.textContent = ` (${marks})`;
        els.questionMarks.hidden = false;
        els.questionMarks.setAttribute('aria-hidden', 'false');
        els.questionMarks.setAttribute('aria-label', `${marks} mark${marks === 1 ? '' : 's'}`);
      } else {
        els.questionMarks.textContent = '';
        els.questionMarks.hidden = true;
        els.questionMarks.setAttribute('aria-hidden', 'true');
        els.questionMarks.removeAttribute('aria-label');
      }
    }
  }

  function distractors(question) {
    if (Array.isArray(question.choices) && question.choices.length) return question.choices.slice();
    const idx=data.SIGNATURES.indexOf(question.signature);
    const total=data.SIGNATURES.length;
    const at=(offset)=>data.SIGNATURES[((idx+offset)%total+total)%total];
    const nearby=[at(-1),at(1),at(4)];
    const label=(sig)=>question.target==='major'?sig.majorLabel:sig.minorLabel;
    return shuffle([question.answer,...nearby.map(label)]);
  }

  function showQuestion() {
    state.current=state.seededQuestion || makeQuestion(state.index); state.seededQuestion=null; state.answered=false;
    window.EAProgressEmbed?.questionReady({id:state.current.id || `key-signature:${state.current.clef}:${state.current.signature.type}:${state.current.signature.count}:${state.current.target}`,level:state.settings.difficulty});
    setQuestionPrompt(state.current);
    els.notation.innerHTML=signatureMarkup(state.current.signature,state.current.clef);
    els.notation.setAttribute('aria-label',`${state.current.clef} clef key signature with ${state.current.signature.displayLabel.toLowerCase()}`);
    els.round.textContent=`Question ${state.index+1} of ${state.settings.count}`;
    els.progress.style.width=`${state.index/state.settings.count*100}%`;
    els.feedback.textContent=''; els.feedback.className='feedback'; els.next.disabled=true;
    els.answers.innerHTML=''; els.answers.hidden=state.current.typed; els.typedForm.hidden=!state.current.typed;
    if(state.current.typed){els.typedInput.value='';els.typedInput.classList.remove('is-correct','is-wrong');setTimeout(()=>els.typedInput.focus(),0)}else distractors(state.current).forEach((answer)=>{const button=document.createElement('button');button.type='button';button.className='answer-button';button.textContent=answer;button.addEventListener('click',()=>mark(answer,button));els.answers.append(button)});
  }

  function ruleFor(signature) {
    if(signature.type==='sharp') return 'The final sharp sits one semitone below the major tonic.';
    if(signature.type==='flat'&&signature.count>1) return 'The second-to-last flat names the major key.';
    if(signature.type==='flat') return 'One flat is F major or D minor.';
    return 'No accidentals represents C major or A minor.';
  }

  function mark(answer, button) {
    if(state.answered)return; state.answered=true;
    const q=state.current; const expected=q.answer;
    const correct=data.acceptable(answer,expected,q.target);
    if(correct){state.correct++;state.streak++;state.best=Math.max(state.best,state.streak);state.xp+=10+Math.min(state.streak,5)*2;state.typedErrors=q.typed?0:Math.max(0,state.typedErrors-1)}else{state.streak=0;if(q.typed)state.typedErrors++}
    state.results.push({correct,type:q.type,signature:q.signature,typed:q.typed});
    document.querySelectorAll('.answer-button').forEach((item)=>{item.disabled=true;if(item.textContent===q.answer)item.classList.add('correct')});
    if(button&&!correct)button.classList.add('incorrect');
    els.typedInput.disabled=q.typed;
    if(q.typed){els.typedInput.classList.toggle('is-correct',correct);els.typedInput.classList.toggle('is-wrong',!correct)}
    els.feedback.textContent=correct?`Correct — ${q.signature.pairLabel} share this signature.`:`Not quite — the answer is ${q.answer}.`;
    els.feedback.classList.add(correct?'correct':'incorrect');
    els.score.textContent=`Mark: ${state.correct} / ${state.index+1}`;els.streak.textContent=state.streak;els.xp.textContent=state.xp;els.next.disabled=false;els.next.focus();
    els.insight.className='answerCard';
    els.insight.innerHTML=`
      <div class="answer-reveal ${correct?'is-correct':'is-wrong'}">
        <div class="answer-status-line">
          <span class="answer-status-dot" aria-hidden="true"></span>
          <p class="${correct?'good':'bad'}">${correct?'Correct':'Not quite'}</p>
        </div>
        <div class="answer-title-block">
          <p class="eyebrow">KEY SIGNATURE</p>
          <h2>${correct?'1 / 1':'0 / 1'}</h2>
        </div>
        <div class="answer-meta-card">
          <div class="meta-row"><span>Feedback</span><strong>${escapeHTML(correct?`${q.signature.pairLabel} share this signature.`:`The correct answer is ${q.answer}.`)}</strong></div>
          <div class="meta-row"><span>Your answer</span><strong>${escapeHTML(answer||'—')}</strong></div>
          <div class="meta-row"><span>Correct answer</span><strong>${escapeHTML(q.answer)}</strong></div>
          <div class="meta-row"><span>Remember</span><strong>${escapeHTML(ruleFor(q.signature))}</strong></div>
        </div>
      </div>`;
    window.EAProgressEmbed?.answerComplete({questionId:`key-signature:${q.clef}:${q.signature.type}:${q.signature.count}:${q.target}`,score:correct?1:0,maximumScore:1,correct,responseType:q.typed?'typed':'multiple-choice',answerData:answer,modelAnswer:q.answer,feedback:els.feedback.textContent,accidentalType:q.signature.type,accidentalCount:q.signature.count,type:q.type,clef:q.clef});
  }

  // Live Sessions and the server adapter both call the same isomorphic
  // generator. This makes the rendered signature and the scored answer a
  // deterministic function of (seed, level), rather than two implementations
  // which merely happen to enumerate similar content.
  function loadQuestionBySeed(seed, payload) {
    if (seed === undefined || seed === null || seed === '') return false;
    const requestedLevel = questionCore.appLevel(payload && payload.level);
    const requestedOption = document.querySelector(`[name="difficulty"][value="${requestedLevel}"]`);
    if (requestedOption) requestedOption.checked = true;
    const roundSettings = settings();
    const question = questionCore.buildQuestion(data, seed, {
      level: requestedLevel,
      focus: roundSettings.focus,
      clef: roundSettings.clef,
      range: roundSettings.range,
      answerMode: 'choice'
    });
    state={settings:{...roundSettings,difficulty:requestedLevel,count:1},index:0,correct:0,streak:0,best:0,xp:0,typedErrors:0,results:[],signatureDeck:[question.signature],seededQuestion:question};
    setSettingsLocked(true);els.panel.classList.remove('is-ready','is-complete');els.panel.classList.add('is-active');els.score.textContent='Mark: 0 / 0';els.ready.hidden=true;els.results.hidden=true;els.play.hidden=false;els.typedInput.disabled=false;showQuestion();
    return true;
  }

  window.EAProgressEmbed?.registerQuestionHandler((payload) => {
    const seed = payload && (payload.seed !== undefined ? payload.seed : payload.questionId);
    loadQuestionBySeed(seed, payload || {});
  });

  function finish() {
    els.panel.classList.remove('is-active');els.panel.classList.add('is-complete');els.play.hidden=true;els.results.hidden=false;els.progress.style.width='100%';els.round.textContent='Sprint complete';
    const percent=Math.round(state.correct/state.settings.count*100);const types={};const accidentalGroups={sharp:{right:0,total:0},flat:{right:0,total:0},natural:{right:0,total:0}};state.results.forEach((r)=>{types[r.type]??={right:0,total:0};types[r.type].total++;accidentalGroups[r.signature.type].total++;if(r.correct){types[r.type].right++;accidentalGroups[r.signature.type].right++}});
    const weak=state.results.filter((r)=>!r.correct).map((r)=>r.signature.pairLabel).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3);
    const typeSummary=Object.entries(types).map(([key,v])=>`${key}: ${Math.round(v.right/v.total*100)}%`).join(' · ');const accidentalSummary=Object.entries(accidentalGroups).filter(([,v])=>v.total).map(([key,v])=>`${key==='natural'?'none':key}: ${Math.round(v.right/v.total*100)}%`).join(' · ');
    els.results.innerHTML=`<p class="eyebrow">SESSION SUMMARY</p><h2>Sprint complete</h2><div class="result-score">${percent}%</div><div class="result-grid"><div><strong>${state.correct}/${state.settings.count}</strong><br>Correct</div><div><strong>${state.best}</strong><br>Best streak</div><div><strong>${state.xp}</strong><br>XP gained</div><div><strong>${typeSummary||'—'}</strong><br>By question type</div><div><strong>${accidentalSummary||'—'}</strong><br>Sharps · flats · none</div></div><p>${weak.length?`Practise next: ${weak.join('; ')}.`:'Excellent — no key signatures need immediate review.'}</p><div class="result-actions"><button id="playAgain" class="primary">Restart sprint</button><a href="../index.html">Harmony Explorer</a></div>`;
    $('playAgain').addEventListener('click',start);
  }

  function next(){if(state.index+1>=state.settings.count)return finish();state.index++;els.typedInput.disabled=false;showQuestion()}

  // Freeze the LHS skill + level selection while a round is active/complete
  // (matches Instrument Identifier's setup-panel.is-settings-locked pattern,
  // section: Harmony Explorer parity). Snapshotting `.is-selected` BEFORE
  // disabling the inputs means the selected chrome doesn't depend only on
  // `:has(input:checked)`.
  function setSettingsLocked(locked) {
    const setupPanel = document.querySelector('.setup-panel');
    if (setupPanel) {
      setupPanel.classList.toggle('is-settings-locked', locked);
      if (locked) setupPanel.setAttribute('aria-disabled', 'true');
      else setupPanel.removeAttribute('aria-disabled');
    }
    if (locked) {
      document.querySelectorAll('[name="skill"], [name="difficulty"]').forEach((input) => {
        const label = input.closest('label');
        if (label) label.classList.toggle('is-selected', input.checked);
      });
    }
    document.querySelectorAll('[name="skill"], [name="difficulty"]').forEach((input) => { input.disabled = locked; });
  }

  function start(){const roundSettings=settings();const config=data.LEVELS[roundSettings.difficulty];const pool=data.pool(config.maxAccidentals,roundSettings.range);const spacedKey=`he-ks:${roundSettings.difficulty}:${roundSettings.range}`;state={settings:roundSettings,index:0,correct:0,streak:0,best:0,xp:0,typedErrors:0,results:[],signatureDeck:buildSignatureDeck(pool,roundSettings.count,spacedKey)};setSettingsLocked(true);els.panel.classList.remove('is-ready','is-complete');els.panel.classList.add('is-active');els.score.textContent='Mark: 0 / 0';els.ready.hidden=true;els.results.hidden=true;els.play.hidden=false;els.typedInput.disabled=false;showQuestion()}
  function setAdvancedOpen(open){els.advanced.hidden=!open;els.advancedToggle.setAttribute('aria-expanded',String(open))}
  els.advancedToggle.addEventListener('click',(event)=>{event.stopPropagation();setAdvancedOpen(els.advanced.hidden)});
  els.advanced.addEventListener('click',(event)=>event.stopPropagation());
  document.addEventListener('click',()=>setAdvancedOpen(false));
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!els.advanced.hidden){setAdvancedOpen(false);els.advancedToggle.focus()}});
  els.start.addEventListener('click',start);els.next.addEventListener('click',next);els.typedForm.addEventListener('submit',(event)=>{event.preventDefault();if(els.typedInput.value.trim())mark(els.typedInput.value.trim())});

  document.querySelectorAll('[name="skill"]').forEach((input) => {
    input.addEventListener('change', () => {
      // Locked mid-round: inputs are disabled/inert — no-op if a change slips through.
      const setupPanel = document.querySelector('.setup-panel');
      if (setupPanel && setupPanel.classList.contains('is-settings-locked')) {
        const keysInput = document.querySelector('[name="skill"][value="key-signatures"]');
        if (keysInput) keysInput.checked = true;
        return;
      }
      // "Chords" isn't implemented here — it's Harmony Explorer's other skill,
      // same cross-link pattern as Instrument Identifier <-> Ensemble Recognition.
      if (input.value === 'chord-identifier' && input.checked) {
        window.location.href = '../../chord-identifier/index.html';
      }
    });
  });

  if (launchParams.get('autostart') === '1') start();
})();
