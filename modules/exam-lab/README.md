# EchoAural Exam Lab

Eleven self-contained question sets using supplied audio extracts, with skeleton scores where required. Exam Lab is available both as independent practice and as an authenticated, teacher-controlled Classroom Live activity. EXL009 and EXL010 are reserved for later addition.

## Included

- two-tile Exam Lab interface
- EchoAural topbar, waveform logo and visual branding
- large skeleton-score panel
- narrower answer sheet
- four-play audio lock with no seeking/native controls
- EXL001: seven questions / nine marks
- EXL002: eight questions / nine marks
- EXL003: eight questions / ten marks
- EXL004: seven questions / ten marks
- EXL005: eight questions / ten marks
- EXL006: eight questions / ten marks
- EXL007: seven questions / ten marks
- EXL008: twelve questions / twelve marks
- EXL011: eleven questions / eleven marks (score-free)
- EXL012: eleven questions / eleven marks (score-free)
- EXL013: eleven questions / eleven marks (score-free)
- deterministic marking and model answers
- Cambridge requirement IDs and skill tags per question
- targeted route metadata for smaller EchoAural apps
- local result persistence under `ea.examLab.results.v1`
- `examlab:completed` browser event for later dashboard/classroom integration

## Shared architecture

- `marking.js` is the deterministic marking engine used by both modes.
- `core/exam-lab-core.js` validates extracts, validates raw answer payloads, marks complete extracts, and builds private student/class outcomes.
- `server-data.js` loads and validates enabled production extracts and their assets on the server.
- `teacher-adapter.js` connects the shared core to the existing Classroom Live room system.
- Classroom API payloads use neutral question IDs and room-scoped score/audio URLs. They do not contain internal extract IDs, answer keys, mark points, model answers, feedback, routes, or source metadata before release.

## Open directly

Open `index.html`, or serve the project normally and visit:

`/modules/exam-lab/index.html`

EXL008 opens by default. The extract selector can open any installed set. Direct links use:

`/modules/exam-lab/index.html?extract=EXL001` through `/modules/exam-lab/index.html?extract=EXL008`, plus `EXL011`, `EXL012` and `EXL013`

## Classroom Live

Teachers launch Exam Lab from Teacher Dashboard’s **Start Exam Lab** action. The dashboard offers existing active-class selection but deliberately has no extract picker. The existing Classroom Live server creates the room, selects one whole enabled extract, stores that selection privately in the in-memory room, and returns the standard room code and join link.

The selected extract does not change on polling, student reconnect, or teacher refresh while that room survives. A bounded two-item recent list is held per teacher in server memory. With the current eleven extracts, selection prefers an extract outside that teacher’s last two sessions and falls back to the complete pool if no non-recent option exists. This recent list does **not** survive a server restart; persisting it did not justify a new database subsystem at this stage.

Exam Lab rooms require an authenticated teacher. Students must use an active EchoAural student account belonging to that teacher, and must belong to the selected class when a class is specified. Teacher control endpoints verify room ownership. The score asset is served only to the owner or a joined authorised student; the audio asset is served only to the owning teacher. Student state contains neither an audio path nor playback controls.

The server accepts raw answers only, resolves the extract from private room state, ignores client extract/score/maximum values, validates neutral question IDs, and marks through the shared core. Feedback stays private until the teacher finishes. Finished results are written through the existing `rounds` and `attempts` persistence: one Exam Lab round per student and one attempt per extract question, including protected raw responses, marks, skill outcomes, route metadata, class context, room/round IDs, and `attemptSource: classroom_live`. No database migration is required.

Teacher Dashboard groups saved student rounds by room and classroom round. It derives the class summary, accessible question analysis, skill analysis, individual outcomes, and teacher-reviewed recommendations from those persisted records. Recommendations never assign homework automatically. Live routes currently lead to Melodic Intervals, Melody Master, Instrument Identifier, and Meter Master. Key and Tonality Practice, Dynamics Practice, Cadence Coach, and Context & Style remain planned and render without broken links.

## Progression data

Each `ExamLab_EXL00x_Cambridge_Skill_Map.csv` file records the Cambridge requirement IDs, skill tags and recommended trainer route for its extract.

## Verification

Run `npm run check:exam-lab` for the focused integration assertions, or `npm run check` for the complete project checks plus Exam Lab. Browser/audio alignment still requires a manual teacher-and-two-student session; automated checks do not claim musical revalidation or listening alignment.
