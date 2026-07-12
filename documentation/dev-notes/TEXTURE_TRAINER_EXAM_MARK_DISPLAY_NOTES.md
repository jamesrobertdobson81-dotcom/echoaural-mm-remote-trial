# Texture Trainer exam mark display

Updated Texture Trainer so the available mark value is displayed beside the question prompt in GCSE-style bracket form, e.g. `[1]`.

Files changed:

- `modules/texture-trainer/index.html`
- `modules/texture-trainer/script.js`
- `modules/texture-trainer/style.css`

Implementation notes:

- Added a dedicated `#questionMarks` element beside `#questionPrompt`.
- The displayed mark is generated dynamically from each question card's `maxMarks`.
- This keeps the UI ready for later multi-mark texture questions such as texture change questions worth `[2]` or `[3]`.
- Existing Melody Master, Instrument Identifier and Teacher Mode files were not changed.
