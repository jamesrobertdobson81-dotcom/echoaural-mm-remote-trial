    (() => {
      "use strict";

      const set = Object.freeze({
        id: "EXL020",
        title: "Unfamiliar hip-hop extract",
        subtitle: "Aural-only listening question",
        board: "Cambridge",
        syllabus: "0410",
        syllabusYears: "2026–2028",
        areaOfStudy: "Popular music",
        genre: "Hip-hop",
        performingForces: "Drum machine, bass and sampled-style textures",
        extractDescription: "Aural-only extract without a supplied skeleton score",
        reviewStatus: "Requires final listening QA",
        totalMarks: 11,
        maxPlays: 4,
        scoreRequired: false,
        lyricsRequired: false,
        audio: "assets/EXL020.mp3",
        score: "",
        scoreAlt: "",
        source: {
          composer: "Kevin MacLeod",
          work: "Chillin Hard",
          movement: "Extract 0:12–1:02",
          recordingSource: "Wikimedia Commons / incompetech.com",
          recordingLicence: "CC BY 3.0; Chillin Hard Kevin MacLeod (incompetech.com)",
          scoreLicence: "No score supplied"
        },
        overarchingRequirements: [
          "CAM-EX-01",
          "CAM-EX-03"
        ],
        questions: [
          {
        id: "EXL020-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which instrument provides the main rhythmic foundation?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Violin",
          "Drum machine / drums",
          "Flute",
          "Harp"
        ],
        correctChoice: "Drum machine / drums",
        modelAnswer: "Drum machine / drums",
        feedback: "Drum machine / drums.",
        skills: [
        "instrument identification",
        "drums",
        "hip-hop",
        "beat"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-INS-01"
],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising hip-hop drum patterns" }
      },
      {
        id: "EXL020-Q02",
        number: 2,
        commandWord: "Give",
        prompt: "Give one way in which technology has been used in this extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "drum machine",
          "sampling",
          "programmed beats",
          "electronic production",
          "synthesiser",
          "loop",
          "electronic drums"
        ],
        modelAnswer: "Drum machine / sampling / programmed beats",
        feedback: "Drum machine / sampling / programmed beats.",
        skills: [
        "music technology",
        "hip-hop",
        "electronic production",
        "sampling"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "identifying technology in hip-hop" }
      },
      {
        id: "EXL020-Q03",
        number: 3,
        commandWord: "Describe",
        prompt: "Describe the bass line.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "repeated",
          "syncopated",
          "loop",
          "ostinato",
          "rhythmic",
          "low",
          "groove"
        ],
        modelAnswer: "Repeated / syncopated / loop / ostinato",
        feedback: "Repeated / syncopated / loop / ostinato.",
        skills: [
        "bass line",
        "hip-hop",
        "ostinato",
        "groove"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing hip-hop bass lines" }
      },
      {
        id: "EXL020-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Which term describes the repeated rhythmic pattern?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Cadence",
          "Beat / groove",
          "Sequence",
          "Pedal"
        ],
        correctChoice: "Beat / groove",
        modelAnswer: "Beat / groove",
        feedback: "Beat / groove.",
        skills: [
        "beat",
        "groove",
        "hip-hop",
        "rhythm"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising hip-hop beats" }
      },
      {
        id: "EXL020-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe the texture.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "layered",
          "homophonic",
          "melody and accompaniment",
          "beat with bass and samples"
        ],
        modelAnswer: "Layered / homophonic / beat with bass",
        feedback: "Layered / homophonic / beat with bass.",
        skills: [
        "texture",
        "layering",
        "hip-hop",
        "beat"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing hip-hop textures" }
      },
      {
        id: "EXL020-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe one change which takes place during the extract.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "a layer is added",
          "a layer is removed",
          "texture changes",
          "dynamics change",
          "elements drop out",
          "parts enter"
        ],
        modelAnswer: "A layer is added or removed / texture or dynamics change",
        feedback: "A layer is added or removed / texture or dynamics change.",
        skills: [
        "change recognition",
        "texture",
        "dynamics",
        "structure"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing changes in hip-hop" }
      },
      {
        id: "EXL020-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "On which beats is the snare or clap mainly heard?",
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
        feedback: "2 and 4.",
        skills: [
        "backbeat",
        "snare",
        "metre",
        "hip-hop rhythm"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising the hip-hop backbeat" }
      },
      {
        id: "EXL020-Q08",
        number: 8,
        commandWord: "Name",
        prompt: "Name the short repeated rhythmic idea in the drums.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "beat",
          "groove",
          "rhythmic loop",
          "ostinato",
          "repeated pattern",
          "drum pattern"
        ],
        modelAnswer: "Beat / groove / rhythmic loop / ostinato",
        feedback: "Beat / groove / rhythmic loop / ostinato.",
        skills: [
        "beat",
        "groove",
        "ostinato",
        "hip-hop"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "naming hip-hop rhythmic loops" }
      },
      {
        id: "EXL020-Q09",
        number: 9,
        commandWord: "Give",
        prompt: "Give one feature typical of hip-hop music.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "sampled beats",
          "rap-ready groove",
          "backbeat",
          "bass loop",
          "electronic production",
          "repeated beat"
        ],
        modelAnswer: "Sampled beats / backbeat / bass loop / electronic production",
        feedback: "Sampled beats / backbeat / bass loop / electronic production.",
        skills: [
        "hip-hop",
        "genre features",
        "popular music",
        "technology"
],
        cambridgeRequirements: [
        "CAM-EX-03",
        "CAM-EX-12"
],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising hip-hop genre features" }
      },
      {
        id: "EXL020-Q10",
        number: 10,
        commandWord: "Describe",
        prompt: "Describe the role of the hi-hat or cymbals.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: [
          "steady pulse",
          "keeps time",
          "rhythmic pattern",
          "sixteenth notes",
          "drives the rhythm",
          "supports the beat"
        ],
        modelAnswer: "Steady pulse / keeps time / rhythmic pattern",
        feedback: "Steady pulse / keeps time / rhythmic pattern.",
        skills: [
        "hi-hat",
        "rhythm",
        "pulse",
        "hip-hop"
],
        cambridgeRequirements: [
        "CAM-EX-03"
],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "describing hi-hat patterns" }
      },
      {
        id: "EXL020-Q11",
        number: 11,
        commandWord: "Identify",
        prompt: "Choose the most suitable style for this extract.",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Hip-hop",
          "Baroque fugue",
          "Gamelan music",
          "Romantic art song"
        ],
        correctChoice: "Hip-hop",
        modelAnswer: "Hip-hop",
        feedback: "Hip-hop.",
        skills: [
        "style recognition",
        "hip-hop",
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
      window.EXAM_LAB_QUESTION_SETS.EXL020 = set;
      window.EXAM_LAB_QUESTION_SET = set;
    })();
