(() => {
  "use strict";

  const set = Object.freeze({
    id: "EXL005",
    title: "Unfamiliar electronic music extract",
    subtitle: "Aural-only listening question",
    board: "Cambridge",
    syllabus: "0410",
    syllabusYears: "2026–2028",
    areaOfStudy: "Popular music",
    genre: "Electronic dance music",
    performingForces: "Electronic instruments and production technology",
    extractDescription: "Aural-only extract without a supplied skeleton score",
    reviewStatus: "Requires final listening QA",
    totalMarks: 10,
    maxPlays: 4,
    scoreRequired: false,
    lyricsRequired: false,
    audio: "assets/EXL005.mp3",
    score: "",
    scoreAlt: "",
    source: {
      composer: "User-supplied recording",
      work: "Electronic dance music extract",
      movement: "Listening extract",
      recordingSource: "User-supplied extract",
      recordingLicence: "User supplied",
      scoreLicence: "No score supplied"
    },
    overarchingRequirements: ["CAM-EX-01", "CAM-EX-03"],
    questions: [
      {
        id: "EXL005-Q01",
        number: 1,
        commandWord: "Identify",
        prompt: "Which of the following is closest to the tempo of the extract?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["72 BPM", "96 BPM", "120 BPM", "144 BPM"],
        correctChoice: "144 BPM",
        modelAnswer: "144 BPM",
        feedback: "The tempo is approximately 144 BPM.",
        skills: ["tempo", "beats per minute", "pulse", "aural estimation"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "estimating tempo in beats per minute" }
      },
      {
        id: "EXL005-Q02",
        number: 2,
        commandWord: "Identify",
        prompt: "Which of the following best describes the metre?",
        marks: 1,
        responseType: "multiple-choice",
        options: ["Simple duple", "Simple triple", "Simple quadruple", "Compound duple"],
        correctChoice: "Simple quadruple",
        modelAnswer: "Simple quadruple",
        feedback: "There are four main beats in each bar and each beat divides into two.",
        skills: ["metre", "simple quadruple", "four-beat metre", "pulse"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Meter Master", path: "../meter-master/index.html", status: "live", focus: "recognising simple quadruple metre" }
      },
      {
        id: "EXL005-Q03",
        number: 3,
        commandWord: "Identify",
        prompt: "Identify the music technology technique used for the short repeated patterns.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["loop", "loops", "looping", "looped", "looped pattern", "looped patterns"],
        modelAnswer: "Loop",
        feedback: "A loop is a short recorded or programmed pattern which is repeated.",
        skills: ["music technology", "loop", "repeated pattern", "production technique"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Music Technology", path: "#", status: "planned", focus: "recognising loops and production techniques" }
      },
      {
        id: "EXL005-Q04",
        number: 4,
        commandWord: "Identify",
        prompt: "Identify the structural section from approximately 8 seconds to approximately 23 seconds.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["build up", "buildup", "build-up", "the build up"],
        modelAnswer: "Build up",
        feedback: "This section is a build up. The music develops and increases in intensity before the main section enters.",
        skills: ["structure", "build up", "EDM", "section recognition"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Structure Practice", path: "#", status: "planned", focus: "recognising build ups in electronic dance music" }
      },
      {
        id: "EXL005-Q05",
        number: 5,
        commandWord: "Identify",
        prompt: "Identify the structural event at approximately 23 seconds.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["drop", "the drop"],
        modelAnswer: "Drop",
        feedback: "The entry of the fuller and more energetic section is the drop.",
        skills: ["structure", "drop", "EDM", "structural event"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Structure Practice", path: "#", status: "planned", focus: "recognising the drop in electronic dance music" }
      },
      {
        id: "EXL005-Q06",
        number: 6,
        commandWord: "Describe",
        prompt: "Describe two ways in which the music changes from approximately 8 seconds to approximately 23 seconds.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Describe two distinct musical changes.",
        modelAnswer: "More layers are added and a rising electronic sweep increases the intensity.",
        markingFeedbackMode: "two-change",
        markPoints: [
          {
            id: "texture-layers",
            label: "The texture becomes thicker or more layers or sounds are added.",
            explanation: "The build in texture counts as one change.",
            suggestion: "Describe how the texture or number of layers changes.",
            acceptedAnswers: ["texture becomes thicker", "texture gets thicker", "thicker texture", "texture thickens", "more layers are added", "more layers added", "adds more layers", "more layers", "more sounds are added", "more sounds added", "additional sounds", "additional layers"]
          },
          {
            id: "dynamics",
            label: "The dynamics increase or the music becomes louder.",
            explanation: "Increasing dynamics and becoming louder are one change.",
            suggestion: "State that the dynamics increase or the music becomes louder.",
            acceptedAnswers: ["dynamics increase", "dynamics get louder", "dynamic level increases", "music becomes louder", "becomes louder", "gets louder", "grows louder", "louder", "volume increases", "increases in volume", "crescendo", "crescendos"]
          },
          {
            id: "intensity",
            label: "The intensity increases.",
            explanation: "The music becomes progressively more intense.",
            suggestion: "Describe the increase in intensity.",
            acceptedAnswers: ["intensity increases", "increasing intensity", "becomes more intense", "gets more intense", "more intense"]
          },
          {
            id: "rising-sweep",
            label: "A rising electronic sound is heard or the pitch or register rises.",
            explanation: "The rising electronic sweep and rising pitch or register count as one change.",
            suggestion: "Mention the rising electronic sweep, pitch or register.",
            acceptedAnswers: ["rising electronic sound", "rising electronic sweep", "rising sweep", "electronic sweep rises", "electronic sweep", "riser", "pitch rises", "rising pitch", "pitch gets higher", "register rises", "rising register", "register gets higher", "becomes higher"]
          },
          {
            id: "rhythmic-activity",
            label: "The rhythmic activity increases or the repeated patterns become more insistent.",
            explanation: "The rhythm becomes busier and the repetitions become more insistent.",
            suggestion: "Describe the increase in rhythmic activity or insistence.",
            acceptedAnswers: ["rhythmic activity increases", "increased rhythmic activity", "more rhythmic activity", "rhythm becomes busier", "busier rhythm", "rhythm gets busier", "patterns become more insistent", "repeated patterns become more insistent", "repetition becomes more insistent", "more insistent"]
          },
          {
            id: "pause-silence",
            label: "There is a pause or brief silence at the end of the passage.",
            explanation: "A short pause or silence occurs immediately before the next section.",
            suggestion: "Mention the pause or brief silence at the end.",
            acceptedAnswers: ["pause", "brief pause", "short pause", "brief silence", "short silence", "moment of silence", "music stops briefly", "stops briefly", "brief gap"]
          }
        ],
        nonCreditRules: [
          { id: "tempo", feedback: "A faster tempo or accelerando is not heard and is not credited.", phrases: ["tempo becomes faster", "tempo gets faster", "accelerando", "accelerates", "speeds up"] },
          { id: "labels", feedback: "Naming a structural section does not describe how the music changes.", phrases: ["music becomes EDM", "becomes EDM", "drop begins", "the drop begins", "it builds up", "builds up"] },
          { id: "vague", feedback: "A vague response needs a specific musical change.", phrases: ["it becomes exciting", "becomes exciting", "it changes", "music changes"] }
        ],
        skills: ["musical change", "texture", "dynamics", "intensity", "electronic sweep", "rhythmic activity", "silence"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "describing changes in texture and musical layers" }
      },
      {
        id: "EXL005-Q07",
        number: 7,
        commandWord: "Identify",
        prompt: "Identify the structural section beginning at approximately 62 seconds.",
        marks: 1,
        responseType: "short-text",
        acceptedAnswers: ["breakdown", "break down", "the breakdown"],
        modelAnswer: "Breakdown",
        feedback: "This is a breakdown. The texture and rhythmic intensity are reduced.",
        skills: ["structure", "breakdown", "EDM", "section recognition"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Structure Practice", path: "#", status: "planned", focus: "recognising breakdowns in electronic dance music" }
      },
      {
        id: "EXL005-Q08",
        number: 8,
        commandWord: "Compare",
        prompt: "Compare the texture at approximately 30 seconds with the texture at approximately 65 seconds.",
        marks: 2,
        responseType: "extended-text",
        placeholder: "Make two paired comparisons between the passages.",
        modelAnswer: "At 30 seconds the texture is thick and layered, with full electronic percussion. At 65 seconds it is thinner, with fewer layers and reduced percussion.",
        markingFeedbackMode: "paired-comparison",
        firstPassageMarkers: ["30 seconds", "30 second", "30 sec", "30 secs", "30s", "at 30", "first passage", "first section", "first extract"],
        secondPassageMarkers: ["65 seconds", "65 second", "65 sec", "65 secs", "65s", "at 65", "second passage", "second section", "second extract"],
        incompleteComparisonFeedback: "Each point must compare both passages; a description of only one passage is not credited.",
        pairedComparisonPoints: [
          {
            id: "density-layers",
            label: "Thicker or more layered at 30 seconds; thinner or more sparse at 65 seconds",
            explanation: "The first passage has greater textural density and more simultaneous layers.",
            suggestion: "Compare the number of layers or overall textural density in both passages.",
            firstPassageAnswers: ["thicker", "thick texture", "thick and layered", "more layered", "layered texture", "more layers", "more sounds", "more sounds simultaneously", "sounds are heard simultaneously", "fuller texture", "dense texture"],
            secondPassageAnswers: ["thinner", "thin texture", "more sparse", "sparser", "sparse texture", "fewer layers", "fewer sounds", "less layered", "reduced texture"],
            directComparisons: ["texture is thicker at 30 seconds than at 65 seconds", "texture is more layered at 30 seconds than at 65 seconds", "more layers at 30 seconds than at 65 seconds", "more sounds at 30 seconds than at 65 seconds"]
          },
          {
            id: "percussion-layer",
            label: "Fuller percussion at 30 seconds; reduced percussion at 65 seconds",
            explanation: "The electronic percussion layer is fuller in the first passage and reduced in the second.",
            suggestion: "Compare the percussion layer in both passages.",
            firstPassageAnswers: ["percussion layer is fuller", "fuller percussion", "full percussion", "full electronic percussion", "more percussion"],
            secondPassageAnswers: ["percussion is reduced", "reduced percussion", "less percussion", "percussion layer is reduced", "lighter percussion"],
            directComparisons: ["percussion is fuller at 30 seconds than at 65 seconds", "more percussion at 30 seconds than at 65 seconds"]
          },
          {
            id: "rhythmic-activity",
            label: "Rhythmically busier at 30 seconds; less active at 65 seconds",
            explanation: "The first passage contains greater rhythmic activity.",
            suggestion: "Compare the rhythmic activity in both passages.",
            firstPassageAnswers: ["rhythmically busier", "busier rhythm", "more rhythmic activity", "rhythmic activity is greater", "more active rhythm"],
            secondPassageAnswers: ["less active", "less rhythmic activity", "rhythmically less active", "less busy", "reduced rhythmic activity"],
            directComparisons: ["rhythmically busier at 30 seconds than at 65 seconds", "more rhythmic activity at 30 seconds than at 65 seconds"]
          },
          {
            id: "bass-percussion-exposure",
            label: "Fuller bass-and-percussion texture at 30 seconds; more exposed at 65 seconds",
            explanation: "The fuller bass and percussion make the first passage denser, while the second sounds more exposed.",
            suggestion: "Compare the bass-and-percussion texture with the exposed sound at 65 seconds.",
            firstPassageAnswers: ["fuller bass and percussion texture", "full bass and percussion", "bass and percussion are fuller", "strong bass and percussion"],
            secondPassageAnswers: ["more exposed", "sound is more exposed", "exposed texture", "more exposed texture"],
            directComparisons: ["bass and percussion are fuller at 30 seconds than at 65 seconds"]
          },
          {
            id: "high-frequency-layers",
            label: "More high-frequency layers at 30 seconds; less bright at 65 seconds",
            explanation: "The additional high-frequency layers make the first passage sound brighter.",
            suggestion: "Compare the high-frequency layers or brightness in both passages.",
            firstPassageAnswers: ["more high frequency layers", "more high frequency sounds", "more high frequencies", "brighter", "brighter sound"],
            secondPassageAnswers: ["less bright", "darker", "fewer high frequency layers", "fewer high frequency sounds", "less high frequency content"],
            directComparisons: ["more high frequency layers at 30 seconds than at 65 seconds", "brighter at 30 seconds than at 65 seconds"]
          }
        ],
        nonCreditRules: [
          { id: "dynamics-only", feedback: "A difference in dynamics alone is not credited because the question asks about texture.", phrases: ["louder", "quieter", "dynamics", "dynamic level", "volume"] }
        ],
        skills: ["texture comparison", "layering", "percussion", "rhythmic activity", "bass", "frequency", "paired comparison"],
        cambridgeRequirements: ["CAM-EX-03"],
        route: { module: "Texture Trainer", path: "../texture-trainer/index.html", status: "live", focus: "making paired comparisons of contrasting textures" }
      }
    ]
  });

  window.EXAM_LAB_QUESTION_SETS = window.EXAM_LAB_QUESTION_SETS || {};
  window.EXAM_LAB_QUESTION_SETS.EXL005 = set;
  window.EXAM_LAB_QUESTION_SET = set;
})();
