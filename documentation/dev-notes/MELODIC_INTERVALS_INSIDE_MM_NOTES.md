# Melodic Intervals placement

Melodic Intervals is treated as an option inside the Melody Master suite, not as a separate top-level homepage app.

Changes:
- Removed the Melodic Intervals card from the EchoAural homepage.
- Added an active Melodic Intervals option card inside `modules/melody-master/index.html`.
- Kept the standalone interval module files in `modules/melodic-intervals/` so the feature remains cleanly isolated and can still support Teacher Mode.
- Hid Melodic Intervals from the shared Teacher Mode top-level module selector while preserving direct access through `teacher/?module=melodic-intervals`.
