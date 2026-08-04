(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL004",
    title: "Unfamiliar instrumental extract",
    subtitle: "Aural-only listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "World focus: Hindustani classical music",
    genre: "Hindustani classical music",
    performingForces: "Small instrumental ensemble",
    extractDescription: "Aural-only extract without a supplied skeleton score",
    reviewStatus: "Requires final listening QA",
    totalMarks: 10,
    maxPlays: 4,
    scoreRequired: false,
    lyricsRequired: false,
    audio: "assets/EXL004.mp3",
    score: "",
    scoreAlt: "",
    source: {
      composer: "Hindustani classical tradition",
      work: "Instrumental performance",
      movement: "Sitār and tablā extract",
      recordingSource: "User-supplied extract",
      recordingLicence: "User supplied",
      scoreLicence: "No score supplied"
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03"],
    questions: [
      {
        id: "EXL004-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Identify the melody instrument.",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Sarod", "Sārangi", "Sitār", "Santoor"],
        correctChoice: "Sitār",
        acceptedAnswers: ["sitar", "sitār"],
        modelAnswer: "Sitār",
        feedback: "The sitār is a plucked string instrument. Its resonant tone and capacity for pitch-bending are characteristic features.",
        skills: ["instrument identification", "sitār", "timbre", "Hindustani instruments"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising the timbre of the sitār" }
      },
      {
        id: "EXL004-Q02",
        number: 2,
        commandWord: "Name",
        prompt: "Name the percussion instrument.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["tabla", "tablā", "tabla drums", "pair of tabla drums"],
        modelAnswer: "Tablā",
        feedback: "The tablā consists of a pair of hand-played drums and provides the rhythmic accompaniment.",
        skills: ["instrument identification", "tablā", "percussion", "Hindustani instruments"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising the timbre of the tablā" }
      },
      {
        id: "EXL004-Q03",
        number: 3,
        commandWord: "Name",
        prompt: "What name is given to the melodic framework used in this musical tradition?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["raga", "rāga", "rag", "raag"],
        modelAnswer: "Rāga",
        feedback: "A rāga provides characteristic pitches, melodic patterns and rules which guide the performance and improvisation.",
        skills: ["rāga", "melodic framework", "Hindustani classical music", "musical terminology"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-EX-12"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "Hindustani melodic frameworks and terminology" }
      },
      {
        id: "EXL004-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Which statement best describes the roles of the two instruments in this extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: [
          "Both instruments play the same melody in unison.",
          "One instrument develops the melody, while the other provides rhythmic accompaniment.",
          "One instrument plays the melody, while the other provides block chords.",
          "Both instruments play independent contrapuntal melodies."
        ],
        correctChoice: "One instrument develops the melody, while the other provides rhythmic accompaniment.",
        modelAnswer: "One instrument develops the melody, while the other provides rhythmic accompaniment.",
        feedback: "The sitār has the principal melodic role, while the tablā supplies the rhythmic foundation.",
        skills: ["texture", "instrumental roles", "melody and accompaniment", "ensemble relationship"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "distinguishing melody from rhythmic accompaniment" }
      },
      {
        id: "EXL004-Q05",
        number: 5,
        commandWord: "Describe",
        prompt: "Describe two features of the melody.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Describe two distinct melodic features.",
        modelAnswer: "The melody is highly ornamented, with frequent pitch-bending, and short phrases are improvised and varied.",
        markingFeedbackMode: "answer-coach",
        markPoints: [
          {
            id: "ornamentation",
            label: "Ornamented or decorated melodic writing",
            explanation: "The melody is highly decorated, including ornamental figures and runs.",
            suggestion: "Describe the ornamentation or decorative runs in the melody.",
            acceptedAnswers: ["highly ornamented", "ornamented", "ornamentation", "highly decorated", "decorated", "decorated melody", "decorative melody", "decorative runs", "ornamental runs", "ornaments", "embellished", "embellishment"]
          },
          {
            id: "pitch-bending",
            label: "Pitch-bending or sliding between notes",
            explanation: "Notes are bent or joined by expressive slides between pitches.",
            suggestion: "Mention pitch-bending, slides, meend or a related term.",
            acceptedAnswers: ["pitch bending", "bends the pitch", "bent notes", "notes are bent", "sliding between pitches", "slides between pitches", "sliding notes", "slides", "glissando", "glissandi", "portamento", "meend"]
          },
          {
            id: "improvisation",
            label: "Improvised or freely moving melody",
            explanation: "The melodic line sounds improvised and moves freely rather than following a fixed Western-style tune.",
            suggestion: "State that the melody sounds improvised or moves freely.",
            acceptedAnswers: ["improvised", "improvisation", "sounds improvised", "melodic improvisation", "freely improvised", "moves freely", "line moves freely", "free moving melody", "not a fixed tune", "rather than a fixed tune"]
          },
          {
            id: "phrase-development",
            label: "Short phrases developed, varied or repeated with changes",
            explanation: "Short melodic ideas are repeated, developed and varied during the performance.",
            suggestion: "Describe how short phrases are developed, varied or repeated with changes.",
            acceptedAnswers: ["phrases are developed", "phrases developed", "melodic phrases are developed", "develops melodic phrases", "phrases are varied", "phrases varied", "melodic phrases are varied", "variation", "short ideas are repeated with changes", "short ideas repeated with changes", "phrases are repeated with changes", "phrases repeated with changes", "repeated and changed", "repeated with variation"]
          }
        ],
        nonCreditRules: [
          { id: "instrument-only", feedback: "Naming the instrument does not describe a feature of its melody.", phrases: ["it is played by a sitar", "played by a sitar", "it is a sitar", "sitar"] },
          { id: "origin-only", feedback: "Naming the tradition or country without musical detail is not credited.", phrases: ["it is Indian", "Indian music", "it is Hindustani"] },
          { id: "vague", feedback: "A vague description needs a specific melodic feature.", phrases: ["it sounds unusual", "sounds unusual", "it is fast", "sounds fast"] }
        ],
        skills: ["melodic description", "ornamentation", "pitch-bending", "improvisation", "phrase development"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "describing ornamentation and melodic development" }
      },
      {
        id: "EXL004-Q06",
        number: 6,
        commandWord: "Explain",
        prompt: "Explain the role of the percussion instrument in this extract.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Explain two aspects of its rhythmic role.",
        modelAnswer: "The tablā provides a clear rhythmic accompaniment and maintains the repeating tāla cycle beneath the improvised sitār melody.",
        showAllMarkPoints: true,
        markPoints: [
          {
            id: "rhythmic-accompaniment",
            label: "Provides rhythmic accompaniment or establishes a clear pulse.",
            explanation: "The tablā supplies the rhythm and keeps the pulse clear.",
            suggestion: "Explain that it supplies the rhythmic accompaniment or keeps the pulse.",
            acceptedAnswers: ["provides rhythmic accompaniment", "rhythmic accompaniment", "supplies the rhythm", "provides the rhythm", "provides rhythm", "keeps the pulse", "maintains the pulse", "establishes a clear pulse", "clear pulse", "keeps the beat", "provides the beat", "accompanies the sitar rhythmically", "rhythmic support"]
          },
          {
            id: "tala-cycle",
            label: "Maintains the repeating rhythmic cycle, or tāla, and supports or interacts with the sitār.",
            explanation: "The tablā articulates the tāla cycle and provides a rhythmic framework for the improvisation.",
            suggestion: "Refer to the repeating tāla cycle, rhythmic framework or interaction with the melodic performer.",
            acceptedAnswers: ["maintains the tala", "maintains tala", "tala", "repeating rhythmic cycle", "repeated rhythmic cycle", "maintains the rhythmic cycle", "articulates the rhythmic cycle", "rhythmic framework for the improvisation", "rhythmic framework for improvisation", "responds to the melodic performer", "responds to the sitar", "interacts with the sitar", "interaction with the sitar", "supports the improvisation", "supports the improvised melody"]
          }
        ],
        nonCreditRules: [
          { id: "duplicate-pulse", feedback: "Two descriptions of pulse or beat count as one point.", phrases: ["keeps the beat and provides the beat", "keeps the pulse and provides the beat"] },
          { id: "wrong-role", feedback: "The tablā does not provide the melody or harmony in this extract.", phrases: ["plays the tune", "plays the melody", "provides harmony"] }
        ],
        skills: ["tablā role", "rhythmic accompaniment", "pulse", "tāla", "performer interaction"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "tāla and rhythmic roles in Hindustani performance" }
      },
      {
        id: "EXL004-Q07",
        number: 7,
        commandWord: "Give",
        prompt: "Other than the instruments, give two features of the extract which are typical of Hindustani classical music.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Give two distinct musical features other than the instruments.",
        modelAnswer: "The performance uses improvised, highly ornamented melodic material and a repeating tāla rhythmic cycle.",
        markingFeedbackMode: "answer-coach",
        markPoints: [
          {
            id: "raga-framework",
            label: "Use of a rāga or melodic framework",
            explanation: "The performance is guided by a rāga with characteristic pitches and melodic patterns.",
            suggestion: "Refer to the rāga or melodic framework.",
            acceptedAnswers: ["raga", "rāga", "raag", "melodic framework", "raga framework"]
          },
          {
            id: "improvisation",
            label: "Melodic improvisation",
            explanation: "The melodic part is improvised rather than performed as a fixed Western-style tune.",
            suggestion: "Mention melodic improvisation.",
            acceptedAnswers: ["melodic improvisation", "improvised melody", "melody is improvised", "improvisation", "improvised", "freely improvised"]
          },
          {
            id: "ornamentation",
            label: "Highly ornamented melodic writing",
            explanation: "The melody is decorated with ornaments and runs.",
            suggestion: "Describe the ornamented or decorated melody.",
            acceptedAnswers: ["highly ornamented", "ornamented melody", "ornamentation", "decorated melody", "decorative runs", "ornamental runs", "embellished melody"]
          },
          {
            id: "pitch-bending",
            label: "Pitch-bending or sliding between pitches",
            explanation: "Expressive bends and slides connect notes in the melodic line.",
            suggestion: "Mention pitch-bending or sliding notes.",
            acceptedAnswers: ["pitch bending", "bent notes", "notes are bent", "sliding between pitches", "slides between pitches", "sliding notes", "slides", "glissando", "portamento", "meend"]
          },
          {
            id: "tala-cycle",
            label: "Use of a tāla or repeating rhythmic cycle",
            explanation: "The rhythmic accompaniment articulates a repeating tāla cycle.",
            suggestion: "Refer to the tāla or repeating rhythmic cycle.",
            acceptedAnswers: ["tala", "tāla", "repeating rhythmic cycle", "repeated rhythmic cycle", "rhythmic cycle", "cyclical rhythm"]
          },
          {
            id: "phrase-development",
            label: "Development and variation of short melodic ideas",
            explanation: "Short phrases are repeated, developed and varied.",
            suggestion: "Describe how short ideas are developed or varied.",
            acceptedAnswers: ["development of short melodic ideas", "develops short melodic ideas", "short ideas are developed", "variation of short melodic ideas", "short ideas are varied", "phrases are varied", "phrases are developed", "repeated with changes", "repeated and varied"]
          },
          {
            id: "performer-relationship",
            label: "Interaction between melody and rhythmic accompaniment",
            explanation: "The melodic and rhythmic performers interact, with the melody heard over rhythmic accompaniment.",
            suggestion: "Describe the interaction between the melody and rhythmic accompaniment.",
            acceptedAnswers: ["interaction between the melodic and rhythmic performers", "performers interact", "melodic and rhythmic performers interact", "interaction between melody and rhythm", "melody over rhythmic accompaniment", "melody over a rhythmic accompaniment", "melody performed over rhythmic accompaniment", "melody performed over a rhythmic accompaniment", "a melody performed over a rhythmic accompaniment", "melody is performed over rhythmic accompaniment", "melody is performed over a rhythmic accompaniment", "a melody is performed over a rhythmic accompaniment", "melody with rhythmic accompaniment"]
          },
          {
            id: "melody-rhythm-emphasis",
            label: "Emphasis on melody and rhythm rather than Western chord progressions",
            explanation: "The music centres on melodic and rhythmic development rather than Western functional harmony.",
            suggestion: "Contrast the emphasis on melody and rhythm with Western chord progressions.",
            acceptedAnswers: ["emphasis on melody and rhythm", "focus on melody and rhythm", "melody and rhythm rather than western chord progressions", "rather than western chord progressions", "no western chord progressions", "not based on western chords", "not based on chord progressions"]
          }
        ],
        nonCreditRules: [
          { id: "instruments", feedback: "Instruments are excluded by the question and are not credited.", phrases: ["sitar", "sitār", "tabla", "tablā", "Indian instruments"] },
          { id: "tradition-only", feedback: "Naming the tradition without a musical feature is not credited.", phrases: ["it is Hindustani music", "Hindustani music", "it is Indian"] },
          { id: "vague", feedback: "A vague comment needs supporting musical detail.", phrases: ["it is expressive", "sounds expressive", "it sounds unusual"] }
        ],
        skills: ["Hindustani style", "rāga", "tāla", "improvisation", "ornamentation", "pitch-bending", "musical evidence"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-EX-13"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising and explaining features of Hindustani classical music" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL004 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
