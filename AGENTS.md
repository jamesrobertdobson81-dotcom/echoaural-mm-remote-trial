# EchoAural Development Rules

EchoAural is an established, functioning application.

Preserve all existing gameplay, question logic, scoring, marking, feedback, teacher mode, student mode, classroom behaviour, progression, tracking, accounts, login flows, routes, navigation, audio behaviour, assets, question data, branding, layout, sizing, browser-window fit and responsive behaviour unless the requested task explicitly requires a change.

Before editing:

* Read the relevant existing implementation.
* Check Git status.
* State which live files need changing.
* Make the smallest focused change possible.
* Do not edit backup copies.

After editing:

* Run `npm run check`.
* Run any relevant targeted tests.
* Review the complete Git diff.
* Report exactly which files changed.
* Report what was tested.

Restrictions:

* No unrelated cleanup or refactoring.
* No redesign unless explicitly requested.
* Do not remove, rename or move assets.
* Do not change `.env`, credentials, production data or deployment configuration unless explicitly requested.
* Do not install packages unless necessary and explicitly explained.
* Do not commit, push or deploy unless explicitly instructed.
* Never push to a remote repository without explicit permission.
