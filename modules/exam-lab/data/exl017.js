    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL017",
        title: "Unfamiliar African rhythm extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "World focus: African music",
        genre: "African percussion",
        performingForces: "Percussion ensemble with layered rhythmic patterns",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL017.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Untitled African rhythm",
          movement: "Extract 0:08–0:58",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Untitled African rhythm Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL017-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which continent is this music most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Africa",
          "Europe",
          "Asia",
          "Australia"
        ],
        correctChoice: "Africa",
        modelAnswer: "Africa",
        feedback: "Africa.",
        skills: [
        "world region",
        "Africa",
        "context",
        "tradition"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating African traditions" }
      },
      {
        id: "EXL017-Q02",
        number: 2,
        commandWord: "Identify",
        prompt: "Which family of instruments is most prominent?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Strings",
          "Percussion",
          "Brass",
          "Woodwind"
        ],
        correctChoice: "Percussion",
        modelAnswer: "Percussion",
        feedback: "Percussion.",
        skills: [
        "instrument family",
        "percussion",
        "African music",
        "ensemble"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "identifying percussion-led African textures" }
      },
      {
        id: "EXL017-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "polyrhythm",
          "cross-rhythm",
          "interlocking",
          "repeated",
          "layered",
          "syncopated",
          "cyclical"
        ],
        modelAnswer: "Polyrhythm / cross-rhythm / interlocking patterns",
        feedback: "Polyrhythm / cross-rhythm / interlocking patterns.",
        skills: [
        "rhythm",
        "polyrhythm",
        "cross-rhythm",
        "African music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing African rhythmic patterns" }
      },
      {
        id: "EXL017-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "layered",
          "polyphonic",
          "interlocking",
          "heterogeneous",
          "multiple rhythmic layers"
        ],
        modelAnswer: "Layered / polyphonic / interlocking",
        feedback: "Layered / polyphonic / interlocking.",
        skills: [
        "texture",
        "layering",
        "polyrhythm",
        "African music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing layered African textures" }
      },
      {
        id: "EXL017-Q05",
        number: 5,
        commandWord: "Identify",
        prompt: "Which term best describes the relationship between some rhythmic parts?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Unison",
          "Interlocking",
          "Homophonic",
          "Monophonic"
        ],
        correctChoice: "Interlocking",
        modelAnswer: "Interlocking",
        feedback: "Interlocking.",
        skills: [
        "interlocking",
        "texture",
        "ensemble relationship",
        "African music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "recognising interlocking rhythmic parts" }
      },
      {
        id: "EXL017-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe the timbre of the percussion.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "dry",
          "sharp",
          " resonant",
          "woody",
          "hand-struck",
          "bright",
          "crisp"
        ],
        modelAnswer: "Dry / sharp / resonant / hand-struck",
        feedback: "Dry / sharp / resonant / hand-struck.",
        skills: [
        "timbre",
        "percussion",
        "African music",
        "drums"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing African percussion timbres" }
      },
      {
        id: "EXL017-Q07",
        number: 7,
        commandWord: "Name",
        prompt: "Name one type of drum or percussion heard.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "djembe",
          "drum",
          "hand drum",
          "conga",
          "bongo",
          "percussion",
          "tom"
        ],
        modelAnswer: "Djembe / hand drum / percussion",
        feedback: "Djembe / hand drum / percussion.",
        skills: [
        "instrument identification",
        "drums",
        "percussion",
        "African music"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "naming African percussion" }
      },
      {
        id: "EXL017-Q08",
        number: 8,
        commandWord: "Describe",
        prompt: "Describe one change which takes place during the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "a layer is added",
          "a layer is removed",
          "texture changes",
          "dynamics change",
          "rhythm intensifies",
          "parts enter"
        ],
        modelAnswer: "A layer is added or removed / texture or dynamics change",
        feedback: "A layer is added or removed / texture or dynamics change.",
        skills: [
        "change recognition",
        "texture",
        "dynamics",
        "structure"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing audible changes in African percussion" }
      },
      {
        id: "EXL017-Q09",
        number: 9,
        commandWord: "Identify",
        prompt: "Which time signature is most likely?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Simple time",
          "Compound time",
          "Irregular time",
          "Mixed metre"
        ],
        correctChoice: "Simple time",
        modelAnswer: "Simple time",
        feedback: "Simple time.",
        skills: [
        "metre",
        "time signature",
        "simple time",
        "African music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "identifying metres in African music" }
      },
      {
        id: "EXL017-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one feature typical of African percussion music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "polyrhythm",
          "interlocking rhythms",
          "call and response",
          "repeated patterns",
          "cross-rhythm",
          "layered percussion"
        ],
        modelAnswer: "Polyrhythm / interlocking rhythms / call and response",
        feedback: "Polyrhythm / interlocking rhythms / call and response.",
        skills: [
        "African music",
        "genre features",
        "percussion",
        "rhythm"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising African genre features" }
      },
      {
        id: "EXL017-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "African percussion music",
          "Baroque fugue",
          "Disco",
          "Romantic art song"
        ],
        correctChoice: "African percussion music",
        modelAnswer: "African percussion music",
        feedback: "African percussion music.",
        skills: [
        "style recognition",
        "African music",
        "genre",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "matching extracts to world styles" }
      }
        ]
      });

      window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
      window.EXAM_LAB_QUESTION_SETS.EXL017 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
