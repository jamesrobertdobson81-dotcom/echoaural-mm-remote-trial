(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL006",
    title: "Unfamiliar orchestral extract",
    subtitle: "Score-based listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Western classical tradition",
    genre: "Orchestral dance movement",
    performingForces: "Orchestra",
    extractDescription: "Orchestral extract with a supplied skeleton score",
    reviewStatus: "Requires final listening and score-alignment QA",
    totalMarks: 10,
    maxPlays: 4,
    scoreRequired: true,
    lyricsRequired: false,
    audio: "assets/EXL006.mp3",
    score: "assets/EXL006-skeleton-score.png",
    scoreAlt: "Skeleton score for an unfamiliar orchestral listening extract, with selected musical details removed.",
    scoreMasks: [
      { type: "blank-stave", left: 4.4, top: 69.25, width: 20.4, height: 10.59 }
    ],
    source: {
      composer: "Wolfgang Amadeus Mozart",
      work: "Symphony No. 36 in C major, K.425",
      movement: "III. Menuetto",
      recordingSource: "Tsumugi Orchestra, conducted by Takashi Inoue; Wikimedia Commons",
      recordingLicence: "CC BY 3.0; extract shortened and converted for EchoAural",
      scoreLicence: "Public-domain Breitkopf & Härtel score (1880)"
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03"],
    questions: [
      {
        id: "EXL006-Q01",
        number: 1,
        commandWord: "Write",
        prompt: "The time signature has been removed from the score. Write the missing time signature.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["3/4", "three-four", "three four", "three-four time", "three four time"],
        modelAnswer: "3/4",
        feedback: "There are three crotchet beats in each bar.",
        skills: ["time signature", "3/4", "triple metre", "score completion"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-NOT-01"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "identifying time signatures and metre" }
      },
      {
        id: "EXL006-Q02",
        number: 2,
        commandWord: "Identify",
        prompt: "Identify the rhythmic feature heard at the beginning, before bar 1.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["anacrusis", "an upbeat", "upbeat", "up-beat", "pickup", "pick-up", "pickup note", "pick-up note"],
        modelAnswer: "Anacrusis",
        feedback: "The melody begins before the first complete bar. This is an anacrusis.",
        skills: ["anacrusis", "upbeat", "rhythm", "score following"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-RHY-02"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising anacruses and incomplete opening bars" }
      },
      {
        id: "EXL006-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Which ornament features prominently in the extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Appoggiatura", "Mordent", "Trill", "Turn"],
        correctChoice: "Trill",
        modelAnswer: "Trill",
        feedback: "A rapid alternation between adjacent notes creates the prominent trill.",
        skills: ["ornamentation", "trill", "aural identification", "score following"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-ORN-01"],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "recognising ornaments" }
      },
      {
        id: "EXL006-Q04",
        number: 4,
        commandWord: "Describe",
        prompt: "Describe the change in dynamics at bar 15.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["the music suddenly becomes quieter", "suddenly becomes quieter", "sudden decrease in dynamics", "there is a sudden decrease in dynamics", "dynamics change from forte to piano", "from forte to piano", "forte to piano", "changes from loud to soft", "from loud to soft", "loud to soft", "becomes much quieter", "it becomes much quieter", "subito piano"],
        modelAnswer: "The music suddenly becomes quieter.",
        feedback: "There is a sudden contrast from the preceding loud passage to a much quieter passage.",
        skills: ["dynamics", "sudden contrast", "forte", "piano", "score following"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-DYN-01"],
        route: { module: "Dynamics Practice", path: "#", status: "planned", focus: "describing sudden dynamic contrasts" }
      },
      {
        id: "EXL006-Q05",
        number: 5,
        commandWord: "Identify",
        prompt: "The rhythm of bar 22 has been removed from the score. Which of the following completes the bar?",
        marks: 1,
        responseType: "rhythm-choice",
        options: [
          { id: "correct", pattern: ["q-ss", "crotchet", "dq-s"] },
          { id: "distractor-1", pattern: ["ssss", "crotchet", "dq-s"] },
          { id: "distractor-2", pattern: ["q-ss", "qq", "dq-s"] },
          { id: "distractor-3", pattern: ["dq-s", "crotchet", "q-ss"] }
        ],
        correctChoice: "correct",
        modelAnswer: "Quaver–semiquaver–semiquaver, crotchet, dotted quaver–semiquaver.",
        feedback: "Listen separately for the three rhythmic groups and check that the selected option fills three crotchet beats.",
        skills: ["rhythmic dictation", "quavers", "semiquavers", "dotted rhythm", "bar completion"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-RHY-03"],
        route: { module: "Melody Master", path: "../melody-master/index.html", status: "live", focus: "rhythmic dictation" }
      },
      {
        id: "EXL006-Q06",
        number: 6,
        commandWord: "Name",
        prompt: "Name the key and cadence in bars 31–32.",
        marks: 2,
        responseType: "short-text",
        markComponents: [
          { id: "key", label: "Key: C major.", acceptedAnswers: ["C major", "C maj", "C major key"] },
          { id: "cadence", label: "Cadence: perfect cadence.", acceptedAnswers: ["perfect cadence", "perfect", "V-I", "V to I", "dominant to tonic", "dominant tonic"] }
        ],
        modelAnswer: "C major; perfect cadence.",
        feedback: "The harmony moves from the dominant chord to the tonic chord in C major, producing a perfect cadence.",
        showAllMarkPoints: true,
        skills: ["key", "C major", "cadence", "perfect cadence", "V-I", "harmony"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-HAR-01", "CAM-HAR-03"],
        route: { module: "Cadence Coach", path: "#", status: "planned", focus: "identifying keys and perfect cadences" }
      },
      {
        id: "EXL006-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "Identify the type of movement.",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Cadenza", "Minuet", "Rondo", "Theme and variations"],
        correctChoice: "Minuet",
        acceptedAnswers: ["minuet", "menuet", "menuetto"],
        modelAnswer: "Minuet",
        feedback: "The regular three-beat dance metre and balanced phrasing are characteristic of a minuet.",
        skills: ["movement type", "minuet", "dance", "style recognition"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-AOS1-01"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "recognising Classical dance movements" }
      },
      {
        id: "EXL006-Q08",
        number: 8,
        commandWord: "Give",
        prompt: "Give two musical reasons for your answer to Question 7.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Give two distinct musical reasons.",
        modelAnswer: "The music has three crotchet beats in each bar and is organised into balanced, regular phrases.",
        markingFeedbackMode: "answer-coach",
        markPoints: [
          { id: "triple-metre", label: "Triple metre or three crotchet beats in each bar", explanation: "A minuet is a dance in triple metre.", suggestion: "Refer to the triple metre or three beats in each bar.", acceptedAnswers: ["triple metre", "triple meter", "3/4", "three four", "three crotchet beats in each bar", "three crotchet beats per bar", "three beats in each bar", "three beats per bar"] },
          { id: "dance-pulse", label: "Regular dance-like pulse", explanation: "The steady, regular pulse supports the dance character.", suggestion: "Describe the regular or dance-like pulse.", acceptedAnswers: ["regular dance like pulse", "regular dance-like pulse", "dance like pulse", "dance-like pulse", "regular dance pulse", "steady dance pulse", "steady pulse", "regular pulse"] },
          { id: "first-beat-emphasis", label: "Emphasis on the first beat", explanation: "The first beat of each bar is emphasised.", suggestion: "Mention the emphasis on the first beat.", acceptedAnswers: ["emphasis on the first beat", "first beat is emphasised", "first beat is emphasized", "accent on the first beat", "first beat is accented", "strong first beat"] },
          { id: "stately-tempo", label: "Moderate or stately tempo", explanation: "The moderate, stately tempo is suitable for a minuet.", suggestion: "Describe the tempo as moderate or stately.", acceptedAnswers: ["moderate tempo", "stately tempo", "moderate and stately tempo", "stately speed", "moderate speed"] },
          { id: "balanced-phrases", label: "Balanced or symmetrical phrases", explanation: "The phrases are balanced and symmetrical.", suggestion: "Refer to balanced or symmetrical phrasing.", acceptedAnswers: ["balanced phrases", "balanced phrasing", "phrases are balanced", "symmetrical phrases", "symmetrical phrasing", "phrases are symmetrical", "symmetric phrases"] },
          { id: "regular-phrasing", label: "Regular, orderly or periodic phrasing", explanation: "The music uses regular phrase lengths and periodic organisation.", suggestion: "Describe the regular phrase lengths or periodic phrasing.", acceptedAnswers: ["regular phrase lengths", "regular phrases", "regular phrasing", "orderly phrasing", "periodic phrasing", "periodic phrases", "phrases are regular"] },
          { id: "repeated-material", label: "Repeated musical material", explanation: "Musical material is repeated within the regular dance structure.", suggestion: "Mention the repeated musical material.", acceptedAnswers: ["repeated musical material", "musical material is repeated", "repeated material", "repetition of material", "music repeats", "repeated phrases"] },
          { id: "clear-cadences", label: "Clear cadences or phrases ending with cadences", explanation: "Clear cadences reinforce the balanced phrase structure.", suggestion: "Mention the clear cadences at phrase endings.", acceptedAnswers: ["clear cadences", "cadences are clear", "phrases end with cadences", "phrase ends with cadences", "cadences at the ends of phrases", "cadences at phrase endings"] }
        ],
        nonCreditRules: [
          { id: "composer", feedback: "Naming the composer is not a musical reason.", phrases: ["it is by Mozart", "Mozart"] },
          { id: "score-label", feedback: "A printed movement label is not a musical reason.", phrases: ["score says Menuetto", "says Menuetto", "Menuetto"] },
          { id: "source", feedback: "The work or performing force alone does not identify the movement type.", phrases: ["comes from a symphony", "it is a symphony", "played by an orchestra", "orchestra"] },
          { id: "vague-period", feedback: "Naming a period without musical evidence is not credited.", phrases: ["sounds Classical", "it is Classical", "Classical music"] }
        ],
        skills: ["style justification", "minuet", "triple metre", "dance pulse", "phrasing", "cadences"],
        cambridgeRequirements: ["CAM-EX-03", "CAM-EX-13", "CAM-AOS1-02"],
        route: { module: "Context & Style", path: "#", status: "planned", focus: "supporting a movement identification with musical evidence" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL006 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
