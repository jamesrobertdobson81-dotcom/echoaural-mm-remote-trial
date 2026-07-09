# Melody Master Teacher Mode question-count settings fix

Date: 2026-07-06

## Issue
The Teacher Mode settings modal allowed the teacher to choose a number of questions, but the background polling loop could overwrite the unsaved choice with the previous server value before the teacher pressed **Save Settings**. This made it look as though the number-of-questions setting was not affecting the quiz length.

## Fix
- Added an `isEditingQuizSettings` flag in `modules/melody-master/teacher-mode.js`.
- While the settings modal is open, polling still updates the classroom state, but it no longer overwrites the teacher's local unsaved quiz-length/play-count choices.
- Choosing a new question count or play count marks the settings as needing to be saved again before the quiz starts.
- Existing Teacher Mode functionality, student view, main Melody Master app, scoring, playback and resources are unchanged.

## Expected behaviour
1. Create a Teacher Mode session.
2. Open Settings.
3. Choose 3, 5, 10 or 15 questions.
4. Save Settings.
5. Start Quiz.
6. The quiz runs for exactly the chosen number of questions, then the main button changes to **Finish Quiz**.
