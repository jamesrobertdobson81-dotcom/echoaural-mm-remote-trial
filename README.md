# EchoAural 2 — current development baseline

Current baseline: **5 July 2026 wrap-up build**.

EchoAural is a premium GCSE Music listening and revision platform. This build contains:

- the EchoAural landing page
- Instrument Identifier
- Texture Trainer MVP with typed-answer rule-based marking
- Melody Master solo app
- Melody Master Teacher Mode and student classroom flow
- resource-data tooling for Instrument Identifier and Melody Master

## Run locally

From the project folder:

```bash
npm start
```

Then open:

```text
http://localhost:3000/
```

Useful direct pages:

```text
http://localhost:3000/modules/melody-master/index.html
http://localhost:3000/modules/melody-master/teacher-mode.html
http://localhost:3000/modules/instrument-identifier/index.html
http://localhost:3000/modules/texture-trainer/index.html
```

## Check the project before making changes

```bash
npm run check
```

This checks required pages, JavaScript syntax, the Texture Trainer home-page link and the starter Texture Trainer answer-card data.

## Regenerate data files

Instrument Identifier:

```bash
npm run generate:ii
```

Melody Master:

```bash
npm run generate:mm
```

Do not regenerate Melody Master unless the CSV and the existing working layout metadata are both present. The generator is designed to preserve gameplay metadata while refreshing composer/track/licence/resource fields.

## Main working areas

```text
modules/instrument-identifier/
modules/texture-trainer/
modules/melody-master/
shared/css/brand.css
tools/
```

## Texture Trainer MVP notes

Texture Trainer now has TT001 wired to an existing Instrument Identifier solo flute clip:

```text
TT001 -> ../instrument-identifier/audio/II201.mp3
Source clip -> modules/instrument-identifier/audio/II201.mp3
```

Remaining starter questions still use placeholder audio paths:

```text
modules/texture-trainer/audio/tt002.mp3
modules/texture-trainer/audio/tt003.mp3
modules/texture-trainer/audio/tt004.mp3
modules/texture-trainer/audio/tt005.mp3
modules/texture-trainer/audio/tt006.mp3
```

The new resource tracker is here:

```text
resources/Texture_Trainer_Resources.xlsx
```

The answer system is deterministic and client-side only; it does not use OpenAI or any external API. Licensing/source URLs still need final verification before commercial release.

## Current Melody Master principle

The main Melody Master app is now the source for the solo scoring/feedback workflow. Teacher Mode should not be changed until the solo flow is fully approved, then the scoring/feedback logic can be copied across deliberately.


## Texture Trainer icon update

- Texture Trainer MVP is available at `modules/texture-trainer/index.html`.
- The module uses the existing `assets/icons/modules/texture-trainer.svg` icon on the home card and Texture Trainer interface.

## Shared Teacher Mode refactor

The live classroom layer is now separated from Melody Master-specific code. Run the same local server:

```bash
node server.js
```

Then open:

```text
http://localhost:3000/teacher/
http://localhost:3000/join
```

The shared teacher page can create local classroom sessions for:

- Instrument Identifier
- Melody Master
- Texture Trainer

Core classroom files:

```text
classroom/classroom-server.js
classroom/room-manager.js
classroom/scoring.js
classroom/classroom-events.js
teacher/index.html
teacher/teacher.css
teacher/teacher.js
student/join.html
student/student-shell.html
student/student.css
student/student.js
```

Each current module exposes a teacher adapter:

```text
modules/melody-master/teacher-adapter.js
modules/instrument-identifier/teacher-adapter.js
modules/texture-trainer/teacher-adapter.js
```

The old Melody Master Teacher Mode URL redirects to the shared teacher page with Melody Master preselected:

```text
http://localhost:3000/modules/melody-master/teacher-mode.html
```

## Online Teacher Mode / Cloudflare frontend + hosted classroom API

This build is prepared for the next step: keeping the main EchoAural site on Cloudflare while running the live classroom server online as a Node web service.

Recommended production shape:

```text
https://echoaural.com                  -> Cloudflare static/frontend site
https://teacher-api.echoaural.com      -> hosted Node classroom API/server
```

Local use still works without environment variables:

```bash
node server.js
```

Cloudflare/public classroom pages now use `shared/js/classroom-client.js` to decide where classroom API requests should go:

- localhost/private IP pages use same-origin `/api/classroom/...`
- public pages default to `https://teacher-api.echoaural.com`
- temporary testing can override the API with `?classroomApi=https://YOUR-RENDER-SERVICE.onrender.com`

For Render, create a Node Web Service using:

```text
Build command: npm install
Start command: npm start
```

Set these environment variables:

```text
NODE_ENV=production
PUBLIC_SITE_URL=https://echoaural.com
PUBLIC_API_URL=https://teacher-api.echoaural.com
PUBLIC_HOST=teacher-api.echoaural.com
PUBLIC_PROTOCOL=https
ROOM_MAX_AGE_MS=43200000
```

Then add `teacher-api.echoaural.com` as a Render custom domain and create the matching Cloudflare CNAME to the Render service URL.
