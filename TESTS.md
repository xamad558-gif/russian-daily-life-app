# v8.3 Visual Guide Tests

## Programmatic checks
- `data/words.json` contains 75 words.
- Every word has grammar, examples, and phrases.
- Every word has `detailQuality = full-v8.2`.
- Detail page labels are localized with `detailText()`.
- App version is `v8.3-visual-guide`.
- Service worker cache name is `russian-daily-life-v8-3-visual-guide-v1`.

## Manual checks
1. Open any word.
2. Click the full word page.
3. Confirm the table, examples, phrases, and gender comparison card exist.
4. Confirm matching gender uses a blue card and different gender uses a red card.
5. Switch UI language and reopen the detail page.
6. Play an English meaning containing `/` and confirm the separator is silent.
