# Progress Mode (test build)

Cross-app "Progress Mode": a student starts a question round mixing
questions from every integrated app (Instrument Identifier, Ensemble
Recognition, Melody Master — devices and dictation, Melodic Intervals,
Texture Trainer, Chord Identifier, Harmony Explorer's Key Signatures,
Cadence Coach, Meter Master, ScoreDecoder, and ContextCoach), each
question sourced from its own independently-tracked driver, presented inside
the same three-panel console layout used across the rest of EchoAural.
Transposition Dictation is intentionally excluded for now.

Each integrated app loads one shared, dormant embed bridge. It does nothing
during normal standalone play and only reports question/result events when
Progress Mode supplies an explicit, versioned launch token. Removing Progress
Mode therefore still leaves standalone app layout, gameplay and progression
unchanged. There are also two deliberate external dependencies:
1. The student dashboard (`account/student-home/`), which both links to
   this folder (see "Dashboard entry point" below) AND loads `store.js`,
   `app-drivers.js` and `feedback.js` directly to render Progress Mode's own
   "Detailed feedback" dialog (see "Dashboard detailed-feedback dialog"
   below) — a one-way, read-only dependency (the dashboard reaches into
   Progress Mode's data, never the other way round), kept to exactly those
   3 files.
2. `script.js`'s `postProgressSummaryBestEffort`, called once per finished
   round, POSTs a small summary (per-area levels, marks, rounds completed —
   no per-question detail) to `accounts/account-server.js`'s
   `/api/student/progress-mode-summary` route, purely so a teacher can see
   real Progress Mode data (`/api/teacher/progress-mode-summary` — see the
   teacher dashboard's own "Progress Mode" panel). This is genuinely
   fire-and-forget: it's wrapped so a failure (no login session, offline,
   server down) never blocks or errors the round, and localStorage remains
   the actual source of truth this module reads from and reasons about
   everywhere else. Unlike exception 1, this reaches OUT of the folder —
   it's the one place this module isn't self-contained, kept as small and
   additive as possible (its own table, its own routes, never touching
   `/api/student/rounds` or the older, differently-labelled "Progress Mode"
   system that used to live on these dashboards, since retired).

## Layout

`index.html` reuses `../instrument-identifier/style.css` directly (plus the
shared brand/track-info CSS) so the page is genuinely styled/sized like the
Instrument Identifier homepage — same topbar, same `three-panel-layout`
panel chrome, same fonts/gradients/glass panels. `style.css` in this folder
only adds the handful of elements unique to Progress Mode (identity block,
embedded round iframe, the transition-overlay wave animation, the per-area
progress bars).

- **LHS (setup-panel):** same structure as II's homepage, minus the
  skill/level radio grids — pointless here since every round mixes apps and
  levels are tracked automatically per area, not chosen by the student. In
  their place: a one-field name entry (falls back for direct/standalone
  visits) or a "Signed in as …" readout when identity arrives via the
  dashboard link.
- **Centre (quiz-panel):** the live console. Ready state shows a "Start
  Progress Round" button (+ an Advanced Settings popover, matching II's,
  that genuinely controls how many questions are in the round). Once
  started, this area is replaced by an iframe loading one real app page per
  round-slot, masked by a branded loading transition (see "Round mechanics"
  below) until each question is actually ready.
- **RHS (info-panel):** deliberately minimal — one progress bar per main
  area (see "Progress bars" below) plus a link to the student dashboard.
  Levels, level-progress metrics and written feedback per area used to live
  here too; they were moved to the dashboard's "Detailed feedback" dialog to
  keep this panel scannable at a glance.

## Progress bars (RHS)

Each area's bar fill is **not** raw accuracy — it's `Store.
getAreaOverallProgressPercentage()`, a 0-100 measure of how far the student
is through Foundation → Mastering *in that area*: each of the 4 levels is
worth 25 points, fully cleared levels bank their 25 automatically, and the
current level contributes a fraction of its own 25 based on how close its
pooled sample is to clearing the volume/accuracy/variety bars documented
under "Round mechanics" below (at Mastering itself, that fraction instead
measures progress toward fully clearing Mastering, since there's no further
level to advance into). The number beside each bar is cumulative marks
earned out of marks attempted for that area (e.g. `176/756`) — Progress
Mode scores every question as a flat 0 or 1 regardless of the source app's
own mark scheme, so this is exactly `cumulativeCorrect`/`cumulativeQuestions`
summed across the area's sources.

## Areas, sources, and reporting

Every driver (a real sub-app, or one topic of ScoreDecoder/ContextCoach)
belongs to exactly one of **6 main areas** — Melody, Texture, Harmony,
Instrumentation, Rhythm, Context (`AREA_ORDER`/`AREA_LABELS` in
`app-drivers.js`). Progress Mode reports one level PER AREA, not one per
driver/sub-app:

| Area | Sources |
| --- | --- |
| Melody | Melody Master (devices + dictation), Melodic Intervals, ScoreDecoder Ornamentation + Articulation |
| Texture | Texture Trainer, ScoreDecoder Dynamics |
| Harmony | Chord Identifier, Key Signatures (Harmony Explorer), Cadence Coach |
| Instrumentation | Instrument Identifier, Ensemble Recognition |
| Rhythm | Meter Master, ScoreDecoder Tempo |
| Context | ContextCoach (`era-explorer/`) — composers + periods |

Most areas fall back to Progress Mode's own icon in the dashboard's detail
dialog; areas with an obvious "home" app can override that via
`AREA_ICONS` in `app-drivers.js` (currently just Context, using
ContextCoach's own icon).

ScoreDecoder (`modules/musical-language/`) has 4 topics that route to 3
different areas by musical function (per the product decision behind this
design — e.g. ornaments are a melodic device, dynamics are a textural one),
so it's driven as **one driver entry per topic**, each pinning the app's own
`elementFocus` filter to just that topic, rather than one entry for the
whole app. ContextCoach (`era-explorer/`) similarly gets one driver per
topic (composers, periods) sharing one underlying page — but unlike
ScoreDecoder, both of its topics land in the same area (Context), so the
split here is purely for round-building breadth, matching Melody Master's
devices/dictation split rather than ScoreDecoder's cross-area one.

Sub-app/driver names are never their own scored row — they only ever appear
inside an area's written feedback paragraph (`buildAreaFeedback` in
`script.js`), which names a strongest and a weakest contributing source
(once each has enough of a sample) and points at a concrete next focus, e.g.
*"You recognise melodic devices well but need to examine more closely if a
passage is ascending or descending. You need to now focus on melodic
dictations."*

Round-building (`buildRoundQueue` in `script.js`) round-robins through a
freshly-shuffled pass of every real **app page** before any of them repeats
— "questions from different apps should be spread as evenly as possible
over a round." Several sources share one underlying page (ScoreDecoder's 4
topics; Melody Master's devices vs dictation), so evenness is judged at the
page level (`APP_GROUPS`, keyed by `driver.path`), not the source level, or
a multi-topic app could fill several slots while another app sits out
entirely. Which source represents a repeat visit to a multi-topic app is
chosen adaptively (`pickSourceForGroup`) — it favours whichever of that
app's sources sits in the area currently flagged weakest, which is where
"progress dependent" comes in. Once a source clears `ADAPTIVE_MIN_QUESTIONS`
(5 — was 8) cumulative questions and is genuinely the area's weakest, this
is a hard preference, not a soft bias: it's picked deterministically
whenever its group's turn comes up, not just more often.

The ready screen's Advanced Settings popover also has a "Focus area" picker
(`pmFocusArea` radios) — since Practice Mode's removal, this is the only way
left to deliberately drill one known-weak area inside the tracked system
rather than leaving every round to mix across all 6. When set, `getFocusAreaKey`/`appGroupKeysForArea`
narrow `buildQueueFromGroups` (the round-robin logic above, factored out so
both paths share it) down to just that area's app groups — but only for
most of the round: every 4th slot (`FOCUS_BREADTH_INTERVAL`) is still drawn
from every area, deliberately not a 100%-single-area round, since
interleaving is a genuine strength worth keeping even in a focused round.

## How the round mechanics work

Each real app page is loaded inside the `<iframe>`. After it loads,
`app-drivers.js` still configures the app's real setup controls so existing
level selection and question filtering remain unchanged. Once play begins,
the shared `progress-embed-contract.js` bridge reports stable
`question-ready` and `answer-complete` events to Progress Mode. The older DOM
signature/answer polling remains as a compatibility fallback, but it is no
longer the normal result path. The iframe is then
reloaded with a fresh `src` for the next round-slot — every slot is a full,
independent single-question load of a real app page. That raw load/setup
sequence is masked behind `#frameTransition` (a branded pulsing-wave overlay,
reusing the topbar's own `iiWaveRoll` animation) the whole time — it only
lifts once `checkSignatureThenPoll`'s `revealQuestion()` confirms a real
question is ready, so the target app's own unstyled setup screen and the
blank iframe navigation in between are never visible.

An empty pool at a source's normal (area) level — e.g. a ScoreDecoder topic
not yet introduced at Foundation — doesn't mean the source has nothing for
this student: content is only ever locked *until* a level, never locked
*above* one. `confirmStartedThenPoll`/`retryAtHigherLevelOrSkip` detect that
case (the target app stays on its `.quiz-panel.is-ready` screen instead of
proceeding) and retry the same source one level up, escalating as far as
Mastering, before finally giving up and moving to the next queued source.

Once a question is confirmed ready, its app-supplied stable ID (or the legacy
driver fingerprint when running through the fallback) is checked against that
SOURCE's own persistent
"already seen" set — not just this round, every round this student has ever
played — reusing `shared/js/spaced-repetition.js` (`getSeenIds`/`markShown`/
`resetCycle`), the same utility several other apps already use for their own
question cycling, keyed per source per student
(`progressmode:<studentId>:<sourceKey>`). A duplicate triggers a silent
reroll (reload the same slot) up to `MAX_DUPLICATE_REROLLS` times; if every
reroll still lands on something already seen, the pool for that source at
that level is almost certainly exhausted, so the cycle resets and the
question is accepted — "cycle through everything available before
repeating," the same spaced-repetition philosophy as its source utility,
rather than a hard "never repeat" that could stall a small pool forever.
`loadCurrentSlotFrame` explicitly pauses any `audio`/`video` element in the
discarded document (`silenceCurrentFrame`) before every navigation, reroll
included — otherwise a question that had already started autoplaying (e.g.
Melodic Intervals, which autostarts immediately) could keep audibly playing
into the next question while the reload was still in flight. The overlay
itself is fully opaque for the same reason on the visual side — it used to
carry a hair of transparency, letting a rapid reroll's page-load flicker
faintly bleed through underneath.

Two more layers close the remaining gaps in this same area:
- **Audio starting behind the still-up overlay.** Many target apps autoplay
  their audio a short fixed delay (often ~180ms) after a question renders —
  frequently sooner than Progress Mode's own readiness poll gets a chance to
  run and decide whether to keep or reroll the question, so audio could
  start audibly before `revealQuestion()` ever lifts the overlay.
  `checkSignatureThenPoll` now calls `pauseFrameMedia(doc)` the instant it
  runs (before the reroll decision), and `resumeFrameMedia(doc)` right after
  `revealQuestion()` if the question is kept — resuming only media with real
  playback progress (`currentTime > 0`, i.e. genuinely paused mid-play, not
  media that simply hasn't started yet, which is left for the target app's
  own timer so it isn't double-triggered/restarted a moment later).
- **A flash of blank iframe on the very first question of a round.** The
  overlay's own entrance used the shared `popoverIn` animation
  (`instrument-identifier/style.css`), which ramps opacity 0→1 over 300ms —
  fine when it's fading in over the previous, already-rendered question
  (question 2+), but on question 1 there's nothing loaded in the iframe yet,
  so that ramp let a blank white flash show through. `.pm-frame-transition`
  now uses its own `pmOverlayIn` keyframes (`style.css`), which only animate
  `transform`, never `opacity` — fully opaque from its very first frame.
- The readiness polls themselves (`waitForReady`/`confirmStartedThenPoll`/
  `waitForAutoStartedQuestion`) were also sped up from 200/150ms to 50ms
  ticks (attempt-count thresholds scaled to keep the same real-world
  timeouts — 6s/1.5s/6s), shrinking the window described above where an
  app's own autoplay could get ahead of Progress Mode noticing readiness.

Sources whose driver has no `getSignature` can't be deduplicated this way at
all — same limitation as before. This is rarer than it sounds: even
melody-master-dictation, whose content isn't readable as visible text, has a
working `getSignature` that reads the target melody straight from the
iframe's own same-origin JS globals (`win.ALL_MELODY_CLIPS[win.currentQuestionIndex]`)
instead.

A wrong answer is treated differently from a right one at this same check:
`advanceSlot` calls `Store.recordQuestionOutcome`, which schedules that
question's signature for retry rather than letting it join the normal
"seen, avoid until the pool cycles" set — 2 more draws from that source
before it's next eligible, backing off to 4 then 8 if it's missed again
(`MISS_RETRY_INTERVALS`, a Leitner-style schedule). Draw-count alone would
collapse to almost no real spacing if a student grinds several rounds
back-to-back in one sitting, so a parallel wall-clock minimum
(`MISS_RETRY_MIN_MINUTES` — 3, then 10, then 30 minutes) also has to elapse;
a question is only eligible again once BOTH gates clear. `checkSignatureThenPoll` rerolls
away from a still-cooling-down miss exactly like an already-seen question;
once its cooldown passes it simply stops being avoided. **This is a
best-effort bias, not a guarantee** — Progress Mode never chooses which
question an embedded app shows, only accepts or rerolls whatever the app's
own randomiser produces, so there's no way to force the exact missed
question to reappear on schedule, only to stop excluding it once it's due
and let ordinary chance take it from there. A correct answer on retry
clears it from the queue entirely.

Separately, once at least one area has reached Mastering, `buildRoundQueue`
reserves one slot per round (rounds of 5+ only) for deliberate long-interval
review: `Store.getReviewCandidate` picks whichever Mastered-area source was
drawn longest ago (or never at all), overriding the normal round-robin
selection for that one slot. Round-robin alone already keeps Mastered
content mixing in at normal frequency forever — this adds a genuine spacing
bias on top, so content doesn't just avoid being starved, it's actively
brought back rather than left to chance, aimed at durable retention through
to the actual exam rather than just clearing levels once. Same best-effort
caveat as the missed-question retry above.

- `store.js` — localStorage-only progress store (`echoaural.progressmode.v2`).
  Two tiers: lightweight cumulative stats per SOURCE (feedback + adaptive
  selection input only, plus `lastDrawnAt` for the review-slot bias above),
  and level-advancement pooled per AREA — 10 questions, 80% accuracy, 6
  distinct question-signatures (wherever at least one contributing source
  can recognise distinct questions), AND every individually-reliable source
  (≥8 of its own cumulative questions) clearing at least 60% itself — at the
  current level before an area advances (Foundation → Developing → Securing
  → Mastering). That last bar stops a pooled area average from masking one
  genuinely weak sub-skill behind several strong ones (e.g. Melody pools 5
  sources). These bars apply independently and identically at every level —
  Foundation→Developing is judged the same way as Developing→Securing or
  Securing→Mastering. A level-escalated attempt (see "empty pool" above)
  banks its sample at the level it was actually asked at, never the area's
  current level, so it can neither drag down nor prematurely clear a level
  the student isn't really being tested on. Overall level is the average
  across the 6 areas. `getAreaOverallProgressPercentage()` turns that same
  per-level data into the single 0-100 "progress toward finishing Mastering"
  number the RHS bars and the dashboard dialog both use.
- `app-drivers.js` — one config entry per source: how to set its level/skill
  radios, which area it belongs to, how to detect "answered", how to read
  correct/incorrect.
- `feedback.js` — per-area written feedback (`buildAreaFeedback`), pulled out
  of `script.js` so the student dashboard can call it directly too (see
  below). Not loaded by `index.html`/`script.js` — this page's own RHS no
  longer shows feedback text.
- `script.js` — round orchestrator: builds an app-evenly-spread, adaptively-
  weighted round queue, drives the iframe through it, scores per-source,
  pools into per-area results, and re-renders the RHS progress bars.

## Round-complete popup

After the round's last question is answered, `finishRound()` shows a branded
modal over the centre console tile — the same treatment instrument-identifier
uses at the end of its own rounds — rather than leaving the student to notice
the RHS summary quietly updated. It deliberately reuses
`instrument-identifier/style.css`'s round-feedback-window classes verbatim
(`.ii-round-feedback-overlay`/`.ii-round-review-panel`/`.mm-round-review-hero`/
`.mm-compiled-feedback-tile`/`.mm-final-finish-button`, backdrop dimming via
`body.ii-round-review-open`) — `index.html` already loads that stylesheet in
full for the answer-grid CSS overrides above, so the popup needed zero new
CSS, only matching class names in JS-generated markup. The one departure from
instrument-identifier's version: instead of a medal and a per-question row
list, the body shows this page's own `.pm-element-row`/`.pm-element-bar-fill`
area bars (same component the RHS "My progress" panel uses) — but scoped to
just this round's marks, not the all-time cumulative figures, so a student can
see specifically what this round covered. `finishRound()` computes that
round-only tally (`roundAreaStats`) from `state.perSourceTally` before it
resets for the next round, and separately collects which areas advanced a
level this round (`leveledUpAreas`, from `Store.recordSourceResult`'s
`advanced` flag) to lead the feedback sentence with a level-up celebration
when one happened. `buildRoundFeedbackText` otherwise just names this round's
best- and worst-covered area by accuracy and suggests the weak one as next
focus — deliberately a single short sentence about *this round*, not
`feedback.js`'s multi-sentence all-time analysis (that's dashboard-only).
"Continue" (`closeRoundCompletePopup`) removes the overlay and the body/
app-shell/quiz-panel classes it added, revealing the RHS ready-state
(with its own already-rendered all-time bars and "Start another
round"/"Back to my progress" buttons) underneath, exactly as before this
popup existed.

## Dashboard detailed-feedback dialog

The student dashboard's Progress Mode card already had a "Detailed feedback"
button opening a shared dialog (`account/student-home/student-home.js`'s
`openCategoryDetail`/`detailedCategoryMarkup`), normally fed by the
server-side progress API. Progress Mode's own rounds never reach that API
(see the top of this file), so for the `progress` category that dialog is
now built by a dedicated `progressModeDetailMarkup()` instead, which loads
`store.js`/`app-drivers.js`/`feedback.js` directly (script tags in
`account/student-home/index.html`) and reads the same student id used to
launch Progress Mode itself (`state.student.id`, matching the
`studentId` query param below) to render: overall level, marks earned per
area, level-progress metrics, and each area's written feedback paragraph.

## Dashboard entry point

`account/student-home/index.html`'s left-hand "Progress mode" quick-action
button (in the "My progress" console, above "Join live session") now links
straight to `modules/progress-mode/index.html?studentId=…&studentName=…`
using the real logged-in student's identity — set once in
`account/student-home/student-home.js`'s init flow via `categoryActionHref()`.
Progress Mode reads those params on load, skips its own name-entry fallback,
and resumes that student's levels directly (localStorage-keyed by the real
student id, so a bare revisit with no params also resumes them). The centre
"My learning" console card is unrelated and untouched — it still only tracks
and displays stats, as before.

## Known limitations (test build, not production)

- Identity is name/id only, no real teacher-code/PIN handshake of its own —
  it trusts whatever `studentId`/`studentName` the dashboard link passes.
- Chord Identifier and Key Signatures are forced into multiple-choice mode
  (`answerMode=choice`/`answers=choice`) so answers are always
  DOM-detectable; typed-answer mode is not exercised for those two. Cadence
  Coach has no such forced mode (not a value it supports) and ScoreDecoder's
  Securing/Mastering tier always uses typed answers regardless — both are
  driven by reading `#feedback` text instead.
- Texture Trainer's free-text question types and ScoreDecoder's
  Securing/Mastering tier can award partial credit; Progress Mode treats at
  least half marks as "correct" for its own binary scoring (see
  `app-drivers.js`'s `isCorrect` for each) rather than requiring full marks
  — otherwise genuine partial understanding at the harder tiers would be
  counted as an outright miss.
- Instrument Identifier and Ensemble Recognition both have a small number of
  `responseType:"typed"` questions (a typed-answer textarea instead of the
  usual answer buttons) mixed in among their mostly-multiple-choice pools,
  question-level rather than level-gated, with no "always multiple choice"
  mode to force. Both drivers now detect this (`#iiStudentAnswer`/
  `#ensStudentAnswer` disabled, `#answerCard .answer-reveal.is-correct`) —
  previously undetected, this was a real bug: a typed question would never
  satisfy the old MC-only `isAnswered` check, so Progress Mode never noticed
  it had been answered and never moved on, while the target app's own
  multi-question round kept running underneath (through its remaining
  questions and its own round-complete summary screen) until the 90-second
  safety timeout eventually forced a skip.
- Melody Master's Melodic Devices skill has the same class of gap for a
  handful of `responseType:"Written response"` questions (Securing/Mastering
  — a `#melodicDevicesWrittenAnswer` textarea, no answer buttons at all
  rather than a hybrid button-or-textarea UI). Unlike the typed-input cases
  above, `submitMelodicDeviceAnswer()` never disables that textarea itself —
  the one signal it *does* set unconditionally either way is `#feedback`'s
  className (`"good"`/`"bad"`), the same idiom the sibling
  `melody-master-dictation` driver already relies on; `melody-master-devices`
  now checks it as a fallback too.
- `musical-language-*` (ScoreDecoder)'s driver already had matching
  MC/typed detection (`#typedAnswer` disabled), but now also falls back to
  `#nextButton` becoming enabled — set unconditionally on every submission
  regardless of answer-UI type, the same proven, simpler pattern
  `chord-identifier`'s driver already uses on its own. Added as extra
  redundancy against any answer-UI variant the two explicit checks don't
  anticipate. Its `getSignature` was also fixed — it used to read
  `#questionKicker`, which only ever shows "ELEMENT · SUBSKILL" (identical
  for every question in that subskill), causing near-constant false
  "already seen" reroll cascades; now prefers the actual answer text or
  question prompt, both genuinely unique per question. A full simulated run
  through every question in ScoreDecoder's real question bank (all 4
  topics × all 4 levels, MC and typed) confirmed the answered-detection
  logic itself is correct in every case — the actual repeated "stuck on a
  written question" reports were narrowed down to something the detection
  logic can't see at all: `revealQuestion()` now also explicitly focuses
  the iframe (`els.appFrame.contentWindow.focus()`). Several drivers'
  typed-answer inputs rely on the target app's own `input.focus()` call to
  place the caret, which only reliably captures keyboard input if the
  iframe itself already has real browser focus — before this fix, a
  student who hadn't yet clicked inside the iframe could see a
  seemingly-focused input (its `document.activeElement` reports it as
  focused either way) that silently ate their keystrokes, appearing
  "stuck" despite the underlying logic working fine — multiple-choice
  questions never showed this because clicking an answer button naturally
  focuses the iframe as a side effect of the click itself. Also confirmed
  via the same simulated run: ScoreDecoder's Foundation-level Ornamentation
  pool has zero active questions (and Ornamentation/Articulation both have
  very thin Foundation-Developing pools generally) — Progress Mode's
  existing empty-pool escalation already handles this by design, but it's
  worth knowing this is a real, frequently-hit case for that topic, not an
  edge case.
- The "stuck" reports persisted even after the fixes above, so this was
  investigated further with a real headless-browser reproduction (Playwright
  against a real local dev server, not simulated). Two things came out of
  that: (1) the iframe-focus theory above was directly ruled out — disabling
  it entirely reproduced the exact same failure, so it wasn't the cause,
  though it's kept as a legitimate fix in its own right; (2) the actual
  failure reproduced consistently, and identically, on both ScoreDecoder AND
  Ensemble Recognition's typed inputs — pointing at something shared between
  apps rather than either app's own code. That shared thing is
  `.listening-console` (the central quiz card in `instrument-identifier/
  style.css`, reused by literally every app this module drives): it's
  `overflow: hidden` with an all-`auto` `grid-template-rows`, sized for its
  own standalone layout, not the fixed 100vh this module forces `.quiz-panel`
  into. A longer-than-usual prompt — disproportionately likely on typed
  questions, since those carry the real question text verbatim rather than a
  short canned multiple-choice prompt — can push later rows, including the
  answer input itself, past the bottom edge, where they're silently clipped:
  invisible, unclickable, and unreachable, while the underlying JS (and
  Progress Mode's own answered-detection) is completely unaffected. This
  fits every reported detail (intermittent, worse on written questions,
  looks totally stuck with nothing to interact with) better than a JS bug
  does. Fix: `.listening-console` now scrolls vertically within itself
  (`overflow-y: auto`) via `FOCUS_MODE_CSS`, so overflow content becomes
  reachable by scrolling the card rather than vanishing — deliberately not
  touching the outer `html, body { overflow: hidden }` above, which exists
  for its own, unrelated, already-documented reason. **This theory turned
  out not to be the actual cause** (confirmed via a real browser screenshot
  showing the typed input fully visible, correctly sized, not clipped) —
  kept as a real, worthwhile defensive fix regardless, but see the next
  point for what was actually happening.
- **The real cause, confirmed by a real headless-browser reproduction**:
  several drivers' target apps synchronously focus their OWN "Next
  question" button as part of the very same submit handler a typed
  answer's Enter keypress triggers — e.g. ScoreDecoder/Key Signatures both
  do `els.next.disabled = false; els.next.focus();` inside their submit
  function. The browser's native "Enter/Space activates the focused
  button" behaviour then clicks that button immediately, auto-advancing to
  the next question entirely within the same native event — faster than
  `beginAnsweredPolling`'s 350ms interval could ever observe the brief
  "just answered" state in between. Left unhandled, this module never
  noticed, and a student ended up playing straight through the target
  app's own internal multi-question round completely unsupervised —
  correctly submitting and correctly seeing feedback the whole time, which
  is why "typing and Enter work, but Progress Mode looks broken" was the
  precise, confusing symptom — until it finally reached that app's own
  round-complete screen and only `beginAnsweredPolling`'s 90s safety
  timeout eventually recovered it. Fixed generically, inside
  `beginAnsweredPolling` itself rather than per-driver: on every poll tick
  where `isAnswered` is still false, if the driver supports
  `getSignature`, a signature that no longer matches what was revealed is
  treated as unambiguous proof the app moved on regardless — recorded as a
  skip (correctness for the actual question asked can't be recovered once
  the DOM has already moved on to a different one).
- The per-source feedback phrase table (`SOURCE_PHRASES` in `feedback.js`) is
  a first-pass template, not final reviewed copy.
- Storage was bumped to `echoaural.progressmode.v2` when areas were
  introduced — existing `v1` per-driver progress is not migrated (this is a
  throwaway test build; a clean reset is acceptable).
