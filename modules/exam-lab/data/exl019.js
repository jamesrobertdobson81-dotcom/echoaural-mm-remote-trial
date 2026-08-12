    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL019",
        title: "Unfamiliar Japanese folk extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "World focus: Japanese music",
        genre: "Japanese folk song",
        performingForces: "Traditional Japanese vocal and instrumental ensemble",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL019.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Traditional Japanese music",
          work: "Matsumae–Oiwake",
          movement: "Extract 0:00–0:50 (1931 recording)",
          recordingSource: "Wikimedia Commons (1931 recording)",
          recordingLicence: "Public domain",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL019-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which country is this music most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Japan",
          "India",
          "Mexico",
          "Nigeria"
        ],
        correctChoice: "Japan",
        modelAnswer: "Japan",
        feedback: "Japan.",
        skills: [
        "world region",
        "Japan",
        "context",
        "tradition"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating Japanese traditions" }
      },
      {
        id: "EXL019-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name one traditional Japanese instrument heard.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "shamisen",
          "koto",
          "shakuhachi",
          "taiko",
          "biwa"
        ],
        modelAnswer: "Shamisen / koto / shakuhachi",
        feedback: "Shamisen / koto / shakuhachi.",
        skills: [
        "instrument identification",
        "Japanese music",
        "traditional instruments"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising Japanese instruments" }
      },
      {
        id: "EXL019-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Which family of instruments is most prominent?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Strings",
          "Brass",
          "Percussion only",
          "Electronic"
        ],
        correctChoice: "Strings",
        modelAnswer: "Strings",
        feedback: "Strings.",
        skills: [
        "instrument family",
        "strings",
        "Japanese music",
        "ensemble"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "identifying string-led Japanese textures" }
      },
      {
        id: "EXL019-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe the timbre of the main melodic instrument.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "plucked",
          "bright",
          "sharp",
          "nasal",
          "penetrating",
          "resonant",
          "twangy"
        ],
        modelAnswer: "Plucked / bright / sharp / nasal",
        feedback: "Plucked / bright / sharp / nasal.",
        skills: [
        "timbre",
        "Japanese music",
        "plucked strings"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing Japanese string timbres" }
      },
      {
        id: "EXL019-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "monophonic",
          "heterophonic",
          "melody and accompaniment",
          "unison",
          "single melodic line"
        ],
        modelAnswer: "Monophonic / heterophonic / melody and accompaniment",
        feedback: "Monophonic / heterophonic / melody and accompaniment.",
        skills: [
        "texture",
        "Japanese music",
        "folk song"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing Japanese folk textures" }
      },
      {
        id: "EXL019-Q06",
        number: 6,
        commandWord: "Identify",
        prompt: "Which scale type is most likely to be associated with this music?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Major scale",
          "Pentatonic",
          "Whole-tone scale",
          "Chromatic scale"
        ],
        correctChoice: "Pentatonic",
        modelAnswer: "Pentatonic",
        feedback: "Pentatonic.",
        skills: [
        "scale",
        "pentatonic",
        "Japanese music",
        "pitch"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking Japanese music to pentatonic scales" }
      },
      {
        id: "EXL019-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe one feature of the melody.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "ornamented",
          "stepwise",
          "decorative",
          "florid",
          "melismatic",
          "simple",
          "folk-like"
        ],
        modelAnswer: "Ornamented / decorative / folk-like",
        feedback: "Ornamented / decorative / folk-like.",
        skills: [
        "melody",
        "ornamentation",
        "Japanese folk",
        "decoration"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing Japanese folk melodies" }
      },
      {
        id: "EXL019-Q08",
        number: 8,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "free",
          "flexible",
          "rubato",
          "unmeasured",
          "steady",
          "simple",
          "regular"
        ],
        modelAnswer: "Free / flexible / rubato OR steady / simple",
        feedback: "Free / flexible / rubato OR steady / simple.",
        skills: [
        "rhythm",
        "rubato",
        "Japanese folk",
        "flexible tempo"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing flexible folk rhythms" }
      },
      {
        id: "EXL019-Q09",
        number: 9,
        commandWord: "Identify",
        prompt: "This music was traditionally associated with which context?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Opera houses",
          "Folk traditions",
          "Nightclubs",
          "Film studios"
        ],
        correctChoice: "Folk traditions",
        modelAnswer: "Folk traditions",
        feedback: "Folk traditions.",
        skills: [
        "context",
        "folk tradition",
        "Japanese music",
        "function"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking music to cultural contexts" }
      },
      {
        id: "EXL019-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one feature typical of traditional Japanese music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "pentatonic scale",
          "plucked strings",
          "ornamentation",
          "heterophonic texture",
          "folk melody",
          "traditional instruments"
        ],
        modelAnswer: "Pentatonic scale / plucked strings / ornamentation",
        feedback: "Pentatonic scale / plucked strings / ornamentation.",
        skills: [
        "Japanese music",
        "genre features",
        "tradition",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Japanese genre features" }
      },
      {
        id: "EXL019-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Japanese folk music",
          "Hip-hop",
          "Disco",
          "Romantic symphony"
        ],
        correctChoice: "Japanese folk music",
        modelAnswer: "Japanese folk music",
        feedback: "Japanese folk music.",
        skills: [
        "style recognition",
        "Japanese folk",
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
      window.EXAM_LAB_QUESTION_SETS.EXL019 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
