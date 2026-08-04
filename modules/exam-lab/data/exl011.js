(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL011",
    title: "Unfamiliar rock extract",
    subtitle: "Aural-only listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Popular music",
    genre: "Rock",
    performingForces: "Saxophones, electric guitar, bass guitar and drum kit",
    extractDescription: "Aural-only extract without a supplied skeleton score",
    reviewStatus: "Requires final listening QA",
    totalMarks: 11,
    maxPlays: 4,
    scoreRequired: false,
    lyricsRequired: false,
    audio: "assets/EXL011.mp3",
    score: "",
    scoreAlt: "",
    source: {
      composer: "Kevin MacLeod",
      work: "Sax, Rock, and Roll",
      movement: "Extract 0:18–1:08",
      recordingSource: "Wikimedia Commons / incompetech.com",
      recordingLicence: "CC BY 3.0; Sax, Rock, and Roll Kevin MacLeod (incompetech.com)",
      scoreLicence: "No score supplied"
    },
    overarchingRequirements: [
      "CAM-EX-01",
      "CAM-EX-03"
    ],
    questions: [
      {
        id: "EXL011-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which instrument plays the main melodic riff?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Clarinet",
          "Saxophone",
          "Trombone",
          "Violin"
        ],
        correctChoice: "Saxophone",
        modelAnswer: "Saxophone",
        feedback: "The main melodic riff is played by saxophones.",
        skills: [
          "instrument identification",
          "saxophone",
          "riff",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising saxophone timbre in a rock texture" }
      },
      {
        id: "EXL011-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name one type of saxophone heard in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "tenor saxophone",
          "tenor sax",
          "baritone saxophone",
          "baritone sax",
          "bari sax"
        ],
        modelAnswer: "Tenor saxophone",
        feedback: "Tenor and/or baritone saxophones are heard in the extract.",
        skills: [
          "instrument identification",
          "saxophone",
          "timbre",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "naming saxophone types" }
      },
      {
        id: "EXL011-Q03",
        number: 3,
        commandWord: "Name",
        prompt: "Name the instrument which plays the lowest part.",
        marks: 1,
        responseType: "short-text",
        strictAnswerMatch: true,
        acceptedAnswers: [
          "bass guitar",
          "electric bass",
          "electric bass guitar",
          "bass"
        ],
        modelAnswer: "Bass guitar",
        feedback: "The lowest part is played by the bass guitar.",
        skills: [
          "instrument identification",
          "bass guitar",
          "bass line",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "identifying the bass guitar" }
      },
      {
        id: "EXL011-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe the timbre of the electric guitar.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "distorted",
          "overdriven",
          "gritty",
          "rough",
          "harsh",
          "amplified",
          "heavy",
          "powerful"
        ],
        modelAnswer: "Distorted",
        feedback: "The electric guitar has a distorted or overdriven rock timbre.",
        skills: [
          "timbre",
          "electric guitar",
          "distortion",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "describing distorted electric guitar timbre" }
      },
      {
        id: "EXL011-Q05",
        number: 5,
        commandWord: "Identify",
        prompt: "On which beats is the snare drum mainly heard?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "1 and 2",
          "1 and 3",
          "2 and 4",
          "3 and 4"
        ],
        correctChoice: "2 and 4",
        modelAnswer: "2 and 4",
        feedback: "The snare drum is heard mainly on beats 2 and 4, creating a backbeat.",
        skills: [
          "backbeat",
          "snare drum",
          "metre",
          "rock rhythm"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising the rock backbeat" }
      },
      {
        id: "EXL011-Q06",
        number: 6,
        commandWord: "Name",
        prompt: "Name the short repeated melodic idea heard in the saxophones and guitar.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "riff",
          "repeated riff",
          "melodic riff",
          "repeated melodic idea",
          "repeated instrumental idea",
          "repeated pattern"
        ],
        modelAnswer: "Riff",
        feedback: "A riff is a short repeated melodic or instrumental idea.",
        skills: [
          "riff",
          "melodic devices",
          "repeated pattern",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising riffs" }
      },
      {
        id: "EXL011-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe the relationship between the saxophones and the other instruments.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "the saxophones play the melody",
          "the saxophones play the riff",
          "the other instruments accompany the saxophones",
          "the instruments alternate",
          "call and response",
          "the saxophones are answered by the band",
          "melodic material is passed between instruments",
          "saxophones play the melody",
          "saxophones play the riff",
          "other instruments accompany",
          "answered by the band",
          "call-and-response"
        ],
        modelAnswer: "The saxophones play the melody / riff while the other instruments accompany, with alternation or call and response.",
        feedback: "The saxophones carry the melodic riff, while the other instruments accompany or answer them.",
        skills: [
          "texture",
          "instrumental roles",
          "call and response",
          "melody and accompaniment"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing instrumental roles and relationships" }
      },
      {
        id: "EXL011-Q08",
        number: 8,
        commandWord: "Identify",
        prompt: "Which term describes the short drum patterns heard at the ends of phrases?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Drum fills",
          "Drones",
          "Pedal notes",
          "Sequences"
        ],
        correctChoice: "Drum fills",
        modelAnswer: "Drum fills",
        feedback: "Short drum patterns at the ends of phrases are drum fills.",
        skills: [
          "drum fills",
          "rhythm",
          "phrase endings",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising drum fills" }
      },
      {
        id: "EXL011-Q09",
        number: 9,
        commandWord: "Describe",
        prompt: "Describe one way in which the texture becomes fuller.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "more instruments enter",
          "saxophones or trumpet are added",
          "saxophones are added",
          "trumpet is added",
          "electric guitar is added",
          "parts are layered",
          "more parts play together",
          "the riff is doubled",
          "the melody is played by more than one instrument",
          "instruments are added",
          "texture thickens",
          "layers are added",
          "parts are added"
        ],
        modelAnswer: "More instruments enter / parts are layered.",
        feedback: "The texture becomes fuller as instruments are added or parts are layered.",
        skills: [
          "texture",
          "layering",
          "density",
          "rock"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing thickening texture" }
      },
      {
        id: "EXL011-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one feature which is typical of rock music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "electric guitar",
          "distorted guitar",
          "bass guitar",
          "drum kit",
          "backbeat",
          "repeated riff",
          "strong regular beat",
          "amplified instruments",
          "drum fills",
          "riff",
          "distortion"
        ],
        modelAnswer: "Electric guitar / distorted guitar / backbeat / repeated riff.",
        feedback: "Typical rock features include electric/distorted guitar, bass guitar, drum kit, backbeat and repeated riffs.",
        skills: [
          "rock style",
          "genre features",
          "instrumentation",
          "backbeat"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-EX-12"
        ],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising features of rock music" }
      },
      {
        id: "EXL011-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Baroque concerto",
          "Gamelan music",
          "Rock",
          "Romantic symphony"
        ],
        correctChoice: "Rock",
        modelAnswer: "Rock",
        feedback: "The instrumentation, riff writing and backbeat identify the extract as rock.",
        skills: [
          "style recognition",
          "rock",
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
  window.EXAM_LAB_QUESTION_SETS.EXL011 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
