# Melody Master Teacher Mode – MM013 classroom alignment fix

Baseline used: `EchoAural_2_MM_teacher_finish_feedback_fix.zip`.

## Issue fixed

In the Teacher Mode student view, MM013 looked one stave-step out visually: the correct musical answer is:

`G G E F F D`

but the classroom student page only appeared to mark notes green when they were visually placed as:

`A A F G G E`

The underlying MM013 answer data in `clips.js` was already correct. The problem was a classroom-rendering alignment mismatch for the mixed quaver/crotchet note PNGs on MM013.

## Change made

Changed only `modules/melody-master/script.js`.

Added a classroom-only visual-anchor helper so that, when the student view is running in Teacher Mode and the active question is MM013, the classroom renderer uses the standard note-art visual anchor for the draggable quaver/crotchet PNGs.

This keeps the musical answer and scoring data untouched while making the green/red marking line up with what students see on the stave.

## Not changed

- Main/solo Melody Master app behaviour
- MM013 answer pitches
- audio/question/image paths
- Teacher control screen layout
- leaderboard/final feedback flow
- server scoring
- resource data

## Validation

Ran:

```bash
npm run check
```

Result: JavaScript syntax passed and 15 Melody Master questions validated.
