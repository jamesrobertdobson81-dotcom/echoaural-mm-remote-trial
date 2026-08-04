(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL003",
    title: "Unfamiliar orchestral extract",
    subtitle: "Listening question with a supplied score",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Music in the nineteenth century",
    genre: "Romantic orchestral programme music",
    performingForces: "Orchestra",
    extractDescription: "Supplied 24-bar extract beginning around the first principal climax",
    reviewStatus: "Requires final listening and score-alignment QA",
    totalMarks: 10,
    maxPlays: 4,
    scoreRequired: true,
    lyricsRequired: false,
    audio: "assets/EXL003.mp3",
    score: "assets/EXL003-skeleton-score.png",
    scoreAlt: "Supplied 24-bar skeleton score for an orchestral extract, with numbered systems and neutral question prompts.",
    source: {
      composer: "Edvard Grieg",
      work: "Peer Gynt Suite No. 1, Op. 46",
      movement: "IV. In the Hall of the Mountain King",
      recordingSource: "User-supplied extract",
      recordingLicence: "User supplied",
      scoreLicence: "User-supplied skeleton score"
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03"],
    questions: [
      {
        id: "EXL003-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "What key is the music in at the beginning?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["B minor", "B min", "Bm", "B minor key"],
        modelAnswer: "B minor",
        feedback: "The extract begins in B minor.",
        skills: ["key", "tonality", "minor key", "aural recognition", "score reading"],
        cambridgeRequirements: ["CAM-EX-04", "CAM-NOT-01"],
        route: { module: "Melodic Intervals", path: "../melodic-intervals/index.html", status: "live", focus: "minor keys and tonal recognition" }
      },
      {
        id: "EXL003-Q02",
        number: 2,
        commandWord: "Identify",
        prompt: "Which best describes the metre of this extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Simple Duple", "Common", "Compound", "Irregular"],
        correctChoice: "Common",
        modelAnswer: "Common",
        feedback: "The music is in 4/4, which is also known as common time.",
        skills: ["metre", "4/4", "common time", "pulse"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising 4/4 and common time" }
      },
      {
        id: "EXL003-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Which playing technique is used by the lower strings at the beginning?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["Pizzicato"],
        acceptMisspellings: true,
        maxEditDistance: 2,
        modelAnswer: "Pizzicato",
        feedback: "The lower strings pluck the notes rather than playing them with the bow.",
        skills: ["pizzicato", "string technique", "playing technique", "timbre", "articulation"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "recognising orchestral string techniques" }
      },
      {
        id: "EXL003-Q05",
        number: 4,
        commandWord: "Identify",
        prompt: "Which articulation is used frequently in the extract?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["accent", "accents", "accented", "accented notes", "accent marks", "strongly accented"],
        modelAnswer: "Accents",
        feedback: "Accents are used frequently, giving the music a forceful and emphatic character.",
        skills: ["articulation", "accents", "expressive markings", "emphasis", "aural recognition", "score recognition"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising articulation and expressive markings" }
      },
      {
        id: "EXL003-Q06",
        number: 5,
        commandWord: "Identify",
        prompt: "Which family of instruments plays the melody in bar 13?",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["woodwind", "woodwinds", "woodwind family", "the woodwind", "the woodwind family", "woodwind instruments"],
        modelAnswer: "Woodwind",
        feedback: "The melody in bar 13 is played by instruments from the woodwind family.",
        skills: ["instrument family", "woodwind", "orchestration", "score following", "bar reference", "aural identification"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-INS-01"],
        route: { module: "Instrument Identifier", path: "../instrument-identifier/index.html", status: "live", focus: "identifying orchestral instrument families" }
      },
      {
        id: "EXL003-Q07",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe how the tempo and dynamics change during the extract.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Describe both changes.",
        modelAnswer: "Tempo: becomes faster / accelerates. Dynamics: becomes louder / crescendos.",
        showAllMarkPoints: true,
        markPoints: [
          {
            id: "tempo-increase",
            label: "Tempo: becomes faster / accelerates.",
            explanation: "The tempo increases progressively.",
            suggestion: "State that the tempo becomes faster or accelerates.",
            acceptedAnswers: ["becomes faster", "gets faster", "get faster", "faster", "speeds up", "speed up", "speeding up", "accelerates", "accelerate", "accelerando", "increases in tempo", "increase in tempo", "tempo increases", "becomes progressively quicker", "progressively quicker", "becomes quicker", "gets quicker"]
          },
          {
            id: "dynamic-increase",
            label: "Dynamics: becomes louder / crescendos.",
            explanation: "The dynamic level increases progressively.",
            suggestion: "State that the music becomes louder or crescendos.",
            acceptedAnswers: ["becomes louder", "gets louder", "get louder", "louder", "crescendos", "crescendo", "increases in dynamic level", "increase in dynamic level", "dynamic level increases", "dynamics increase", "increases in volume", "increase in volume", "volume increases", "grows louder", "grow louder", "progressively louder"]
          }
        ],
        skills: ["tempo", "accelerando", "dynamics", "crescendo", "musical development", "aural description"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising changes in tempo and pulse" }
      },
      {
        id: "EXL003-Q08",
        number: 7,
        commandWord: "Identify",
        prompt: "During which musical period was this piece written?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Baroque", "Classical", "Romantic", "Modern"],
        correctChoice: "Romantic",
        modelAnswer: "Romantic",
        feedback: "The music was written during the Romantic period.",
        skills: ["period", "Romantic", "nineteenth-century music", "style recognition", "context"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-AOS3-01"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "Romantic style recognition" }
      },
      {
        id: "EXL003-Q09",
        number: 8,
        commandWord: "Give",
        prompt: "Give two musical reasons for your answer to Question 7.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Write two distinct musical reasons.",
        modelAnswer: "For example: colourful orchestration; an extended crescendo; an accelerando; a fuller orchestral texture; a higher register; strong accents; or a repeated motif developed through the orchestra.",
        markingFeedbackMode: "answer-coach",
        markPoints: [
          {
            id: "orchestral-colour",
            label: "Colourful or varied orchestration",
            explanation: "The varied instrumental colours and timbres are characteristic of Romantic orchestral writing.",
            suggestion: "Comment on the colourful or varied orchestration.",
            acceptedAnswers: ["colourful orchestration", "colorful orchestration", "orchestration is colourful", "orchestration is colorful", "varied orchestration", "varied use of orchestral instruments", "orchestral colour", "orchestral color", "instrumental colour", "instrumental color", "prominent orchestral colour", "prominent orchestral color", "changing instrumental colours", "changing instrumental colors", "range of timbres", "orchestral timbre"]
          },
          {
            id: "expressive-dynamics",
            label: "Dramatic or expressive dynamics",
            explanation: "The large dynamic growth and contrasts create the expressive scale associated with Romantic music.",
            suggestion: "Describe the crescendo or another dramatic dynamic change.",
            acceptedAnswers: ["dramatic changes in dynamics", "dramatic dynamic changes", "large crescendo", "extended crescendo", "crescendo", "crescendos", "becomes louder", "gets louder", "grows louder", "expressive dynamics", "dramatic contrasts", "wide dynamic range", "large dynamic range"]
          },
          {
            id: "changing-tempo",
            label: "Changing tempo or accelerando",
            explanation: "The gradual increase in speed is an expressive Romantic device.",
            suggestion: "Describe the accelerando or gradual increase in speed.",
            acceptedAnswers: ["changing tempo", "tempo changes", "accelerando", "accelerates", "speeds up", "speeding up", "becomes faster", "gets faster", "faster", "gradual increase in speed", "progressively faster", "progressively quicker"]
          },
          {
            id: "orchestral-growth",
            label: "Thickening orchestral sound",
            explanation: "The increasingly full orchestral texture creates a dramatic Romantic build-up.",
            suggestion: "Explain that more instruments join or the orchestra becomes fuller.",
            acceptedAnswers: ["gradual thickening", "thickening of the orchestral sound", "orchestral sound thickens", "increasingly full orchestration", "dramatic orchestral build up", "orchestral build up", "orchestra builds up", "more instruments gradually join", "more instruments join", "instruments gradually join", "orchestra becomes fuller", "orchestration becomes fuller", "instruments are added", "layering instruments"]
          },
          {
            id: "higher-register",
            label: "Movement into a higher register",
            explanation: "The rising register intensifies the expressive and dramatic character.",
            suggestion: "Comment on the movement into a higher register.",
            acceptedAnswers: ["higher register", "moves into a higher register", "movement into a higher register", "moves higher", "higher pitch range"]
          },
          {
            id: "forceful-accents",
            label: "Forceful or strong accents",
            explanation: "The emphatic articulation heightens the drama of the orchestral writing.",
            suggestion: "Mention the forceful or strongly accented articulation.",
            acceptedAnswers: ["forceful accents", "strong accents", "strongly accented", "forceful articulation", "strong articulation", "accented articulation", "use of accents", "accents make it more dramatic", "accents"]
          },
          {
            id: "melodic-repetition",
            label: "Repeated melody or motif",
            explanation: "The repeated material is intensified to build tension and atmosphere.",
            suggestion: "Explain how the repeated melody or motif builds tension.",
            acceptedAnswers: ["repeated melodic material", "repeated melody", "melody is repeated", "repeated tune", "tune is repeated", "repeated motif", "motif is repeated", "short melody repeated", "short motif repeated", "repeated tune becomes more intense"]
          },
          {
            id: "motif-development",
            label: "Motif developed through orchestration",
            explanation: "Developing a short motif through changing orchestral colour is characteristic of Romantic programme music.",
            suggestion: "Describe how the short motif is developed or passed through the orchestra.",
            acceptedAnswers: ["short motif developed", "motif developed through changes in orchestration", "melody is passed between different orchestral instruments", "passed between different orchestral instruments", "passed through the orchestra", "passed around the orchestra", "melody passes through the orchestra"]
          },
          {
            id: "large-orchestral-sound",
            label: "Large orchestral sound",
            explanation: "The scale and weight of the orchestral sound support the Romantic-period style.",
            suggestion: "Comment on the large or powerful orchestral sound.",
            acceptedAnswers: ["large orchestral sound", "large orchestra", "full orchestral sound", "powerful orchestral sound"]
          }
        ],
        nonCreditRules: [
          { id: "historical", feedback: "Historical information without musical evidence is not credited.", phrases: ["it is Romantic", "Grieg was a Romantic composer", "composed in the nineteenth century", "written in the nineteenth century", "it is old", "Peer Gynt", "In the Hall of the Mountain King"] },
          { id: "unsupported-programme", feedback: "A story, scene, atmosphere or programme-music claim needs a supporting musical feature.", phrases: ["it tells a story", "tells a story", "programme music", "program music", "creates a scene", "creates atmosphere", "creates an atmosphere"] },
          { id: "vague-instruments", feedback: "A vague reference to instruments needs a specific musical observation.", phrases: ["the instruments"], exactOnly: true },
          { id: "vague-dynamics", feedback: "A vague reference to dynamics needs a specific description.", phrases: ["the dynamics"], exactOnly: true },
          { id: "negated-evidence", feedback: "Negated or opposite musical evidence is not credited.", phrases: ["there is no crescendo", "does not speed up", "doesn't speed up", "orchestra becomes smaller", "music becomes less dramatic"] }
        ],
        skills: ["Romantic style", "musical evidence", "orchestration", "dynamics", "tempo", "articulation", "programme music", "feature-plus-evidence writing"],
        cambridgeRequirements: ["CAM-EX-12", "CAM-EX-13", "CAM-AOS3-01", "CAM-AOS3-02"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "feature-plus-evidence writing for Romantic music" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL003 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
