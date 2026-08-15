(function initTextureQuestionSystem(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EchoAuralTextureQuestionSystem = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function createTextureQuestionSystem() {
  const LEVELS = ["Foundation", "Developing", "Securing", "Mastering"];
  const RESPONSE_TYPES = ["multiple-choice", "short-text", "extended-text"];
  const BASIC_TEXTURE_CHOICES = ["Monophonic", "Homophonic", "Polyphonic"];
  const DEVELOPING_CHOICES = [
    "Monophonic",
    "Unison",
    "Octaves",
    "Homophonic",
    "Melody and accompaniment",
    "Chordal",
    "Homorhythmic",
    "Polyphonic",
    "Contrapuntal",
    "Imitative",
    "Canon",
    "Call and response",
    "Antiphonal",
    "Heterophonic"
  ];
  const DISTINCT_TEXTURE_TERMS = new Set([
    "monophonic",
    "monophony",
    "homophonic",
    "homophony",
    "polyphonic",
    "polyphony",
    "heterophonic",
    "heterophony",
    "contrapuntal",
    "counterpoint",
    "imitative",
    "imitation",
    "fugal",
    "fugue",
    "canon",
    "canonic",
    "unison",
    "octaves",
    "chordal",
    "homorhythmic",
    "homorhythm"
  ]);
  const NUMBER_WORDS = {
    0: "zero",
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five"
  };

  function normaliseText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b([0-5])\b/g, (_, number) => NUMBER_WORDS[number] || number)
      .replace(/[-–—]/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayText(value) {
    return String(value || "")
      .replace(/\(\d+(?:\.\d+)?\)/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[.;:,\s]+$/, "");
  }

  function unique(items) {
    const seen = new Set();
    return items
      .map(displayText)
      .filter(Boolean)
      .filter((item) => {
        const key = normaliseText(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function numericQuestionId(question = {}, fallback = 0) {
    const match = String(question.id || "").match(/\d+/);
    return match ? Number(match[0]) : Number(fallback) || 0;
  }

  function getQuestionLevel(question = {}) {
    const explicitLevel = String(question.level || "").trim();
    if (LEVELS.includes(explicitLevel)) return explicitLevel;

    const marks = Number(question.maxMarks) || 1;
    const text = normaliseText([
      question.type,
      question.marksType,
      question.target,
      question.title,
      question.prompt,
      question.modelAnswer
    ].filter(Boolean).join(" "));
    const questionNumber = numericQuestionId(question);

    if (marks >= 2) {
      if (/describe two|two ways|two features|contrasting|built during|fugal build|homophonic and imitative|thin to thick/.test(text)) {
        return "Mastering";
      }
      return "Securing";
    }

    if (questionNumber >= 19 && /fugue|fugal|polyphonic|contrapuntal|subject enters|successive voices|textural device/.test(text)) {
      return "Developing";
    }

    return "Foundation";
  }

  function normaliseResponseType(value) {
    const clean = String(value || "").trim();
    if (RESPONSE_TYPES.includes(clean)) return clean;
    return "";
  }

  function inferResponseType(question = {}, index = 0) {
    const explicit = normaliseResponseType(question.responseType);
    if (explicit) return explicit;

    const level = getQuestionLevel(question);
    const numericId = numericQuestionId(question, index + 1);
    const maxMarks = Number(question.maxMarks) || 1;

    if (level === "Foundation") return "multiple-choice";
    if (level === "Developing") return numericId % 4 === 0 ? "short-text" : "multiple-choice";
    if (level === "Securing") return numericId % 4 === 0 ? "multiple-choice" : "short-text";
    if (level === "Mastering") return maxMarks <= 1 || numericId % 10 <= 2 ? "short-text" : "extended-text";
    return "short-text";
  }

  function questionText(question = {}) {
    return normaliseText([
      question.broadTextureCategory,
      question.specificTextureTerm,
      question.preferredAnswer,
      question.correctChoice,
      question.target,
      question.type,
      question.marksType,
      question.textureFocus,
      question.clipType,
      question.title,
      question.prompt,
      question.modelAnswer,
      ...(Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [])
    ].filter(Boolean).join(" "));
  }

  function inferSpecificTerm(question = {}) {
    const code = String([
      question.specificTextureTerm,
      question.type,
      question.marksType,
      question.clipType
    ].filter(Boolean).join(" ")).toUpperCase();
    if (code.includes("MONOPHONIC")) return "Monophonic";
    if (code.includes("HOMOPHONIC_MELODY_ACCOMPANIMENT")) return "Melody and accompaniment";
    if (code.includes("MELODY AND ACCOMPANIMENT")) return "Melody and accompaniment";
    if (code.includes("HOMOPHONIC_CHORDAL")) return "Chordal homophony";
    if (code.includes("CHORDAL") || code.includes("HOMORHYTHMIC")) return "Chordal homophony";
    if (code.includes("CANONIC")) return "Canon";
    if (code.includes("CANON") || code.includes("ROUND")) return "Canon";
    if (code.includes("IMITATIVE")) return "Imitative texture";
    if (code.includes("BASIC IMITATION")) return "Imitative texture";
    if (code.includes("FUGAL")) return "Fugal imitation";
    if (code.includes("FUGUE")) return "Fugal imitation";
    if (code.includes("POLYPHONIC")) return "Polyphonic";
    if (code.includes("COUNTERM") || code.includes("COUNTERPOINT") || code.includes("DENSE COUNTERPOINT")) return "Polyphonic";
    if (code.includes("HETEROPHONIC")) return "Heterophonic";
    if (code.includes("ANTIPHONAL")) return "Antiphonal";
    if (code.includes("DRONE")) return "Drone";
    if (code.includes("LAYERED")) return "Layered texture";
    if (code.includes("SOLO AND TUTTI")) return "Solo and tutti";
    if (code.includes("CHANGE IN TEXTURE")) return "Layered texture";
    if (code.includes("PARALLEL")) return "Parallel motion";
    if (code.includes("HOMOPHONIC")) return "Homophonic";
    const text = questionText(question);
    if (/heterophonic|heterophony|decorated versions|shared melodic/.test(text)) return "Heterophonic";
    if (/canon|canonic|round/.test(text)) return "Canon";
    if (/fugue|fugal/.test(text)) return "Fugal imitation";
    if (/call and response|antiphonal|antiphony/.test(text)) return "Antiphonal";
    if (/drone|sustained pitch|pedal/.test(text)) return "Drone";
    if (/parallel motion|similar motion/.test(text)) return "Parallel motion";
    if (/solo and tutti|solo to tutti|concertino|ripieno|soloist with orchestra/.test(text)) return "Solo and tutti";
    if (/layered|layers are added|textural thickening|texture thickens/.test(text)) return "Layered texture";
    if (/monophonic|single melodic line|one unaccompanied|one melodic line|solo line|no accompaniment|without accompaniment/.test(text)) return "Monophonic";
    if (/melody and accompaniment|melody with accompaniment|accompanied melody|principal melody supported|main melody supported|subordinate accompaniment|repeated accompaniment/.test(text)) {
      return "Melody and accompaniment";
    }
    if (/homorhythmic|homorhythm/.test(text)) return "Homorhythmic";
    if (/chordal|block chords|move together rhythmically|moving in chords|form chords/.test(text)) return "Chordal homophony";
    if (/imitative|imitation|subject entries|same idea enters/.test(text)) return "Imitative texture";
    if (/polyphonic|contrapuntal|counterpoint|independent melodic lines|overlapping melodic lines/.test(text)) return "Polyphonic";
    if (/unison|octaves/.test(text)) return text.includes("octave") ? "Octaves" : "Unison";
    if (/homophonic|principal idea supported|supporting parts/.test(text)) return "Homophonic";
    return displayText(question.target || question.title || "Texture");
  }

  function inferBroadCategory(question = {}) {
    const specific = question.specificTextureTerm || inferSpecificTerm(question);
    if (["Polyphonic", "Fugal imitation", "Imitative texture", "Canon"].some((term) => sameAnswer(term, specific))) return "Polyphonic";
    if (["Melody and accompaniment", "Chordal homophony", "Homorhythmic", "Homophonic"].some((term) => sameAnswer(term, specific))) return "Homophonic";
    if (["Monophonic", "Unison", "Octaves"].some((term) => sameAnswer(term, specific))) return "Monophonic";
    if (sameAnswer(specific, "Heterophonic")) return "Heterophonic";
    if (["Antiphonal", "Drone", "Parallel motion", "Solo and tutti", "Layered texture"].some((term) => sameAnswer(term, specific))) return "Texture feature";
    const text = questionText(question);
    if (/monophonic|single melodic line|one unaccompanied|unison|octaves|solo line/.test(text)) return "Monophonic";
    if (/homophonic|homorhythmic|chordal|melody and accompaniment|accompaniment|principal idea supported/.test(text)) return "Homophonic";
    if (/polyphonic|contrapuntal|counterpoint|fugal|fugue|imitative|canon|independent melodic lines/.test(text)) return "Polyphonic";
    if (/heterophonic|heterophony/.test(text)) return "Heterophonic";
    return inferSpecificTerm(question);
  }

  function getPreferredAnswer(question = {}) {
    return displayText(
      question.preferredAnswer ||
      question.correctChoice ||
      question.specificTextureTerm ||
      inferSpecificTerm(question) ||
      question.modelAnswer
    );
  }

  function splitPhrases(value) {
    if (Array.isArray(value)) return value.flatMap(splitPhrases);
    return String(value || "")
      .split(/[;|/]/)
      .map(displayText)
      .filter(Boolean);
  }

  function textureAnswerFamily(value) {
    const text = normaliseText(value);
    if (!text) return "";
    if (/^(monophonic|monophony)$/.test(text)) return "monophonic";
    if (/^(one )?single unaccompanied (melody|melodic) line$/.test(text)) return "monophonic";
    if (/^(a )?(single|one) (melodic )?line$/.test(text)) return "monophonic";
    if (/^(a )?(single|one) melody$/.test(text)) return "monophonic";
    if (/^(a )?(single|one) part$/.test(text)) return "monophonic";
    if (/^solo (line|melody)$/.test(text)) return "monophonic";
    if (/^unaccompanied (melody|melodic line)$/.test(text)) return "monophonic";
    if (/^no accompaniment$|^without accompaniment$/.test(text)) return "monophonic";
    if (/^(homophonic|homophony)$/.test(text)) return "homophonic";
    if (/melody.*accompaniment|accompanied melody|tune.*(accompaniment|backing)|main (melody|tune).*chords/.test(text)) return "melody-accompaniment";
    if (/chordal|homorhythmic|homorhythm|block chords|same rhythm|move together/.test(text)) return "chordal";
    if (/^(polyphonic|polyphony|contrapuntal|counterpoint)$/.test(text)) return "polyphonic";
    if (/independent (parts|melodies|lines)|several melodies|multiple melodies|interweaving|overlapping/.test(text)) return "polyphonic";
    if (/^(imitative|imitation|canon|canonic)$/.test(text)) return "imitative";
    if (/part (copies|imitates|follows)|melody is copied|successive entries/.test(text)) return "imitative";
    if (/fugue|fugal|subject entries|answer entries/.test(text)) return "fugal";
    if (/unison/.test(text)) return "unison";
    if (/octave/.test(text)) return "octaves";
    if (/call and response|antiphonal|antiphony|alternates|answering phrases/.test(text)) return "antiphonal";
    if (/heterophonic|heterophony/.test(text)) return "heterophonic";
    if (/drone|sustained pitch|pedal/.test(text)) return "drone";
    if (/layered|layers? (are )?added|textural thickening|texture thickens|gets thicker|becomes thicker/.test(text)) return "layered-texture";
    if (/solo and tutti|solo to tutti|concertino|ripieno/.test(text)) return "solo-and-tutti";
    if (/parallel motion|similar motion/.test(text)) return "parallel-motion";
    return "";
  }

  function acceptedChoiceEquivalents(question = {}, correctChoice = "") {
    return unique([
      correctChoice,
      question.preferredAnswer,
      question.correctChoice,
      question.specificTextureTerm,
      ...(Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : []),
      ...(Array.isArray(question.markPoints)
        ? question.markPoints.flatMap((markPoint) => markPoint.acceptedAnswers || [])
        : [])
    ]);
  }

  function isChoiceEquivalentToCorrect(choice = "", question = {}, correctChoice = "") {
    const answerEquivalents = acceptedChoiceEquivalents(question, correctChoice);
    const choiceFamily = textureAnswerFamily(choice);
    return answerEquivalents.some((answer) => (
      sameAnswer(choice, answer) ||
      (choiceFamily && choiceFamily === textureAnswerFamily(answer))
    ));
  }

  function buildAcceptedWrittenAnswers(question = {}) {
    const preferred = getPreferredAnswer(question);
    const accepted = unique([
      preferred,
      question.correctChoice,
      question.specificTextureTerm,
      ...splitPhrases(question.acceptedWrittenAnswers),
      ...splitPhrases(question.acceptedAnswers),
      ...splitPhrases(question.answerOptions),
      ...splitPhrases(question.choices)
    ]);
    const specificPreferred = !BASIC_TEXTURE_CHOICES.some((choice) => sameAnswer(choice, preferred));
    if (!specificPreferred) return accepted;
    return accepted.filter((answer) => !BASIC_TEXTURE_CHOICES.some((choice) => sameAnswer(choice, answer)));
  }

  function bestExistingChoice(question = {}, preferred = "") {
    const choices = unique([
      ...splitPhrases(question.answerChoices),
      ...splitPhrases(question.choices),
      ...splitPhrases(question.answerOptions)
    ]);
    if (!choices.length) return "";

    const targetText = normaliseText([
      preferred,
      question.correctChoice,
      question.modelAnswer,
      ...(Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [])
    ].filter(Boolean).join(" "));

    let best = "";
    let bestScore = 0;
    choices.forEach((choice) => {
      const tokens = normaliseText(choice).split(" ").filter(Boolean);
      const score = tokens.reduce((total, token) => total + (targetText.includes(token) ? 1 : 0), 0);
      if (score > bestScore) {
        best = choice;
        bestScore = score;
      }
    });

    return bestScore > 0 ? best : "";
  }

  function getCorrectChoice(question = {}) {
    const preferred = getPreferredAnswer(question);
    if (question.correctChoice) return displayText(question.correctChoice);
    if (getQuestionLevel(question) === "Foundation") {
      const broad = inferBroadCategory(question);
      if (BASIC_TEXTURE_CHOICES.includes(broad)) return broad;
    }
    return bestExistingChoice(question, preferred) || preferred;
  }

  function plausibleDistractors(question = {}, correctChoice = "") {
    const level = getQuestionLevel(question);
    const broad = question.broadTextureCategory || inferBroadCategory(question);
    const specific = question.specificTextureTerm || inferSpecificTerm(question);
    const base = level === "Foundation" ? BASIC_TEXTURE_CHOICES : DEVELOPING_CHOICES;
    const custom = [];

    if (broad === "Homophonic") custom.push("Polyphonic", "Monophonic", "Melody and accompaniment", "Chordal", "Homorhythmic");
    if (broad === "Polyphonic") custom.push("Homophonic", "Monophonic", "Contrapuntal", "Imitative", "Canon");
    if (broad === "Monophonic") custom.push("Homophonic", "Polyphonic", "Unison", "Octaves");
    if (specific === "Heterophonic") custom.push("Homophonic", "Polyphonic", "Melody and accompaniment", "Antiphonal");
    if (specific === "Drone") custom.push("Pedal", "Melody and accompaniment", "Ostinato", "Unison");
    if (specific === "Antiphonal") custom.push("Call and response", "Imitative", "Homophonic", "Polyphonic");
    if (specific === "Layered texture") custom.push("Homophonic", "Polyphonic", "Melody and accompaniment", "Drone");
    if (specific === "Solo and tutti") custom.push("Melody and accompaniment", "Antiphonal", "Unison", "Polyphonic");
    if (specific === "Parallel motion") custom.push("Similar motion", "Contrapuntal", "Homorhythmic", "Canon");

    return unique([...custom, ...base]).filter((choice) => !isChoiceEquivalentToCorrect(choice, question, correctChoice));
  }

  function getAnswerChoices(question = {}) {
    const responseType = inferResponseType(question);
    if (responseType !== "multiple-choice") return [];

    const level = getQuestionLevel(question);
    const correctChoice = getCorrectChoice(question);
    const existing = unique([
      ...splitPhrases(question.answerChoices),
      ...splitPhrases(question.choices),
      ...splitPhrases(question.answerOptions)
    ]);
    const limit = level === "Foundation" ? 3 : 4;

    if (question.lockAnswerOptions && existing.length) return existing.slice(0, limit);

    const source = existing.length && existing.some((choice) => sameAnswer(choice, correctChoice))
      ? existing
      : [];

    return unique([
      correctChoice,
      ...source.filter((choice) => !isChoiceEquivalentToCorrect(choice, question, correctChoice)),
      ...plausibleDistractors(question, correctChoice)
    ]).slice(0, limit);
  }

  function shuffleChoices(choices = []) {
    const shuffled = choices.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function normaliseQuestion(question = {}, index = 0) {
    const level = getQuestionLevel(question);
    const responseType = inferResponseType({ ...question, level }, index);
    const preferredAnswer = getPreferredAnswer(question);
    const broadTextureCategory = question.broadTextureCategory || inferBroadCategory(question);
    const specificTextureTerm = question.specificTextureTerm || inferSpecificTerm(question);
    const correctChoice = getCorrectChoice({ ...question, level, preferredAnswer, broadTextureCategory, specificTextureTerm, responseType });
    const normalised = {
      ...question,
      level,
      responseType,
      preferredAnswer,
      broadTextureCategory,
      specificTextureTerm,
      correctChoice,
      acceptedWrittenAnswers: buildAcceptedWrittenAnswers({ ...question, preferredAnswer, correctChoice, broadTextureCategory, specificTextureTerm }),
      explanation: question.explanation || question.feedbackCorrect || question.modelAnswer || `Listen for ${specificTextureTerm.toLowerCase()}.`,
      maxMarks: responseType === "multiple-choice" ? 1 : Number(question.maxMarks || 1)
    };
    normalised.answerChoices = getAnswerChoices(normalised);
    normalised.requiredConcepts = Array.isArray(question.requiredConcepts) ? question.requiredConcepts : [];
    normalised.optionalConcepts = Array.isArray(question.optionalConcepts) ? question.optionalConcepts : [];
    return normalised;
  }

  function levenshtein(left, right) {
    const a = normaliseText(left);
    const b = normaliseText(right);
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const old = row[j];
        row[j] = Math.min(
          row[j] + 1,
          row[j - 1] + 1,
          previous + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        previous = old;
      }
    }
    return row[b.length];
  }

  function sameAnswer(left, right) {
    return normaliseText(left) === normaliseText(right);
  }

  function fuzzySameShortAnswer(answer, target) {
    const cleanAnswer = normaliseText(answer);
    const cleanTarget = normaliseText(target);
    if (!cleanAnswer || !cleanTarget) return false;
    if (cleanAnswer === cleanTarget) return true;
    if (` ${cleanAnswer} `.includes(` ${cleanTarget} `)) return true;
    if (DISTINCT_TEXTURE_TERMS.has(cleanAnswer) && DISTINCT_TEXTURE_TERMS.has(cleanTarget)) return false;
    if (cleanAnswer.split(" ").length <= 4 && cleanTarget.split(" ").length <= 4) {
      const maxDistance = cleanTarget.length <= 7 ? 1 : Math.max(2, Math.floor(cleanTarget.length * 0.22));
      return levenshtein(cleanAnswer, cleanTarget) <= maxDistance;
    }
    return false;
  }

  function phraseToTokens(value) {
    return normaliseText(value).split(" ").filter(Boolean);
  }

  function findPhraseOccurrence(answer, phrase) {
    const normalisedPhrase = normaliseText(phrase);
    if (!normalisedPhrase) return null;

    const tokens = phraseToTokens(answer);
    const phraseTokens = phraseToTokens(phrase);
    const phraseLength = phraseTokens.length;
    if (!tokens.length || !phraseLength || phraseLength > tokens.length) {
      return fuzzySameShortAnswer(answer, phrase) ? { phrase, start: 0, end: phraseLength } : null;
    }

    for (let index = 0; index <= tokens.length - phraseLength; index += 1) {
      const segment = tokens.slice(index, index + phraseLength).join(" ");
      const previousTwo = tokens.slice(Math.max(0, index - 2), index);
      if (previousTwo.includes("not") || previousTwo.includes("no") || previousTwo.includes("isnt") || previousTwo.includes("isn")) continue;
      if (segment === normalisedPhrase || fuzzySameShortAnswer(segment, normalisedPhrase)) {
        return { phrase, start: index, end: index + phraseLength };
      }
    }

    return null;
  }

  function findMatchingPhrase(answer, phrases = []) {
    return phrases.find((phrase) => findPhraseOccurrence(answer, phrase)) || "";
  }

  function phraseSpansOverlap(firstMatch, secondMatch) {
    return firstMatch.start < secondMatch.end && secondMatch.start < firstMatch.end;
  }

  function findUnusedMatchingPhrase(answer, phrases = [], usedMatches = []) {
    const matches = phrases
      .map((phrase) => findPhraseOccurrence(answer, phrase))
      .filter(Boolean);
    const match = matches.find((candidate) => !usedMatches.some((usedMatch) => phraseSpansOverlap(candidate, usedMatch)));
    if (match) usedMatches.push(match);
    return match?.phrase || "";
  }

  const WRITTEN_TEXTURE_CLAIMS = [
    {
      family: "monophonic",
      phrases: ["monophonic", "monophony", "single melodic line", "single melody line", "one melodic line", "one melody line", "one melody", "one line", "one part", "solo line", "solo melody", "unaccompanied melody"]
    },
    {
      family: "homophonic",
      phrases: ["homophonic", "homophony"]
    },
    {
      family: "melody-accompaniment",
      phrases: ["melody and accompaniment", "melody with accompaniment", "tune with accompaniment", "tune with backing", "accompanied melody"]
    },
    {
      family: "chordal",
      phrases: ["chordal", "homorhythmic", "homorhythm", "block chords", "same rhythm", "moving together", "move together"]
    },
    {
      family: "polyphonic",
      phrases: ["polyphonic", "polyphony", "contrapuntal", "counterpoint", "independent parts", "independent lines", "independent melodies", "two independent parts", "two independent lines", "overlapping parts"]
    },
    {
      family: "imitative",
      phrases: ["imitative", "imitation", "canon", "canonic"]
    },
    {
      family: "fugal",
      phrases: ["fugal", "fugue", "subject entries", "answer entries"]
    },
    {
      family: "heterophonic",
      phrases: ["heterophonic", "heterophony"]
    }
  ];
  const WRITTEN_MARKING_ALIAS_GROUPS = [
    {
      trigger: /\b(independent (parts|lines|melodies|voices)|independent melodic|melodic independence|two independent|several independent|multiple independent)\b/,
      aliases: [
        "independent melodic lines",
        "independent melody lines",
        "two independent melodic lines",
        "two independent melody lines",
        "two independent lines",
        "two independent parts",
        "both lines are independent",
        "both parts are independent",
        "each part has its own melody",
        "each line has its own melody",
        "neither part is just accompaniment",
        "neither line is just accompaniment",
        "no single line is just accompaniment",
        "no single part is just accompaniment"
      ]
    },
    {
      trigger: /\b(similar importance|equal importance|equally important|weighted equally|equally weighted|equal weight|same importance|balanced)\b/,
      aliases: [
        "similar importance",
        "equal importance",
        "equally important",
        "both parts are equally important",
        "both lines are equally important",
        "both melodies are equally important",
        "weighted equally",
        "equally weighted",
        "equal weighting",
        "equal weight",
        "same importance",
        "balanced importance",
        "equally balanced",
        "neither part is more important",
        "neither line is more important",
        "neither is more important",
        "no main melody",
        "no single main melody",
        "not just accompaniment",
        "neither is just accompaniment",
        "no single part functions only as accompaniment",
        "no single line functions only as accompaniment"
      ]
    },
    {
      trigger: /\b(supported|supporting|subordinate|accompaniment|backing|chords underneath|chords below|main (melody|tune)|principal (line|melody|idea))\b/,
      aliases: [
        "melody and accompaniment",
        "melody with accompaniment",
        "main melody with accompaniment",
        "main tune with accompaniment",
        "main melody supported by accompaniment",
        "main tune supported by accompaniment",
        "principal melody is supported",
        "principal line is supported",
        "supported by subordinate parts",
        "supported by backing parts",
        "supported by chords",
        "chords underneath",
        "accompaniment supports the melody",
        "accompaniment supports the tune",
        "one melody is supported by other parts"
      ]
    },
    {
      trigger: /\b(move together|moving together|same rhythm|same rhythmic|homorhythmic|homorhythm|chordal|block chords|chords move together)\b/,
      aliases: [
        "parts move together",
        "parts moving together",
        "voices move together",
        "move together rhythmically",
        "same rhythm",
        "same rhythmic pattern",
        "homorhythmic",
        "chordal",
        "block chords",
        "chords move together",
        "parts form chords"
      ]
    },
    {
      trigger: /\b(overlap|overlapping|interweav|at the same time|simultaneously|different rhythms|enter at different times)\b/,
      aliases: [
        "overlapping lines",
        "lines overlap",
        "parts overlap",
        "melodies overlap",
        "interweaving lines",
        "interweaving melodies",
        "different melodies at the same time",
        "different rhythms",
        "enter at different times",
        "heard at the same time",
        "simultaneous melodic lines"
      ]
    },
    {
      trigger: /\b(imitat|copies|copied|same idea enters|successive entries|one after another|staggered entries|canon|fugue|fugal)\b/,
      aliases: [
        "imitative",
        "imitation",
        "one part imitates another",
        "one part copies another",
        "same idea enters in different parts",
        "parts enter one after another",
        "staggered entries",
        "successive entries",
        "subject entries",
        "fugal entries",
        "canon"
      ]
    },
    {
      trigger: /\b(decorated versions|varied versions|different versions|same tune|same melody|shared melody|ornamentation|ornamented)\b/,
      aliases: [
        "different versions of the same melody",
        "different versions of the same tune",
        "different versions of the same tune together",
        "decorated versions of the same melody",
        "varied versions of the same melody",
        "same tune at the same time",
        "same tune together",
        "same melody at the same time",
        "same melody together",
        "same melodic material together",
        "shared melody with ornamentation",
        "same melodic material with individual ornamentation"
      ]
    }
  ];

  function expandWrittenMarkingPhrases(phrases = []) {
    const basePhrases = unique(splitPhrases(phrases));
    const phraseText = normaliseText(basePhrases.join(" "));
    const aliases = WRITTEN_MARKING_ALIAS_GROUPS
      .filter((group) => group.trigger.test(phraseText))
      .flatMap((group) => group.aliases);
    return unique([...basePhrases, ...aliases]);
  }

  function expectedTextureFamilies(question = {}) {
    return new Set(acceptedChoiceEquivalents(question, question.correctChoice || question.preferredAnswer)
      .map(textureAnswerFamily)
      .filter(Boolean));
  }

  function answerClaimsTextureFamily(answer = "", family = "") {
    const claim = WRITTEN_TEXTURE_CLAIMS.find((item) => item.family === family);
    return Boolean(claim && claim.phrases.some((phrase) => findPhraseOccurrence(answer, phrase)));
  }

  function answerClaimsExpectedTexture(question = {}, answer = "") {
    const expectedFamilies = expectedTextureFamilies(question);
    return Array.from(expectedFamilies).some((family) => answerClaimsTextureFamily(answer, family));
  }

  function hasConflictingTextureClaim(question = {}, answer = "") {
    const expectedFamilies = expectedTextureFamilies(question);
    if (answerClaimsExpectedTexture(question, answer)) return false;
    return WRITTEN_TEXTURE_CLAIMS.some((claim) => (
      !expectedFamilies.has(claim.family) &&
      claim.phrases.some((phrase) => findPhraseOccurrence(answer, phrase))
    ));
  }

  function conflictingTextureRejection(question = {}) {
    return {
      status: "incorrect",
      marksAwarded: 0,
      maxMarks: Number(question.maxMarks) || 1,
      matchedPhrase: "",
      pointResults: [{ label: "Texture term", status: "missed", matchedPhrase: "", marksAwarded: 0 }],
      missingConcepts: [question.preferredAnswer || "Correct texture"],
      feedback: `Check the texture term first. Preferred answer: ${question.preferredAnswer}.`,
      label: "Not quite"
    };
  }

  function conceptPoints(question = {}) {
    if (Array.isArray(question.requiredConcepts) && question.requiredConcepts.length) {
      return question.requiredConcepts.map((concept, index) => {
        if (typeof concept === "string") return { label: concept, acceptedAnswers: [concept], partialAnswers: [] };
        return {
          label: concept.label || concept.name || `Concept ${index + 1}`,
          acceptedAnswers: unique([concept.label, concept.name, ...splitPhrases(concept.acceptedAnswers || concept.answers || concept.phrases)]),
          partialAnswers: unique(splitPhrases(concept.partialAnswers || concept.partial || []))
        };
      });
    }
    if (Array.isArray(question.markPoints) && question.markPoints.length) return question.markPoints;
    return [{
      label: "Texture term",
      acceptedAnswers: question.acceptedWrittenAnswers || question.acceptedAnswers || [question.preferredAnswer],
      partialAnswers: question.partialAnswers || []
    }];
  }

  function markConcepts(question = {}, answer = "") {
    const points = conceptPoints(question);
    const maxMarks = Number(question.maxMarks) || points.length || 1;
    const usedMatches = [];
    const preparedPoints = points.map((point) => ({
      label: point.label || "Concept",
      acceptedAnswers: expandWrittenMarkingPhrases(point.acceptedAnswers || []),
      partialAnswers: expandWrittenMarkingPhrases(point.partialAnswers || [])
    }));
    const pointResults = preparedPoints.map((point) => ({
      label: point.label,
      status: "missed",
      matchedPhrase: "",
      marksAwarded: 0
    }));

    preparedPoints.forEach((point, index) => {
      const acceptedMatch = findUnusedMatchingPhrase(answer, point.acceptedAnswers, usedMatches);
      if (acceptedMatch) {
        pointResults[index] = { label: point.label, status: "correct", matchedPhrase: acceptedMatch, marksAwarded: 1 };
      }
    });

    preparedPoints.forEach((point, index) => {
      if (pointResults[index].status !== "missed") return;
      const partialMatch = findUnusedMatchingPhrase(answer, point.partialAnswers, usedMatches);
      if (partialMatch) {
        pointResults[index] = { label: point.label, status: "partial", matchedPhrase: partialMatch, marksAwarded: 0.5 };
      }
    });

    let marksAwarded = pointResults.reduce((total, point) => total + point.marksAwarded, 0);

    const optionalMatches = splitPhrases(question.optionalConcepts)
      .filter((phrase) => findPhraseOccurrence(answer, phrase))
      .slice(0, Math.max(0, maxMarks - marksAwarded));
    marksAwarded += optionalMatches.length;

    const cappedMarks = Math.min(maxMarks, marksAwarded);
    const status = cappedMarks >= maxMarks ? "correct" : cappedMarks > 0 ? "partial" : "incorrect";
    const missingConcepts = pointResults.filter((point) => point.status === "missed").map((point) => point.label);
    const matchedPhrase = pointResults
      .filter((point) => point.matchedPhrase)
      .map((point) => `${point.label}: ${point.matchedPhrase}`)
      .join("; ");

    return {
      status,
      marksAwarded: cappedMarks,
      maxMarks,
      matchedPhrase,
      pointResults,
      missingConcepts,
      feedback: buildFeedback(question, status, missingConcepts),
      label: status === "correct" ? "Correct" : status === "partial" ? "Partly correct" : "Not quite"
    };
  }

  function buildFeedback(question = {}, status = "incorrect", missingConcepts = []) {
    if (status === "correct") return question.feedbackCorrect || question.explanation || `Correct. ${question.preferredAnswer} is the best answer.`;
    if (status === "partial") {
      const missing = missingConcepts.length ? ` Missing idea: ${missingConcepts.slice(0, 2).join(", ")}.` : "";
      return question.feedbackPartial || `Good. Add one more precise texture detail.${missing}`;
    }
    return question.feedbackIncorrect || question.explanation || `Not quite. Preferred answer: ${question.preferredAnswer}.`;
  }

  function markMultipleChoice(question = {}, answer = "") {
    const correct = isChoiceEquivalentToCorrect(answer, question, question.correctChoice);
    return {
      status: correct ? "correct" : "incorrect",
      marksAwarded: correct ? 1 : 0,
      maxMarks: 1,
      matchedPhrase: correct ? question.correctChoice : "",
      pointResults: [{ label: "Choice", status: correct ? "correct" : "missed", matchedPhrase: answer, marksAwarded: correct ? 1 : 0 }],
      feedback: correct
        ? (question.feedbackCorrect || question.explanation || `Correct. ${question.preferredAnswer} is the best answer.`)
        : (question.feedbackIncorrect || question.explanation || `Not quite. The answer is ${question.correctChoice}.`),
      label: correct ? "Correct" : "Not quite",
      correctChoice: question.correctChoice
    };
  }

  function isOverlyBroadShortAnswer(question = {}, answer = "") {
    const cleanAnswer = normaliseText(answer);
    const preferred = normaliseText(question.preferredAnswer);
    const broad = normaliseText(question.broadTextureCategory);
    const isSingleBroadTerm = BASIC_TEXTURE_CHOICES.some((choice) => cleanAnswer === normaliseText(choice));
    const preferredIsBroad = BASIC_TEXTURE_CHOICES.some((choice) => preferred === normaliseText(choice));
    return Boolean(isSingleBroadTerm && !preferredIsBroad && cleanAnswer === broad);
  }

  function broadAnswerRejection(question = {}) {
    return {
      status: "incorrect",
      marksAwarded: 0,
      maxMarks: Number(question.maxMarks) || 1,
      matchedPhrase: "",
      pointResults: [{ label: "Precise term", status: "missed", matchedPhrase: "", marksAwarded: 0 }],
      missingConcepts: [question.preferredAnswer || "Precise texture term"],
      feedback: `Use the more precise term here: ${question.preferredAnswer}.`,
      label: "Not quite"
    };
  }

  function markShortText(question = {}, answer = "") {
    if (isOverlyBroadShortAnswer(question, answer)) return broadAnswerRejection(question);
    const accepted = expandWrittenMarkingPhrases([...(question.acceptedWrittenAnswers || []), question.preferredAnswer, question.correctChoice]);
    const acceptedMatch = findMatchingPhrase(answer, accepted);
    const partialMatch = !acceptedMatch ? findMatchingPhrase(answer, expandWrittenMarkingPhrases(question.partialAnswers || [])) : "";
    const maxMarks = Number(question.maxMarks) || 1;

    if (acceptedMatch && maxMarks <= 1) {
      return {
        status: "correct",
        marksAwarded: 1,
        maxMarks: 1,
        matchedPhrase: acceptedMatch,
        pointResults: [{ label: "Texture term", status: "correct", matchedPhrase: acceptedMatch, marksAwarded: 1 }],
        feedback: question.feedbackCorrect || question.explanation || `Correct. Preferred exam term: ${question.preferredAnswer}.`,
        label: "Correct"
      };
    }

    if (maxMarks > 1) return markConcepts(question, answer);

    return {
      status: partialMatch ? "partial" : "incorrect",
      marksAwarded: partialMatch ? 0.5 : 0,
      maxMarks: 1,
      matchedPhrase: partialMatch,
      pointResults: [{ label: "Texture term", status: partialMatch ? "partial" : "missed", matchedPhrase: partialMatch, marksAwarded: partialMatch ? 0.5 : 0 }],
      feedback: partialMatch
        ? (question.feedbackPartial || `Nearly. Preferred exam term: ${question.preferredAnswer}.`)
        : (question.feedbackIncorrect || question.explanation || `Not quite. Preferred exam term: ${question.preferredAnswer}.`),
      label: partialMatch ? "Partly correct" : "Not quite"
    };
  }

  function markAnswer(rawQuestion = {}, answer = "") {
    const question = rawQuestion.responseType ? rawQuestion : normaliseQuestion(rawQuestion);
    if (question.responseType === "multiple-choice") return markMultipleChoice(question, answer);
    if (hasConflictingTextureClaim(question, answer)) return conflictingTextureRejection(question);
    if (isOverlyBroadShortAnswer(question, answer)) return broadAnswerRejection(question);
    if (question.responseType === "extended-text") return markConcepts(question, answer);
    return markShortText(question, answer);
  }

  return {
    LEVELS,
    RESPONSE_TYPES,
    normaliseText,
    normaliseQuestion,
    getQuestionLevel,
    inferResponseType,
    getAnswerChoices,
    isChoiceEquivalentToCorrect,
    shuffleChoices,
    sameAnswer,
    fuzzySameShortAnswer,
    markAnswer
  };
});
