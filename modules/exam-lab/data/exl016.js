    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL016",
        title: "Unfamiliar Indian-influenced extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "World focus: Indian music",
        genre: "Indian-influenced world music",
        performingForces: "Sitar-like melody, percussion and drone textures",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL016.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Dhaka",
          movement: "Extract 0:25–1:15",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Dhaka Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL016-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which part of the world is this music most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "India",
          "Japan",
          "Ireland",
          "Brazil"
        ],
        correctChoice: "India",
        modelAnswer: "India",
        feedback: "India.",
        skills: [
        "world region",
        "India",
        "context",
        "tradition"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating Indian traditions" }
      },
      {
        id: "EXL016-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the plucked string instrument heard in the melody.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "sitar",
          "plucked string",
          "string instrument"
        ],
        modelAnswer: "Sitar / plucked string instrument",
        feedback: "Sitar / plucked string instrument.",
        skills: [
        "instrument identification",
        "sitar",
        "India",
        "plucked strings"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising sitar-like timbres" }
      },
      {
        id: "EXL016-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe the timbre of the melodic instrument.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "buzzing",
          "resonant",
          "nasal",
          "metallic",
          "bright",
          "twangy",
          "reedy"
        ],
        modelAnswer: "Buzzing / resonant / nasal / twangy",
        feedback: "Buzzing / resonant / nasal / twangy.",
        skills: [
        "timbre",
        "sitar",
        "Indian music",
        "plucked strings"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing sitar timbres" }
      },
      {
        id: "EXL016-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "cyclical",
          "repetitive",
          "tabla patterns",
          "driving",
          "regular",
          "repeated"
        ],
        modelAnswer: "Cyclical / repetitive / tabla patterns",
        feedback: "Cyclical / repetitive / tabla patterns.",
        skills: [
        "rhythm",
        "cyclical",
        "Indian music",
        "tabla"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing cyclical rhythmic patterns" }
      },
      {
        id: "EXL016-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the role of any sustained low notes.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "drone",
          "pedal",
          "sustained",
          "underpins the melody",
          "tonic drone",
          "harmonic foundation"
        ],
        modelAnswer: "Drone / pedal / underpins the melody",
        feedback: "Drone / pedal / underpins the melody.",
        skills: [
        "drone",
        "pedal",
        "Indian music",
        "raga"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Harmony Explorer", path: "../harmony-explorer/index.html", status: "live", focus: "recognising drone in Indian music" }
      },
      {
        id: "EXL016-Q06",
        number: 6,
        commandWord: "Identify",
        prompt: "Which term describes melodic decoration in this extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Sequence",
          "Ornamentation",
          "Inversion",
          "Retrograde"
        ],
        correctChoice: "Ornamentation",
        modelAnswer: "Ornamentation",
        feedback: "Ornamentation.",
        skills: [
        "ornamentation",
        "melody",
        "Indian music",
        "decoration"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising melodic ornamentation" }
      },
      {
        id: "EXL016-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "melody and accompaniment",
          "melody with drone",
          "heterophonic",
          "monophonic",
          "layered"
        ],
        modelAnswer: "Melody and accompaniment / melody with drone",
        feedback: "Melody and accompaniment / melody with drone.",
        skills: [
        "texture",
        "melody and accompaniment",
        "drone",
        "Indian music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing Indian instrumental textures" }
      },
      {
        id: "EXL016-Q08",
        number: 8,
        commandWord: "Name",
        prompt: "Name one percussion instrument heard.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "tabla",
          "drum",
          "drums",
          "hand drum",
          "percussion"
        ],
        modelAnswer: "Tabla / hand drum / percussion",
        feedback: "Tabla / hand drum / percussion.",
        skills: [
        "instrument identification",
        "tabla",
        "percussion",
        "Indian music"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising tabla and percussion" }
      },
      {
        id: "EXL016-Q09",
        number: 9,
        commandWord: "Identify",
        prompt: "Which scale type is most likely to be associated with this music?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Major scale",
          "Raga / modal scale",
          "Whole-tone scale",
          "Chromatic scale"
        ],
        correctChoice: "Raga / modal scale",
        modelAnswer: "Raga / modal scale",
        feedback: "Raga / modal scale.",
        skills: [
        "scale",
        "raga",
        "Indian music",
        "mode"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking Indian music to raga scales" }
      },
      {
        id: "EXL016-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one feature typical of Indian classical or influenced music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "drone",
          "ornamentation",
          "cyclical rhythm",
          "improvisation",
          "raga",
          "tabla patterns",
          "sitar"
        ],
        modelAnswer: "Drone / ornamentation / cyclical rhythm / raga",
        feedback: "Drone / ornamentation / cyclical rhythm / raga.",
        skills: [
        "Indian music",
        "genre features",
        "tradition",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Indian genre features" }
      },
      {
        id: "EXL016-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Indian-influenced music",
          "Reggae",
          "Rock",
          "Symphony"
        ],
        correctChoice: "Indian-influenced music",
        modelAnswer: "Indian-influenced music",
        feedback: "Indian-influenced music.",
        skills: [
        "style recognition",
        "Indian music",
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
      window.EXAM_LAB_QUESTION_SETS.EXL016 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
