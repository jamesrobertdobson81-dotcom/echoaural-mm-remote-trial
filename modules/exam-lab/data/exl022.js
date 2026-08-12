    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL022",
        title: "Unfamiliar house / EDM extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "Popular music",
        genre: "House / electronic dance music",
        performingForces: "Synthesiser, drum machine and electronic bass",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL022.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Kick Shock",
          movement: "Extract 0:03–0:53",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Kick Shock Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL022-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which family of instruments provides the main beat?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Strings",
          "Percussion / electronic drums",
          "Brass",
          "Woodwind"
        ],
        correctChoice: "Percussion / electronic drums",
        modelAnswer: "Percussion / electronic drums",
        feedback: "Percussion / electronic drums.",
        skills: [
        "instrument family",
        "electronic drums",
        "EDM",
        "beat"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising electronic drum beats" }
      },
      {
        id: "EXL022-Q02",
        number: 2,
        commandWord: "Give",
        prompt: "Give one way in which technology has been used in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "synthesiser",
          "drum machine",
          "electronic production",
          "programmed drums",
          "electronic bass",
          "synth"
        ],
        modelAnswer: "Synthesiser / drum machine / programmed drums",
        feedback: "Synthesiser / drum machine / programmed drums.",
        skills: [
        "music technology",
        "EDM",
        "electronic production",
        "synthesis"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "identifying technology in EDM" }
      },
      {
        id: "EXL022-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Which rhythmic pattern is played by the bass drum?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "On every crotchet beat",
          "Only on beats 2 and 4",
          "Syncopated off-beats only",
          "Irregular pattern"
        ],
        correctChoice: "On every crotchet beat",
        modelAnswer: "On every crotchet beat",
        feedback: "On every crotchet beat.",
        skills: [
        "bass drum",
        "four on the floor",
        "metre",
        "house"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising four-on-the-floor patterns" }
      },
      {
        id: "EXL022-Q04",
        number: 4,
        commandWord: "Name",
        prompt: "What name is given to this bass-drum pattern in dance music?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "four on the floor",
          "4 on the floor",
          "four-on-the-floor",
          "steady kick pattern"
        ],
        modelAnswer: "Four on the floor",
        feedback: "Four on the floor.",
        skills: [
        "four on the floor",
        "bass drum",
        "house",
        "dance music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "naming four-on-the-floor patterns" }
      },
      {
        id: "EXL022-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the bass line.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "repeated",
          "syncopated",
          "electronic",
          "loop",
          "ostinato",
          "driving"
        ],
        modelAnswer: "Repeated / syncopated / electronic loop",
        feedback: "Repeated / syncopated / electronic loop.",
        skills: [
        "bass line",
        "ostinato",
        "EDM",
        "electronic"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing EDM bass lines" }
      },
      {
        id: "EXL022-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe the texture when most elements are playing.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "layered",
          "thick",
          "homophonic",
          "dense",
          "beat with synth layers"
        ],
        modelAnswer: "Layered / thick / homophonic",
        feedback: "Layered / thick / homophonic.",
        skills: [
        "texture",
        "layering",
        "EDM",
        "density"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing dense EDM textures" }
      },
      {
        id: "EXL022-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "Which term describes the addition of electronic parts to build up the texture?",
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
        "EDM"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "recognising layered EDM textures" }
      },
      {
        id: "EXL022-Q08",
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
          "filter sweep",
          "layers drop"
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
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing changes in EDM" }
      },
      {
        id: "EXL022-Q09",
        number: 9,
        commandWord: "Give",
        prompt: "Give one feature which makes this music suitable for dancing.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "steady beat",
          "four on the floor",
          "repeated bass",
          "driving rhythm",
          "regular pulse",
          "strong kick drum"
        ],
        modelAnswer: "Steady beat / four on the floor / driving rhythm",
        feedback: "Steady beat / four on the floor / driving rhythm.",
        skills: [
        "dance music",
        "pulse",
        "EDM",
        "function"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking EDM features to dance function" }
      },
      {
        id: "EXL022-Q10",
        number: 10,
        commandWord: "Describe",
        prompt: "Describe the timbre of the synthesiser sounds.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "bright",
          "electronic",
          "harsh",
          "filtered",
          "synthetic",
          "punchy",
          "sharp"
        ],
        modelAnswer: "Bright / electronic / synthetic / filtered",
        feedback: "Bright / electronic / synthetic / filtered.",
        skills: [
        "timbre",
        "synthesiser",
        "EDM",
        "electronic"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing synthesiser timbres" }
      },
      {
        id: "EXL022-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "House / EDM",
          "Baroque concerto",
          "Reggae",
          "Gamelan music"
        ],
        correctChoice: "House / EDM",
        modelAnswer: "House / EDM",
        feedback: "House / EDM.",
        skills: [
        "style recognition",
        "EDM",
        "house",
        "genre"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "matching extracts to popular styles" }
      }
        ]
      });

      window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
      window.EXAM_LAB_QUESTION_SETS.EXL022 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
