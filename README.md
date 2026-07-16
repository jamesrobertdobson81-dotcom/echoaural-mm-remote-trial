# EchoAural — Current Stable Baseline

Stable baseline commit: `fe32c27` — `Stable EchoAural baseline before cleanup audit`

EchoAural is a GCSE Music listening platform with student accounts, teacher accounts, classroom live sessions, practice mode, progress mode, homework foundations, and levelled listening activities.

## Current Application Areas

- Public landing page and Founding Partners page
- Teacher signup, login and onboarding
- Student login and dashboard
- Teacher dashboard with class, student and progress views
- Shared live-session Teacher Mode and student join flow
- Instrument Identifier
- Melody Master Dictation
- Melodic Intervals
- Texture Trainer

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

The check validates required files, JavaScript syntax, Texture Trainer starter data, and the four Melodic Intervals progression levels.

## Core Files

```text
server.js
accounts/
account/
classroom/
teacher/
student/
modules/
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

Currently levelled:

- Instrument Identifier
- Melody Master Dictation
- Melodic Intervals

Texture Trainer remains present in the app set, with future level progression still to be developed.

## Teacher Dashboard

The teacher dashboard is now the launch hub for:

- live sessions
- homework setup foundations
- class progress
- individual student progress
- student account/class management

The internal `/teacher/` route remains the stable live-session runtime for room codes, live leaderboard, audio controls and submissions.

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

Detailed historical content is also recoverable through Git history before and at the stable baseline commit.
