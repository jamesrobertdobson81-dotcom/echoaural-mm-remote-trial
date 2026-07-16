# EchoAural Documentation Archive

This archive condenses the earlier step-by-step development notes into one place so the project root and documentation tree stay tidy.

Stable baseline commit: `fe32c27` — `Stable EchoAural baseline before cleanup audit`

## Current Source Of Truth

- Project overview and local commands: `README.md`
- Agent/development rules: `AGENTS.md`
- Application code and routing: live files in `account/`, `accounts/`, `classroom/`, `teacher/`, `student/`, `modules/`, `shared/`
- Validation: `npm run check`

## Archived Development Note Topics

The previous `documentation/dev-notes/` files covered these historical implementation areas:

- Melody Master data-layer updates
- Melody Master GCSE feedback and feedback layout
- Melody Master main app layout, replay flow, RHS feedback and round-score work
- Melody Master teacher-mode question count, student button removal and classroom alignment fixes
- Melody Master randomised question order
- Melodic Intervals placement inside the Melody Master suite
- Texture Trainer MVP, icon wiring, TT001 audio/resource tracking and exam mark display
- Online Teacher Mode / Render deployment notes

Those notes were useful during construction, but they are no longer the current implementation guide. Use the live code and root `README.md` for current behaviour.

## Recovering Full Historical Notes

If the detailed note files are ever needed, recover them from Git history at or before:

```bash
git show fe32c27:documentation/dev-notes/TEXTURE_TRAINER_MVP_NOTES.md
```

Replace the path with the note file needed.

## Rollback Scripts

Older rollback scripts have been moved to:

```text
documentation/archive/rollback-scripts/
```

They are kept for historical reference only. The preferred rollback point is now the Git baseline commit `fe32c27`.
