# Melody Master data layer update

This project has been updated so Melody Master now has an Instrument-Identifier-style data pipeline without changing the core app layout, gameplay, checking logic, score display, or Teacher Mode flow.

## Changed / added files

- `modules/melody-master/clips.js`  
  Existing gameplay data has been preserved and enriched with tracker-backed metadata from the commercial resource spreadsheet.

- `tools/melody-master-data.csv`  
  Clean source CSV exported from the latest Melody Master commercial resource tracker. This is the editable bridge between the spreadsheet and the app.

- `tools/generate-melody-master-clips.js`  
  Regenerates `modules/melody-master/clips.js` from the CSV while preserving the existing dictation layouts and validating audio/image/answer metadata.

## What this enables

- Correct composer/work/movement/performer metadata is now available for all MM questions.
- Licence/commercial-use metadata is now attached to each question.
- CC BY tracks are flagged with attribution requirements.
- Future feedback logic can use the same per-note pitch/rhythm/interval metadata already attached to each clip.
- Teacher Mode/server payloads can access `title`, `composer`, `work`, `movement`, `performer`, `credit`, and `resourceMetadata` fields.

## What was not changed

- No CSS files were changed.
- No HTML files were changed.
- No drag/drop logic was changed.
- No answer-checking logic was changed.
- No Teacher Mode control flow was changed.
- No student classroom workflow was changed.

## To regenerate later

From the project root:

```bash
node tools/generate-melody-master-clips.js
```

The generator validates that each audio file, question PNG, answer PNG, answer pitch sequence and dictation slot sequence is still usable before overwriting `clips.js`.
