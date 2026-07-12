# Melody Master Replay / Submit Flow Fix

Scope: main Melody Master app only.

## Changed

- Renamed the visible answer button from **Check your answers** to **Submit your answers**.
- Replay button is now disabled while audio is playing.
- During playback, the replay button shows the number of plays available at the start of that play, e.g. **3 plays left**.
- When the audio ends, the replay button unlocks and shows the updated remaining plays, e.g. **Replay Excerpt (2 plays left)**.
- After the final permitted play, the replay button shows **0 plays left** and remains disabled until the student submits their answer.
- After **Submit your answers** is pressed, the question is scored, feedback is shown, and the replay button becomes **Next Question** or **Finish Quiz** depending on the round position.
- Submitting an answer stops any currently playing audio so the question moves cleanly into feedback/progression state.

## Preserved

- Main layout
- Expanded question PNG flow
- Drag/drop behaviour
- GCSE-style scoring calculation
- Round score tracking
- Teacher Mode and classroom files
- Audio/question/resource data
