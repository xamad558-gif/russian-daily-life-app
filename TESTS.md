# v8.3 Visual Guide Tests

## Programmatic checks
- `data/units/home.json` contains 75 words (inside a unit file, under its `words` array).
- Every word has Russian, Arabic, and English word-pronunciation fields for the available learner bridges.
- Every word has `transliterationAr`, `exampleTransliterationAr`, `exampleTransliterationEn`, and `exampleArTransliterationRu`.
- `node scripts/complete-arabic-vocalization.mjs` rebuilds all 600 Arabic vocalization fields without unknown tokens.
- `node scripts/complete-arabic-pronunciation-ru.mjs` rebuilds all 450 nested Cyrillic pronunciation fields.
- `node scripts/validate-arabic.mjs` reports Arabic content and learning-field coverage.
- `node scripts/audio-smoke.mjs` verifies that speech uses the source word, not its transliteration, and selects a matching voice.
- `node scripts/validate-units.mjs` validates `data/units.json` and every referenced unit file (see `docs/UNIT_ARCHITECTURE.md`). It rejects an empty registry, missing registry/unit/room fields, duplicate unit ids, duplicate room ids within a unit, and duplicate word ids across units; it only reports `SKIPPED` if no registry file exists at all.
- `node scripts/validate-units.mjs --registry=scripts/fixtures/units/units.json` proves the unit-registry contract against fixtures independent of production content.
- `npm run test:static` no longer hard-codes the vocabulary word count; `scripts/e2e-smoke.mjs` derives it from the loaded unit.
- The app loads words through `data/units.json` (unit registry) via `js/units.js`, which fetches the active unit's `dataPath` — `data/units/home.json` for Home. `js/units.js` retries the registry/unit fetch twice with backoff, and checks every returned word's `unitId` matches its unit at runtime (not just in static validation).
- The legacy flat `data/words.json` is deprecated and unread by any code path; see `docs/KNOWN_ISSUES.md` for why it has not been deleted yet.
- `js/storage.js` exposes only domain methods (`loadSettings`/`saveSettings`, `loadProgress`/`saveProgress`, `loadFavorites`/`saveFavorites`, `loadQuizStats`/`saveQuizStats`). Feature modules no longer call `localStorage` keys directly; all raw key names live inside `js/storage.js`. Existing `localStorage` keys (`uiLang`, `learningLanguage`, `lastRoom`, `density`, `theme`, `mastery`, `learningState`, `savedWords`, `quizStats`) are unchanged, plus a new `activeUnit` key.
- Room metadata (labels, icons, images, tone) is no longer hard-coded in `app.js` (`ROOM_FEATURES` is removed) or duplicated per-language in `js/i18n.js` (`categories`/`categoryIcons` are removed). Rooms are loaded from the active unit's `rooms` array inside `data/units/home.json` via `state.rooms`, with `AppI18N.roomLabel()`/`roomIcon()` resolving the label/icon for the current interface language. The registry (`data/units.json`) carries no room data itself, only unit metadata (title, description, cover image, icon, `dataPath`).
- The sidebar has an explicit unit selector (`#unitMenu`) rendered from `data/units.json`, localized in all three interface languages. Selecting a unit reloads that unit's words and rooms, resets filters, and persists `activeUnit`. `#unit/<id>` in the URL activates that unit on initial load (deep-linkable), independent of the existing `#word/<id>` routing.
- `scripts/validate-units.mjs` requires every unit file to be the full enveloped format (`{schemaVersion, unitId, contentVersion, rooms, words}`) — the legacy bare-array fallback was removed once Home's migration completed.
- `node scripts/validate-arabic.mjs --edition=ru-ar` must pass before releasing the Russian-to-Arabic book.
- Every word has grammar, examples, and phrases.
- A1 examples stay short and controlled; A2 examples include varied household contexts.
- Every word has `detailQuality = full-v8.2`.
- Detail page labels are localized with `detailText()`.
- App version is `v8.3-visual-guide`.
- Service worker cache name is `russian-daily-life-v8-3-visual-guide-v19`. Only the app shell (HTML/CSS/JS/manifest/icons), the unit registry, `data/units/home.json`, and the static hero image (`house.jpg`) are precached at install; the other ~74 word/room images are cached the first time each is actually requested, not upfront.
- `scripts/build_book_pdf.py` accepts `--unit=<id>` (default `home`) to build the workbook from any unit under `data/units/`.

## Browser smoke test
- Install dependencies with `npm install`.
- Install the browser once with `npx playwright install chromium`.
- Run `npm run test:e2e` or `npm run test:e2e -- --headed` for a visible run.
- The smoke test covers the two-language display rule, RTL/LTR direction, pronunciation bridges, card details, quiz state transitions, and the cached offline app shell.
- Full word details display the available pronunciation bridge inside each example card, including Cyrillic pronunciation for all Arabic examples in Russian UI mode.
- The smoke test also opens full word details at a 390x844 mobile viewport and rejects horizontal overflow.
- The smoke test reads persisted progress and settings through `window.AppStorage` (`loadProgress()`, `loadSettings()`), not raw `localStorage` keys, and asserts that `activeUnit` survives a full page reload.
- GitHub Actions runs `npm run test:static` and `npm run test:e2e` on every push and pull request through `.github/workflows/quality.yml`.

## Manual checks
1. Open any word.
2. Click the full word page.
3. Confirm the table, examples, phrases, and gender comparison card exist.
4. Confirm matching gender uses a blue card and different gender uses a red card.
5. Switch UI language and reopen the detail page.
6. Play an English meaning containing `/` and confirm the separator is silent.
7. Set the interface to English and confirm English meanings show Arabic pronunciation in brackets.
8. Set learning language to Arabic with English interface and confirm Arabic pronunciation uses Latin letters.
9. Set learning language to English with Arabic and Russian interfaces and confirm the English word has Arabic and Cyrillic pronunciation aids.
10. At a 390px-wide mobile viewport, open full word details and confirm the page does not scroll horizontally.
