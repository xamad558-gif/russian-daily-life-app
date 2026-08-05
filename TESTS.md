# v8.3 Visual Guide Tests

## Programmatic checks
- `data/words.json` contains 75 words.
- Every word has Russian, Arabic, and English word-pronunciation fields for the available learner bridges.
- Every word has `transliterationAr`, `exampleTransliterationAr`, `exampleTransliterationEn`, and `exampleArTransliterationRu`.
- `node scripts/complete-arabic-vocalization.mjs` rebuilds all 600 Arabic vocalization fields without unknown tokens.
- `node scripts/complete-arabic-pronunciation-ru.mjs` rebuilds all 450 nested Cyrillic pronunciation fields.
- `node scripts/validate-arabic.mjs` reports Arabic content and learning-field coverage.
- `node scripts/validate-arabic.mjs --edition=ru-ar` must pass before releasing the Russian-to-Arabic book.
- Every word has grammar, examples, and phrases.
- Every word has `detailQuality = full-v8.2`.
- Detail page labels are localized with `detailText()`.
- App version is `v8.3-visual-guide`.
- Service worker cache name is `russian-daily-life-v8-3-visual-guide-v2`.

## Browser smoke test
- Install dependencies with `npm install`.
- Install the browser once with `npx playwright install chromium`.
- Run `npm run test:e2e` or `npm run test:e2e -- --headed` for a visible run.
- The smoke test covers the two-language display rule, RTL/LTR direction, pronunciation bridges, card details, quiz state transitions, and the cached offline app shell.
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
