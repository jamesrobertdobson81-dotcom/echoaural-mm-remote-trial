(function attachEraExplorerCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EraExplorer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createEraExplorerCore() {
  "use strict";

  /** Cambridge Western classical periods used in Era Explorer (before jazz/pop/world). */
  const CAMBRIDGE_PERIODS = Object.freeze([
    "Renaissance",
    "Baroque",
    "Classical",
    "Romantic",
    "20th Century"
  ]);

  const PERIOD_ALIASES = new Map([
    ["renaissance", "Renaissance"],
    ["baroque", "Baroque"],
    ["classical", "Classical"],
    ["classical romantic transition", "Classical"],
    ["romantic", "Romantic"],
    ["twentieth century", "20th Century"],
    ["20th century", "20th Century"],
    ["twentieth century music", "20th Century"],
    ["modern", "20th Century"]
  ]);

  const COMPOSER_ALIASES = new Map([
    ["bach", "Johann Sebastian Bach"],
    ["j s bach", "Johann Sebastian Bach"],
    ["js bach", "Johann Sebastian Bach"],
    ["johann sebastian bach", "Johann Sebastian Bach"],
    ["handel", "George Frideric Handel"],
    ["george frideric handel", "George Frideric Handel"],
    ["vivaldi", "Antonio Vivaldi"],
    ["antonio vivaldi", "Antonio Vivaldi"],
    ["cpe bach", "Carl Philipp Emanuel Bach"],
    ["c p e bach", "Carl Philipp Emanuel Bach"],
    ["carl philipp emanuel bach", "Carl Philipp Emanuel Bach"],
    ["telemann", "Georg Philipp Telemann"],
    ["georg philipp telemann", "Georg Philipp Telemann"],
    ["mozart", "Wolfgang Amadeus Mozart"],
    ["w a mozart", "Wolfgang Amadeus Mozart"],
    ["wolfgang amadeus mozart", "Wolfgang Amadeus Mozart"],
    ["haydn", "Joseph Haydn"],
    ["joseph haydn", "Joseph Haydn"],
    ["clementi", "Muzio Clementi"],
    ["muzio clementi", "Muzio Clementi"],
    ["beethoven", "Ludwig van Beethoven"],
    ["l van beethoven", "Ludwig van Beethoven"],
    ["ludwig van beethoven", "Ludwig van Beethoven"],
    ["schumann", "Robert Schumann"],
    ["robert schumann", "Robert Schumann"],
    ["chopin", "Frédéric Chopin"],
    ["frederic chopin", "Frédéric Chopin"],
    ["mussorgsky", "Modest Mussorgsky"],
    ["modest mussorgsky", "Modest Mussorgsky"],
    ["grieg", "Edvard Grieg"],
    ["edvard grieg", "Edvard Grieg"],
    ["johannes brahms", "Johannes Brahms"],
    ["brahms", "Johannes Brahms"],
    ["felix mendelssohn", "Felix Mendelssohn"],
    ["mendelssohn", "Felix Mendelssohn"],
    ["pyotr ilyich tchaikovsky", "Pyotr Ilyich Tchaikovsky"],
    ["tchaikovsky", "Pyotr Ilyich Tchaikovsky"],
    ["debussy", "Claude Debussy"],
    ["claude debussy", "Claude Debussy"],
    ["tomaso albinoni", "Tomaso Albinoni"],
    ["edward elgar", "Edward Elgar"],
    ["elgar", "Edward Elgar"],
    ["antonin dvorak", "Antonín Dvořák"],
    ["antonin dvořák", "Antonín Dvořák"],
    ["dvorak", "Antonín Dvořák"],
    ["dvořák", "Antonín Dvořák"],
    ["johann strauss ii", "Johann Strauss II"],
    ["johann strauss", "Johann Strauss II"],
    ["strauss", "Johann Strauss II"],
    ["sergei rachmaninoff", "Sergei Rachmaninoff"],
    ["rachmaninoff", "Sergei Rachmaninoff"],
    ["rachmaninov", "Sergei Rachmaninoff"],
    ["gabriel faure", "Gabriel Fauré"],
    ["gabriel fauré", "Gabriel Fauré"],
    ["faure", "Gabriel Fauré"],
    ["fauré", "Gabriel Fauré"],
    ["alexander borodin", "Alexander Borodin"],
    ["borodin", "Alexander Borodin"],
    ["franz schubert", "Franz Schubert"],
    ["schubert", "Franz Schubert"],
    ["josef suk", "Josef Suk"],
    ["suk", "Josef Suk"],
    ["mouret", "Mouret"],
    ["nikolai rimsky korsakov", "Nikolai Rimsky-Korsakov"],
    ["rimsky korsakov", "Nikolai Rimsky-Korsakov"],
    ["bottesini", "Bottesini"],
    ["dushkin", "Dushkin"],
    ["glazunov", "Glazunov"],
    ["kuhlau", "Kuhlau"],
    ["von weber", "von Weber"],
    ["weber", "von Weber"]
  ]);

  const PERIOD_ORDER = CAMBRIDGE_PERIODS.slice();

  /** Composers with verified portrait tiles in assets/icons/composers. */
  const COMPOSERS_WITH_ICONS = new Set([
    "alexander borodin",
    "antonio vivaldi",
    "antonin dvorak",
    "bottesini",
    "carl philipp emanuel bach",
    "claude debussy",
    "dushkin",
    "edvard grieg",
    "edward elgar",
    "felix mendelssohn",
    "franz schubert",
    "frederic chopin",
    "gabriel faure",
    "georg philipp telemann",
    "george frideric handel",
    "glazunov",
    "igor stravinsky",
    "johann sebastian bach",
    "johann strauss ii",
    "johannes brahms",
    "josef suk",
    "joseph haydn",
    "kuhlau",
    "ludwig van beethoven",
    "modest mussorgsky",
    "mouret",
    "muzio clementi",
    "nikolai rimsky korsakov",
    "pyotr ilyich tchaikovsky",
    "robert schumann",
    "sergei rachmaninoff",
    "tomaso albinoni",
    "von weber",
    "wolfgang amadeus mozart"
  ]);

  function text(value) {
    return String(value ?? "").trim();
  }

  function normaliseKey(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function isCambridgePeriod(value) {
    return CAMBRIDGE_PERIODS.some((period) => normaliseKey(period) === normaliseKey(value));
  }

  function normalisePeriod(value) {
    const original = text(value);
    if (!original) return "";
    const mapped = PERIOD_ALIASES.get(normaliseKey(original));
    if (mapped && isCambridgePeriod(mapped)) return mapped;
    if (isCambridgePeriod(original)) {
      return CAMBRIDGE_PERIODS.find((period) => normaliseKey(period) === normaliseKey(original)) || "";
    }
    return "";
  }

  function normaliseComposer(value) {
    const original = text(value);
    if (!original) return "";
    return COMPOSER_ALIASES.get(normaliseKey(original)) || original.replace(/\s+/g, " ");
  }

  function validComposer(value) {
    const key = normaliseKey(value);
    if (!key) return false;
    return !(
      key === "unknown" ||
      key === "anonymous" ||
      key === "none" ||
      key === "n a" ||
      key.startsWith("user supplied") ||
      key.startsWith("generated") ||
      key.endsWith("tradition")
    );
  }

  function normaliseAudioPath(value) {
    const path = text(value).replace(/\\/g, "/").replace(/^\.?\//, "");
    if (!path || /^https?:\/\//i.test(path) || !/\.(?:mp3|ogg|wav|m4a)$/i.test(path)) return "";
    return `/${path}`;
  }

  function numericField(record, names) {
    for (const name of names) {
      const value = Number(record?.[name]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return null;
  }

  /** Solo / monophonic extracts skew heavily Baroque and are weak period clues. */
  function isMonophonicClip(record) {
    const ensemble = normaliseKey(record?.ensemble);
    const clipType = text(record?.clip_type);
    if (ensemble === "solo") return true;
    if (normaliseKey(clipType) === "solo") return true;
    return /^monophonic\b/i.test(clipType);
  }

  function excludedClipIdSet(curation) {
    const list = curation && curation.excludedClipIds;
    if (list instanceof Set) return list;
    if (Array.isArray(list)) return new Set(list);
    return null;
  }

  // curation (optional) is the Content Review team's per-clip overlay — see
  // era-explorer/data/context-coach-curation.json. It never touches the
  // shared catalogue (reused by other apps); it only excludes/levels/re-picks
  // distractors for Context Coach's own question generation. Omitting it
  // entirely reproduces the pre-review, fully-algorithmic behaviour exactly.
  function auditEraExplorerClips(catalogue, curation) {
    const records = Array.isArray(catalogue) ? catalogue : catalogue?.clips;
    if (!Array.isArray(records)) {
      return { valid: [], invalid: [{ id: "", reason: "Catalogue does not contain a clips array." }] };
    }

    const excludedIds = excludedClipIdSet(curation);
    const valid = [];
    const invalid = [];
    const monophonicCandidates = [];
    const seenIds = new Set();

    records.forEach((record, index) => {
      const id = text(record?.clip_id || record?.id);
      const composer = normaliseComposer(record?.composer);
      const period = normalisePeriod(record?.period);
      const audioPath = normaliseAudioPath(record?.audio_path || record?.file);
      let reason = "";

      if (!id) reason = "Missing clip ID.";
      else if (seenIds.has(id)) reason = "Duplicate clip ID.";
      else if (!audioPath) reason = "Missing or unsupported local audio path.";
      else if (!composer || !validComposer(composer)) reason = "Missing or non-person composer metadata.";
      else if (!period) reason = "Missing or unsupported Cambridge period metadata.";
      else if (excludedIds && excludedIds.has(id)) reason = "Excluded by Context Coach content review.";

      if (reason) {
        invalid.push({ id: id || `row-${index + 1}`, reason });
        return;
      }

      seenIds.add(id);
      const startTime = numericField(record, ["start_time", "startTime", "clip_start", "clipStart"]) ?? 0;
      const suppliedEnd = numericField(record, ["end_time", "endTime", "clip_end", "clipEnd"]);

      const clip = {
        id,
        audioPath,
        composer,
        period,
        work: text(record.work),
        movement: text(record.movement),
        source: text(record.source),
        rights: text(record.rights),
        originalComposer: text(record.composer),
        originalPeriod: text(record.period),
        startTime,
        endTime: suppliedEnd !== null && suppliedEnd > startTime ? suppliedEnd : null,
        monophonic: isMonophonicClip(record)
      };

      if (clip.monophonic) monophonicCandidates.push(clip);
      else valid.push(clip);
    });

    // Keep 50% of monophonic/solo clips (stable every-other selection by clip id).
    monophonicCandidates.sort((left, right) => left.id.localeCompare(right.id));
    monophonicCandidates.forEach((clip, index) => {
      if (index % 2 === 0) {
        valid.push(clip);
        return;
      }
      invalid.push({
        id: clip.id,
        reason: "Monophonic solo clip omitted to reduce Baroque-heavy Era Explorer pool."
      });
    });

    return { valid, invalid };
  }

  function validEraExplorerClips(catalogue) {
    return auditEraExplorerClips(catalogue).valid;
  }

  function shuffle(items, random = Math.random) {
    const output = items.slice();
    for (let index = output.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
    }
    return output;
  }

  function uniqueValues(items) {
    const seen = new Set();
    const output = [];
    for (const item of items) {
      const value = text(item);
      const key = normaliseKey(value);
      if (!value || seen.has(key)) continue;
      seen.add(key);
      output.push(value);
    }
    return output;
  }

  function periodDistance(left, right) {
    const leftIndex = PERIOD_ORDER.indexOf(left);
    const rightIndex = PERIOD_ORDER.indexOf(right);
    if (leftIndex < 0 || rightIndex < 0) return Number.MAX_SAFE_INTEGER;
    return Math.abs(leftIndex - rightIndex);
  }

  function composerPrimaryPeriod(composer, pool) {
    const key = normaliseKey(composer);
    const periods = uniqueValues(
      pool
        .filter((item) => normaliseKey(normaliseComposer(item.composer)) === key)
        .map((item) => normalisePeriod(item.period))
    ).filter(Boolean);
    return periods[0] || "";
  }

  function composerHasIcon(composer) {
    return COMPOSERS_WITH_ICONS.has(normaliseKey(composer));
  }

  /**
   * Prefer composers from clearly different periods so students are not forced
   * to distinguish four composers from the same era by ear alone.
   * Prefer composers that already have portrait icons when available.
   */
  function getComposerDistractors(clip, pool, random = Math.random) {
    const correct = normaliseComposer(clip?.composer);
    const correctKey = normaliseKey(correct);
    const correctPeriod = normalisePeriod(clip?.period);
    const candidates = uniqueValues(pool.map((item) => normaliseComposer(item.composer)))
      .filter((composer) => normaliseKey(composer) !== correctKey)
      .map((composer) => {
        const period = composerPrimaryPeriod(composer, pool);
        return {
          composer,
          period,
          distance: periodDistance(correctPeriod, period),
          samePeriod: normaliseKey(period) === normaliseKey(correctPeriod),
          hasIcon: composerHasIcon(composer)
        };
      });

    const otherPeriod = candidates.filter((candidate) => !candidate.samePeriod && candidate.period);
    const samePeriod = candidates.filter((candidate) => candidate.samePeriod);

    function preferIconed(list) {
      const withIcons = list.filter((candidate) => candidate.hasIcon);
      const withoutIcons = list.filter((candidate) => !candidate.hasIcon);
      return [...withIcons, ...withoutIcons];
    }

    const ordered = [];
    const distances = uniqueValues(otherPeriod.map((candidate) => String(candidate.distance)))
      .map(Number)
      .sort((a, b) => b - a);

    distances.forEach((distance) => {
      const group = shuffle(
        otherPeriod.filter((candidate) => candidate.distance === distance),
        random
      );
      ordered.push(...preferIconed(group).map((candidate) => candidate.composer));
    });

    // Prefer one composer per period so options span eras clearly.
    const diverse = [];
    const usedPeriods = new Set();
    for (const composer of ordered) {
      const period = composerPrimaryPeriod(composer, pool);
      const periodKey = normaliseKey(period);
      if (periodKey && usedPeriods.has(periodKey)) continue;
      if (periodKey) usedPeriods.add(periodKey);
      diverse.push(composer);
      if (diverse.length >= 3) break;
    }

    for (const composer of ordered) {
      if (diverse.length >= 3) break;
      if (!diverse.includes(composer)) diverse.push(composer);
    }

    if (diverse.length < 3) {
      diverse.push(...preferIconed(shuffle(samePeriod, random)).map((candidate) => candidate.composer));
    }

    return uniqueValues(diverse).slice(0, 3);
  }

  function curationTypeExcluded(curation, clipId, type) {
    const excl = curation && curation.typeExclusions && curation.typeExclusions[clipId];
    return Array.isArray(excl) && excl.includes(type);
  }

  function curationLevel(curation, clipId, type) {
    const entry = curation && curation.levels && curation.levels[clipId];
    return (entry && entry[type]) || null;
  }

  function curationOptionOverride(curation, clipId, type) {
    const entry = curation && curation.optionOverrides && curation.optionOverrides[clipId];
    const options = entry && entry[type];
    return Array.isArray(options) && options.length ? options : null;
  }

  function buildPeriodQuestion(clip, pool, random = Math.random, curation = null) {
    if (curationTypeExcluded(curation, clip?.id, "period")) return null;
    const correctAnswer = normalisePeriod(clip?.period);
    if (!isCambridgePeriod(correctAnswer)) return null;

    const override = curationOptionOverride(curation, clip?.id, "period");
    let options;
    if (override) {
      options = shuffle(override, random);
    } else {
      const distractors = shuffle(
        CAMBRIDGE_PERIODS.filter((period) => normaliseKey(period) !== normaliseKey(correctAnswer)),
        random
      ).slice(0, 3);
      if (distractors.length < 3) return null;
      options = shuffle([correctAnswer, ...distractors], random);
    }

    return {
      id: `${clip.id}-period`,
      type: "period",
      prompt: "Which musical period is this extract from?",
      correctAnswer,
      options,
      level: curationLevel(curation, clip?.id, "period"),
      clip
    };
  }

  function buildComposerQuestion(clip, pool, random = Math.random, curation = null) {
    if (curationTypeExcluded(curation, clip?.id, "composer")) return null;
    const correctAnswer = normaliseComposer(clip?.composer);
    if (!correctAnswer) return null;

    const override = curationOptionOverride(curation, clip?.id, "composer");
    let options;
    if (override) {
      options = shuffle(override, random);
    } else {
      const distractors = getComposerDistractors(clip, pool, random);
      if (distractors.length < 3) return null;
      if (uniqueValues([correctAnswer, ...distractors]).length !== 4) return null;
      options = shuffle([correctAnswer, ...distractors], random);
    }

    return {
      id: `${clip.id}-composer`,
      type: "composer",
      prompt: "Who composed this extract?",
      correctAnswer,
      options,
      level: curationLevel(curation, clip?.id, "composer"),
      clip
    };
  }

  function validateEraQuestion(question) {
    if (!question || !["period", "composer"].includes(question.type)) return false;
    if (!question.clip?.audioPath || !question.correctAnswer || !question.prompt) return false;
    if (!Array.isArray(question.options) || question.options.length !== 4) return false;
    if (uniqueValues(question.options).length !== 4) return false;
    if (question.type === "period") {
      if (!question.options.every((option) => isCambridgePeriod(option))) return false;
      if (!isCambridgePeriod(question.correctAnswer)) return false;
    }
    return question.options.some((option) => normaliseKey(option) === normaliseKey(question.correctAnswer));
  }

  function balancedQuestionTypes(count, random = Math.random, forcedType = null) {
    const safeCount = Math.max(2, Math.floor(Number(count) || 0));
    if (forcedType === "period" || forcedType === "composer") {
      return Array(safeCount).fill(forcedType);
    }
    const extraType = random() < 0.5 ? "period" : "composer";
    const periodCount = Math.floor(safeCount / 2) + (safeCount % 2 && extraType === "period" ? 1 : 0);
    const composerCount = safeCount - periodCount;
    return shuffle([
      ...Array(periodCount).fill("period"),
      ...Array(composerCount).fill("composer")
    ], random);
  }

  /**
   * options.questionType — "period" or "composer" to build a single-skill round
   * (ContextCoach's Eras & Periods / Composers sub-apps); omitted for a mixed round.
   * options.seenClipIds — Set of clip ids already shown in the current spaced-repetition
   * cycle; when supplied, unseen clips are strongly preferred over seen ones so a round
   * only repeats a clip once every clip in the pool has appeared.
   * options.curation — the Context Coach content-review overlay (see
   * era-explorer/data/context-coach-curation.json); passed straight through
   * to buildPeriodQuestion/buildComposerQuestion for exclusions, level
   * tagging and option overrides.
   * options.level — when set alongside a single-skill questionType, restricts
   * the pool to clips curated at that level for that skill before drawing a
   * round. Ignored for mixed (no questionType) rounds, since level is
   * curated per (clip, type), not per clip.
   */
  function buildRoundQuestions(pool, count, random = Math.random, options = {}) {
    const forcedType = options.questionType === "period" || options.questionType === "composer"
      ? options.questionType
      : null;
    const seenClipIds = options.seenClipIds instanceof Set ? options.seenClipIds : null;
    const curation = options.curation || null;
    let clips = Array.isArray(pool) ? pool.filter(Boolean) : [];
    if (forcedType && options.level) {
      clips = clips.filter((clip) => curationLevel(curation, clip.id, forcedType) === options.level);
    }
    const requestedCount = Math.max(2, Math.floor(Number(count) || 0));
    if (clips.length < requestedCount) {
      throw new Error("Not enough valid Era Explorer clips for this round.");
    }
    if (forcedType !== "composer" && uniqueValues(clips.map((clip) => clip.period)).length < 3) {
      throw new Error("Era Explorer needs at least three Cambridge musical periods.");
    }
    if (forcedType !== "period" && uniqueValues(clips.map((clip) => clip.composer)).length < 4) {
      throw new Error("Era Explorer needs at least four composers.");
    }

    const types = balancedQuestionTypes(requestedCount, random, forcedType);
    const remaining = shuffle(clips, random);
    const questions = [];
    let previousClip = null;
    // Keeps the same period/composer answer from appearing twice in one
    // round (namespaced by type, so a period repeat and a composer repeat
    // are tracked separately). Soft-scored like the other penalties below
    // rather than hard-excluded, so a round that genuinely can't avoid a
    // repeat (more questions of a type than distinct answers exist) still
    // completes instead of throwing.
    const usedAnswers = new Set();

    for (const type of types) {
      const candidates = remaining
        .map((clip, index) => ({
          clip,
          index,
          penalty: previousClip
            ? Number(normaliseKey(clip.composer) === normaliseKey(previousClip.composer)) * 2 +
              Number(normaliseKey(clip.period) === normaliseKey(previousClip.period))
            : 0
        }))
        .map((candidate) => {
          const prospectiveAnswer = type === "period"
            ? normalisePeriod(candidate.clip.period)
            : normaliseComposer(candidate.clip.composer);
          const repeatsAnswer = usedAnswers.has(`${type}|${normaliseKey(prospectiveAnswer)}`);
          return {
            ...candidate,
            penalty: candidate.penalty +
              (type === "composer" && !composerHasIcon(candidate.clip.composer) ? 4 : 0) +
              (seenClipIds && seenClipIds.has(candidate.clip.id) ? 8 : 0) +
              (repeatsAnswer ? 3 : 0)
          };
        })
        .sort((left, right) => left.penalty - right.penalty);

      let selected = null;
      for (const candidate of candidates) {
        const question = type === "period"
          ? buildPeriodQuestion(candidate.clip, clips, random, curation)
          : buildComposerQuestion(candidate.clip, clips, random, curation);
        if (!validateEraQuestion(question)) continue;
        selected = { ...candidate, question };
        break;
      }

      if (!selected) throw new Error(`Could not build a valid ${type} question.`);
      remaining.splice(selected.index, 1);
      questions.push(selected.question);
      previousClip = selected.clip;
      usedAnswers.add(`${type}|${normaliseKey(selected.question.correctAnswer)}`);
    }

    return questions;
  }

  return Object.freeze({
    CAMBRIDGE_PERIODS,
    COMPOSERS_WITH_ICONS,
    composerHasIcon,
    normalisePeriod,
    normaliseComposer,
    isCambridgePeriod,
    normaliseAudioPath,
    isMonophonicClip,
    auditEraExplorerClips,
    validEraExplorerClips,
    shuffle,
    uniqueValues,
    getComposerDistractors,
    buildPeriodQuestion,
    buildComposerQuestion,
    balancedQuestionTypes,
    validateEraQuestion,
    buildRoundQuestions
  });
});
