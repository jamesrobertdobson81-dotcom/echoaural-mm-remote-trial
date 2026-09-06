# ScoreDecoder terms — new audio manifest (articulation & ornaments batch)

Staged only. Nothing in `modules/musical-language/` was touched — no CSV
edits, no integration. Files live in `review-staging/audio/scoredecoder-terms/`.
All clips are 44.1kHz stereo MP3 at ~192-195kbps (matching the bitrate/format
of most of the 18 existing clips in `modules/musical-language/assets/audio/`,
e.g. `legato.mp3`, `staccato.mp3`, `sforzando.mp3`).

Six of the eight requested terms were sourced with real confidence by this
agent's web search. Turn was not sourced this way (see its own section
below) but was resolved afterward by reusing an already-reviewed EchoAural
asset. Tenuto remains genuinely unsourced — see the "NOT SOURCED" entry at
the bottom for why.

All six sourced clips come from the same collection already trusted and used
by the 18 existing ScoreDecoder clips: the **Musopen 2012 Kickstarter
Project**, mirrored in full at `archive.org/details/MusopenCollectionAsFlac`.
Every recording in it was made specifically to be released into the public
domain (license: Creative Commons Public Domain Mark 1.0 —
http://creativecommons.org/publicdomain/mark/1.0/), confirmed directly from
the archive.org item's metadata (`licenseurl`). This is the identical source
already embedded in the existing clips' own ID3 comment tags
(`http://archive.org/details/MusopenCollectionAsFlac`), so these six new
clips are on exactly the same legal footing as the 18 already in the app.

Because I can't literally listen to audio, every clip below was verified two
ways before being trimmed: (1) independent, named secondary sourcing
(program notes, Wikipedia's own ornament-illustration citations, or a
peer-reviewed/dissertation-level musicological source) confirming the
specific piece/bar contains the named articulation or ornament in Bach's or
the composer's own markings, and (2) direct empirical inspection of the
actual downloaded audio — spectrograms, RMS-loudness-over-time envelopes, and
(for the two grace-note cases) a spectral-flux onset-detection pass — to
confirm the audio itself shows the acoustic signature that ornament/
articulation should produce (e.g. a sudden loud/short event, an anomalously
long sustain, or two note-onsets an implausibly short time apart for anything
but a crushed grace note). Details are per-entry below.

---

## Trill

- **File:** `trill.mp3` (8.0s, trimmed from 0:00–0:08 of the source recording)
- **Source:** J. S. Bach, Goldberg Variations, BWV 988 — Variation 28.
- **Original URL:** https://archive.org/download/MusopenCollectionAsFlac/Bach_GoldbergVariations/JohannSebastianBach-29-GoldbergVariationsBwv.988-Variation28.mp3
  (item: https://archive.org/details/MusopenCollectionAsFlac)
- **License:** Public domain (Creative Commons Public Domain Mark 1.0),
  Musopen Kickstarter Project.
- **Performer:** Shelley Katz (piano).
- **Verification:** Variation 28 is one of the most specifically-documented
  trill passages in the keyboard repertoire — program notes (Orchestra of
  St. Luke's) describe it as built on "written-out trills using 32nd notes
  present in most measures, heard in one hand and then the other, and
  sometimes simultaneously," and note it's "specified for two manuals... for
  handling the complex hand-crossing and trilling passages." Because the
  trilling is continuous through virtually the whole variation, no
  bar-level timing precision was needed — I confirmed via spectrogram that
  the opening bars show the expected dense, rapid, evenly-spaced train of
  same-register note attacks consistent with trilling, then used the first
  8 seconds as-is.
- **Why it demonstrates the term:** Trills are audible essentially from the
  first note; this is, by design, one of Bach's most trill-saturated single
  movements anywhere in the keyboard literature.

---

## Mordent

- **File:** `mordent.mp3` (6.0s, trimmed from 0:00–0:06 of the source
  recording — the very opening bar)
- **Source:** J. S. Bach, Goldberg Variations, BWV 988 — Variation 7.
- **Original URL:** https://archive.org/download/MusopenCollectionAsFlac/Bach_GoldbergVariations/JohannSebastianBach-08-GoldbergVariationsBwv.988-Variation7.mp3
  (item: https://archive.org/details/MusopenCollectionAsFlac)
- **License:** Public domain (Creative Commons Public Domain Mark 1.0),
  Musopen Kickstarter Project.
- **Performer:** Shelley Katz (piano).
- **Verification:** Wikipedia's own "Mordent" article uses this exact
  passage as its canonical audio illustration of the ornament — its embedded
  demo file is captioned "The first bar of the Goldberg Variation No. 7,
  first played with lower mordents, then without." Since the relevant
  ornament is in bar 1, no bar-counting was needed — bar 1 is the very start
  of the track. A dissertation on Goldberg Variations performance practice
  (Indiana University ScholarWorks) independently confirms Variation 7 is
  one of the small set of variations built on continuous 32nd-note groups
  with Bach's own slur/ornament markings.
- **Why it demonstrates the term:** The specific ornament this Wikipedia
  citation identifies (a lower mordent) falls right at the start of the
  variation's opening melodic gesture, within the first couple of seconds
  of this clip.

---

## Acciaccatura

- **File:** `acciaccatura.mp3` (4.7s, trimmed from 25.8s–30.5s of the source
  recording — bar 6)
- **Source:** J. S. Bach, Goldberg Variations, BWV 988 — Aria (the main
  theme).
- **Original URL:** https://archive.org/download/MusopenCollectionAsFlac/Bach_GoldbergVariations/JohannSebastianBach-01-GoldbergVariationsBwv.988-Aria.mp3
  (item: https://archive.org/details/MusopenCollectionAsFlac)
- **License:** Public domain (Creative Commons Public Domain Mark 1.0),
  Musopen Kickstarter Project.
- **Performer:** Shelley Katz (piano).
- **Verification:** I downloaded a free typeset score of the Aria (Joel
  Mayes transcription, GNU FDL, via IMSLP) and visually confirmed bar 6
  contains two grace notes with a slash through the stem — the standard
  notation for an acciaccatura — each immediately preceding a principal
  melody note. I then ran a spectral-flux onset-detection pass on the actual
  audio and found two pairs of note onsets only ~0.15s and ~0.06s apart
  respectively in this part of the recording (all other onsets nearby are
  spaced ~0.4–1.5s apart) — exactly the acoustic signature of a "crushed"
  grace note played just before its main note, at exactly the two points in
  the bar the score says they should be. This dual score+audio match is why
  I'm confident in this one despite not being able to listen directly.
- **Why it demonstrates the term:** Two audibly crushed grace-note-into-main-
  note pairs, the first only ~0.5s into the clip.

---

## Pause (fermata)

- **File:** `pause.mp3` (10.9s, trimmed from 1.3s–12.2s of the source
  recording — the opening of the overture)
- **Source:** W. A. Mozart, The Magic Flute (Die Zauberflöte) Overture,
  K. 620 — opening Adagio.
- **Original URL:** https://archive.org/download/MusopenCollectionAsFlac/Mozart_MagicFluteOverture/WolfgangAmadeusMozart-MagicFluteOverture.mp3
  (item: https://archive.org/details/MusopenCollectionAsFlac)
- **License:** Public domain (Creative Commons Public Domain Mark 1.0),
  Musopen Kickstarter Project.
- **Performer:** Czech National Symphony Orchestra.
- **Verification:** This is one of the most famous fermata passages in the
  entire orchestral repertoire — multiple program notes (Nashville Symphony,
  Jacksonville Symphony, and an independent score analysis) describe the
  overture's opening as three ceremonial/"majestic" chords in E-flat major,
  referencing Masonic ritual (the number three), and every standard edition
  of the score marks each of these three chords with a fermata. I measured
  the actual recording's RMS loudness over time and found exactly the
  expected pattern: near-silence, then three separate loud chords, each
  sustained for roughly 2-3+ seconds (far longer than any surrounding note
  value in the piece) with a decay back to near-silence between each one —
  textbook fermata behaviour, empirically confirmed in the waveform, not
  just asserted from program notes.
- **Why it demonstrates the term:** All three held chords, each clearly
  outlasting an ordinary note value, are audible in this one clip.

---

## Accent

- **File:** `accent.mp3` (7.0s, trimmed from 0:00–0:07 of the source
  recording — the overture's opening)
- **Source:** Ludwig van Beethoven, Egmont Overture, Op. 84 — opening
  Sostenuto, ma non troppo.
- **Original URL:** https://archive.org/download/MusopenCollectionAsFlac/Beethoven_EgmontOvertureOp.84/LudwigVanBeethoven-EgmontOvertureOp.84.mp3
  (item: https://archive.org/details/MusopenCollectionAsFlac)
- **License:** Public domain (Creative Commons Public Domain Mark 1.0),
  Musopen Kickstarter Project.
- **Performer:** Czech National Symphony Orchestra.
- **Verification / confidence caveat:** Program notes universally describe
  Egmont's opening as a single stark, heavy orchestral chord launching the
  slow introduction, answered by a quiet, plaintive phrase — a real
  emphasis/stress gesture. I measured RMS loudness over time and confirmed
  the actual recording: near-silence, then a sudden onset jumping straight
  to a sustained loud plateau (~-14dB, up from below -80dB), before decaying
  into a much quieter answering passage. This is offered with good, not
  total, confidence: I could not independently verify from a score that this
  specific chord carries a printed accent (`>`) mark as opposed to just a
  dynamic `ff`/`sf` — but it is unambiguously an emphasised, stressed
  gesture standing out sharply against what immediately follows, which is
  the audible bar the brief sets for this term.
- **Why it demonstrates the term:** A single hard-hit chord, clearly more
  forceful than the hushed, sustained material that follows it in the same
  clip — an audible "punched" moment for direct contrast.

---

## Marcato

- **File:** `marcato.mp3` (8.5s, trimmed from 139.5s–148.0s of the source
  recording — near the climax)
- **Source:** Edvard Grieg, "In the Hall of the Mountain King" (Peer Gynt
  Suite No. 1, Op. 46, No. 4).
- **Original URL:** https://archive.org/download/MusopenCollectionAsFlac/Greig_PeerGynt/EdvardGrieg-PeerGyntSuiteNo.1Op.46-04-InTheHallOfTheMountainKing.mp3
  (item: https://archive.org/details/MusopenCollectionAsFlac)
- **License:** Public domain (Creative Commons Public Domain Mark 1.0),
  Musopen Kickstarter Project.
- **Performer:** Czech National Symphony Orchestra.
- **Verification:** This piece's famous long crescendo is built from the
  same repeated ostinato figure played progressively louder, faster, and
  more heavily accented on each pass — a standard example of orchestral
  marcato playing. Rather than rely on that reputation alone, I measured
  RMS loudness over time through the second half of the piece and located a
  passage (~139.5–148s) with a series of separate, sharp, forceful chord
  attacks (each rising abruptly from a quieter texture to a loud peak, then
  clearly decaying before the next one) spaced roughly 1-3 seconds apart —
  i.e. genuinely detached, hammered hits, not a continuous loud wash. (Note:
  the same recording's much later, faster final flourish (~149-150s) was
  deliberately *not* used — at that point the hits blur together too fast to
  read as individually "detached," which is what marcato specifically
  requires. Also note this same source file is separately used, at a
  completely different, non-overlapping timestamp (95.5–109.5s), for an
  "Accelerando" clip staged in an earlier batch
  (`MANIFEST-tempo-dynamics.md` in this same folder) — no overlap between
  the two clips.)
- **Why it demonstrates the term:** A short run of separate, forceful,
  clearly detached chord-hits — audibly punchier and more separated than a
  single plain accent.

---

## Turn — sourced separately (not by this agent)

This term was NOT sourced via the web-search process documented for the
other six terms below/above. Attempted first (see git history for this
file): Wikipedia's ornament article, douglasniedt.com's named Mozart
examples (K.331, K.511 — neither in any rights-clear collection found),
and two Bach Goldberg Variations candidates that didn't hold up to
verification (a different edition's ornament-realisation error in one
case; onset-detection not finding the expected 4-close-onset burst in the
other). Skipped at that point rather than force a weak match.

James then identified a better source directly: EchoAural already has a
turn confirmed, reviewed and live in production, in Melody Master's own
question bank.

- **File:** `turn.mp3` (35.7s — the full excerpt, unedited; see note on
  length below)
- **Source:** `modules/melody-master/audio/melodic-devices/MDA040.mp3`
  (identical file also lives at
  `modules/melody-master/questions/mm016/MM016-audio.mp3`), copied
  verbatim — no re-encoding.
- **Licence:** Already cleared for production use — Musopen, Public
  Domain Mark 1.0 (Chopin's own work is public domain; this specific
  recording's rights are already tracked in `melody-master-melodic-
  devices-50.json`'s `rightsNote`/`sourceProvider` fields for MDV040).
- **Work:** Chopin, Nocturne in E-flat major, Op. 9 No. 2 (Andante),
  piano.
- **Why it demonstrates the term:** This is MDV040 in Melody Master's own
  melodic-devices bank — a multiple-choice "Identify the ornament used in
  this extract" question whose `correctAnswer` is `"Turn"`, already
  through a completed human listening review
  (`finalListeningReview: "Score and audio share the MM016 source
  excerpt; the turn is printed clearly in the supplied score."`,
  `clarityConfidence: "High"`). The bundled score image
  (`questions/mm016/mm016-answer-restored.png`) shows the turn sign (∾)
  printed above a note early in the second bar of the excerpt.
- **Why the full 35.7s, not a short trim:** I located the turn's
  approximate position from the score (second bar of the phrase) and
  tried to pin its exact timestamp — bar-position estimate, a pitch-
  tracking pass matching the bar's known dictation pitches
  (`B5-A5-G5-F5-G5-D5` from MM016's own data), and spectrogram
  inspection — but piano sustain-pedal blur made the note-to-note timing
  too uncertain to trim confidently without risking cutting the ornament
  out entirely. Since this source is already fully vetted (unlike the
  other six terms above, which needed independent verification from
  scratch), reusing the complete excerpt as-is carries no such risk.
  Worth trimming down once someone can confirm the exact moment by ear —
  flagging that as a follow-up rather than guessing at it.

## NOT SOURCED: Tenuto

Tried and could not clear the confidence bar. What I tried:

- Tenuto's defining feature — a note held for its *full written value*,
  as opposed to being clipped short — is a comparison against the printed
  note's rhythmic value, not a distinct sound in isolation. Acoustically it
  sits extremely close to (and is very often indistinguishable from) both
  plain legato and simply "not staccato" playing; there is no spectral or
  loudness signature I can measure from audio alone (the way I could for a
  sudden loud accent, an anomalously long fermata sustain, or an
  anomalously short grace-note gap) that reliably distinguishes "held its
  full value" from "just a normal sustained note."
- I considered reusing the same kind of approach as the other terms (find a
  score with an explicit tenuto dash marking, then locate that bar in a
  real recording), but even with a confirmed score location, I would have
  no way to verify — by ear or by measurement — that the specific
  performance in a given public-domain recording actually renders that
  marking audibly differently from the surrounding notes, since most
  pianists/ensembles treat printed tenuto marks as a very subtle
  interpretive nuance rather than a sound with its own clear signature.
- The existing `legato.mp3` clip already in the app covers closely
  adjacent territory (smoothly connected, fully-sustained notes), which
  would make a separately-sourced "tenuto" clip that sounds almost
  identical more confusing than illustrative rather than less.
- Given the brief's own explicit warning that fine articulation
  distinctions between accent/tenuto/marcato are "genuinely hard to isolate
  reliably... without a score in front of you," and that I have no reliable
  way to verify this one even with a score in hand, I'm skipping it rather
  than shipping a clip that isn't meaningfully different from `legato.mp3`.
