# Texture Trainer MVP notes

Created as a separate module at `modules/texture-trainer/`.

## Files added

- `modules/texture-trainer/index.html`
- `modules/texture-trainer/style.css`
- `modules/texture-trainer/script.js`
- `modules/texture-trainer/data/texture-questions.js`
- `modules/texture-trainer/audio/.gitkeep`
- `tools/check-project.js`

## Files modified

- `index.html` — Texture Trainer card changed from locked/coming soon to live launch link.
- `README.md` — local run instructions updated with Texture Trainer URL and placeholder audio notes.

## Marking model

The MVP uses deterministic client-side answer cards. Student answers are normalised by lowercasing, removing punctuation, stripping accents and trimming extra spaces. The marker checks accepted phrases first, partial phrases second, then common wrong-answer phrases.

No OpenAI API or external AI is used in this MVP.

## Placeholder audio

Replace these files when ready:

- `modules/texture-trainer/audio/tt001.mp3`
- `modules/texture-trainer/audio/tt002.mp3`
- `modules/texture-trainer/audio/tt003.mp3`
- `modules/texture-trainer/audio/tt004.mp3`
- `modules/texture-trainer/audio/tt005.mp3`
- `modules/texture-trainer/audio/tt006.mp3`
