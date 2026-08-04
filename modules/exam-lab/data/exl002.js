(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL002",
    title: "Unfamiliar orchestral extract",
    subtitle: "Skeleton-score listening question",
    totalMarks: 9,
    maxPlays: 4,
    audio: "assets/EXL002.mp3",
    score: "assets/EXL002-skeleton-score.png",
    scoreAlt: "Skeleton score for EXL002 with prompts for the key, opening instrument, later instrument and cadence.",
    source: {
      composer: "Edvard Grieg",
      work: "Peer Gynt Suite No. 1, Op. 46",
      movement: "I. Morning Mood",
      recordingSource: "User-supplied extract",
      recordingLicence: "User supplied",
      scoreLicence: "User-created skeleton score"
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03"],
    questions: [
      {
        id: "EXL002-Q01",
        number: 1,
        prompt: "What key is the music in at the beginning?",
        barReference: "Beginning",
        marks: 1,
        responseType: "multiple-choice",
        options: ["E major", "B major", "A major", "C# minor"],
        correctChoice: "E major",
        modelAnswer: "E major",
        skills: ["key", "tonality", "score reading"],
        cambridgeRequirements: ["CAM-EX-04", "CAM-NOT-01"],
        route: { module: "Key and Tonality Practice", path: "#", status: "planned", focus: "major keys and tonal recognition" }
      },
      {
        id: "EXL002-Q02",
        number: 2,
        prompt: "What instrument plays the melody at the beginning?",
        barReference: "Beginning",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["flute", "a flute", "the flute"],
        modelAnswer: "Flute",
        skills: ["instrument identification", "woodwind", "orchestral timbre"],
        cambridgeRequirements: ["CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "orchestral woodwind recognition" }
      },
      {
        id: "EXL002-Q03",
        number: 3,
        prompt: "What instrument later takes over the melody?",
        barReference: "Later in the extract",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["oboe", "an oboe", "the oboe"],
        modelAnswer: "Oboe",
        skills: ["instrument identification", "woodwind", "orchestral timbre"],
        cambridgeRequirements: ["CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "distinguishing flute and oboe timbres" }
      },
      {
        id: "EXL002-Q04",
        number: 4,
        prompt: "Which of the following best describes the movement of the opening melody?",
        barReference: "Opening melody",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Entirely repeated notes", "Mostly conjunct with some movement by thirds", "A descending chromatic scale", "Disjunct"],
        correctChoice: "Mostly conjunct with some movement by thirds",
        modelAnswer: "Mostly conjunct with some movement by thirds",
        skills: ["melodic movement", "stepwise motion", "interval recognition"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "stepwise movement and movement by thirds" }
      },
      {
        id: "EXL002-Q05",
        number: 5,
        prompt: "How do the dynamics change during the extract?",
        barReference: "Whole extract",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["crescendo", "a crescendo", "gradually increase", "gradually increases", "gradually get louder", "gradually gets louder", "increase", "increasing", "become louder", "becomes louder", "get louder", "gets louder", "grow louder", "grows louder"],
        modelAnswer: "They gradually increase (crescendo).",
        skills: ["dynamics", "crescendo", "aural recognition"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Dynamics Practice", path: "#", status: "planned", focus: "recognising gradual dynamic change" }
      },
      {
        id: "EXL002-Q06",
        number: 6,
        prompt: "Name the cadence at the end of the written extract.",
        barReference: "End of written extract",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["imperfect", "imperfect cadence", "half cadence", "half-cadence", "ends on the dominant", "dominant"],
        modelAnswer: "Imperfect cadence",
        skills: ["cadence", "harmony", "aural recognition"],
        cambridgeRequirements: ["CAM-EX-08", "CAM-HAR-03"],
        route: { module: "Cadence Coach", path: "../cadence-coach/index.html", status: "planned", focus: "recognising imperfect cadences" }
      },
      {
        id: "EXL002-Q07",
        number: 7,
        prompt: "Which period of music is this extract from?",
        barReference: "Whole extract",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Baroque", "Classical", "Romantic", "Modern"],
        correctChoice: "Romantic",
        modelAnswer: "Romantic",
        skills: ["period recognition", "style", "context"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-AOS3-01"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "Romantic style recognition" }
      },
      {
        id: "EXL002-Q08",
        number: 8,
        prompt: "Give two musical reasons for your answer to Question 7.",
        barReference: "Whole extract",
        marks: 2,
        responseType: "extended-text",
        modelAnswer: "For example: expressive dynamic changes; colourful orchestration; prominent woodwind solos; programme music portraying a scene or atmosphere; gradual orchestral growth; a lyrical melody; wider or more expressive harmonic language.",
        reasonCategories: [
          { id: "expressive-dynamics", keywords: ["expressive dynamic", "dynamic change", "crescendo", "gradually louder", "gradual increase", "dynamic swell", "dynamic contrast", "wide dynamic range", "wide range of dynamics", "large dynamic range", "wide dynamics", "extreme dynamics", "very soft and loud", "pianissimo", "fortissimo", "pp to ff"] },
          { id: "colourful-orchestration", keywords: ["colourful orchestration", "colorful orchestration", "orchestral colour", "orchestral color", "varied orchestration", "instrumental colour", "instrumental color", "range of instruments", "timbre", "horns prominently", "prominent horn", "french horn", "prominent brass", "brass section", "brass instruments", "full orchestra", "large orchestra"] },
          { id: "woodwind-solos", keywords: ["woodwind solo", "solo woodwind", "prominent woodwind", "flute solo", "solo flute", "oboe solo", "solo oboe", "flute and oboe", "flute then oboe", "woodwind melody"] },
          { id: "programme-music", keywords: ["programme music", "program music", "portray", "scene", "atmosphere", "nature", "sunrise", "morning", "descriptive music", "paints a picture", "tells a story", "evokes an atmosphere", "depicts nature"] },
          { id: "orchestral-growth", keywords: ["orchestral growth", "orchestra grows", "orchestra builds", "instruments enter", "increasing instrumentation", "gradual build", "builds up", "orchestral build up", "orchestral build-up", "layering instruments", "instruments are added"] },
          { id: "lyrical-melody", keywords: ["lyrical melody", "lyrical", "expressive melody", "singing melody", "long melodic", "melodic line", "flowing melody", "singing quality", "long phrase", "expressive tune"] },
          { id: "expressive-harmony", keywords: ["chromatic harmony", "chromaticism", "expressive harmony", "wider harmony", "harmonic colour", "harmonic color", "rich harmony", "richer harmony", "chromatic chord", "unusual chord", "expanded harmony"] }
        ],
        skills: ["style justification", "musical evidence", "Romantic context"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-EX-13", "CAM-AOS3-01", "CAM-AOS3-02"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "feature-plus-reason writing for Romantic music" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL002 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
