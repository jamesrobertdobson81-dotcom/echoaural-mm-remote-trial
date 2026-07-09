# Melody Master GCSE-style feedback update

## Scope
This update changes the main Melody Master student app feedback/marking layer only.

It does not change:
- layout structure
- drag/drop note placement
- score expansion/zoom behaviour
- audio playback
- question data
- Teacher Mode control flow
- classroom submission flow
- server logic

## Marking model implemented
The main app now uses a GCSE-style best-fit melodic dictation model:

1. Award 1 mark per exactly correct pitch.
2. Award 1 additional shape/contour credit where the overall up/down/same melodic outline is secure.
3. Give professional feedback explaining:
   - GCSE-style mark awarded
   - pitch marks
   - shape/contour credit
   - first error locations
   - whether the answer is transposed from a wrong starting note
   - whether intervals are too large/small or moving in the wrong direction

This reflects the two common GCSE patterns found in mark schemes:
- Pearson/Edexcel musical dictation: separate rhythm and pitch questions, normally up to 5 marks for correct answers.
- AQA-style melodic completion: marks for correct pitch plus credit for correct shape regardless of starting note.

## Files changed
- `modules/melody-master/script.js`
- `modules/melody-master/style.css`

## Teacher Mode
Teacher Mode still uses the existing classroom scoring/submission logic. The new GCSE-style feedback panel is deliberately kept out of Teacher Mode for now, ready to copy across later after testing in the main app.
