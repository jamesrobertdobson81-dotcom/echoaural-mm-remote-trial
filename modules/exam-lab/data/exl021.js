    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL021",
        title: "Unfamiliar pop extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "Popular music",
        genre: "Pop / light jazz",
        performingForces: "Piano, bass, drums and melodic lead",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL021.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Carefree",
          movement: "Extract 0:18–1:08",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Carefree Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL021-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which instrument plays the main melody?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Trumpet",
          "Piano",
          "Trombone",
          "Oboe"
        ],
        correctChoice: "Piano",
        modelAnswer: "Piano",
        feedback: "Piano.",
        skills: [
        "instrument identification",
        "piano",
        "pop",
        "melody"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising piano melody in pop" }
      },
      {
        id: "EXL021-Q02",
        number: 2,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "melody and accompaniment",
          "homophonic",
          "melody with chords",
          "simple",
          "clear melody"
        ],
        modelAnswer: "Melody and accompaniment / homophonic",
        feedback: "Melody and accompaniment / homophonic.",
        skills: [
        "texture",
        "homophonic",
        "pop",
        "melody and accompaniment"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing pop textures" }
      },
      {
        id: "EXL021-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe the bass line.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "stepwise",
          "repeated",
          "simple",
          "supports harmony",
          "root notes",
          "walking",
          "smooth"
        ],
        modelAnswer: "Stepwise / repeated / supports harmony",
        feedback: "Stepwise / repeated / supports harmony.",
        skills: [
        "bass line",
        "pop",
        "harmony",
        "accompaniment"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing pop bass lines" }
      },
      {
        id: "EXL021-Q04",
        number: 4,
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
        "pop"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "identifying simple metres in pop" }
      },
      {
        id: "EXL021-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe one feature of the melody.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "catchy",
          "stepwise",
          "simple",
          "memorable",
          "repeated",
          "smooth",
          "singable"
        ],
        modelAnswer: "Catchy / stepwise / simple / memorable",
        feedback: "Catchy / stepwise / simple / memorable.",
        skills: [
        "melody",
        "pop",
        "memorable",
        "singable"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing pop melodies" }
      },
      {
        id: "EXL021-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe the dynamics.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "moderate",
          "steady",
          "soft to moderate",
          "consistent",
          "gentle",
          "relaxed"
        ],
        modelAnswer: "Moderate / steady / gentle",
        feedback: "Moderate / steady / gentle.",
        skills: [
        "dynamics",
        "pop",
        "level",
        "expression"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "describing pop dynamics" }
      },
      {
        id: "EXL021-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "Which term describes the chordal support beneath the melody?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Countermelody",
          "Accompaniment",
          "Pedal",
          "Canon"
        ],
        correctChoice: "Accompaniment",
        modelAnswer: "Accompaniment",
        feedback: "Accompaniment.",
        skills: [
        "accompaniment",
        "texture",
        "pop",
        "harmony"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "recognising accompaniment roles" }
      },
      {
        id: "EXL021-Q08",
        number: 8,
        commandWord: "Describe",
        prompt: "Describe one change which takes place during the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "dynamics change",
          "texture changes",
          "a part is added",
          "instruments enter",
          "layers are added"
        ],
        modelAnswer: "Dynamics / texture change / parts added",
        feedback: "Dynamics / texture change / parts added.",
        skills: [
        "change recognition",
        "dynamics",
        "texture",
        "structure"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing changes in pop" }
      },
      {
        id: "EXL021-Q09",
        number: 9,
        commandWord: "Give",
        prompt: "Give one feature typical of pop music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "catchy melody",
          "simple harmony",
          "steady beat",
          "verse-chorus structure",
          "memorable tune",
          "homophonic texture"
        ],
        modelAnswer: "Catchy melody / simple harmony / steady beat",
        feedback: "Catchy melody / simple harmony / steady beat.",
        skills: [
        "pop",
        "genre features",
        "popular music",
        "melody"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising pop genre features" }
      },
      {
        id: "EXL021-Q10",
        number: 10,
        commandWord: "Describe",
        prompt: "Describe the role of the drums.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "steady beat",
          "keep the pulse",
          "support the melody",
          "simple pattern",
          "backbeat"
        ],
        modelAnswer: "Steady beat / keep the pulse / simple pattern",
        feedback: "Steady beat / keep the pulse / simple pattern.",
        skills: [
        "drums",
        "pop",
        "pulse",
        "accompaniment"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing drum roles in pop" }
      },
      {
        id: "EXL021-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Pop",
          "Gamelan music",
          "Baroque fugue",
          "Symphony"
        ],
        correctChoice: "Pop",
        modelAnswer: "Pop",
        feedback: "Pop.",
        skills: [
        "style recognition",
        "pop",
        "genre",
        "context"
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
      window.EXAM_LAB_QUESTION_SETS.EXL021 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
