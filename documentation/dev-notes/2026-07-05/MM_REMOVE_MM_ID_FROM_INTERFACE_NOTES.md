# Melody Master: remove MM IDs from main interface

Scope: main Melody Master app display text only.

Changed:
- Removed the MM question ID from the top round label.
- Active quiz header now displays only `Question X of Y`.
- Landing/ready state now displays `Ready` rather than `MM001 Ready`.
- Removed the MM question ID from the central track/composer info tile.
- Central track info tile now uses the neutral kicker `Track information`.
- Round feedback question rows now display `Question 1`, `Question 2`, etc. rather than internal MM IDs.

Preserved:
- Gameplay, drag/drop, audio, replay/play limits, submit/check-again/reveal flow, round feedback window, RHS answer panel, Teacher Mode/classroom files, question data and track metadata.

Validation:
- `node --check modules/melody-master/script.js` passed.
