(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL010",
    title: "Unfamiliar orchestral extract",
    subtitle: "Score-based listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Western classical tradition",
    genre: "Romantic ballet",
    performingForces: "Orchestra",
    extractDescription: "Opening of a Romantic orchestral dance with a supplied skeleton score",
    reviewStatus: "Requires final listening, rights and score-alignment QA",
    totalMarks: 10,
    maxPlays: 4,
    scoreRequired: true,
    lyricsRequired: false,
    audio: "assets/EXL010.mp3",
    score: "assets/EXL010-skeleton-score.png",
    scoreAlt: "Skeleton score for an unfamiliar orchestral listening extract, with selected musical details labelled for identification.",
    source: {
      composer: "Pyotr Ilyich Tchaikovsky",
      work: "The Nutcracker, Op. 71",
      movement: "Dance of the Sugar Plum Fairy",
      extract: "Opening extract",
      recordingSource: "User-supplied educational extract",
      recordingLicence: "Rights status requires confirmation",
      scoreLicence: "Public-domain composition; supplied skeleton-score image requires final provenance check"
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03", "CAM-AOS3-01"],
    questions: [
      {
        id: "EXL010-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "What word describes the playing technique used by the strings at the beginning of the extract?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["pizzicato", "pizz", "plucked", "plucking", "the strings are plucked", "played by plucking the strings"],
        strictAnswerMatch: true,
        acceptMisspellings: true,
        maxEditDistance: 1,
        modelAnswer: "Pizzicato",
        feedback: "The strings are plucked rather than bowed: this technique is pizzicato.",
        skills: ["playing technique", "pizzicato", "strings", "articulation"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising string playing techniques" }
      },
      {
        id: "EXL010-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the keyboard instrument which enters in bar 5.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["celesta", "celeste", "celseta"],
        strictAnswerMatch: true,
        acceptMisspellings: true,
        maxEditDistance: 1,
        modelAnswer: "Celesta",
        feedback: "The distinctive high, bell-like keyboard instrument is the celesta.",
        skills: ["instrument identification", "celesta", "keyboard instrument", "orchestral timbre"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising the celesta by timbre" }
      },
      {
        id: "EXL010-Q03",
        number: 3,
        commandWord: "Name",
        prompt: "Name the instrument which plays the printed cue at the end of bar 8.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["bass clarinet", "bass clarinet in b flat", "bass clarinet in b-flat", "bass clarinet in bb"],
        strictAnswerMatch: true,
        acceptMisspellings: true,
        maxEditDistance: 1,
        modelAnswer: "Bass clarinet",
        feedback: "The low woodwind cue at the end of bar 8 is played by the bass clarinet.",
        skills: ["instrument identification", "bass clarinet", "woodwind", "score following"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01", "CAM-NOT-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising bass clarinet timbre" }
      },
      {
        id: "EXL010-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Which of the following best describes the melody in bars 14–15?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Chromatic", "Diatonic", "Pentatonic", "Whole-tone"],
        correctChoice: "Chromatic",
        acceptedAnswers: ["A", "Chromatic"],
        strictAnswerMatch: true,
        modelAnswer: "A — Chromatic",
        feedback: "The melody uses adjacent semitone movement and is chromatic.",
        skills: ["melody", "chromatic movement", "tonality", "score following"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-NOT-01"],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising chromatic melodic movement" }
      },
      {
        id: "EXL010-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe two features of the music played by the strings in bars 1–4, other than the playing technique named in Question 1.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Describe two distinct features. Do not repeat the playing technique from Question 1.",
        modelAnswer: "Any two of: soft dynamics; off-beat quavers; quavers alternating with rests; a repeated rhythmic or two-bar pattern; an ostinato-like accompaniment; low register.",
        markingFeedbackMode: "answer-coach",
        markPoints: [
          {
            id: "soft-dynamics",
            label: "Quiet or soft dynamics",
            explanation: "The string accompaniment begins quietly.",
            suggestion: "Describe the quiet dynamic level.",
            acceptedAnswers: ["quiet", "quietly", "soft", "softly", "quiet dynamics", "soft dynamics", "piano", "played piano", "p dynamic", "low dynamic level"]
          },
          {
            id: "off-beat-quavers",
            label: "Off-beat quavers",
            explanation: "The quavers sound on the off-beats.",
            suggestion: "Describe the off-beat quaver rhythm.",
            acceptedAnswers: ["off beat quavers", "offbeat quavers", "quavers on the off beats", "quavers on off beats", "off beat rhythm", "offbeat rhythm", "syncopated quavers", "syncopated rhythm", "syncopation"]
          },
          {
            id: "alternating-notes-rests",
            label: "Quavers alternate with rests",
            explanation: "Each short quaver is separated by a rest.",
            suggestion: "Explain that quavers alternate with rests.",
            acceptedAnswers: ["quavers alternating with rests", "quavers alternate with rests", "alternating quavers and rests", "notes alternating with rests", "notes alternate with rests", "quaver then rest", "quavers separated by rests", "detached quavers with rests"]
          },
          {
            id: "repeated-pattern",
            label: "Repeated rhythmic or two-bar pattern",
            explanation: "The same rhythmic idea is repeated across the opening bars.",
            suggestion: "Mention the repeated rhythmic or two-bar pattern.",
            acceptedAnswers: ["repeated rhythmic pattern", "repeating rhythmic pattern", "rhythmic pattern is repeated", "repeated rhythm", "repeating rhythm", "two bar pattern repeated", "two bar pattern is repeated", "repeated two bar pattern", "pattern repeats", "repeated pattern", "repeating pattern"]
          },
          {
            id: "ostinato-accompaniment",
            label: "Ostinato-like accompaniment",
            explanation: "The repeated figure works as an ostinato-like accompaniment.",
            suggestion: "Identify the repeated accompaniment as ostinato-like.",
            acceptedAnswers: ["ostinato", "rhythmic ostinato", "ostinato accompaniment", "ostinato like accompaniment", "repeated accompaniment", "repeating accompaniment", "accompaniment pattern"]
          },
          {
            id: "low-register",
            label: "Low register",
            explanation: "The opening string accompaniment lies in a low register.",
            suggestion: "Describe the low register or low pitch range.",
            acceptedAnswers: ["low register", "lower register", "low pitch", "low pitches", "low pitched", "low pitch range", "played low", "low notes"]
          }
        ],
        nonCreditRules: [
          { id: "pizzicato-repeat", feedback: "Pizzicato was assessed in Question 1 and is not credited again here.", phrases: ["pizzicato", "pizz", "plucked", "plucking"] }
        ],
        skills: ["string writing", "dynamics", "rhythm", "repetition", "ostinato", "register", "written description"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-RHY-02"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing repeated and off-beat rhythmic patterns" }
      },
      {
        id: "EXL010-Q06",
        number: 6,
        commandWord: "Identify",
        prompt: "Which of the following best describes the texture from bar 5 onwards?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Imitation", "Melody and accompaniment", "Monophonic", "Unison"],
        correctChoice: "Melody and accompaniment",
        acceptedAnswers: ["B", "Melody and accompaniment"],
        strictAnswerMatch: true,
        modelAnswer: "B — Melody and accompaniment",
        feedback: "From bar 5, the celesta melody is supported by the string accompaniment.",
        skills: ["texture", "melody and accompaniment", "homophonic texture", "musical roles"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "identifying melody-and-accompaniment texture" }
      },
      {
        id: "EXL010-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "Which of the following is the most suitable tempo marking for this extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Adagio", "Allegro", "Andante", "Presto"],
        correctChoice: "Andante",
        acceptedAnswers: ["C", "Andante"],
        strictAnswerMatch: true,
        modelAnswer: "C — Andante",
        feedback: "The moderate walking pace is best described as Andante.",
        skills: ["tempo", "Andante", "tempo markings", "aural identification"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "matching tempo markings to musical speed" }
      },
      {
        id: "EXL010-Q08",
        number: 8,
        commandWord: "Identify",
        prompt: "When was this music written?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Baroque period", "Classical period", "Romantic period", "Twentieth Century"],
        correctChoice: "Romantic period",
        acceptedAnswers: ["C", "Romantic", "Romantic period"],
        strictAnswerMatch: true,
        modelAnswer: "C — Romantic period",
        feedback: "The piece was written in the Romantic period.",
        skills: ["Romantic period", "historical period", "style recognition", "context"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-AOS3-01"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "identifying Romantic-period style" }
      },
      {
        id: "EXL010-Q09",
        number: 9,
        commandWord: "Identify",
        prompt: "Who is the most likely composer of this music?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Johannes Brahms", "Edvard Grieg", "Nikolai Rimsky-Korsakov", "Pyotr Ilyich Tchaikovsky"],
        correctChoice: "Pyotr Ilyich Tchaikovsky",
        acceptedAnswers: ["D", "Tchaikovsky", "Pyotr Tchaikovsky", "Pyotr Ilyich Tchaikovsky"],
        strictAnswerMatch: true,
        modelAnswer: "D — Pyotr Ilyich Tchaikovsky",
        feedback: "The extract is from Tchaikovsky’s The Nutcracker.",
        skills: ["composer recognition", "Tchaikovsky", "Romantic period", "orchestral style"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-AOS3-01"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Tchaikovsky’s orchestral style" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL010 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
