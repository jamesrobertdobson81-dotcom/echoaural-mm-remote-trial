# Melody Master randomised question order

Date: 2026-07-06

## Scope

Navigation/demo build only. No gameplay, scoring, layout, Teacher Mode student feedback, audio, resource, or question-data changes were made.

## Change made

The temporary testing behaviour that always put the newest/last-added Melody Master question first has been removed for the demo build.

### Solo Melody Master

- `modules/melody-master/script.js`
- `ALL_MELODY_CLIPS` now keeps the natural `clips.js` order instead of reversing it.
- Each solo quiz round now builds a shuffled list of question indices and uses the requested number of questions from that shuffled order.

### Teacher Mode / classroom Melody Master

- `server.js`
- `loadMelodyQuestions()` now keeps the natural `clips.js` order instead of reversing it.
- When a classroom quiz starts, the server creates a random question order for that room using the selected quiz length.
- The **Next Question** endpoint advances through that room's random order instead of stepping sequentially through the full question list.

## Future testing note

For adding brand-new questions, the previous newest-first testing shortcut can be reintroduced as a temporary developer-only option later, but it should not be active for demos or production trials.

## Validation

- `npm run check` passed.
- API smoke test confirmed a 5-question Teacher Mode quiz used a random sequence, e.g. `MM002, MM006, MM009, MM008, MM003`.
