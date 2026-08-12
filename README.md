# EchoAural

EchoAural is a GCSE/iGCSE Music listening platform with student accounts, teacher accounts, classroom live sessions, practice mode, progress mode, and a full set of levelled listening activities covering the Cambridge syllabus areas (AoS4–7).

## Local Development

```bash
npm start
```

Then open:

```text
http://localhost:3000/
```

Useful direct routes:

```text
http://localhost:3000/account/teacher-login/
http://localhost:3000/account/student-login/
http://localhost:3000/account/teacher-dashboard/
http://localhost:3000/account/student-home/
http://localhost:3000/teacher/
http://localhost:3000/join
```

## Validation

Run this before and after application changes:

```bash
npm run check
```

This runs `tools/check-project.js`, `tools/check-skill-metadata.js`, the full Node test suite (Exam Lab, Context Coach, Ensemble Recognition, Harmony Explorer's key-signature sprint, Progress Mode, and shared spaced-repetition logic), and `tools/check-exam-lab-integration.js`. All of it should stay green — a failing check almost always means either a real regression or a stale fixture that needs updating alongside the change that caused it, not something to skip.

## Listening & Learning Modules

All live in `modules/`, except Context Coach which lives at the project root in `era-explorer/` (its in-app brand name is "ContextCoach"):

- **Instrument Identifier** — timbre/sound-source recognition, plus country-of-origin ensemble questions
- **Ensemble Recognition** — identify the performing ensemble from an extract
- **Melody Master** — melodic dictation (drag notes onto a stave) and melodic-devices multiple choice
- **Melodic Intervals** — interval ear-training, reached via Melody Master's own navigation
- **Texture Trainer** — texture type, density and change
- **Meter Master** — simple/compound and duple/triple metre recognition
- **Harmony Explorer** — tonality, harmonic rhythm, and a Key Signature Sprint sub-app
- **Context Coach** (`era-explorer/`) — composer and musical-period recognition, generated from a shared clip catalogue with a content-review curation layer (see `era-explorer/data/context-coach-curation.json`)
- **Chord Identifier**, **Transposition Dictation**, **Cadence Coach**, **Musical Language** (public brand name "ScoreDecoder") — reached via Progress Mode and other apps' own navigation, not always linked directly from the homepage
- **Exam Lab** — full past-paper-style listening extracts (EXL001–EXL023+), with typed/MC/rhythm-choice questions and Cambridge skill-map CSVs per extract
- **Progress Mode** (`modules/progress-mode/`) — composes a mixed round across whichever of the above apps are wired into its driver registry (`app-drivers.js`), embedding each app's own UI in an iframe rather than reimplementing it

## Core Files

```text
server.js
accounts/
account/
classroom/
teacher/
student/
modules/
era-explorer/
shared/
tools/
db/
resources/
```

## Progress Modes

Student dashboard app launches are split into:

- `Practice Mode` — students practise independently; account score results are not recorded, but practice time is logged.
- `Progress Mode` — students work through Foundation, Developing, Securing and Mastering; results are recorded for student and teacher dashboards.
- `Join live session` — students enter a live-session room code and use the shared classroom flow.

Foundation/Developing/Securing/Mastering is the shared level vocabulary across the platform, but how far each app's own content is actually leveled (vs. mixed-difficulty) varies by app and is still growing — check an app's own data file or driver entry in `modules/progress-mode/app-drivers.js` for its current state before assuming full level coverage.

## Teacher Dashboard

The teacher dashboard is the launch hub for:

- live sessions
- homework setup foundations
- class progress
- individual student progress
- student account/class management

The internal `/teacher/` route remains the stable live-session runtime for room codes, live leaderboard, audio controls and submissions.

## Content Review Pipeline

New candidate content (new questions, new clips) gets reviewed before going live via `review-staging/` — a set of generic review tools (`review-staging/shared/review-engine.js` + `review-shell.js`, driven by per-app `data/*-draft.js` files) at `http://localhost:3000/review-staging/`. This is draft/scratch tooling, not part of any live app. A reviewed export gets folded into the relevant app's live data by hand, following the drop/keep/edit decisions and notes in the export.

## Resource Generation

Instrument Identifier:

```bash
npm run generate:ii
```

Melody Master:

```bash
npm run generate:mm
```

Only regenerate resources when the source data and layout metadata are available and the generated output can be checked visually.

## Email Testing

```bash
npm run email:test -- recipient@example.com
```

Email delivery uses environment variables. Do not commit `.env`.

## Database

```bash
npm run db:check
npm run db:migrate
npm run onboarding:migrate
```

Local database helper scripts remain in `tools/`.

## Deployment Notes

Render deployment configuration is in:

```text
render.yaml
```

Do not push or deploy without explicit permission.

## Documentation Archive

Historical development notes have been condensed into:

```text
documentation/archive/INDEX.md
```

Detailed historical content is also recoverable through Git history.
