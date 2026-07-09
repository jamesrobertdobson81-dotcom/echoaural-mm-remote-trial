# Melody Master main-app layout and quiz-flow tweak

Scope: main `modules/melody-master/index.html` app flow only, built on top of the GCSE feedback layout-tweak version.

## Changed

- The unused Melodic Devices mode card is now disabled and labelled `Coming Soon`.
- Melodic Dictation remains the selected live mode so the current app can still be started normally.
- `Advanced Settings` is now labelled `Settings`.
- Settings now provide:
  - Questions per round: `1`, `3`, `5`, `10`
  - Plays per question: `1`, `2`, `3`, `4`
- Defaults are set to:
  - `3` questions per round
  - `3` permitted plays per question
- Pressing `Start Quiz` now loads the first question directly into the expanded score PNG view.
- The first excerpt play starts from the Start Quiz action.
- The old `Play Excerpt` control is now used as a replay control and shows remaining plays.
- The expanded score view is kept during the main app round flow and between questions.

## Preserved

- Existing layout structure and EchoAural visual identity.
- Existing drag/drop note behaviour.
- Existing checking and GCSE feedback logic.
- Existing answer reveal behaviour.
- Existing score expansion mechanism.
- Existing audio, score PNG and question data paths.
- Teacher Mode files were not edited.

## Note

The user wording mentioned putting `Coming Soon` on Melodic Dictation, but the rest of the requested behaviour depends on Melodic Dictation staying live and highlighted. This build therefore applies the disabled `Coming Soon` state to Melodic Devices, while keeping Melodic Dictation selected and functional.
