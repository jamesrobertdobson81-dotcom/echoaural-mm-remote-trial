    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL014",
        title: "Unfamiliar Latin dance extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "Popular music",
        genre: "Latin dance / salsa",
        performingForces: "Percussion, bass, synthesiser and layered dance textures",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL014.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Latin Industries",
          movement: "Extract 0:45–1:35",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Latin Industries Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL014-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which region is this music most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Western Europe",
          "Latin America",
          "East Asia",
          "Scandinavia"
        ],
        correctChoice: "Latin America",
        modelAnswer: "Latin America",
        feedback: "Latin America.",
        skills: [
        "world region",
        "Latin America",
        "salsa",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating Latin American traditions" }
      },
      {
        id: "EXL014-Q02",
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
        "Latin dance",
        "ensemble"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "identifying percussion-led Latin textures" }
      },
      {
        id: "EXL014-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "syncopated",
          "driving",
          "dance-like",
          "repeated",
          "energetic",
          "off-beat",
          "cross-rhythm",
          "lively"
        ],
        modelAnswer: "Syncopated / driving / dance-like",
        feedback: "Syncopated / driving / dance-like.",
        skills: [
        "rhythm",
        "syncopation",
        "Latin dance",
        "pulse"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing Latin dance rhythms" }
      },
      {
        id: "EXL014-Q04",
        number: 4,
        commandWord: "Name",
        prompt: "Name the short repeated bass pattern heard in the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "ostinato",
          "repeated bass pattern",
          "repeated bass line",
          "bass ostinato",
          "repeated pattern"
        ],
        modelAnswer: "Ostinato",
        feedback: "Ostinato.",
        skills: [
        "ostinato",
        "bass line",
        "repeated pattern",
        "Latin dance"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising bass ostinatos" }
      },
      {
        id: "EXL014-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the texture when most instruments are playing.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "layered",
          "homophonic",
          "melody and accompaniment",
          "thick",
          "dense"
        ],
        modelAnswer: "Layered / homophonic / melody and accompaniment",
        feedback: "Layered / homophonic / melody and accompaniment.",
        skills: [
        "texture",
        "layering",
        "homophonic",
        "Latin dance"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing layered dance textures" }
      },
      {
        id: "EXL014-Q06",
        number: 6,
        commandWord: "Identify",
        prompt: "Which term best describes the addition of parts to build up the music?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Imitation",
          "Layering",
          "Canon",
          "Pedal"
        ],
        correctChoice: "Layering",
        modelAnswer: "Layering",
        feedback: "Layering.",
        skills: [
        "layering",
        "texture",
        "build-up",
        "dance music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "recognising layered build-ups" }
      },
      {
        id: "EXL014-Q07",
        number: 7,
        commandWord: "Give",
        prompt: "Give one way in which technology has been used in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "synthesiser",
          "synthesized",
          "electronic",
          "programmed",
          "electronic sounds",
          "synth",
          "electronic production"
        ],
        modelAnswer: "Synthesiser / electronic sounds / programmed drums",
        feedback: "Synthesiser / electronic sounds / programmed drums.",
        skills: [
        "music technology",
        "synthesiser",
        "electronic production",
        "Latin dance"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "identifying uses of music technology" }
      },
      {
        id: "EXL014-Q08",
        number: 8,
        commandWord: "Describe",
        prompt: "Describe one change which takes place during the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "a part is added",
          "a part is removed",
          "texture changes",
          "dynamics change",
          "instruments enter",
          "instruments leave",
          "layers are added"
        ],
        modelAnswer: "A part is added or removed / texture or dynamics change",
        feedback: "A part is added or removed / texture or dynamics change.",
        skills: [
        "change recognition",
        "texture",
        "dynamics",
        "structure"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing audible musical changes" }
      },
      {
        id: "EXL014-Q09",
        number: 9,
        commandWord: "Give",
        prompt: "Give one feature which makes this music suitable for dancing.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "strong beat",
          "steady pulse",
          "syncopation",
          "repeated rhythm",
          "driving rhythm",
          "dance rhythm",
          "regular beat"
        ],
        modelAnswer: "Strong beat / syncopation / driving rhythm",
        feedback: "Strong beat / syncopation / driving rhythm.",
        skills: [
        "dance music",
        "pulse",
        "syncopation",
        "function"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking musical features to dance function" }
      },
      {
        id: "EXL014-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one feature typical of Latin American dance music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "syncopation",
          "percussion",
          "dance rhythms",
          "repeated patterns",
          "ostinato",
          "cross-rhythm"
        ],
        modelAnswer: "Syncopation / percussion / dance rhythms",
        feedback: "Syncopation / percussion / dance rhythms.",
        skills: [
        "Latin American music",
        "genre features",
        "dance",
        "rhythm"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Latin American genre features" }
      },
      {
        id: "EXL014-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Baroque suite",
          "Latin dance music",
          "Romantic symphony",
          "Balinese gamelan"
        ],
        correctChoice: "Latin dance music",
        modelAnswer: "Latin dance music",
        feedback: "Latin dance music.",
        skills: [
        "style recognition",
        "Latin dance",
        "genre",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "matching extracts to popular and world styles" }
      }
        ]
      });

      window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
      window.EXAM_LAB_QUESTION_SETS.EXL014 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
