(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL013",
    title: "Unfamiliar Balinese gamelan extract",
    subtitle: "Aural-only listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "World focus: Balinese gamelan",
    genre: "Balinese gamelan",
    performingForces: "Gamelan ensemble",
    extractDescription: "Aural-only extract without a supplied skeleton score",
    reviewStatus: "Requires final listening QA",
    totalMarks: 11,
    maxPlays: 4,
    scoreRequired: false,
    lyricsRequired: false,
    audio: "assets/EXL013.mp3",
    score: "",
    scoreAlt: "",
    source: {
      composer: "Traditional Balinese music",
      work: "Gamelan Anklung Berong Pengetjet",
      movement: "Extract 0:00–0:50 (cleaned)",
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
        id: "EXL013-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "From which part of the world does this music come?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Bali",
          "China",
          "India",
          "West Africa"
        ],
        correctChoice: "Bali",
        modelAnswer: "Bali",
        feedback: "This extract comes from the Balinese gamelan tradition.",
        skills: [
          "world music",
          "Bali",
          "gamelan",
          "context"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-EX-12"
        ],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating world-music traditions" }
      },
      {
        id: "EXL013-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the instrumental ensemble heard in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "gamelan",
          "gamelan ensemble",
          "balinese gamelan",
          "gamelan orchestra"
        ],
        modelAnswer: "Gamelan",
        feedback: "The ensemble is a gamelan.",
        skills: [
          "gamelan",
          "ensemble identification",
          "world music",
          "Bali"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising gamelan ensembles" }
      },
      {
        id: "EXL013-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Which family of instruments is most prominent?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Brass",
          "Keyboard",
          "Percussion",
          "Woodwind"
        ],
        correctChoice: "Percussion",
        modelAnswer: "Percussion",
        feedback: "Gamelan instruments are predominantly percussion.",
        skills: [
          "instrument family",
          "percussion",
          "gamelan",
          "timbre"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "identifying percussion families" }
      },
      {
        id: "EXL013-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe the timbre of the instruments.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "metallic",
          "bright",
          "resonant",
          "ringing",
          "bell-like",
          "bell like",
          "gong-like",
          "gong like",
          "shimmering",
          "percussive"
        ],
        modelAnswer: "Metallic / bell-like / resonant",
        feedback: "Gamelan instruments have a metallic, resonant, bell-like or shimmering timbre.",
        skills: [
          "timbre",
          "metallic",
          "gamelan",
          "percussion"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing metallic percussion timbres" }
      },
      {
        id: "EXL013-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "layered",
          "several layers",
          "multiple layers",
          "polyphonic",
          "interlocking",
          "several independent parts",
          "different patterns sounding together",
          "a melody over repeated patterns"
        ],
        modelAnswer: "Layered / interlocking / polyphonic",
        feedback: "The texture is layered, with interlocking or independent patterns sounding together.",
        skills: [
          "texture",
          "layering",
          "interlocking",
          "gamelan"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing layered interlocking textures" }
      },
      {
        id: "EXL013-Q06",
        number: 6,
        commandWord: "Identify",
        prompt: "Which word best describes the relationship between some of the instrumental parts?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Interlocking",
          "Unison",
          "Monophonic",
          "Recitative"
        ],
        correctChoice: "Interlocking",
        modelAnswer: "Interlocking",
        feedback: "Some parts fit together in interlocking patterns.",
        skills: [
          "interlocking",
          "texture",
          "ensemble relationship",
          "gamelan"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "recognising interlocking parts" }
      },
      {
        id: "EXL013-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe one feature of the rhythm.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "repeated rhythmic patterns",
          "interlocking rhythms",
          "ostinatos",
          "ostinato",
          "complex rhythms",
          "several rhythmic layers",
          "regular pulse",
          "rapid repeated notes",
          "contrasting note lengths",
          "overlapping rhythms",
          "repeated patterns",
          "rhythmic layers"
        ],
        modelAnswer: "Repeated / interlocking rhythmic patterns / ostinatos.",
        feedback: "Credit a clear rhythmic feature such as ostinato, interlocking patterns or layered rhythms.",
        skills: [
          "rhythm",
          "ostinato",
          "interlocking",
          "gamelan"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing layered rhythmic patterns" }
      },
      {
        id: "EXL013-Q08",
        number: 8,
        commandWord: "Name",
        prompt: "Name the large instrument which provides low punctuating notes.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "gong",
          "large gong",
          "suspended gong",
          "low gong"
        ],
        modelAnswer: "Gong",
        feedback: "A large gong provides low punctuating notes.",
        skills: [
          "gong",
          "instrument identification",
          "gamelan",
          "punctuation"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising the gong" }
      },
      {
        id: "EXL013-Q09",
        number: 9,
        commandWord: "Describe",
        prompt: "Describe the role of the low gong.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "marks important beats",
          "marks the ends of phrases",
          "punctuates the music",
          "marks points in the musical cycle",
          "provides a low foundation",
          "marks structural points",
          "marks the beginning or end of a cycle",
          "marks the beginning of a cycle",
          "marks the end of a cycle",
          "punctuates",
          "structural punctuation"
        ],
        modelAnswer: "Marks important beats / structural points / ends of phrases.",
        feedback: "The low gong punctuates the music and marks structural or cyclic points.",
        skills: [
          "gong role",
          "structure",
          "cycle",
          "gamelan"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "explaining structural roles in gamelan" }
      },
      {
        id: "EXL013-Q10",
        number: 10,
        commandWord: "Identify",
        prompt: "Which scale type is most likely to be associated with this music?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Chromatic",
          "Pentatonic",
          "Whole-tone",
          "Major only"
        ],
        correctChoice: "Pentatonic",
        modelAnswer: "Pentatonic",
        feedback: "Gamelan music is most closely associated here with pentatonic scale types.",
        skills: [
          "scale",
          "pentatonic",
          "gamelan",
          "pitch"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-EX-12"
        ],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking world traditions to scale types" }
      },
      {
        id: "EXL013-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "This music was traditionally associated with which context?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Ceremonies",
          "Opera houses",
          "Symphony concerts",
          "Recording studios"
        ],
        correctChoice: "Ceremonies",
        modelAnswer: "Ceremonies",
        feedback: "Balinese gamelan music of this kind was traditionally associated with ceremonies.",
        skills: [
          "context",
          "ceremony",
          "gamelan",
          "world music"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-EX-12"
        ],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking music to ceremonial contexts" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL013 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
