    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL018",
        title: "Unfamiliar reggae extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "Popular music",
        genre: "Reggae",
        performingForces: "Electric guitar, bass, drums and keyboard textures",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL018.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Tea Roots",
          movement: "Extract 0:25–1:15",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Tea Roots Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL018-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which instrument plays the off-beat chords?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Piano",
          "Electric guitar",
          "Flute",
          "Violin"
        ],
        correctChoice: "Electric guitar",
        modelAnswer: "Electric guitar",
        feedback: "Electric guitar.",
        skills: [
        "instrument identification",
        "electric guitar",
        "reggae",
        "skank"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising reggae guitar skank" }
      },
      {
        id: "EXL018-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the rhythmic guitar pattern used in reggae.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "skank",
          "off-beat chords",
          "skank chords",
          "chords on the off-beat",
          "reggae skank"
        ],
        modelAnswer: "Skank / off-beat chords",
        feedback: "Skank / off-beat chords.",
        skills: [
        "skank",
        "reggae",
        "rhythm guitar",
        "off-beat"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "naming the reggae skank" }
      },
      {
        id: "EXL018-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe the bass line.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "repeated",
          "syncopated",
          "stepwise",
          "riffs",
          "melodic",
          "outlines harmony",
          "bouncy"
        ],
        modelAnswer: "Repeated / syncopated / outlines the harmony",
        feedback: "Repeated / syncopated / outlines the harmony.",
        skills: [
        "bass line",
        "reggae",
        "syncopation",
        "repeated pattern"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing reggae bass lines" }
      },
      {
        id: "EXL018-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "On which beats are the guitar chords mainly heard?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "On every beat",
          "Off-beats",
          "Beats 1 and 3 only",
          "Beats 2 and 4 only"
        ],
        correctChoice: "Off-beats",
        modelAnswer: "Off-beats",
        feedback: "Off-beats.",
        skills: [
        "off-beat",
        "reggae",
        "metre",
        "rhythm"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising off-beat reggae chords" }
      },
      {
        id: "EXL018-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the role of the drums.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "steady beat",
          "backbeat",
          "groove",
          "rhythmic foundation",
          "keep the pulse",
          "support the bass"
        ],
        modelAnswer: "Steady beat / groove / rhythmic foundation",
        feedback: "Steady beat / groove / rhythmic foundation.",
        skills: [
        "drums",
        "reggae",
        "pulse",
        "groove"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing drum roles in reggae" }
      },
      {
        id: "EXL018-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "melody and accompaniment",
          "homophonic",
          "layered",
          "bass and chords with melody"
        ],
        modelAnswer: "Melody and accompaniment / homophonic",
        feedback: "Melody and accompaniment / homophonic.",
        skills: [
        "texture",
        "homophonic",
        "reggae",
        "melody and accompaniment"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing reggae textures" }
      },
      {
        id: "EXL018-Q07",
        number: 7,
        commandWord: "Describe",
        prompt: "Describe one change which takes place during the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "a part is added",
          "texture changes",
          "dynamics change",
          "instruments enter",
          "layers are added"
        ],
        modelAnswer: "A part is added / texture or dynamics change",
        feedback: "A part is added / texture or dynamics change.",
        skills: [
        "change recognition",
        "texture",
        "dynamics",
        "structure"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing changes in reggae" }
      },
      {
        id: "EXL018-Q08",
        number: 8,
        commandWord: "Give",
        prompt: "Give one feature typical of reggae music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "off-beat guitar",
          "skank",
          "syncopated bass",
          "steady beat",
          "repeated bass line",
          "relaxed tempo"
        ],
        modelAnswer: "Off-beat guitar / skank / syncopated bass / steady beat",
        feedback: "Off-beat guitar / skank / syncopated bass / steady beat.",
        skills: [
        "reggae",
        "genre features",
        "Caribbean",
        "rhythm"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising reggae genre features" }
      },
      {
        id: "EXL018-Q09",
        number: 9,
        commandWord: "Identify",
        prompt: "From which region is reggae most closely associated?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Caribbean",
          "Scandinavia",
          "East Asia",
          "Central Europe"
        ],
        correctChoice: "Caribbean",
        modelAnswer: "Caribbean",
        feedback: "Caribbean.",
        skills: [
        "world region",
        "Caribbean",
        "reggae",
        "context"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "locating Caribbean traditions" }
      },
      {
        id: "EXL018-Q10",
        number: 10,
        commandWord: "Give",
        prompt: "Give one way in which technology has been used in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "electric guitar",
          "amplified",
          "electronic keyboard",
          "effects",
          "recording technology",
          "electric bass"
        ],
        modelAnswer: "Electric / amplified instruments / electronic keyboard",
        feedback: "Electric / amplified instruments / electronic keyboard.",
        skills: [
        "music technology",
        "amplification",
        "reggae",
        "popular music"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "identifying technology in reggae" }
      },
      {
        id: "EXL018-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Reggae",
          "Baroque concerto",
          "Latin dance music",
          "Symphony"
        ],
        correctChoice: "Reggae",
        modelAnswer: "Reggae",
        feedback: "Reggae.",
        skills: [
        "style recognition",
        "reggae",
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
      window.EXAM_LAB_QUESTION_SETS.EXL018 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
