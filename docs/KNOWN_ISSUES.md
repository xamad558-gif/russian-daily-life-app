# Known Issues

Tracked as of v8.3-visual-guide (2026-07-26). Update this list whenever a release checklist run finds something new, and remove entries once fixed.

## Accepted / by design (not blockers)

- **No real audio files.** All `audioWord*` / `audioSentence*` paths in `data/units/home.json` point to files that don't exist. The app falls back to `speechSynthesis` silently. This is an intentional, deferred decision — see `docs/WORD_SCHEMA.md` Audio policy. Do not treat as a bug.
- **Single content unit.** Only the "Home" unit (75 words) exists under `data/units/`. Additional units are planned for v9.0-new-units per `docs/ROADMAP.md`.

## Open technical debt

- **`data/words.json` is deprecated but not yet deleted.** The app and every script now read `data/units/home.json` instead (Phase 3 of the unit migration, see `docs/UNIT_ARCHITECTURE.md`). The legacy file is kept only until a full, repeated `npm run test:e2e` pass confirms the migration end to end — see the next item.
- **`npm run test:e2e` is currently unreliable in low-memory conditions.** On a machine with very little free RAM, the full browser smoke test intermittently fails its first assertion (`net::ERR_FAILED` fetching app data) even though direct fetch tests, static validation, and a forced service-worker-controlled reload all succeed. Root cause not fully isolated; strongly correlated with available system memory rather than a specific code path (reproduced even against the pre-migration `data/words.json`, and persisted after reducing the service worker's install-time precache from ~95 files to ~20). Retry on a machine/session with more free memory before treating a failure here as a real regression.
- **Browser smoke test depends on the CI/runtime browser.** `npm run test:e2e` covers the main language/card/quiz/offline flow locally; the repository workflow installs Chromium before running it.
- **`app.js` remains the orchestration entry point.** Feature logic now lives under `js/`; the remaining cleanup is limited to further reducing its event wiring and startup code.
- **Search has no fuzzy/typo tolerance.** `normalize()` only does lowercasing, trimming, and a few Cyrillic/Arabic letter-variant substitutions — no Levenshtein or similar matching.
- **Advanced example variety is not yet applicable.** A1 examples remain intentionally short, and all A2 entries now use additional household contexts; B1 examples will be added when the unit contains B1 vocabulary.

## Verified working (do not re-flag without checking)

- Dark mode preference now persists via `localStorage` (`theme` key) — fixed in v8.3-cleanup.
- Progress (`mastery`, `learningState`, `savedWords`, `quizStats`, `uiLang`, `density`, `theme`) all persist across reloads via `localStorage`.
- Service worker registers, manifest is valid, page title is current — confirmed via `node scripts/check-pwa.mjs` (PASS).
- `data/units/home.json` has no duplicate ids, missing images, or missing required fields — confirmed via `node scripts/validate-data.mjs --audio=ignore` (PASS).
- `data/units.json` and every referenced unit file pass `node scripts/validate-units.mjs` (PASS).
