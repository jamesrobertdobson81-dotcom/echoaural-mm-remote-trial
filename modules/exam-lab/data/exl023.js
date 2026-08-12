    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL023",
        title: "Unfamiliar Celtic folk extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "World focus: Celtic folk music",
        genre: "Celtic folk",
        performingForces: "Fiddle, harp and folk ensemble textures",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL023.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Brittle Rille",
          movement: "Extract 0:35–1:25",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Brittle Rille Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL023-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which region is this music most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Celtic regions / British Isles",
          "Latin America",
          "East Asia",
          "North Africa"
        ],
        correctChoice: "Celtic regions / British Isles",
        modelAnswer: "Celtic regions / British Isles",
        feedback: "Celtic regions / British Isles.",
        skills: [
        "world region",
        "Celtic",
        "folk",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating Celtic folk traditions" }
      },
      {
        id: "EXL023-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the bowed string instrument heard in the melody.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "fiddle",
          "violin",
          "folk fiddle"
        ],
        modelAnswer: "Fiddle / violin",
        feedback: "Fiddle / violin.",
        skills: [
        "instrument identification",
        "fiddle",
        "Celtic folk",
        "strings"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising fiddle in Celtic folk" }
      },
      {
        id: "EXL023-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe the timbre of the fiddle.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "bright",
          "lively",
          "folk-like",
          "sharp",
          "energetic",
          "reedy",
          "nasal"
        ],
        modelAnswer: "Bright / lively / folk-like / energetic",
        feedback: "Bright / lively / folk-like / energetic.",
        skills: [
        "timbre",
        "fiddle",
        "Celtic folk",
        "strings"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing fiddle timbres" }
      },
      {
        id: "EXL023-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Which scale type is most likely to be associated with this music?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Major scale only",
          "Modal / folk scale",
          "Whole-tone scale",
          "Chromatic scale"
        ],
        correctChoice: "Modal / folk scale",
        modelAnswer: "Modal / folk scale",
        feedback: "Modal / folk scale.",
        skills: [
        "scale",
        "mode",
        "Celtic folk",
        "pitch"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking folk music to modal scales" }
      },
      {
        id: "EXL023-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe one feature of the melody.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "ornamented",
          "florid",
          "repeated",
          "folk-like",
          "lively",
          "stepwise",
          "decorative"
        ],
        modelAnswer: "Ornamented / lively / folk-like / decorative",
        feedback: "Ornamented / lively / folk-like / decorative.",
        skills: [
        "melody",
        "ornamentation",
        "Celtic folk",
        "decoration"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing Celtic folk melodies" }
      },
      {
        id: "EXL023-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "melody and accompaniment",
          "homophonic",
          "monophonic",
          "heterophonic",
          "melody with drone"
        ],
        modelAnswer: "Melody and accompaniment / homophonic",
        feedback: "Melody and accompaniment / homophonic.",
        skills: [
        "texture",
        "folk",
        "melody and accompaniment",
        "Celtic"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing Celtic folk textures" }
      },
      {
        id: "EXL023-Q07",
        number: 7,
        commandWord: "Name",
        prompt: "Name one other instrument heard supporting the melody.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "harp",
          "guitar",
          "bodhran",
          "accordion",
          "flute",
          "pipes",
          "percussion"
        ],
        modelAnswer: "Harp / guitar / bodhrán / flute",
        feedback: "Harp / guitar / bodhrán / flute.",
        skills: [
        "instrument identification",
        "folk ensemble",
        "Celtic",
        "accompaniment"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising Celtic folk accompaniment" }
      },
      {
        id: "EXL023-Q08",
        number: 8,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "lively",
          "dance-like",
          "steady",
          "repeated",
          "jig-like",
          "regular",
          "driving"
        ],
        modelAnswer: "Lively / dance-like / steady / jig-like",
        feedback: "Lively / dance-like / steady / jig-like.",
        skills: [
        "rhythm",
        "dance",
        "Celtic folk",
        "pulse"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing Celtic dance rhythms" }
      },
      {
        id: "EXL023-Q09",
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
        correctChoice: "Compound time",
        modelAnswer: "Compound time",
        feedback: "Compound time.",
        skills: [
        "metre",
        "compound time",
        "jig",
        "Celtic folk"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "identifying compound metres in folk dance" }
      },
      {
        id: "EXL023-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one feature typical of Celtic folk music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "ornamented melody",
          "fiddle",
          "dance rhythms",
          "modal scale",
          "folk instruments",
          "lively tempo"
        ],
        modelAnswer: "Ornamented melody / fiddle / dance rhythms / modal scale",
        feedback: "Ornamented melody / fiddle / dance rhythms / modal scale.",
        skills: [
        "Celtic folk",
        "genre features",
        "tradition",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Celtic genre features" }
      },
      {
        id: "EXL023-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Celtic folk music",
          "Hip-hop",
          "Disco",
          "Symphony"
        ],
        correctChoice: "Celtic folk music",
        modelAnswer: "Celtic folk music",
        feedback: "Celtic folk music.",
        skills: [
        "style recognition",
        "Celtic folk",
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
      window.EXAM_LAB_QUESTION_SETS.EXL023 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
