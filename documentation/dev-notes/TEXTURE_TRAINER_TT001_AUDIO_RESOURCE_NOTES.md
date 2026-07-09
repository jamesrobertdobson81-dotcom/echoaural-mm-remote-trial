# Texture Trainer TT001 audio/resource update

Date: 2026-07-07

## What changed

- Updated `modules/texture-trainer/data/texture-questions.js` so TT001 uses an existing Instrument Identifier solo flute clip.
- TT001 now points to `../instrument-identifier/audio/II201.mp3` instead of the placeholder `audio/tt001.mp3`.
- TT001 prompt is now: `Name the texture.`
- TT001 remains a 1-mark question with the expected answer `Monophonic`.
- Added TT001 source metadata to the answer card object for future resource tracking.
- Created `resources/Texture_Trainer_Resources.xlsx` with resource, licensing, attribution and commercial-use tracking columns.

## Chosen source clip

- Source module: Instrument Identifier
- Source clip ID: II201
- Source path: `modules/instrument-identifier/audio/II201.mp3`
- Instrument: Flute
- Type: Solo
- Composer: Bach
- Work: Partita BWV 1013
- Existing II metadata source: MusOpen
- Existing II metadata rights: PD

## Important licensing note

The II metadata says `MusOpen` and `PD`, but the exact licence/source URL still needs to be verified before commercial release. The new spreadsheet includes columns for licence type/code, licence URL, source page URL, attribution, proof screenshots and commercial-use sign-off.
