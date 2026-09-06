# ScoreDecoder terms — new audio manifest (tempo & dynamics batch)

Staged only. Nothing in `modules/musical-language/` was touched. Files live in
`review-staging/audio/scoredecoder-terms/`. All clips are 48kHz stereo MP3 at
~128kbps, matching the format of the 18 existing clips in
`modules/musical-language/assets/audio/`.

---

## Largo

- **File:** `largo.mp3` (13.0s)
- **Source:** Antonín Dvořák, Symphony No. 9 "From the New World," Op. 95,
  II. Largo — opening slow brass chorale introduction (before the famous
  cor anglais entrance).
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/c/c3/Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27%2C_op._95_-_ii._largo.ogg
  (via https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_'from_the_new_world',_op._95_-_ii._largo.ogg)
- **License:** Composition public domain; recording released into the
  public domain by Musopen (Creative Commons Public Domain Mark 1.0).
- **Performer:** Musopen orchestral recording (performer/orchestra not
  individually credited on the Commons file page — attributed to Musopen).
- **Why it demonstrates the term:** The movement's tempo marking is
  literally "Largo." This excerpt is the very opening — sustained, hushed,
  slow-moving brass chords — an unambiguous, textbook example of "broad and
  very slow."

---

## Grave

- **File:** `grave.mp3` (10.2s)
- **Source:** Ludwig van Beethoven, Piano Sonata No. 8 in C minor
  "Pathétique," Op. 13, I. Grave — Allegro di molto e con brio — opening
  "Grave" introduction only (the famous fp chords and their descending
  answering phrase, before the Allegro begins).
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/2/26/Beethoven%2C_Sonata_No._8_in_C_Minor_Pathetique%2C_Op._13_-_I._Grave_-_Allegro_di_molto_e_con_brio.ogg
  (via https://commons.wikimedia.org/wiki/File:Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_I._Grave_-_Allegro_di_molto_e_con_brio.ogg)
- **License:** CC0 1.0 Universal (Public Domain Dedication).
- **Performer:** Paul Pitman (piano), via Musopen.
- **Verification:** Checked the score directly (IMSLP/Edition Peters
  reprint) — the movement is headed "Grave" in the composer's own tempo
  marking, confirming this passage is exactly the music in question. Used
  silence-gap analysis of the recording to trim right at the first natural
  phrase break so the clip doesn't cut off mid-chord.
- **Why it demonstrates the term:** Slow, weighty, punctuated fp chords —
  the canonical "very slow and solemn" opening gesture that gives the
  Sonata its "Pathétique" character.

---

## Accelerando

- **File:** `accelerando.mp3` (14.0s, trimmed from 95.5s–109.5s of the
  source recording)
- **Source:** Edvard Grieg, "In the Hall of the Mountain King" (Peer Gynt
  Suite No. 1, Op. 46, No. 4).
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/b/bb/Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg
  (via https://commons.wikimedia.org/wiki/File:Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg)
- **License:** Released into the public domain by Musopen.
- **Performer:** Czech National Symphony Orchestra, performing as the
  "Musopen Symphony," recorded 2012 (Musopen Kickstarter orchestral
  sessions).
- **Verification:** This piece is one of the most commonly cited
  real-world examples of a written accelerando, but because the
  interpretive degree of speed-up varies performance to performance, I did
  not rely on reputation alone. I ran an onset-density (spectral-flux)
  analysis on the actual audio file to confirm this specific recording
  really does speed up, and where. Result: onset rate climbs from ~60–150
  onsets/min around 75–95s to 230–300+ onsets/min by 105–130s — a clear,
  measured tempo increase — accompanied by a corroborating ~10dB rise in
  RMS loudness across the same span (Grieg's terraced crescendo runs
  alongside the accelerando). The trimmed window (95.5–109.5s) sits right
  in the middle of that measured ramp, starting near the low point after a
  brief held pause and ending well into the faster passage.
- **Why it demonstrates the term:** Directly measured, audible speeding-up
  within the clip's own duration, not just "the piece is fast."

---

## Rallentando

- **File:** `rallentando.mp3` (15.0s, trimmed from 248.0s–263.0s of the
  source recording)
- **Source:** Frédéric Chopin, Nocturne in E-flat major, Op. 9, No. 2 —
  closing bars (the final "a tempo" restatement of the theme through the
  score's explicit "dim. — rall. — smorz." marking into the final chord).
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/8/82/Nocturne_in_E_flat_major%2C_Op._9_no._2.mp3
  (via https://commons.wikimedia.org/wiki/File:Nocturneop9no2-.ogg)
- **License:** Public domain (Creative Commons Public Domain Dedication),
  released via Musopen.
- **Performer:** Frank Levy (piano), via Musopen.
- **Verification:** Downloaded the Henle Urtext score (IMSLP) and located
  the exact marking — measure 33 is marked "dim.", "rall.", "smorz."
  (smorzando = dying away in both tempo and volume), leading into the
  final ppp chord in measure 34. Used silence-gap analysis on the audio to
  locate the structural landmarks (the fermata pause before this final
  section, and the long trailing silence after the final chord's decay)
  and trimmed to the passage in between. RMS-over-time confirms the
  passage tapers off in volume toward the end (from around -25dB down to
  -59dB at the tail), consistent with the score's own "dying away"
  instruction.
- **Why it demonstrates the term:** An explicitly rall.-marked passage,
  performed by a real pianist, audibly slowing into the final cadence.

---

## Rubato

- **File:** `rubato.mp3` (10.0s, trimmed from 1.0s–11.0s of the source
  recording — the opening melodic phrase)
- **Source:** Frédéric Chopin, Nocturne in E-flat major, Op. 9, No. 2 —
  opening theme ("Andante," espress. dolce).
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/8/82/Nocturne_in_E_flat_major%2C_Op._9_no._2.mp3
  (via https://commons.wikimedia.org/wiki/File:Nocturneop9no2-.ogg)
- **License:** Public domain (Creative Commons Public Domain Dedication),
  released via Musopen.
- **Performer:** Frank Levy (piano), via Musopen.
- **Why it demonstrates the term:** Chopin's nocturnes are the textbook
  repertoire example of tempo rubato — the melody line is expected to be
  played with small, expressive give-and-take against a steady
  accompaniment, rather than metronomically. The score itself marks a
  "poco rubato" passage later in this same piece (measure 26), confirming
  rubato is the intended performance style throughout; the opening
  phrase — the most recognizable part of the piece — was chosen so the
  clip is both stylistically representative and immediately identifiable.

---

## Forte

- **File:** `forte.mp3` (12.0s, trimmed from 213.0s–225.0s of the source
  recording)
- **Source:** Frédéric Chopin, Nocturne in E-flat major, Op. 9, No. 2 —
  the passionate middle section.
- **Original URL:** https://upload.wikimedia.org/wikipedia/commons/8/82/Nocturne_in_E_flat_major%2C_Op._9_no._2.mp3
  (via https://commons.wikimedia.org/wiki/File:Nocturneop9no2-.ogg)
- **License:** Public domain (Creative Commons Public Domain Dedication),
  released via Musopen.
- **Performer:** Frank Levy (piano), via Musopen.
- **Verification / confidence caveat:** The Henle score confirms a plain
  "f" dynamic is marked once in this piece (measure 18, in the developing
  middle section — distinct from the "ff" climax near the very end and
  the "pp"/"ppp" ending). I was **not** able to precisely map that measure
  number to a timestamp in this specific rubato performance (the piece's
  tempo is too free/nonlinear to extrapolate reliably from bar count
  alone, and I have no way to listen to the recording directly). Instead
  I measured RMS loudness across the *entire* 4:31 recording in 1-second
  windows: this pinpointed one clearly sustained loud plateau
  (~205s–229s, roughly 10dB louder than the piece's quiet/moderate
  baseline elsewhere) — a single, obvious, sustained "loud" passage
  consistent with where a marked forte passage would sit, and distinct in
  character (a songful Romantic forte, not a hammered climax) from the
  brief fortissimo hit later in the piece. This is offered with
  moderate-not-total confidence: it is measurably and audibly "loud" in
  isolation, which was the bar set for this term, but I could not
  independently confirm it is the *exact* bar marked "f" in the score.
  Flagging this so a reviewer can double check by ear before it's used.

---

## NOT SOURCED: Mezzo Piano

Tried and could not clear the bar for confident use. What I tried:

- Checked scores I already had in hand (Beethoven Pathétique Sonata
  No. 8, Chopin Nocturne Op. 9 No. 2) for an explicit "mp" marking —
  neither uses it (Beethoven-era scores of this type essentially never
  use "mp"/"mf"; the Chopin score only has plain p/pp/f/ff/ppp).
  "Mezzo piano" as a marking is much more a late-Romantic/20th-century
  convention, which shifts the search toward repertoire/recordings that
  are far less likely to be public domain performances.
- Considered Debussy's "Clair de Lune" (which does use nuanced mp/mf
  markings) but the only Wikimedia Commons audio file I found for it was
  explicitly noted as "imported from YouTube," which is exactly the kind
  of unclear-rights recording the brief says to avoid — the composition
  is PD, but an unverified YouTube-sourced *performance* is not
  confidently redistributable, so I did not use it.
- Considered freesound.org's "Grand Piano Mezzo-forte"-style packs (single
  notes from the University of Iowa Musical Instrument Samples database,
  re-uploaded to Freesound) but the underlying University of Iowa samples
  carry their own non-commercial-use restriction from the original rights
  holder, which a Freesound re-uploader's CC0 tag doesn't actually clear —
  and a single isolated note also wouldn't give a listener the musical
  context needed to "recognize" a relative dynamic level, per the brief's
  own caution.
- Did not find a rights-clear recording with a verifiable, isolable "mp"
  passage in the time available. Skipping rather than forcing a guess.

## NOT SOURCED: Mezzo Forte

Same situation and same searches as Mezzo Piano above — no plain "mf"
marking turned up in any public-domain score I checked, and I was not
willing to guess at a "moderately loud" passage without score
confirmation (unlike Forte, where I at least had RMS evidence pointing to
one specific sustained loud passage; "moderately loud" is inherently a
narrower, harder-to-judge target than "loud," and I did not want to force
a passage that might really read as forte, mezzo-piano, or just
"ordinary" to a listener). Skipping rather than shipping a misleading
example.
