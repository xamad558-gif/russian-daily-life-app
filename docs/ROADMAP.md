# Roadmap

## Release completion criteria

A release is complete when:

- `node scripts/validate-data.mjs --audio=ignore` passes with zero errors.
- `node scripts/check-pwa.mjs` has no errors and every warning is documented.
- The version appears consistently in the app, service worker, README, changelog, and checklist.
- Manual UI checks are recorded in `TESTS.md`, and unresolved work is tracked in `docs/KNOWN_ISSUES.md`.

## v8.3-cleanup

- [x] Fix stale HTML title.
- [x] Register service worker.
- [x] Add data validation script.
- [x] Decide audio policy — keep speechSynthesis fallback for now; real audio recording is deferred to a later phase (see `docs/WORD_SCHEMA.md` Audio policy).
- [x] Save dark mode preference.
- [x] Document known issues (see `docs/KNOWN_ISSUES.md`).

Release notes: [`CHANGELOG.md`](../CHANGELOG.md#v83-cleanup).

**Definition of complete:** Data validation passes, the version is synchronized across release files, and remaining audio/PWA limitations are documented.

## v8.3-visual-guide

Status: core visual refresh implemented; release follow-ups remain open.

- [x] Add a real-image hero with progress and review action.
- [x] Add clickable room cards connected to vocabulary filters.
- [x] Give A1, A2, and B1 words distinct visual level badges.
- [x] Keep the layout responsive for Arabic RTL and Russian/English LTR.
- [x] Update the cache version and release documentation.
- [x] Add verified 192x192 and 512x512 PNG PWA icons plus `apple-touch-icon`.
- [ ] Complete the human-authored sentence-variety pass for the unit.

Release notes: [`CHANGELOG.md`](../CHANGELOG.md#v83-visual-guide). Tracking: [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md).

**Definition of complete:** The visual checks pass on desktop and mobile, data/PWA validation passes, release files are synchronized, and the two remaining follow-ups are either completed or explicitly accepted for the release.

## v8.4-modularization

- [x] Extract local storage behind `js/storage.js`.
- [x] Extract audio playback and speech fallback behind `js/audio.js`.
- [x] Extract quiz rendering, scoring, and feedback behind `js/quiz.js`.
- [x] Extract progress, mastery, and metric updates behind `js/progress.js`.
- [x] Extract search, sorting, room navigation, and filters behind `js/filters.js`.
- [x] Extract card templates, audio controls, favorites, and card interaction handlers behind `js/cards.js`.
- [x] Extract word detail rendering, examples, grammar, and gender comparison behind `js/detail.js`.
- [x] Extract language switching, view state, theme, density, and sidebar controls behind `js/ui.js`.
- [x] Extract translations, language labels, and pronunciation helpers behind `js/i18n.js`.
- [x] Split feature logic from `app.js` into modules.
- [x] Separate i18n, storage, audio, quiz, progress, filters, cards, and detail page.
- [x] Preserve current behavior.
- [x] Extract startup, event binding, review rendering, and hero rendering behind `js/controller.js`.

**Definition of complete:** The module boundaries are documented, all existing data/UI behavior remains intact, and the full validation plus manual checklist passes.

## v8.5-learning-engine

- [x] Introduce learning states: new, learning, review, known, mastered.
- [x] Schedule review intervals of 1, 3, 7, and 30 days.
- [x] Prioritize lower-mastery and due words in the quiz.
- [x] Add error-based review with immediate due dates.

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
