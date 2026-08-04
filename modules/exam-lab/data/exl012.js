(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL012",
    title: "Unfamiliar disco / electronic dance extract",
    subtitle: "Aural-only listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Popular music",
    genre: "Disco / electronic dance music",
    performingForces: "Electric guitar, bass, drums and layered electronic/string textures",
    extractDescription: "Aural-only extract without a supplied skeleton score",
    reviewStatus: "Requires final listening QA",
    totalMarks: 11,
    maxPlays: 4,
    scoreRequired: false,
    lyricsRequired: false,
    audio: "assets/EXL012.mp3",
    score: "",
    scoreAlt: "",
    source: {
      composer: "Kevin MacLeod",
      work: "Stringed Disco",
      movement: "Extract 0:48–1:38",
      recordingSource: "Wikimedia Commons / incompetech.com",
      recordingLicence: "CC BY 3.0; Stringed Disco Kevin MacLeod (incompetech.com)",
      scoreLicence: "No score supplied"
    },
    overarchingRequirements: [
      "CAM-EX-01",
      "CAM-EX-03"
    ],
    questions: [
      {
        id: "EXL012-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which instrument plays the prominent rhythmic chords?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Electric guitar",
          "Flute",
          "Trombone",
          "Violin"
        ],
        correctChoice: "Electric guitar",
        modelAnswer: "Electric guitar",
        feedback: "The prominent rhythmic chords are played by the electric guitar.",
        skills: [
          "instrument identification",
          "electric guitar",
          "disco",
          "rhythm"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-INS-01"
        ],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising electric guitar chords" }
      },
      {
        id: "EXL012-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the effect used by the electric guitar.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "wah-wah",
          "wah wah",
          "wah",
          "wah pedal",
          "wah-wah effect",
          "filter effect"
        ],
        modelAnswer: "Wah-wah",
        feedback: "The guitar uses a wah-wah (filter) effect.",
        skills: [
          "music technology",
          "wah-wah",
          "guitar effects",
          "timbre"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Music Technology", path: "#", status: "planned", focus: "recognising wah-wah and guitar effects" }
      },
      {
        id: "EXL012-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe the articulation of the guitar chords.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "staccato",
          "detached",
          "short",
          "clipped",
          "sharply articulated",
          "short and detached"
        ],
        modelAnswer: "Staccato / short and detached",
        feedback: "The guitar chords are short, detached and sharply articulated.",
        skills: [
          "articulation",
          "staccato",
          "guitar",
          "disco"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising staccato articulation" }
      },
      {
        id: "EXL012-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Which rhythmic pattern is played by the bass drum?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "On every crotchet beat",
          "On beats 1 and 3 only",
          "On beats 2 and 4 only",
          "Between the main beats"
        ],
        correctChoice: "On every crotchet beat",
        modelAnswer: "On every crotchet beat",
        feedback: "The bass drum plays on every crotchet beat.",
        skills: [
          "bass drum",
          "four on the floor",
          "metre",
          "disco"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising regular bass-drum patterns" }
      },
      {
        id: "EXL012-Q05",
        number: 5,
        commandWord: "Name",
        prompt: "What name is given to this bass-drum pattern?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "four on the floor",
          "four-to-the-floor",
          "four to the floor",
          "bass drum on every beat",
          "kick drum on every beat"
        ],
        modelAnswer: "Four on the floor",
        feedback: "A bass drum on every beat is called four on the floor.",
        skills: [
          "four on the floor",
          "bass drum",
          "disco",
          "dance music"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "naming four-on-the-floor patterns" }
      },
      {
        id: "EXL012-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe the bass line.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "repeated",
          "repetitive",
          "syncopated",
          "contains octave leaps",
          "moves between octaves",
          "uses a repeated pattern",
          "outlines the harmony",
          "works closely with the drum kit",
          "provides a low rhythmic foundation",
          "repeated pattern",
          "octave leaps",
          "low rhythmic foundation"
        ],
        modelAnswer: "Repeated / syncopated / uses octave leaps / outlines the harmony.",
        feedback: "The bass line is repeated and rhythmic, often syncopated, and works closely with the drums.",
        skills: [
          "bass line",
          "ostinato",
          "syncopation",
          "disco"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing bass-line patterns" }
      },
      {
        id: "EXL012-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe one change which takes place during the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "a part is added or removed",
          "a part is added",
          "a part is removed",
          "parts are added",
          "parts are removed",
          "strings enter",
          "texture becomes thicker",
          "texture becomes thinner",
          "texture thickens",
          "texture thins",
          "melody changes",
          "accompaniment changes",
          "dynamics become louder",
          "dynamics become quieter",
          "a new rhythmic pattern enters",
          "instruments enter",
          "instruments leave",
          "becomes louder",
          "becomes quieter"
        ],
        modelAnswer: "A part is added or removed / texture changes / dynamics change.",
        feedback: "Credit a clearly audible change, such as parts entering or leaving, texture change or dynamic change.",
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
        id: "EXL012-Q08",
        number: 8,
        commandWord: "Identify",
        prompt: "Which term describes the addition of instrumental parts to build up the texture?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Layering",
          "Modulation",
          "Rubato",
          "Sequence"
        ],
        correctChoice: "Layering",
        modelAnswer: "Layering",
        feedback: "Adding instrumental parts to build the texture is layering.",
        skills: [
          "layering",
          "texture",
          "build-up",
          "dance music"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "recognising layered textures" }
      },
      {
        id: "EXL012-Q09",
        number: 9,
        commandWord: "Describe",
        prompt: "Describe the texture when most of the instruments are playing.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "layered",
          "thick",
          "full",
          "homophonic",
          "melody and accompaniment",
          "several parts sounding together",
          "several instrumental layers",
          "melody over a repeated accompaniment"
        ],
        modelAnswer: "Layered / thick / melody and accompaniment",
        feedback: "When most instruments play, the texture is layered or thick, often with melody over repeated accompaniment.",
        skills: [
          "texture",
          "homophonic",
          "layering",
          "density"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing dense layered textures" }
      },
      {
        id: "EXL012-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one way in which technology has been used in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "electronic sounds",
          "synthesised sounds",
          "synthesized sounds",
          "electronic keyboard",
          "electric guitar effects",
          "wah-wah effect",
          "wah wah effect",
          "programmed drums",
          "drum machine",
          "looping",
          "multitracking",
          "multi-tracking",
          "electronic production",
          "studio effects",
          "synthesiser",
          "synthesizer"
        ],
        modelAnswer: "Electronic / synthesised sounds / guitar effects / programmed drums.",
        feedback: "Technology is heard through electronic/synthesised sounds, effects, looping or programmed production.",
        skills: [
          "music technology",
          "electronic production",
          "effects",
          "dance music"
        ],
        cambridgeRequirements: [
          "CAM-EX-03"
        ],
        route: { module: "Music Technology", path: "#", status: "planned", focus: "identifying uses of music technology" }
      },
      {
        id: "EXL012-Q11",
        number: 11,
        commandWord: "Give",
        prompt: "Give one feature which makes this music suitable for dancing.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "steady beat",
          "regular pulse",
          "four-on-the-floor bass drum",
          "four on the floor",
          "repeated bass line",
          "repetitive rhythm",
          "strong beat",
          "driving rhythm",
          "predictable phrases",
          "syncopated rhythms",
          "moderately fast tempo",
          "regular beat",
          "steady pulse"
        ],
        modelAnswer: "Steady beat / four on the floor / repeated bass line.",
        feedback: "A steady beat, four-on-the-floor bass drum and repetitive patterns make the music suitable for dancing.",
        skills: [
          "dance music",
          "pulse",
          "four on the floor",
          "genre features"
        ],
        cambridgeRequirements: [
          "CAM-EX-03",
          "CAM-EX-12"
        ],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking musical features to dance function" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL012 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
