(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL007",
    title: "Unfamiliar vocal extract",
    subtitle: "Aural-only music and words question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Music and words",
    genre: "Singer-songwriter / folk-pop",
    performingForces: "Solo voice with accompaniment",
    extractDescription: "Aural-only vocal extract without a supplied skeleton score",
    reviewStatus: "Rights verified; requires final listening QA",
    totalMarks: 10,
    maxPlays: 4,
    scoreRequired: false,
    lyricsRequired: true,
    audio: "assets/EXL007.mp3",
    score: "",
    scoreAlt: "",
    listeningGuide: [
      { label: "Passage A", text: "First verse, from the opening" },
      { label: "Passage B", text: "First refrain, beginning with the repeated word “Sleep”" }
    ],
    source: {
      composer: "Josh Woodward",
      work: "Words Fall Apart",
      movement: "from Addressed to the Stars",
      recordingSource: "Josh Woodward official song page; downloadable copy also hosted by Wikimedia Commons",
      recordingLicence: "Creative Commons Attribution 4.0 International (CC BY 4.0); edited 54-second educational extract",
      scoreLicence: "No score supplied",
      sourcePageUrl: "https://www.joshwoodward.com/song/WordsFallApart",
      audioDownloadUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Josh_Woodward_-_13_-_Words_Fall_Apart.ogg",
      requiredAttribution: "“Words Fall Apart” by Josh Woodward, from Addressed to the Stars, licensed under CC BY 4.0. Source: https://www.joshwoodward.com/song/WordsFallApart."
    },
    rights: {
      checkedDate: "2026-08-03",
      commercialUseAllowed: true,
      adaptationAllowed: true,
      attributionRequired: true,
      evidence: "The artist’s official page states CC BY 4.0 and provides song data and downloads."
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03", "CAM-AOS4-01"],
    questions: [
      {
        id: "EXL007-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which time signature is used in this extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["3/4", "6/8", "9/8", "12/8"],
        correctChoice: "6/8",
        acceptedAnswers: ["6/8", "compound duple"],
        modelAnswer: "6/8",
        feedback: "Two main dotted-crotchet beats are heard in each bar, each dividing into three quavers.",
        skills: ["time signature", "6/8", "compound duple", "metre"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS4-01"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising compound-duple metre" }
      },
      {
        id: "EXL007-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the instrument which accompanies the singer.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["piano", "acoustic piano"],
        modelAnswer: "Piano",
        feedback: "Listen for the struck attack followed by a natural decay.",
        skills: ["instrument identification", "piano", "timbre", "accompaniment"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01", "CAM-AOS4-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising piano timbre" }
      },
      {
        id: "EXL007-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Which term best describes the texture for most of the extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Monophonic", "Melody and accompaniment", "Contrapuntal", "Heterophonic"],
        correctChoice: "Melody and accompaniment",
        acceptedAnswers: ["melody and accompaniment", "homophonic"],
        modelAnswer: "Melody and accompaniment",
        feedback: "The voice carries the principal melodic line while the accompaniment provides subordinate harmonic support.",
        skills: ["texture", "melody and accompaniment", "homophonic texture", "musical roles"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS4-01"],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "identifying melody-and-accompaniment texture" }
      },
      {
        id: "EXL007-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe two features of the piano accompaniment.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Describe two distinct features of the accompaniment.",
        modelAnswer: "It uses a regular rocking compound-duple pattern and broken chords.",
        markingFeedbackMode: "answer-coach",
        markPoints: [
          {
            id: "rocking-repeated-pattern",
            label: "Regular rocking or repeated compound-duple pattern",
            explanation: "The accompaniment uses a recurring rocking figure within the compound-duple metre.",
            suggestion: "Describe its regular rocking or repeated pattern.",
            acceptedAnswers: ["regular rocking compound duple pattern", "rocking compound duple pattern", "regular rocking pattern", "rocking pattern", "pattern rocks", "rocking 6/8 pattern", "repeated figuration", "repeating figuration", "repeated pattern", "repeating pattern", "regular pattern"]
          },
          {
            id: "broken-chords",
            label: "Broken chords or arpeggiation",
            explanation: "Chord notes are sounded successively as broken chords or arpeggios.",
            suggestion: "Mention the broken chords or arpeggiation.",
            acceptedAnswers: ["broken chords", "broken chord", "arpeggiation", "arpeggiated", "arpeggiated chords", "arpeggios", "arpeggio"]
          },
          {
            id: "restrained-dynamics",
            label: "Soft or restrained dynamics",
            explanation: "The accompaniment remains soft or restrained.",
            suggestion: "Describe the soft or restrained dynamics.",
            acceptedAnswers: ["soft dynamics", "dynamics are soft", "restrained dynamics", "played softly", "quiet dynamics", "quiet accompaniment", "soft accompaniment", "piano dynamic", "piano dynamics"]
          },
          {
            id: "harmonic-support",
            label: "Supports the vocal harmony",
            explanation: "The accompaniment supplies harmonic support beneath the vocal line.",
            suggestion: "Explain that it supports the voice harmonically.",
            acceptedAnswers: ["supports the vocal harmony", "supports vocal harmony", "supports the singer harmonically", "harmonic support", "provides harmonic support", "supports the voice", "supports the vocal line"]
          },
          {
            id: "chordal-accompaniment",
            label: "Predominantly chordal accompaniment",
            explanation: "The accompaniment is based principally on chords.",
            suggestion: "Describe the accompaniment as predominantly chordal.",
            acceptedAnswers: ["predominantly chordal accompaniment", "chordal accompaniment", "mainly chordal", "mostly chordal", "based on chords", "uses chords"]
          }
        ],
        nonCreditRules: [
          { id: "instrument-only", feedback: "Naming the instrument does not describe its accompaniment.", phrases: ["it is a piano", "played by piano", "piano"] },
          { id: "duplicate-pattern", feedback: "Equivalent descriptions of the same repeated pattern count as one point.", phrases: ["rocking pattern and repeated figuration", "repeated pattern and rocking pattern"] }
        ],
        skills: ["accompaniment", "compound-duple pattern", "broken chords", "dynamics", "harmonic support", "chordal texture"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS4-01"],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing accompaniment patterns and harmonic roles" }
      },
      {
        id: "EXL007-Q05",
        number: 5,
        commandWord: "Compare",
        prompt: "Compare the first verse with the first refrain.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Make two paired comparisons between the passages.",
        modelAnswer: "The verse uses longer and more varied lines; the refrain uses shorter, repeated words and repeated musical material, creating a more lullaby-like effect.",
        markingFeedbackMode: "paired-comparison",
        firstPassageMarkers: ["first verse", "verse", "passage a", "passage one", "first passage"],
        secondPassageMarkers: ["first refrain", "refrain", "chorus", "passage b", "passage two", "second passage"],
        incompleteComparisonFeedback: "Each point must compare both passages; a description of only one passage cannot earn full marks.",
        pairedComparisonPoints: [
          {
            id: "phrase-length",
            label: "Longer lines in the verse; shorter lines in the refrain",
            explanation: "The verse uses longer lines, while the refrain is built from shorter lines.",
            suggestion: "Compare the length of the lines or phrases in both passages.",
            firstPassageAnswers: ["longer lines", "longer and more varied lines", "longer more varied lines", "longer phrases", "phrases are longer", "lines are longer"],
            secondPassageAnswers: ["shorter lines", "shorter phrases", "phrases are shorter", "lines are shorter", "shorter repeated words", "short repeated words"],
            directComparisons: ["verse has longer lines than the refrain", "verse has longer phrases than the refrain", "refrain has shorter lines than the verse", "refrain has shorter phrases than the verse"]
          },
          {
            id: "repetition-variety",
            label: "More varied material in the verse; greater repetition in the refrain",
            explanation: "The verse is more varied, while the refrain repeats words and musical material.",
            suggestion: "Compare the amount of repetition or variety in both passages.",
            firstPassageAnswers: ["more varied", "more varied lines", "varied lines", "more melodic variety", "less repetitive", "fewer repetitions", "material is more varied"],
            secondPassageAnswers: ["repeated words", "words are repeated", "repeats words", "repeated musical material", "music is repeated", "melody is repeated", "repeated melody", "more repetitive", "greater repetition"],
            directComparisons: ["verse is more varied than the refrain", "refrain is more repetitive than the verse", "refrain has more repetition than the verse"]
          }
        ],
        skills: ["comparison", "verse and refrain", "phrase length", "repetition", "melodic variety", "word setting"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS4-02"],
        route: { module: "Structure Practice", path: "#", status: "planned", focus: "comparing verse and refrain writing" }
      },
      {
        id: "EXL007-Q06",
        number: 6,
        commandWord: "Explain",
        prompt: "Explain one way in which the music helps to create a lullaby-like character in the refrain.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Link one musical feature to its effect.",
        modelAnswer: "The very slow tempo and rocking 6/8 metre create a gentle, soothing motion.",
        linkedExplanation: true,
        showAllMarkPoints: true,
        markPoints: [
          {
            id: "feature",
            label: "Accurate musical feature",
            acceptedAnswers: ["slow tempo", "very slow tempo", "rocking 6/8", "rocking 6/8 metre", "rocking 6/8 meter", "rocking metre", "rocking meter", "compound duple", "repeated words", "words are repeated", "repeated melody", "melody is repeated", "gentle piano", "soft piano", "restrained vocal delivery", "soft vocal delivery", "restrained dynamics"]
          },
          {
            id: "effect",
            label: "Linked lullaby-like effect",
            acceptedAnswers: ["calm effect", "calm character", "creates calm", "makes it calm", "soothing", "soothing effect", "gentle soothing motion", "gentle motion", "cradle like movement", "cradle-like movement", "hypnotic", "hypnotic effect", "reassuring", "reassuring effect", "intimate character", "soft character", "lullaby like character", "lullaby-like character"]
          }
        ],
        skills: ["music and effect", "lullaby character", "tempo", "compound duple", "repetition", "expressive character"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS4-02"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "linking musical features to character and effect" }
      },
      {
        id: "EXL007-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "Which of the following best describes the structure of the song?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Strophic", "Through-composed", "Ternary form", "12-bar blues"],
        correctChoice: "Strophic",
        acceptedAnswers: ["strophic", "strophic form"],
        modelAnswer: "Strophic",
        feedback: "The same basic musical material returns for successive verses, so the song is best described as strophic.",
        skills: ["structure", "strophic form", "song form", "repeated verse material"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS4-02"],
        route: { module: "Structure Practice", path: "#", status: "planned", focus: "identifying strophic song form" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL007 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
