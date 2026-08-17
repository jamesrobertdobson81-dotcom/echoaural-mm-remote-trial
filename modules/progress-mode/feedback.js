// Progress Mode — per-area written feedback.
//
// Pulled out of script.js so it can also be loaded and called directly by
// the student dashboard (account/student-home/), which reads this folder's
// own store.js/app-drivers.js data to render Progress Mode's "Detailed
// feedback" dialog — Progress Mode itself stays self-contained (see
// store.js's own header comment) and never calls INTO the dashboard; this
// is the dashboard reaching in the other direction, read-only.
(function (global) {
  "use strict";

  // Short strength/gap/focus fragments per source — sub-app names only ever
  // appear inside this written feedback, never as their own scored row.
  // Three roles, always used in this order: `strength` (what the student
  // already does well), `gap` (the specific skill/discrimination they
  // haven't built yet — phrased as something to "work on", e.g. "telling X
  // apart from Y", never as a bare description of the mistake itself,
  // which reads oddly after "work on"), and `focus` (the concrete,
  // actionable "how" — what to actually listen/count/check for next time).
  // `label` is the short noun form used parenthetically to name the topic.
  var SOURCE_PHRASES = {
    "instrument-identifier": {
      strength: "recognise instruments and instrumental families confidently",
      gap: "telling similar-sounding instruments apart",
      focus: "listen more closely for register, attack and tone colour between similar instruments",
      label: "instrument identification"
    },
    "ensemble-recognition": {
      strength: "identify ensembles and performing forces well",
      gap: "telling similarly-sized ensembles apart",
      focus: "compare the size and blend of similar ensembles more carefully",
      label: "ensemble recognition"
    },
    "melody-master-devices": {
      strength: "recognise melodic devices well",
      gap: "spotting that something changes without pinning down which device caused it",
      focus: "name the specific device rather than just spotting that something changes",
      label: "melodic devices"
    },
    "melody-master-dictation": {
      strength: "notate melodic dictations accurately",
      gap: "keeping track of a melody's shape while writing down exact pitches",
      focus: "check whether a passage is ascending, descending or repeated before placing exact pitches",
      label: "melodic dictations"
    },
    "melodic-intervals": {
      strength: "recognise melodic intervals confidently",
      gap: "hearing the difference between similar-sized intervals",
      focus: "connect each interval's stave distance to how it actually sounds",
      label: "melodic intervals"
    },
    "musical-language-ornamentation": {
      strength: "recognise ornaments well",
      gap: "telling the rarer ornament symbols apart",
      focus: "learn the less common ornament symbols and their names",
      label: "ornament recognition"
    },
    "musical-language-articulation": {
      strength: "recognise articulation markings well",
      gap: "telling apart marks that look or sound alike",
      focus: "compare similar articulation marks such as staccato and staccatissimo",
      label: "articulation markings"
    },
    "texture-trainer": {
      strength: "describe musical texture clearly",
      gap: "structuring a clear texture description",
      focus: "name the texture first, then explain the number and relationship of the lines",
      label: "texture description"
    },
    "musical-language-dynamics": {
      strength: "recognise dynamic markings well",
      gap: "catching a change in dynamics happening mid-passage",
      focus: "spot dynamic changes such as crescendo and diminuendo, not just static levels",
      label: "dynamic markings"
    },
    "chord-identifier": {
      strength: "identify chords and harmony confidently",
      gap: "hearing when a chord is in inversion",
      focus: "listen for the bass note to judge inversions rather than just the chord itself",
      label: "chord identification"
    },
    "harmony-key-signatures": {
      strength: "identify key signatures confidently",
      gap: "judging a key signature by an exact count rather than its overall shape",
      focus: "count the sharps or flats systematically rather than guessing from the overall shape",
      label: "key signature identification"
    },
    "cadence-coach": {
      strength: "recognise cadence types well",
      gap: "pinpointing exactly where a cadence lands",
      focus: "listen closely to the final two chords rather than the passage as a whole",
      label: "cadence recognition"
    },
    "meter-master": {
      strength: "recognise metre and rhythmic devices well",
      gap: "keeping count of the beat grouping across a whole passage",
      focus: "count the beat grouping carefully before naming the metre",
      label: "metre and rhythm"
    },
    "musical-language-tempo": {
      strength: "recognise tempo markings well",
      gap: "telling apart tempo markings that sit close together",
      focus: "compare similar tempo markings such as andante and moderato",
      label: "tempo markings"
    },
    "context-coach-composer": {
      strength: "identify composers confidently",
      gap: "telling apart composers with a similar style",
      focus: "listen for the stylistic fingerprints that separate similar composers",
      label: "composer identification"
    },
    "context-coach-period": {
      strength: "recognise musical periods well",
      gap: "judging which side of a stylistic boundary a piece falls on",
      focus: "compare the stylistic features that mark the boundary between neighbouring periods",
      label: "period identification"
    }
  };

  // Concept-level phrases — one level more specific than SOURCE_PHRASES
  // above: not "you recognise chords well" but "you recognise first
  // inversion chords well." Keyed by server moduleId (not PM sourceKey,
  // since this data only exists Live-Session-side for now — see
  // accounts/account-server.js's byConcept/CONCEPT_EXTRACTORS_BY_MODULE,
  // which is what decides which concept values a module can produce here).
  // Only the 5 modules with genuinely clean, single-concept data get a
  // bank; every value below was checked against real question data before
  // writing its phrase, not assumed.
  var CONCEPT_PHRASES = {
    "chord-identifier": {
      "root position": {
        strength: "recognise root position chords confidently",
        gap: "telling root position apart from a genuine inversion",
        focus: "check that the lowest note really is the chord's root before settling on root position",
        label: "root position chords"
      },
      "first inversion": {
        strength: "recognise first inversion chords well",
        gap: "hearing when the chord's third, not its root, is on the bottom",
        focus: "listen for the third of the chord sitting in the bass, not the root",
        label: "first inversion chords"
      },
      "second inversion": {
        strength: "recognise second inversion chords confidently",
        gap: "hearing the unstable, six-four feel that signals a second inversion",
        focus: "listen for the fifth in the bass and the unsettled, \"suspended\" quality a 6-4 chord has",
        label: "second inversion chords"
      },
      "third inversion": {
        strength: "recognise third inversion seventh chords well",
        gap: "hearing the tension that marks a seventh chord's third inversion",
        focus: "listen for the dissonant note in the bass — the seventh itself — that marks a third inversion",
        label: "third inversion chords"
      },
      "Triads": {
        strength: "identify plain triads confidently",
        gap: "locking in a triad's basic quality quickly",
        focus: "settle the triad's quality — major, minor or diminished — before considering anything more complex",
        label: "triads"
      },
      "Seventh chords": {
        strength: "recognise seventh chords well",
        gap: "hearing the extra note that turns a triad into a seventh chord",
        focus: "listen for the extra dissonant note a 7th above the root that marks a seventh chord, not just a triad",
        label: "seventh chords"
      },
      "Extended chords": {
        strength: "recognise extended and decorated chords confidently",
        gap: "spotting extra colour notes stacked onto a plain chord",
        focus: "listen past the basic triad for an added colour tone or a suspended note before naming a plain chord",
        label: "extended chords"
      },
      "Roman numeral analysis": {
        strength: "read Roman numeral chord analysis confidently",
        gap: "connecting a chord's sound to its scale-degree numeral",
        focus: "work out the scale degree of the chord's root in the key first, then add the correct case and any figures",
        label: "Roman numeral analysis"
      },
      "Primary chords": {
        strength: "identify primary chords (I, IV, V) confidently",
        gap: "recognising the three main load-bearing chords of a key",
        focus: "check the chord's root against the key's 1st, 4th and 5th degrees before considering anything else",
        label: "primary chords"
      },
      "Secondary chords": {
        strength: "identify secondary chords (ii, iii, vi, vii°) confidently",
        gap: "recognising the less common chords built on the other scale degrees",
        focus: "work out the chord's root's scale degree directly, rather than assuming it must be a primary chord",
        label: "secondary chords"
      },
      "Major keys": {
        strength: "identify chords in major keys confidently",
        gap: "telling a major-key chord apart from its minor-key counterpart",
        focus: "listen for the bright, settled quality a major tonic chord has before analysing further",
        label: "major-key chords"
      },
      "Minor keys": {
        strength: "identify chords in minor keys confidently",
        gap: "telling a minor-key chord apart from its major-key counterpart",
        focus: "listen for the darker, more tense quality a minor tonic chord has before analysing further",
        label: "minor-key chords"
      }
    },
    "key-signature-sprint": {
      "sharp": {
        strength: "identify sharp key signatures confidently",
        gap: "counting a sharp key signature exactly rather than judging it by eye",
        focus: "count the sharps in order (F♯-C♯-G♯-D♯...) rather than judging the overall look",
        label: "sharp key signatures"
      },
      "flat": {
        strength: "identify flat key signatures confidently",
        gap: "counting a flat key signature exactly rather than judging it by eye",
        focus: "count the flats in order (B♭-E♭-A♭-D♭...) rather than judging the overall look",
        label: "flat key signatures"
      },
      "natural": {
        strength: "recognise a natural key signature (no sharps or flats) reliably",
        gap: "checking a key signature is genuinely empty before assuming otherwise",
        focus: "check for a genuinely empty key signature before assuming sharps or flats",
        label: "natural key signatures"
      },
      "Few accidentals (0-2)": {
        strength: "read key signatures with 0-2 sharps or flats confidently",
        gap: "recognising the simplest, most common key signatures instantly",
        focus: "drill the simplest key signatures (C, G, F, D, B♭) until they're instant",
        label: "simple key signatures"
      },
      "Moderate accidentals (3-4)": {
        strength: "handle key signatures with 3-4 sharps or flats well",
        gap: "keeping track once a key signature reaches 3-4 accidentals",
        focus: "use the last-sharp-plus-a-semitone or second-last-flat shortcut once you reach 3-4 accidentals",
        label: "moderate key signatures"
      },
      "Many accidentals (5-7)": {
        strength: "confidently read key signatures with 5-7 sharps or flats",
        gap: "keeping an exact count once a key signature gets busy",
        focus: "count every accidental in order rather than estimating once a key signature gets busy",
        label: "key signatures with 5-7 accidentals"
      },
      "major": {
        strength: "identify major-key signatures confidently",
        gap: "telling a major key apart from its relative minor",
        focus: "check whether the piece resolves to the tonic major chord, not just the bare key signature",
        label: "major key signatures"
      },
      "minor": {
        strength: "identify minor-key signatures confidently",
        gap: "telling a minor key apart from its relative major",
        focus: "check whether the piece resolves to the tonic minor chord, not just the bare key signature",
        label: "minor key signatures"
      },
      "relative": {
        strength: "work out relative major/minor pairs confidently",
        gap: "pairing a key signature with both its major and minor reading",
        focus: "count up a minor third from a minor tonic (or down a minor third from a major one) to find its relative pair",
        label: "relative major/minor"
      },
      "treble": {
        strength: "read key signatures in the treble clef confidently",
        gap: "telling the treble-clef key signature layout apart from the bass clef's",
        focus: "learn the treble-clef line/space position of each sharp and flat in order",
        label: "treble clef key signatures"
      },
      "bass": {
        strength: "read key signatures in the bass clef confidently",
        gap: "telling the bass-clef key signature layout apart from the treble clef's",
        focus: "learn the bass-clef line/space position of each sharp and flat in order — it differs from the treble clef",
        label: "bass clef key signatures"
      }
    },
    "meter-master": {
      "Simple duple": {
        strength: "recognise simple duple metre well",
        gap: "counting exactly how many main beats are in a simple duple bar",
        focus: "check for exactly two main beats per bar, each splitting into two",
        label: "simple duple metre"
      },
      "Simple triple": {
        strength: "recognise simple triple metre confidently",
        gap: "hearing the three-in-a-bar lilt that marks simple triple time",
        focus: "count three main beats per bar, each splitting into two, and listen for that \"waltz\" lilt",
        label: "simple triple metre"
      },
      "Simple quadruple": {
        strength: "recognise simple quadruple metre well",
        gap: "counting exactly how many main beats are in a simple quadruple bar",
        focus: "count four main beats per bar, each splitting into two",
        label: "simple quadruple metre"
      },
      "Compound duple": {
        strength: "recognise compound duple metre confidently",
        gap: "hearing that each beat splits into three, not two",
        focus: "count two main beats per bar, each splitting into three, not two",
        label: "compound duple metre"
      },
      "Compound quadruple": {
        strength: "recognise compound quadruple metre well",
        gap: "telling a compound quadruple bar apart from a simple one",
        focus: "count four main beats per bar, each splitting into three",
        label: "compound quadruple metre"
      },
      "Irregular quintuple": {
        strength: "recognise irregular 5-beat metres confidently",
        gap: "hearing an uneven 2+3 grouping instead of a false steady pulse",
        focus: "listen for an uneven 2+3 or 3+2 grouping rather than a steady beat",
        label: "irregular metre"
      },
      "Variable/mixed": {
        strength: "track metre that changes within a piece well",
        gap: "telling a change in grouping apart from a simple change in tempo",
        focus: "listen for the point where the beat GROUPING itself changes, not just a change in tempo",
        label: "changing or mixed metre"
      },
      "Simple time": {
        strength: "recognise simple time confidently",
        gap: "telling simple and compound time apart at a glance",
        focus: "check whether each main beat splits into two, not three, before naming the metre",
        label: "simple time"
      },
      "Compound time": {
        strength: "recognise compound time well",
        gap: "telling compound and simple time apart at a glance",
        focus: "check whether each main beat splits into three, not two, before naming the metre",
        label: "compound time"
      },
      "Aural classification": {
        strength: "classify metre by ear confidently",
        gap: "recognising metre from the sound alone, with nothing written down",
        focus: "count along with the pulse and listen for how each beat subdivides before naming the metre",
        label: "aural metre classification"
      },
      "Skeleton-score completion": {
        strength: "complete skeleton rhythm scores confidently",
        gap: "working out a bar's missing rhythm from its time signature and a few given notes",
        focus: "count the bar's total beat value first, then work out what note values fill the gap",
        label: "skeleton-score completion"
      },
      "Pulse analysis": {
        strength: "analyse the underlying pulse confidently",
        gap: "locating the steady main beat under a busier surface rhythm",
        focus: "tap the slowest steady pulse you can feel first, then check how it divides",
        label: "pulse analysis"
      },
      "Context and style": {
        strength: "connect metre to musical style and context confidently",
        gap: "linking a metre to the dance or style it's typically associated with",
        focus: "listen for stylistic clues — a lilting compound feel suggests a jig or siciliana, a strong triple pulse suggests a waltz",
        label: "metre in context and style"
      },
      "Beat-unit analysis": {
        strength: "identify the beat unit confidently",
        gap: "naming which note value actually receives one beat",
        focus: "check the bottom number of the time signature against how the beat is actually subdivided, not just assumed",
        label: "beat-unit analysis"
      },
      "Score-reading questions": {
        strength: "read metre and rhythm from a score confidently",
        gap: "reading rhythmic notation directly off the page",
        focus: "look at the barring and beaming first — they show the beat grouping the composer intended",
        label: "score-reading metre questions"
      },
      "Listening-only questions": {
        strength: "recognise metre by ear alone confidently",
        gap: "judging metre with no notation to check against",
        focus: "count along out loud with the recording until the beat grouping becomes clear",
        label: "listening-only metre questions"
      },
      "3/4": {
        strength: "recognise 3/4 time confidently",
        gap: "telling 3/4 apart from a faster two-beat feel",
        focus: "count \"one-two-three\" steadily and check the bar resets exactly on beat one each time",
        label: "3/4 time"
      },
      "6/8": {
        strength: "recognise 6/8 time confidently",
        gap: "hearing 6/8's two dotted-crotchet beats rather than six separate quavers",
        focus: "group the six quavers into two sets of three and tap only the first of each group",
        label: "6/8 time"
      },
      "2/4": {
        strength: "recognise 2/4 time confidently",
        gap: "hearing two crotchet beats per bar without doubling it up as 4/4",
        focus: "count \"one-two\" and check the bar genuinely resets after only two beats",
        label: "2/4 time"
      },
      "4/4": {
        strength: "recognise 4/4 time confidently",
        gap: "keeping track of four even beats without drifting off the pulse",
        focus: "count \"one-two-three-four\" and check for a clear stress on beat one and a lighter stress on beat three",
        label: "4/4 time"
      },
      "2/2": {
        strength: "recognise 2/2 (cut time) confidently",
        gap: "telling cut time's two-beat feel apart from an ordinary four-beat bar",
        focus: "count \"one-two\" at a minim pulse rather than defaulting to a four-beat crotchet count",
        label: "2/2 (cut) time"
      }
    },
    "instrument-identifier": {
      "Strings": {
        strength: "identify string instruments confidently",
        gap: "telling strings apart from other sustained, non-plucked sounds",
        focus: "listen for bow noise or vibrato to separate strings from other sustained sounds",
        label: "string instruments"
      },
      "Woodwind": {
        strength: "identify woodwind instruments well",
        gap: "telling a woodwind's tone colour apart from another family's",
        focus: "listen for the breathy attack and reed or embouchure colour that marks a woodwind instrument",
        label: "woodwind instruments"
      },
      "Brass": {
        strength: "identify brass instruments confidently",
        gap: "telling brass apart from woodwind on a similar-sounding clip",
        focus: "listen for the buzzing-lip attack and metallic ring that separates brass from woodwind",
        label: "brass instruments"
      },
      "Percussion": {
        strength: "identify percussion instruments well",
        gap: "judging a percussion instrument's family correctly from its attack",
        focus: "decide whether the sound has a clear pitch or is unpitched before naming the instrument",
        label: "percussion instruments"
      },
      "Keyboard": {
        strength: "identify keyboard instruments confidently",
        gap: "telling different keyboard instruments' tone apart",
        focus: "listen for how the note decays (piano) versus sustains evenly (organ) to tell keyboards apart",
        label: "keyboard instruments"
      },
      "Guitar": {
        strength: "identify guitar and plucked strings well",
        gap: "telling a plucked guitar apart from a bowed string instrument",
        focus: "listen for the plucked attack and quick decay that separates guitar from bowed strings",
        label: "guitar and plucked strings"
      },
      "Voice": {
        strength: "identify the voice confidently",
        gap: "telling the voice apart from an instrument with a similar tone",
        focus: "listen for text and vowel shaping, which no instrument reproduces",
        label: "the voice"
      },
      "World/Ensemble": {
        strength: "identify world and mixed ensembles well",
        gap: "spotting an unfamiliar instrument instead of defaulting to a familiar family",
        focus: "listen for instruments and tunings outside the standard orchestra before defaulting to a familiar family",
        label: "world instruments and ensembles"
      },
      "Orchestral": {
        strength: "identify instruments inside a full orchestral texture confidently",
        gap: "isolating one instrument among a dense orchestral texture",
        focus: "pick out one instrument's line from the full ensemble rather than listening to the overall blend",
        label: "orchestral textures"
      },
      "Solo": {
        strength: "identify solo instruments well",
        gap: "trusting your first read on a fully exposed solo instrument",
        focus: "use the exposed tone colour to full advantage — there's no ensemble blend to hide behind",
        label: "solo instruments"
      },
      "Piano Accomp.": {
        strength: "identify instruments over piano accompaniment confidently",
        gap: "hearing past a piano accompaniment to the instrument carrying the melody",
        focus: "listen past the piano part to the instrument actually carrying the melody",
        label: "instruments with piano accompaniment"
      },
      "Organ Accomp.": {
        strength: "identify instruments over organ accompaniment well",
        gap: "hearing past an organ's sustained texture to the solo instrument's tone",
        focus: "separate the organ's sustained texture from the solo instrument's own tone",
        label: "instruments with organ accompaniment"
      },
      "Harpsichord": {
        strength: "identify the harpsichord confidently",
        gap: "telling the harpsichord apart from a struck, dynamically-shaded keyboard",
        focus: "listen for its plucked (not struck) attack and its lack of dynamic shading",
        label: "harpsichord"
      },
      "Cello": {
        strength: "identify the cello confidently",
        gap: "telling a cello apart from a viola or double bass",
        focus: "listen for its warm, singing tone sitting in the tenor/baritone range, below a viola and above a double bass",
        label: "cello"
      },
      "Oboe": {
        strength: "identify the oboe confidently",
        gap: "telling an oboe apart from a clarinet",
        focus: "listen for its bright, nasal double-reed tone — more piercing and less mellow than a clarinet",
        label: "oboe"
      },
      "Clarinet": {
        strength: "identify the clarinet confidently",
        gap: "telling a clarinet apart from an oboe",
        focus: "listen for its smooth, hollow single-reed tone, especially rich in its low chalumeau register",
        label: "clarinet"
      },
      "Violin": {
        strength: "identify the violin confidently",
        gap: "telling a violin apart from a viola",
        focus: "listen for its bright, high-pitched tone sitting above a viola's darker range",
        label: "violin"
      },
      "Flute": {
        strength: "identify the flute confidently",
        gap: "telling a flute apart from a recorder",
        focus: "listen for its pure, breathy tone with no reed buzz at all",
        label: "flute"
      },
      "Trumpet": {
        strength: "identify the trumpet confidently",
        gap: "telling a trumpet apart from a French horn",
        focus: "listen for its bright, forward, cutting brass tone rather than a mellower, rounder one",
        label: "trumpet"
      },
      "Recorder": {
        strength: "identify the recorder confidently",
        gap: "telling a recorder apart from a flute",
        focus: "listen for its simple, slightly breathy tone that stays more uniform across its range than a flute's",
        label: "recorder"
      },
      "Double Bass": {
        strength: "identify the double bass confidently",
        gap: "telling a double bass apart from a cello",
        focus: "listen for its very low register and heavier, less agile tone underneath a cello",
        label: "double bass"
      },
      "Viola": {
        strength: "identify the viola confidently",
        gap: "telling a viola apart from a violin",
        focus: "listen for its darker, more veiled tone sitting below a violin's brighter range",
        label: "viola"
      },
      "Erhu": {
        strength: "identify the erhu confidently",
        gap: "telling the erhu apart from a Western bowed string instrument",
        focus: "listen for its thin, nasal, sliding tone, produced on just two strings",
        label: "erhu"
      },
      "Acoustic Guitar": {
        strength: "identify the acoustic guitar confidently",
        gap: "telling an acoustic guitar apart from a harp or other plucked string",
        focus: "listen for its plucked, resonant tone with a distinct fretted-string buzz",
        label: "acoustic guitar"
      },
      "Piano": {
        strength: "identify the piano confidently",
        gap: "telling a piano apart from a harpsichord",
        focus: "listen for its struck, dynamically-shaded tone — notes fade naturally rather than staying level",
        label: "piano"
      },
      "French Horn": {
        strength: "identify the French horn confidently",
        gap: "telling a French horn apart from a trumpet or trombone",
        focus: "listen for its warm, mellow, rounded brass tone, less bright than a trumpet's",
        label: "French horn"
      },
      "Bandoneon": {
        strength: "identify the bandoneon confidently",
        gap: "telling a bandoneon apart from an accordion",
        focus: "listen for its reedy, breathy, slightly nasal tone, closely tied to tango music",
        label: "bandoneon"
      },
      "Typed instrument answers": {
        strength: "recall and spell instrument names confidently without prompts",
        gap: "producing the correct instrument name unprompted, not just recognising it among options",
        focus: "say the instrument name out loud before typing it, to check you're not just guessing from a shortlist in your head",
        label: "typed instrument answers"
      },
      "Custom-choice instrument answers": {
        strength: "handle custom answer-choice questions confidently",
        gap: "adjusting to answer choices that aren't the usual same-family distractors",
        focus: "read every option fully before choosing — these questions deliberately don't use the usual same-family distractors",
        label: "custom-choice instrument questions"
      },
      "Standard multiple-choice instrument answers": {
        strength: "handle standard multiple-choice instrument questions confidently",
        gap: "narrowing down a shortlist of similar-sounding instruments",
        focus: "eliminate the options from clearly different families first, then compare only the close, same-family choices",
        label: "standard multiple-choice instrument questions"
      }
    },
    "texture-trainer": {
      "Monophonic": {
        strength: "recognise monophonic texture confidently",
        gap: "catching a sparse accompaniment hiding under what sounds like one line",
        focus: "check there is truly only one melodic line with no accompaniment at all, however sparse",
        label: "monophonic texture"
      },
      "Homophonic": {
        strength: "recognise homophonic texture well",
        gap: "picking the main tune out from the chords supporting it",
        focus: "separate the main tune from the supporting chords moving underneath it",
        label: "homophonic texture"
      },
      "Polyphonic": {
        strength: "recognise polyphonic texture confidently",
        gap: "telling melody-plus-accompaniment apart from genuine independent lines",
        focus: "listen for two or more genuinely independent melodic lines at once, not just melody plus accompaniment",
        label: "polyphonic texture"
      },
      "Heterophonic": {
        strength: "recognise heterophonic texture well",
        gap: "telling decorated variations of one tune apart from separate melodic lines",
        focus: "listen for performers decorating the SAME tune at once, rather than playing entirely separate lines",
        label: "heterophonic texture"
      },
      "Fugal imitation": {
        strength: "recognise fugal imitation confidently",
        gap: "catching a melodic idea being echoed shortly after it first enters",
        focus: "listen for a melodic idea entering in one voice, then being echoed by another voice shortly after",
        label: "fugal imitation"
      },
      "Fugal polyphony": {
        strength: "recognise fugal polyphony well",
        gap: "keeping count of how many voices have entered with the subject",
        focus: "track how many voices have entered with the same subject before calling the texture \"full\"",
        label: "fugal polyphony"
      },
      "Fugue": {
        strength: "recognise a fugue's texture confidently",
        gap: "tracking new voices entering after a fugue's opening statement",
        focus: "listen for the subject's first full statement, then track each new voice entering with it",
        label: "fugue texture"
      },
      "Canon": {
        strength: "recognise canon (strict imitation) well",
        gap: "telling loose imitation apart from a strict canon",
        focus: "check the imitating voice repeats the leading voice exactly, not just loosely",
        label: "canon"
      },
      "Alberti Bass": {
        strength: "recognise Alberti bass accompaniment confidently",
        gap: "spotting a decorative left-hand accompaniment as its own device",
        focus: "listen for the broken-chord, low-high-middle-high pattern under the melody",
        label: "Alberti bass"
      },
      "Inverted Pedal": {
        strength: "recognise an inverted pedal well",
        gap: "hearing a pedal note sitting above the harmony instead of below it",
        focus: "listen for the sustained note sitting ABOVE the moving harmony, not below it",
        label: "inverted pedal"
      },
      "Pedal / drone": {
        strength: "recognise a pedal note or drone confidently",
        gap: "isolating the one note that stays fixed while everything else moves",
        focus: "listen for one sustained note underneath the harmony while the harmony above it keeps changing",
        label: "pedal notes and drones"
      },
      "Advanced polyphonic": {
        strength: "recognise dense, multi-voice polyphony well",
        gap: "tracking one voice among several independent lines",
        focus: "don't let several simultaneous independent lines overwhelm you — pick one voice and follow it through",
        label: "dense polyphony"
      },
      "Simple polyphonic": {
        strength: "recognise simple two-part polyphony confidently",
        gap: "telling a melody-and-bass texture apart from two independent lines",
        focus: "check the two lines are genuinely independent, not just a melody with a bass line underneath",
        label: "two-part polyphony"
      },
      "Melody and accompaniment": {
        strength: "recognise melody-and-accompaniment texture well",
        gap: "telling which line is the main tune and which is accompaniment",
        focus: "confirm the accompaniment stays clearly subordinate to one main tune",
        label: "melody and accompaniment"
      },
      "Antiphonal": {
        strength: "recognise antiphonal texture confidently",
        gap: "hearing two separate groups calling and answering each other",
        focus: "listen for one group finishing an idea before a second, separated group answers it",
        label: "antiphonal texture"
      },
      "Drone": {
        strength: "recognise a drone confidently",
        gap: "isolating one unchanging held pitch underneath moving material",
        focus: "listen for a single note that never changes pitch while everything else moves around it",
        label: "drone"
      },
      "Layered texture": {
        strength: "recognise layered texture confidently",
        gap: "tracking new layers being added one at a time",
        focus: "count each new line or instrument as it enters, rather than judging the texture only at its thickest point",
        label: "layered texture"
      },
      "Solo and tutti": {
        strength: "recognise solo-and-tutti alternation confidently",
        gap: "telling a soloist's passage apart from the full ensemble",
        focus: "listen for the sudden change in volume and density between one exposed player and the whole group",
        label: "solo and tutti texture"
      },
      "Parallel motion": {
        strength: "recognise parallel motion confidently",
        gap: "hearing two or more lines moving in the same direction by the same interval",
        focus: "check whether the lines keep the same distance apart as they move, rather than crossing or diverging",
        label: "parallel motion"
      },
      "Homorhythmic": {
        strength: "recognise homorhythmic texture confidently",
        gap: "hearing every voice move together in the same rhythm",
        focus: "check whether all the parts change notes at exactly the same time, like a hymn",
        label: "homorhythmic texture"
      },
      "Chordal homophony": {
        strength: "recognise chordal homophony confidently",
        gap: "hearing block chords moving together under a melody",
        focus: "listen for the supporting parts moving as solid chords in the same rhythm as the melody",
        label: "chordal homophony"
      },
      "Imitative texture": {
        strength: "recognise imitative texture confidently",
        gap: "catching one voice repeating an idea just heard in another voice",
        focus: "listen for a short idea entering in one voice, then reappearing in another shortly after",
        label: "imitative texture"
      },
      "Octaves": {
        strength: "recognise octave doubling confidently",
        gap: "hearing the same line doubled an octave apart, rather than two truly separate lines",
        focus: "check whether the two lines share exactly the same contour and rhythm, just at different registers",
        label: "octave doubling"
      },
      "Unison": {
        strength: "recognise unison texture confidently",
        gap: "hearing multiple performers on exactly the same pitch, not just the same idea",
        focus: "check whether every performer is playing the identical pitch, not just the identical rhythm",
        label: "unison texture"
      },
      "multiple-choice": {
        strength: "handle multiple-choice texture questions confidently",
        gap: "narrowing a shortlist of similar-sounding textures",
        focus: "eliminate any option that's clearly a different broad category (monophonic/homophonic/polyphonic) first",
        label: "multiple-choice texture questions"
      },
      "short-text": {
        strength: "name textures in your own words confidently",
        gap: "recalling and writing the correct texture term without options in front of you",
        focus: "name the broad category first (monophonic/homophonic/polyphonic), then add the more specific term",
        label: "short written texture answers"
      },
      "extended-text": {
        strength: "explain texture in full written answers confidently",
        gap: "describing not just what the texture is but how the parts relate to each other",
        focus: "name the texture, then explain in your own words what each part or voice is doing",
        label: "extended written texture answers"
      }
    }
  };

  var FEEDBACK_MIN_QUESTIONS = 8;
  // A lower bar for a hedged, "early signal" version of the same feedback
  // (see the isEarly parameter threaded through pairSentence/
  // strengthSentence/weaknessSentence/developingSentence below) — three
  // questions is the minimum that reasonably reads as a pattern rather
  // than one or two isolated answers. Deliberately does NOT change
  // store.js's own FLOOR_MIN_QUESTIONS (level-advancement gating stays at
  // the original, fully-reliable bar — this only affects what gets shown
  // to a student, never whether they advance a level).
  var EARLY_SIGNAL_MIN_QUESTIONS = 3;
  // Above this cumulative accuracy a source counts as a strength; below this
  // it counts as a weakness; in between it's "developing" — worth a brief
  // mention but not worth calling out as either. Deliberately mirrors
  // Store.PASS_PERCENTAGE (80) for the strength bar, since that's already
  // the bar a student has to clear to be considered secure in something.
  var STRENGTH_THRESHOLD = 80;
  var WEAKNESS_THRESHOLD = 60;
  // Soft cap on how many sentences one area's feedback grows to — every
  // reliable source gets represented somewhere, but a student with 5
  // well-sampled sources in one area (e.g. Melody) shouldn't get a wall of
  // text. Only trims the lowest-priority ("developing") sentence.
  var MAX_FEEDBACK_SENTENCES = 3;

  function joinList(labels) {
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels[0] + " and " + labels[1];
    return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
  }

  // Label text is only ever used as the OBJECT of a verb/preposition below
  // (e.g. "work on melodic dictations", "well with melodic devices"), never
  // as a sentence's grammatical subject — several labels are plural-sounding
  // ("melodic devices") and others singular ("ensemble recognition"), so
  // giving one its own verb ("melodic devices is/are...") would need
  // per-label agreement it isn't worth tracking.
  //
  // All four sentence-builders below take `phrases` (a SOURCE_PHRASES- or
  // CONCEPT_PHRASES[moduleId]-shaped bank) as their first argument, rather
  // than closing over SOURCE_PHRASES directly, so the exact same pairing/
  // sentence logic serves both buildAreaFeedback (across sub-apps) and
  // buildConceptFeedback (across concepts within one sub-app) below.
  // `isEarly` (all four helpers below): true when the sample backing this
  // sentence only clears EARLY_SIGNAL_MIN_QUESTIONS, not the fully-reliable
  // FEEDBACK_MIN_QUESTIONS bar — wraps the exact same strength/gap/focus/
  // label content in visibly tentative language ("Early signs suggest...")
  // instead of the confident phrasing, rather than asserting something the
  // sample size can't really support yet. Never mixes the two voices in
  // one sentence.
  function pairSentence(phrases, strongKey, weakKey, isEarly) {
    if (isEarly) {
      return "Early signs suggest you " + phrases[strongKey].strength + ", but you may want to start on " +
        phrases[weakKey].gap + " — " + phrases[weakKey].focus + " (" + phrases[weakKey].label + ").";
    }
    return "You " + phrases[strongKey].strength + ", but you need to work on " +
      phrases[weakKey].gap + " — " + phrases[weakKey].focus + " (" + phrases[weakKey].label + ").";
  }

  // `keys[0]` anchors the appended "how to improve" tip below — for a solo
  // sentence it's simply the one topic named; for a multi-item list, the
  // caller (buildAreaFeedback) already sorts `keys` so index 0 is the most
  // relevant anchor (strongest-of-the-extras for strengthSentence, weakest-
  // of-the-extras for weaknessSentence, closest-to-strength for
  // developingSentence) — one concrete tip per sentence rather than one per
  // listed label, so a longer list never turns into a wall of instructions.
  function strengthSentence(phrases, keys, hasPrior, isEarly) {
    if (keys.length === 1) {
      var soloStrong = phrases[keys[0]];
      if (isEarly) {
        return (hasPrior
          ? "Early signs also suggest you " + soloStrong.strength + "."
          : "Early signs are good — so far you " + soloStrong.strength + ".") +
          " To stay sharp, " + soloStrong.focus + ".";
      }
      return (hasPrior ? "You also " + soloStrong.strength : "You " + soloStrong.strength) +
        " — to stay sharp, " + soloStrong.focus + ".";
    }
    var labels = keys.map(function (k) { return phrases[k].label; });
    var tipStrong = phrases[keys[0]].focus;
    if (isEarly) {
      return (hasPrior ? "Early signs also suggest you do well with " : "Early signs suggest you do well with ") + joinList(labels) + ". To stay sharp, " + tipStrong + ".";
    }
    return (hasPrior ? "You also do well with " : "You do well with ") + joinList(labels) + ". To stay sharp, " + tipStrong + ".";
  }

  function weaknessSentence(phrases, keys, hasPrior, isEarly) {
    if (keys.length === 1) {
      var solo = phrases[keys[0]];
      if (isEarly) {
        return hasPrior
          ? "It's early, but you may also want to work on " + solo.gap + " — " + solo.focus + " (" + solo.label + ")."
          : "It's early, but you may want to start on " + solo.gap + " — " + solo.focus + " (" + solo.label + ").";
      }
      return hasPrior
        ? "You should also work on " + solo.gap + " — " + solo.focus + " (" + solo.label + ")."
        : "You need to work on " + solo.gap + " — " + solo.focus + " (" + solo.label + ").";
    }
    var labels = keys.map(function (k) { return phrases[k].label; });
    var tipWeak = phrases[keys[0]].focus;
    if (isEarly) {
      return (hasPrior ? "It's early, but you may also want to spend time on " : "It's early, but a good focus might be ") + joinList(labels) + ". To keep improving, " + tipWeak + ".";
    }
    return (hasPrior ? "You should also spend more time on " : "Focus next on ") + joinList(labels) + ". To keep improving, " + tipWeak + ".";
  }

  function developingSentence(phrases, keys, hasPrior, isEarly) {
    var labels = keys.map(function (k) { return phrases[k].label; });
    var tipDeveloping = phrases[keys[0]].focus;
    if (isEarly) {
      return (hasPrior ? "Too early to say for sure, but you're also showing steady signs with " : "Too early to say for sure, but you're showing steady signs with ") +
        joinList(labels) + " so far. To keep improving, " + tipDeveloping + ".";
    }
    return (hasPrior ? "You're steadily improving with " : "You're making steady progress with ") +
      joinList(labels) + " — to keep improving, " + tipDeveloping + ".";
  }

  // Builds a short, always-constructive written-feedback paragraph for one
  // area. `cumulativeStats` is a plain `{ [sourceKey]: {correct, questions,
  // percentage} }` object (exactly what Store.getCumulativeStats already
  // returns) rather than a Store+studentId pair, so this works equally well
  // fed PM-only stats or stats already combined with Live Session evidence
  // (see account/student-home/student-home.js's getCombinedSourceStats) —
  // the caller decides what "cumulative" means, this just writes the
  // sentences. `sourcesInArea` and `areaLabel` are passed in rather than
  // looked up here, so this stays reusable from both script.js's own driver
  // table and the dashboard's.
  //
  // Every source with enough of a sample (FEEDBACK_MIN_QUESTIONS) to be
  // meaningful is represented, not just a single strongest/weakest pick —
  // strengths and weaknesses are paired off into three-part "you do X well,
  // but need to work on Y — here's how" sentences (one pair per sentence),
  // with any left over after pairing (more strengths than weaknesses, or
  // vice versa) folded into a
  // trailing summary sentence, and any merely "developing" sources getting
  // a brief mention of their own. A brand-new area with no reliable source
  // yet still gets a constructive line rather than nothing. Naturally reads
  // more specifically as more sources cross the reliability bar — which in
  // practice means by the time an area reaches Developing level, since
  // clearing Foundation already requires a real volume of answered
  // questions (see store.js's MIN_QUESTIONS_PER_LEVEL).
  function buildAreaFeedback(cumulativeStats, sourcesInArea, areaLabel) {
    var cumulative = cumulativeStats || {};
    var sampled = sourcesInArea.filter(function (sourceKey) {
      return cumulative[sourceKey] && cumulative[sourceKey].questions >= EARLY_SIGNAL_MIN_QUESTIONS;
    });

    if (!sampled.length) {
      return "Complete a few more " + areaLabel.toLowerCase() + " questions to start building personalised feedback here.";
    }

    var reliable = sampled.filter(function (sourceKey) {
      return cumulative[sourceKey].questions >= FEEDBACK_MIN_QUESTIONS;
    });
    var pool = reliable.length ? reliable : sampled;
    var isEarly = !reliable.length;

    var strengths = pool
      .filter(function (k) { return cumulative[k].percentage >= STRENGTH_THRESHOLD; })
      .sort(function (a, b) { return cumulative[b].percentage - cumulative[a].percentage; });
    var weaknesses = pool
      .filter(function (k) { return cumulative[k].percentage < WEAKNESS_THRESHOLD; })
      .sort(function (a, b) { return cumulative[a].percentage - cumulative[b].percentage; });
    // Sorted descending (closest to becoming a strength first) so
    // developingSentence's tip anchor (keys[0]) is well-defined — same
    // "closest" logic buildConceptFeedback's own developing-band branch uses.
    var developing = pool.filter(function (k) {
      return cumulative[k].percentage >= WEAKNESS_THRESHOLD && cumulative[k].percentage < STRENGTH_THRESHOLD;
    }).sort(function (a, b) { return cumulative[b].percentage - cumulative[a].percentage; });

    var parts = [];
    var pairCount = Math.min(strengths.length, weaknesses.length);
    for (var i = 0; i < pairCount; i++) {
      parts.push(pairSentence(SOURCE_PHRASES, strengths[i], weaknesses[i], isEarly));
    }

    var extraStrengths = strengths.slice(pairCount);
    if (extraStrengths.length) parts.push(strengthSentence(SOURCE_PHRASES, extraStrengths, parts.length > 0, isEarly));

    var extraWeaknesses = weaknesses.slice(pairCount);
    if (extraWeaknesses.length) parts.push(weaknessSentence(SOURCE_PHRASES, extraWeaknesses, parts.length > 0, isEarly));

    if (developing.length && parts.length < MAX_FEEDBACK_SENTENCES) {
      parts.push(developingSentence(SOURCE_PHRASES, developing, parts.length > 0, isEarly));
    }

    return parts.join(" ");
  }

  // Single-source counterpart to buildAreaFeedback above, for the "one
  // element's real apps" popup (account/student-home/student-home.js's
  // elementDetailMarkup) — one sub-app at a time rather than pairing
  // several, but the same SOURCE_PHRASES bank and the same
  // strength/weakness/developing thresholds, so a sub-app's popup row and
  // its area-level paragraph never disagree about whether it's currently a
  // strength or a focus area.
  function buildSourceFeedback(sourceKey, correct, questions) {
    var phrases = SOURCE_PHRASES[sourceKey];
    if (!phrases) return "";
    if (!questions || questions < EARLY_SIGNAL_MIN_QUESTIONS) {
      return "Complete a few more questions to start building personalised feedback here.";
    }

    var isEarly = questions < FEEDBACK_MIN_QUESTIONS;
    var percentage = Math.round((correct / questions) * 100);
    if (percentage >= STRENGTH_THRESHOLD) {
      return isEarly
        ? "Early signs are good — so far you " + phrases.strength + ". To stay sharp, " + phrases.focus + "."
        : "You " + phrases.strength + " — to stay sharp, " + phrases.focus + ".";
    }
    if (percentage < WEAKNESS_THRESHOLD) {
      return isEarly
        ? "It's early, but you may want to start on " + phrases.gap + " — " + phrases.focus + " (" + phrases.label + ")."
        : "You need to work on " + phrases.gap + " — " + phrases.focus + " (" + phrases.label + ").";
    }
    return isEarly
      ? "Too early to say for sure, but you're showing steady signs with " + phrases.label + " so far. To keep improving, " + phrases.focus + "."
      : "You're making steady progress with " + phrases.label + " — to keep improving, " + phrases.focus + ".";
  }

  // Concept-level counterpart to buildSourceFeedback above, for the same
  // popup row — used in preference to it when a sub-app's server module has
  // concept-level data (accounts/account-server.js's byConcept). Unlike
  // buildAreaFeedback's multi-pair paragraph, this always picks exactly ONE
  // strength and ONE weakness — the single clearest signal across every
  // concept dimension the module has (e.g. chord-identifier's inversion AND
  // extension tier land in the same `conceptStats` pool, so a "second
  // inversion" weakness and a "Triads" strength can be paired directly) —
  // matching the target feedback shape: one topic named per sentence.
  // Returns null (caller falls back to buildSourceFeedback) only when no
  // concept has enough of a sample yet, or when CONCEPT_PHRASES doesn't
  // cover this module at all — a reliably-sampled concept always produces
  // a sentence, even when every one of them sits in the middle
  // "developing" band (matching buildSourceFeedback's own developing
  // branch and buildAreaFeedback's developingSentence, so concept-level
  // detail is never LESS informative than the coarser sub-app sentence
  // it's meant to replace).
  function buildConceptFeedback(moduleId, conceptStats) {
    var phrases = CONCEPT_PHRASES[moduleId];
    var stats = conceptStats || {};
    if (!phrases) return null;

    // Prefer the fully-reliable pool when one exists; only fall back to the
    // smaller, early-sampled pool (hedged wording throughout) when nothing
    // has reached the confident bar yet — never mixes a confident clause
    // with a hedged one in the same sentence.
    var sampled = Object.keys(stats).filter(function (key) {
      return phrases[key] && stats[key].questions >= EARLY_SIGNAL_MIN_QUESTIONS;
    });
    if (!sampled.length) return null;
    var reliable = sampled.filter(function (key) {
      return stats[key].questions >= FEEDBACK_MIN_QUESTIONS;
    });
    var pool = reliable.length ? reliable : sampled;
    var isEarly = !reliable.length;

    var strengths = pool
      .filter(function (k) { return stats[k].percentage >= STRENGTH_THRESHOLD; })
      .sort(function (a, b) { return stats[b].percentage - stats[a].percentage; });
    var weaknesses = pool
      .filter(function (k) { return stats[k].percentage < WEAKNESS_THRESHOLD; })
      .sort(function (a, b) { return stats[a].percentage - stats[b].percentage; });

    if (strengths.length && weaknesses.length) {
      return pairSentence(phrases, strengths[0], weaknesses[0], isEarly);
    }
    // A real, common case: a student can easily have several reliably-
    // sampled concepts that are ALL currently strengths (e.g. confident on
    // both Orchestral and Strings, nothing yet weak enough to pair against)
    // — or, just as often early on, a weakness with no strength yet to set
    // it against. Rather than showing nothing more specific than the
    // sub-app-level sentence (buildSourceFeedback) whenever a pair doesn't
    // exist, still surface the single clearest signal on its own — same
    // wording buildSourceFeedback already uses for its own single-value
    // strength/focus lines, so the two never read as a different voice.
    if (strengths.length) {
      var strong = phrases[strengths[0]];
      return isEarly
        ? "Early signs are good — so far you " + strong.strength + ". To stay sharp, " + strong.focus + "."
        : "You " + strong.strength + " — to stay sharp, " + strong.focus + ".";
    }
    if (weaknesses.length) {
      var solo = phrases[weaknesses[0]];
      return isEarly
        ? "It's early, but you may want to start on " + solo.gap + " — " + solo.focus + " (" + solo.label + ")."
        : "You need to work on " + solo.gap + " — " + solo.focus + " (" + solo.label + ").";
    }
    // Every sampled concept sits in the 60-79% "developing" band — no clear
    // strength or weakness to name, but still worth naming the one closest
    // to becoming a real strength rather than dropping to the less
    // specific sub-app-level sentence. Single concept only, matching this
    // function's own "one topic per sentence" shape (unlike
    // buildAreaFeedback's developingSentence, which can list several).
    var closest = pool
      .slice()
      .sort(function (a, b) { return stats[b].percentage - stats[a].percentage; })[0];
    var closestPhrase = phrases[closest];
    return isEarly
      ? "Too early to say for sure, but you're showing steady signs with " + closestPhrase.label + " so far. To keep improving, " + closestPhrase.focus + "."
      : "You're making steady progress with " + closestPhrase.label + " — to keep improving, " + closestPhrase.focus + ".";
  }

  global.EAProgressModeFeedback = {
    SOURCE_PHRASES: SOURCE_PHRASES,
    CONCEPT_PHRASES: CONCEPT_PHRASES,
    FEEDBACK_MIN_QUESTIONS: FEEDBACK_MIN_QUESTIONS,
    buildAreaFeedback: buildAreaFeedback,
    buildSourceFeedback: buildSourceFeedback,
    buildConceptFeedback: buildConceptFeedback
  };
})(window);
