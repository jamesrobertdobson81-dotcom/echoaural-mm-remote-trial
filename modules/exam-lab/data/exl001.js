window.EXAM_LAB_QUESTION_SET = Object.freeze({
  id: "EXL001",
  title: "Unfamiliar instrumental extract",
  subtitle: "Skeleton-score listening question",
  totalMarks: 9,
  maxPlays: 4,
  audio: "assets/EXL001.mp3",
  score: "assets/EXL001-skeleton-score.png",
  scoreAlt: "Skeleton score for EXL001 with prompts at bars 1, 8, 10, 19 and the final cadence.",
  source: {
    composer: "Tomaso Albinoni",
    work: "Oboe Concerto in D minor, Op. 9 No. 2",
    movement: "I. Allegro e non presto",
    recordingSource: "Musopen recording hosted by Wikimedia Commons",
    recordingLicence: "CC0 1.0 Universal",
    scoreLicence: "User-created skeleton score derived from a public-domain composition"
  },
  overarchingRequirements: ["CAM-EX-01", "CAM-EX-03"],
  questions: [
    {
      id: "EXL001-Q01",
      number: 1,
      prompt: "What key is the music in at the beginning?",
      barReference: "Opening",
      marks: 1,
      responseType: "short-text",
      acceptedAnswers: ["d minor", "dmin", "d minor key"],
      modelAnswer: "D minor",
      skills: ["key", "tonality", "score reading"],
      cambridgeRequirements: ["CAM-EX-04", "CAM-NOT-01"],
      route: { module: "Melodic Intervals", path: "../melodic-intervals/index.html", status: "live", focus: "key signatures and tonal reading" }
    },
    {
      id: "EXL001-Q02",
      number: 2,
      prompt: "Name the ornament heard in bar 8.",
      barReference: "Bar 8",
      marks: 1,
      responseType: "short-text",
      acceptedAnswers: ["trill", "a trill"],
      modelAnswer: "Trill",
      skills: ["ornamentation", "aural recognition", "notation"],
      cambridgeRequirements: ["CAM-ORN-01", "CAM-NOT-03"],
      route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "melodic devices and ornamentation" }
    },
    {
      id: "EXL001-Q03",
      number: 3,
      prompt: "What instrument plays the printed melody in bar 10?",
      barReference: "Bar 10",
      marks: 1,
      responseType: "short-text",
      acceptedAnswers: ["violin", "violins", "first violin", "1st violin"],
      modelAnswer: "Violin",
      skills: ["instrument identification", "strings", "orchestral timbre"],
      cambridgeRequirements: ["CAM-INS-01"],
      route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "orchestral string recognition" }
    },
    {
      id: "EXL001-Q04",
      number: 4,
      prompt: "Give the exact name of the indicated interval in bar 19.",
      barReference: "Bar 19",
      marks: 2,
      responseType: "short-text",
      acceptedAnswers: ["perfect fifth", "perfect 5th", "p5"],
      markComponents: [
        { id: "quality", acceptedAnswers: ["perfect", "p5"] },
        { id: "number", acceptedAnswers: ["5", "5th", "fifth", "p5"] }
      ],
      modelAnswer: "Perfect fifth",
      skills: ["interval", "notation", "pitch distance"],
      cambridgeRequirements: ["CAM-EX-09", "CAM-NOT-04"],
      route: { module: "Melodic Intervals", path: "../melodic-intervals/index.html", status: "live", focus: "interval number and quality" }
    },
    {
      id: "EXL001-Q05",
      number: 5,
      prompt: "Name the cadence heard at the end of the extract.",
      barReference: "End",
      marks: 1,
      responseType: "short-text",
      acceptedAnswers: ["perfect", "perfect cadence", "authentic", "authentic cadence", "v i", "v-i", "dominant tonic"],
      modelAnswer: "Perfect cadence",
      skills: ["cadence", "harmony", "aural recognition"],
      cambridgeRequirements: ["CAM-EX-08", "CAM-HAR-03"],
      route: { module: "Cadence Coach", path: "../cadence-coach/index.html", status: "planned", focus: "perfect, imperfect and interrupted cadences" }
    },
    {
      id: "EXL001-Q06",
      number: 6,
      prompt: "Which period of music is this extract from?",
      barReference: "Whole extract",
      marks: 1,
      responseType: "multiple-choice",
      options: ["Baroque", "Classical", "Renaissance", "Modern"],
      correctChoice: "Baroque",
      modelAnswer: "Baroque",
      skills: ["period recognition", "style", "context"],
      cambridgeRequirements: ["CAM-EX-12", "CAM-AOS1-01"],
      route: { module: "Context & Style", path: "#", status: "planned", focus: "Baroque style recognition" }
    },
    {
      id: "EXL001-Q07",
      number: 7,
      prompt: "Give two reasons for your answer to Question 6.",
      barReference: "Whole extract",
      marks: 2,
      responseType: "extended-text",
      modelAnswer: "For example: frequent ornamentation and sequences; a small string orchestra with continuo; diatonic functional harmony; solo-and-tutti contrast; regular motor rhythms.",
      reasonCategories: [
        { id: "ornamentation", keywords: ["ornament", "trill", "decorat", "embellish"] },
        { id: "sequence", keywords: ["sequence", "sequential"] },
        { id: "small-ensemble", keywords: ["small orchestra", "small ensemble", "string orchestra", "strings", "chamber orchestra"] },
        { id: "continuo", keywords: ["basso continuo", "continuo", "harpsichord"] },
        { id: "diatonic-harmony", keywords: ["diatonic", "functional harmony", "tonal harmony", "primary chords", "tonic dominant"] },
        { id: "ritornello", keywords: ["ritornello", "solo and tutti", "solo/tutti", "tutti and solo", "soloist and orchestra"] },
        { id: "terraced-dynamics", keywords: ["terraced dynamics", "sudden dynamic", "dynamic contrast"] },
        { id: "motor-rhythm", keywords: ["motor rhythm", "continuous semiquaver", "continuous quaver", "regular rhythmic", "driving rhythm"] },
        { id: "counterpoint", keywords: ["counterpoint", "contrapuntal", "imitation", "imitative"] }
      ],
      skills: ["style justification", "musical evidence", "Baroque context"],
      cambridgeRequirements: ["CAM-EX-12", "CAM-EX-13", "CAM-AOS1-01", "CAM-AOS1-02"],
      route: { module: "Context & Style", path: "#", status: "planned", focus: "feature-plus-reason writing" }
    }
  ]
});

window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
window.EXAM_LAB_QUESTION_SETS.EXL001 = window.EXAM_LAB_QUESTION_SET;
