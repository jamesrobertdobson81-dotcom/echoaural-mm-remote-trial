// Builds the review page's DOM shell into document.body. Kept as JS (not a
// static HTML fragment) so all 4 app pages can share one exact structure
// with only the app label swapped in — avoids 4 slightly-drifting copies.
(function () {
  "use strict";
  function build(config) {
    document.title = config.appLabel + " Review | EchoAural (draft)";
    document.body.setAttribute("data-brand-app", config.brandApp || "");
    document.body.innerHTML = `
      <div class="review-shell">
        <header class="review-topbar">
          <a class="brand refined-logo" href="index.html" aria-label="Back to review hub">
            <span class="brand-wave refined-wave" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </span>
            <strong class="wordmark"><span class="wordmark-echo">Echo</span><span class="wordmark-aural">Aural</span></strong>
          </a>
          <div class="review-title">
            <p class="eyebrow">DRAFT — not part of any live app</p>
            <h1>${config.appLabel} — New Content Review</h1>
          </div>
          <a class="topbar-link" href="index.html">All 4 reviewers</a>
        </header>

        <main class="review-layout">
          <aside class="panel question-list-panel">
            <div class="panel-heading">
              <span class="heading-wave" aria-hidden="true"><span></span><span></span><span></span></span>
              <h2>Questions</h2>
            </div>

            <div class="summary-grid" aria-label="Review summary">
              <div><strong id="totalCount">0</strong><span>Total</span></div>
              <div><strong id="reviewedCount">0</strong><span>Reviewed</span></div>
              <div><strong id="dropCount">0</strong><span>Drop</span></div>
            </div>
            <p id="levelCountSummary" class="question-list-note">Loading draft questions…</p>

            <label class="search-field">
              <span>Search</span>
              <input id="searchInput" type="search" placeholder="ID, track, question…" autocomplete="off" />
            </label>

            <div class="filter-row level-filter-row" aria-label="Draft level filters">
              <button class="filter-button is-active" type="button" data-level-filter="all">All levels</button>
              <button class="filter-button" type="button" data-level-filter="Foundation">Foundation</button>
              <button class="filter-button" type="button" data-level-filter="Developing">Developing</button>
              <button class="filter-button" type="button" data-level-filter="Securing">Securing</button>
              <button class="filter-button" type="button" data-level-filter="Mastering">Mastering</button>
            </div>

            <div class="filter-row" aria-label="Question filters">
              <button class="filter-button is-active" type="button" data-filter="all">All</button>
              <button class="filter-button" type="button" data-filter="unreviewed">Unreviewed</button>
              <button class="filter-button" type="button" data-filter="drop">Drop</button>
            </div>

            <div id="questionList" class="question-list" aria-label="${config.appLabel} draft questions"></div>
          </aside>

          <section class="panel audition-panel">
            <div class="panel-heading panel-heading-centre">
              <span class="heading-wave" aria-hidden="true"><span></span><span></span><span></span></span>
              <h2>Audition</h2>
            </div>

            <div class="question-meta-row">
              <span id="questionPosition">Question 0 / 0</span>
              <span id="questionLevelBadge">Level unset</span>
            </div>

            <article class="audition-card">
              <p class="eyebrow" id="questionId">—</p>
              <h3 id="questionTitle">Loading…</h3>

              <div class="question-card">
                <span>Question</span>
                <p id="questionPrompt">Choose a question to begin.</p>
                <small id="questionDetails">0 marks</small>
              </div>

              <div id="answerChoicePreview" class="answer-choice-preview" aria-label="Answer options"></div>

              <div class="wave-tile" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>

              <button id="playClipButton" class="primary-button play-clip-button" type="button">Play Clip</button>
              <p id="audioStatus" class="audio-status">Ready to play.</p>
              <audio id="audioPlayer" class="review-audio" controls preload="metadata"></audio>

              <div class="clip-scrub-row">
                <label>Clip start (s)
                  <input id="clipStartInput" type="number" step="0.5" min="0" />
                </label>
                <label>Clip end (s)
                  <input id="clipEndInput" type="number" step="0.5" min="0" />
                </label>
                <button id="setStartToCurrentButton" class="secondary-button" type="button">Set start = current time</button>
                <button id="setEndToCurrentButton" class="secondary-button" type="button">Set end = current time</button>
              </div>
              <p class="clip-scrub-hint">Full track duration: <span id="fullDuration">—</span>. Adjust start/end, then Play Clip to preview just that window.</p>

              <div class="nav-row">
                <button id="prevButton" class="secondary-button" type="button">Previous</button>
                <button id="revealButton" class="secondary-button" type="button">Reveal answer</button>
                <button id="nextButton" class="primary-button" type="button">Next question</button>
              </div>
            </article>
          </section>

          <aside class="panel review-panel">
            <div class="panel-heading">
              <span class="heading-wave" aria-hidden="true"><span></span><span></span><span></span></span>
              <h2>Review</h2>
            </div>

            <form id="reviewForm" class="review-form">
              <fieldset>
                <legend>Decision</legend>
                <label><input type="radio" name="decision" value="keep" /> Keep</label>
                <label><input type="radio" name="decision" value="edit" /> Edit</label>
                <label><input type="radio" name="decision" value="drop" /> Drop</label>
              </fieldset>

              <fieldset>
                <legend>Level (draft — adjust as needed)</legend>
                <label><input type="radio" name="level" value="Foundation" /> Foundation</label>
                <label><input type="radio" name="level" value="Developing" /> Developing</label>
                <label><input type="radio" name="level" value="Securing" /> Securing</label>
                <label><input type="radio" name="level" value="Mastering" /> Mastering</label>
              </fieldset>

              <fieldset>
                <legend>Issues</legend>
                <label><input type="checkbox" name="issue" value="answer" /> Answer needs editing</label>
                <label><input type="checkbox" name="issue" value="audio" /> Audio/clip unclear</label>
                <label><input type="checkbox" name="issue" value="level" /> Level uncertain</label>
                <label><input type="checkbox" name="issue" value="duplicate" /> Too similar to another question</label>
              </fieldset>

              <label class="notes-field">
                <span>Notes</span>
                <textarea id="reviewNotes" rows="5" placeholder="e.g. tighten distractors, move to Securing, clip starts too abruptly…"></textarea>
              </label>
            </form>

            <section class="markscheme" id="markscheme" hidden>
              <h3>Answer / marking guidance</h3>
              <div id="markschemeContent"></div>
            </section>

            <section class="source-summary">
              <h3>Source record</h3>
              <div id="sourceSummaryContent"></div>
            </section>

            <div class="export-row">
              <button id="downloadJsonButton" class="primary-button" type="button">Download reviewed JSON</button>
              <button id="downloadCsvButton" class="secondary-button" type="button">Download CSV</button>
              <button id="clearReviewButton" class="ghost-button" type="button">Clear local review</button>
            </div>

            <p id="saveStatus" class="save-status" role="status" aria-live="polite">Autosave ready.</p>
          </aside>
        </main>
      </div>
    `;
  }

  window.EAReviewShell = { build: build };
})();
