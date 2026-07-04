# Melody Master Teacher Mode — Laptop Clean Rebase

This build deliberately uses the original working Melody Master desktop gameplay as the student laptop interface.

## What is different from the experimental student builds

The student laptop page now loads the real Melody Master interface and gameplay engine:

- same three-panel Melody Master layout
- same EchoAural/Melody Master branding
- same expanded score placement code
- same draggable note sizing code
- same notehead alignment and pitch snapping
- same drag/focus zoom behaviour
- same answer pitch data from `clips.js`

Teacher Mode is now a thin classroom layer around the real app instead of a separate cloned student interface.

## Run

From the unzipped `EchoAural 2` folder:

```bash
node server.js
```

Teacher opens:

```text
http://localhost:3000/modules/melody-master/teacher-mode.html
```

Students use the short join link shown on the teacher screen, usually:

```text
http://YOUR-LAPTOP-IP:3000/join
```

Students enter their name and the join code shown on the teacher screen.

## Classroom flow

1. Teacher creates a session.
2. Students join from laptops using `/join` and the room code.
3. Students wait on the branded waiting screen.
4. Teacher presses Play Excerpt.
5. Student laptops switch to the real Melody Master interface.
6. The score expands using the original Melody Master placement/size logic.
7. Students drag the notes using the original Melody Master note behaviour.
8. Students press Submit Answer.
9. Teacher sees submitted/not submitted and leaderboard.

## Preserved from normal Melody Master

The normal solo app remains at:

```text
modules/melody-master/index.html
```

Only a Teacher Mode topbar link was added to the solo page.

## Important design note

This build intentionally parks the phone/tablet work and guided scrolling experiments. Those can be revived later, but laptop Teacher Mode should now be developed from this clean rebase so gameplay stays stable and question-adding remains easy.


## Latest fix: laptop student path/base rebase

The laptop student page now sets `<base href="/modules/melody-master/">` so that the reused main Melody Master engine loads question PNGs, audio paths and draggable note PNGs exactly as it does from the original desktop app. This avoids the `/join` shortcut resolving `questions/...` and `assets/...` from the wrong folder.

## Latest teacher interface update: simplified quiz controls

The teacher control panel is now simplified around one main changing button:

1. **Settings** — opens a branded EchoAural popup to choose quiz length and plays allowed per question.
2. **Start Quiz** — starts Question 1 using the selected settings.
3. **Play Again** — plays the current excerpt through the teacher device/speakers with the existing two-second lead-in.
4. **Next Question** — appears when the selected play limit has been reached.
5. **Finish Quiz** — appears at the end of the final question.

Only two supporting controls remain in the centre panel:

- **Close Submissions**
- **End Quiz**

The track information remains visible, the instruction line now reads **Complete the melody**, and the green status box reports the current quiz state, for example:

```text
Question 1/5 started · 4/4 plays remaining · submissions open.
```

The student laptop interface and main Melody Master gameplay were not changed in this update.

## Teacher Controls refinement

This build keeps the working laptop student Melody Master interface unchanged and only simplifies the teacher control panel.

- The small plays-remaining pill in the top-right of the Teacher Controls panel has been removed.
- Composer / track information appears only once, under the Teacher Controls heading.
- The task line now remains as: “Complete the melody”.
- The green classroom status tile now sits above the control buttons and shows the quiz question / plays remaining information.
- After settings are saved, the main button becomes Start Quiz.
- Pressing Start Quiz starts Question 1 and triggers the first play.
- Play Again triggers audio immediately, without the two-second delay.
- When the selected number of plays has been used, the main button changes to Next Question or Finish Quiz.


## Teacher panel spacing patch

Removed the visible “Complete the melody” task pill from the teacher centre controls pane and increased spacing around the question title, progress/status tile, and action buttons. Student laptop gameplay and layout were not changed.


Update: teacher top-centre panel status tile now sits below the track information while the track info remains in its fixed gameplay position.

## Leaderboard accumulation update

This build keeps the leaderboard totals across the whole quiz instead of resetting them after each question.

- Current-question submitted/not submitted status still resets for each new question.
- Quiz totals now carry forward across questions.
- Leaderboard ranking is based on cumulative quiz score, then cumulative percentage, then number of questions submitted.
- Starting a brand-new quiz from Settings / Start Quiz clears the cumulative totals for the new quiz.
- Ending a quiz leaves the final cumulative leaderboard visible for review.


### Testing multiple students on one computer

The laptop student page now uses a per-tab classroom identity via `sessionStorage`. This means two tabs in the same browser can join the same room as two separate test students, as long as each tab submits with its own name. Refreshing a tab keeps that tab's student identity, but opening a new tab creates a new temporary student identity.

## Teacher layout update

This build moves the cumulative leaderboard into the full-height right panel and places joined students in the lower centre panel. Both lists use density classes so rows shrink as more students join, keeping the teacher page on one screen without scrolling on normal laptop/desktop displays. Student gameplay is unchanged.


## Leaderboard top-ten update

The teacher leaderboard now displays only the top 10 students. If fewer than 10 students have joined, it shows all available leaderboard rows. Cumulative quiz scoring is unchanged; this only limits the number of visible leaderboard rows so the teacher page remains stable on one screen.

## Student name validation update

This build adds server-side student name checks for classroom use:

- Names must be unique within each room/quiz, ignoring case and punctuation-style differences.
- If a name is already taken, the student is asked to add an initial or number.
- Basic school-safe profanity filtering is enforced on the server so it cannot be bypassed from the browser.
- Existing teacher layout, leaderboard layout, student gameplay, and scoring behaviour are otherwise unchanged.


## Name safety update

Student display names are checked server-side for duplicate names and school-inappropriate language. The filter now catches common profanity both as separate words and when joined to other words.

## Stronger school-safe name filter update

The student display-name filter now normalises names before checking them. It strips spaces and punctuation, applies common character substitutions, and checks joined-up/embedded profanity patterns such as spaced, punctuated, or repeated-letter variants. This is server-side only; teacher layout, leaderboard layout, student gameplay, and scoring behaviour are unchanged.


## Latest small visual patch

Teacher Mode buttons in the Melody Master topbar now use the same structure and styling as the Teacher Mode button on the main EchoAural index page, including the `teacher-mode.svg` navigation icon. No teacher logic, student gameplay, leaderboard, join flow, or name filtering was changed.


## Remote friends/family trial build

This build lets student laptops play the excerpt locally when the teacher presses Play. Students should click **Enable audio for remote play** after joining. The teacher still controls Play, Play Again, Next Question, submissions, and the leaderboard.

For online hosting, the server now builds join links from the public HTTPS host automatically when deployed, while still using the local Wi-Fi IP for local testing.
