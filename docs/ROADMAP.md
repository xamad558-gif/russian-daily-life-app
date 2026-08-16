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
- [x] Apply level-aware examples: controlled A1 sentences and contextual A2 sentences.
- [ ] Add B1 vocabulary and richer B1 sentence patterns when the unit expands.

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

Phase mapping: **Phase 0–3** in [`UNIT_ARCHITECTURE.md`](UNIT_ARCHITECTURE.md) complete `v9.0`; **Phase 4–5** complete `v9.1`; **Phase 6** adds content within `v9.x`; **Phase 7** begins `v10.0-platform`.

- [x] Phase 0: add the unit registry contract, validator, stable-ID checks, and a minimal second-unit fixture.
- [x] Phase 0: replace hard-coded word counts in tests with counts from the currently loaded unit.
- [x] Phase 1: create `data/units.json` and the unit loader while keeping the legacy source temporarily.
- [x] Phase 1: add domain methods to `js/storage.js` and migrate every direct storage caller before adding new persistence features.
- [x] Phase 2: add an explicit active-unit selector and load one unit at a time.
- [x] Phase 2: move room metadata, labels, icons, and cover images into unit data.
- [x] Phase 2: keep `subCategory` for rooms and reserve `unitId` for learning units.
- [x] Phase 3: update filters, review, quiz, progress, audio checks, PDF generation, and service-worker rules.
- [x] Phase 3: remove `data/words.json` only after every consumer uses the unit loader.
- [x] Phase 6: add the reviewed Restaurant starter unit with local photographs, multilingual content, unit routing, and automated validation.
- Recommended first new units: restaurant, university, work, supermarket, transportation.
- Require validation and responsive E2E checks before every unit release.

**Definition of complete:** One source of truth exists under `data/units/`, existing IDs and local progress remain valid, the active-unit selector works in all three interface languages, and static/E2E/PDF checks pass.

## v9.1-learning-modes

- [ ] Redesign progress around new, learning, due, known, and mastered states.
- [ ] Separate favorites from scheduled reviews.
- [ ] Sort progress by review priority and show the next due date.
- [ ] Add a direct “Start review” action for due words.
- [ ] Add a flashcard mode with self-assessment first.
- [ ] Add fill-in-the-blank, matching, and listening modes as separate iterations.
- [ ] Defer free Cyrillic recall until input validation is designed and tested.

**Definition of complete:** Progress and review use the same learning-state rules, every mode records an answer consistently, and each mode has an automated smoke test.

## v10.0-platform

Only consider this after stable content and modular frontend:

- React + TypeScript migration.
- Backend.
- User accounts.
- Cloud progress sync.
- Content dashboard.

### Database preparation during v9

- Keep word IDs globally unique and permanent; never rename `home50_*` or `home75_*`.
- Keep content versioned as static unit files; do not duplicate content in browser storage.
- Add a repository boundary in `js/storage.js` so the current localStorage adapter can later be replaced by an API adapter.
- Store `activeUnit`, settings, and anonymous progress locally; do not make the UI depend directly on localStorage keys.
- Treat unit-level progress and overall progress as derived views, not separate sources of truth.

### Future user-data model

- `users`: account identity and timestamps.
- `user_settings`: interface language, learning language, theme, density, and active unit.
- `word_progress`: user ID, permanent word ID, mastery, state, interval, streak, due date, answer counters, and timestamps.
- `review_events` (optional): immutable answer history for analytics and conflict resolution.
- Favorites should be a user-word relation or a field in `word_progress`, not part of the content files.

**Database migration rule:** On first sign-in, merge anonymous local progress into the account once; keep existing word IDs so no progress migration is required when units are split. Prefer an API/repository adapter with offline queue and explicit conflict handling over direct database calls from UI modules.

**Definition of complete:** Authentication, server-side authorization, sync retries, offline reconciliation, local-progress migration, and privacy/data-deletion flows are tested before cloud progress becomes the default.
