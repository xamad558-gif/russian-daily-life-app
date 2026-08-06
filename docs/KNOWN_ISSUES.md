# Known Issues

Tracked as of v8.3-visual-guide (2026-07-26). Update this list whenever a release checklist run finds something new, and remove entries once fixed.

## Accepted / by design (not blockers)

- **No real audio files.** All `audioWord*` / `audioSentence*` paths in `data/words.json` point to files that don't exist. The app falls back to `speechSynthesis` silently. This is an intentional, deferred decision — see `docs/WORD_SCHEMA.md` Audio policy. Do not treat as a bug.
- **Single content unit.** Only the "Home" category (75 words) exists. Additional units are planned for v9.0-new-units per `docs/ROADMAP.md`.

## Open technical debt

- **Browser smoke test depends on the CI/runtime browser.** `npm run test:e2e` covers the main language/card/quiz/offline flow locally; the repository workflow installs Chromium before running it.
- **`app.js` remains the orchestration entry point.** Feature logic now lives under `js/`; the remaining cleanup is limited to further reducing its event wiring and startup code.
- **Search has no fuzzy/typo tolerance.** `normalize()` only does lowercasing, trimming, and a few Cyrillic/Arabic letter-variant substitutions — no Levenshtein or similar matching.
- **Example variety remains limited.** The high-confidence translation and duplicate-example fixes are complete, but many entries still need a human-authored sentence variation pass before a content-quality release.

## Verified working (do not re-flag without checking)

- Dark mode preference now persists via `localStorage` (`theme` key) — fixed in v8.3-cleanup.
- Progress (`mastery`, `learningState`, `savedWords`, `quizStats`, `uiLang`, `density`, `theme`) all persist across reloads via `localStorage`.
- Service worker registers, manifest is valid, page title is current — confirmed via `node scripts/check-pwa.mjs` (PASS).
- `data/words.json` has no duplicate ids, missing images, or missing required fields — confirmed via `node scripts/validate-data.mjs --audio=ignore` (PASS).
