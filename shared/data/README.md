# EchoAural unified skill metadata

Implemented in the live EchoAural project as an additive tracking layer.

## What was added

- `shared/data/skill-taxonomy.csv` and `.json`: one canonical taxonomy used across apps and Exam Lab.
- `shared/data/question-skill-map.csv` and `.json`: lookup by question ID.
- `shared/data/clip-catalogue.csv` and `.json`: deduplicated clip-level metadata.
- `shared/data/metadata-review-needed.csv`: only tags that could not be inferred safely.
- `shared/js/skill-metadata.js`: server-side lookup and backwards-compatible attempt enrichment.
- Teacher Mode and independent Progress Mode saves now retain canonical skill evidence.
- Existing attempt rows are enriched from their question IDs when progress is read, so no data migration is required.
- Student and class progress responses include canonical skill summaries; compiled feedback uses them only after sufficient distinct-question or clip evidence.

## Coverage

- Tagged app questions: 2934
- Canonical question IDs including Exam Lab: 2999
- Deduplicated clips: 754
- Review flags: 343

## Important behaviour

No gameplay, layouts, question wording, answers or scoring rules are changed. Secondary skill codes remain contextual; progress marks are aggregated against the primary skill only.

Era Explorer (shown as **ContextCoach** in the product UI) reads this catalogue for Cambridge-period clips, but keeps only 50% of Solo/monophonic extracts (they are heavily Baroque and weak period clues). The omitted clips stay in the catalogue for Instrument Identifier and other modules.

## Tagging principle

Question metadata describes the skill evidenced by an answer. Clip metadata describes the recording itself. A single clip can therefore support several question skills.
