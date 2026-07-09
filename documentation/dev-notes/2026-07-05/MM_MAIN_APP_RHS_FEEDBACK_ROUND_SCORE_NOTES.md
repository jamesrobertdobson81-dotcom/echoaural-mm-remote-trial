# Melody Master main-app RHS feedback and round-score update

Scope: main Melody Master solo app only.

## Changed

- Removed the visible GCSE-style marking heading/text from the right-hand feedback console during quiz mode.
- Replaced the right-hand quiz feedback panel with a compact layout:
  - Pitch mark box
  - Contour mark box
  - Feedback box
- Added a round-score tracker underneath the feedback box.
- The round-score tracker updates after each checked question.
- On the final checked question, the tracker changes to a final score tile and gives short final feedback.

## Preserved

- Main Melody Master layout structure.
- Drag/drop behaviour.
- Expanded question PNG quiz flow.
- Replay/next/finish button flow.
- GCSE-style marking calculation behind the scenes.
- Audio and question data.
- Teacher Mode and classroom files.

## Validation

- `node --check modules/melody-master/script.js` passed.
- `node --check modules/melody-master/teacher-mode.js` passed.
- `node --check server.js` passed.
- Local server returned 200 OK for:
  - `/modules/melody-master/index.html`
  - `/modules/melody-master/teacher-mode.html`
