# Roadmap

## v8.3-cleanup

- [x] Fix stale HTML title.
- [x] Register service worker.
- [x] Add data validation script.
- [x] Decide audio policy — keep speechSynthesis fallback for now; real audio recording is deferred to a later phase (see `docs/WORD_SCHEMA.md` Audio policy).
- [x] Save dark mode preference.
- [x] Document known issues (see `docs/KNOWN_ISSUES.md`).

## v8.4-modularization

- Split `app.js` into modules.
- Separate i18n, storage, audio, quiz, progress, filters, cards, and detail page.
- Preserve current behavior.

## v8.5-learning-engine

- Introduce learning states: new, learning, review, known, mastered.
- Improve quiz weighting.
- Add error-based review.

## v9.0-new-units

- Add one new unit at a time.
- Recommended first units: restaurant, university, work, supermarket, transportation.
- Require validation before release.

## v10.0-platform

Only consider this after stable content and modular frontend:

- React + TypeScript migration.
- Backend.
- User accounts.
- Cloud progress sync.
- Content dashboard.
