# Known Issues

Tracked as of v8.3-visual-guide (2026-07-23). Update this list whenever a release checklist run finds something new, and remove entries once fixed.

## Accepted / by design (not blockers)

- **No real audio files.** All `audioWord*` / `audioSentence*` paths in `data/words.json` point to files that don't exist. The app falls back to `speechSynthesis` silently. This is an intentional, deferred decision — see `docs/WORD_SCHEMA.md` Audio policy. Do not treat as a bug.
- **Single content unit.** Only the "Home" category (75 words) exists. Additional units are planned for v9.0-new-units per `docs/ROADMAP.md`.

## Open technical debt

- **Manifest icon is a placeholder.** `assets/icons/icon.svg` is a simple emoji-on-color-background SVG, added only to satisfy `manifest.webmanifest` having a non-empty `icons` array. SVG manifest icons are not reliably supported for "Add to Home Screen" on iOS Safari. Needs proper PNG icons (192x192, 512x512) before a real mobile install push.
- **No automated tests.** `TESTS.md` is a manual checklist only; nothing runs in CI. `scripts/validate-data.mjs` and `scripts/check-pwa.mjs` cover data/PWA structure but not UI behavior (filters, quiz logic, mastery math).
- **`app.js` is a single ~550-line file** with global state and DOM handling mixed together. Modularization (i18n / storage / audio / quiz / progress / filters / cards / detail) is planned for v8.4-modularization.
- **Two overlapping i18n mechanisms.** The `I18N` object (top-level UI strings) and the `detailText()` dictionary (word-detail-page strings) duplicate the same kind of lookup logic and should eventually merge into one i18n layer.
- **Mastery tracking is not a real spaced-repetition system.** It's a flat point nudge (+15/-5 on quiz, +25/-10 on manual review), not interval-based scheduling. Acceptable for now; flagged for v8.5-learning-engine.
- **Search has no fuzzy/typo tolerance.** `normalize()` only does lowercasing, trimming, and a few Cyrillic/Arabic letter-variant substitutions — no Levenshtein or similar matching.
- **Example variety remains limited.** The high-confidence translation and duplicate-example fixes are complete, but many entries still need a human-authored sentence variation pass before a content-quality release.
- **iOS install icon is incomplete.** The manifest still uses the SVG icon only; add verified PNG icons and an `apple-touch-icon` before promoting mobile installation.

## Verified working (do not re-flag without checking)

- Dark mode preference now persists via `localStorage` (`theme` key) — fixed in v8.3-cleanup.
- Progress (`mastery`, `savedWords`, `quizStats`, `uiLang`, `density`, `theme`) all persist across reloads via `localStorage`.
- Service worker registers, manifest is valid, page title is current — confirmed via `node scripts/check-pwa.mjs` (PASS).
- `data/words.json` has no duplicate ids, missing images, or missing required fields — confirmed via `node scripts/validate-data.mjs --audio=ignore` (PASS).
