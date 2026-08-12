    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL015",
        title: "Unfamiliar Middle Eastern extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "World focus: Middle Eastern music",
        genre: "Middle Eastern",
        performingForces: "Strings, drums and Middle Eastern-style melodic lines",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL015.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "East of Tunesia",
          movement: "Extract 0:20–1:10",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; East of Tunesia Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL015-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which region is this music most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Middle East",
          "Latin America",
          "Sub-Saharan Africa",
          "North America"
        ],
        correctChoice: "Middle East",
        modelAnswer: "Middle East",
        feedback: "Middle East.",
        skills: [
        "world region",
        "Middle East",
        "context",
        "tradition"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating Middle Eastern traditions" }
      },
      {
        id: "EXL015-Q02",
        number: 2,
        commandWord: "Describe",
        prompt: "Describe the timbre of the string instruments.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "plucked",
          "resonant",
          "bright",
          "nasal",
          "reedy",
          "twangy",
          "sharp"
        ],
        modelAnswer: "Plucked / resonant / bright",
        feedback: "Plucked / resonant / bright.",
        skills: [
        "timbre",
        "strings",
        "Middle Eastern",
        "plucked"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing Middle Eastern string timbres" }
      },
      {
        id: "EXL015-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "repetitive",
          "driving",
          "steady",
          "hypnotic",
          "repeated",
          "regular pulse",
          "persistent"
        ],
        modelAnswer: "Repetitive / driving / steady pulse",
        feedback: "Repetitive / driving / steady pulse.",
        skills: [
        "rhythm",
        "repetition",
        "Middle Eastern",
        "pulse"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing repetitive rhythmic patterns" }
      },
      {
        id: "EXL015-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Which scale type is most likely to be associated with this music?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Major scale",
          "Modal / non-Western scale",
          "Whole-tone scale",
          "Chromatic scale"
        ],
        correctChoice: "Modal / non-Western scale",
        modelAnswer: "Modal / non-Western scale",
        feedback: "Modal / non-Western scale.",
        skills: [
        "scale",
        "mode",
        "Middle Eastern",
        "pitch"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking world traditions to scale types" }
      },
      {
        id: "EXL015-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "melody and accompaniment",
          "heterophonic",
          "monophonic",
          "layered",
          "melody with drone",
          "melody over accompaniment"
        ],
        modelAnswer: "Melody and accompaniment / heterophonic",
        feedback: "Melody and accompaniment / heterophonic.",
        skills: [
        "texture",
        "heterophonic",
        "melody and accompaniment",
        "Middle Eastern"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing Middle Eastern textures" }
      },
      {
        id: "EXL015-Q06",
        number: 6,
        commandWord: "Name",
        prompt: "Name one percussion instrument heard in the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "drum",
          "drums",
          "frame drum",
          "darbuka",
          "tabla",
          "percussion",
          "hand drum"
        ],
        modelAnswer: "Drums / frame drum / hand drum",
        feedback: "Drums / frame drum / hand drum.",
        skills: [
        "instrument identification",
        "percussion",
        "Middle Eastern",
        "drums"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising Middle Eastern percussion" }
      },
      {
        id: "EXL015-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe the role of any repeated low notes or drones.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "pedal",
          "drone",
          "sustained",
          "underpins the melody",
          "harmonic foundation",
          "repeated bass"
        ],
        modelAnswer: "Drone / pedal / underpins the melody",
        feedback: "Drone / pedal / underpins the melody.",
        skills: [
        "drone",
        "pedal",
        "harmony",
        "Middle Eastern"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Harmony Explorer", path: "../harmony-explorer/index.html", status: "live", focus: "recognising drone textures" }
      },
      {
        id: "EXL015-Q08",
        number: 8,
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
        "Middle Eastern"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "identifying simple metres" }
      },
      {
        id: "EXL015-Q09",
        number: 9,
        commandWord: "Give",
        prompt: "Give one feature typical of Middle Eastern music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "ornamentation",
          "modal melody",
          "drone",
          "plucked strings",
          "percussion",
          "improvisation",
          "repetitive rhythm"
        ],
        modelAnswer: "Modal melody / drone / ornamentation / plucked strings",
        feedback: "Modal melody / drone / ornamentation / plucked strings.",
        skills: [
        "Middle Eastern music",
        "genre features",
        "tradition",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Middle Eastern genre features" }
      },
      {
        id: "EXL015-Q10",
        number: 10,
        commandWord: "Describe",
        prompt: "Describe one way in which the melody is decorated.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "ornamented",
          "embellished",
          "trills",
          "slides",
          "grace notes",
          "decorative",
          "flourishes"
        ],
        modelAnswer: "Ornamented / embellished / slides / grace notes",
        feedback: "Ornamented / embellished / slides / grace notes.",
        skills: [
        "ornamentation",
        "melody",
        "decoration",
        "Middle Eastern"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising melodic ornamentation" }
      },
      {
        id: "EXL015-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Middle Eastern music",
          "Rock",
          "Disco",
          "Baroque concerto"
        ],
        correctChoice: "Middle Eastern music",
        modelAnswer: "Middle Eastern music",
        feedback: "Middle Eastern music.",
        skills: [
        "style recognition",
        "Middle Eastern",
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
      window.EXAM_LAB_QUESTION_SETS.EXL015 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
