# Word Schema Guide

This document describes the word record shape. The content layout, loading contract, storage boundary, and migration rules are defined in [`UNIT_ARCHITECTURE.md`](UNIT_ARCHITECTURE.md).

Word records for the Home unit live in `data/units/home.json`, inside a unit file (`{schemaVersion, unitId, contentVersion, rooms, words}`). The registry at `data/units.json` points to it. Every word carries a `unitId` field matching its unit. `data/words.json` is deprecated and no longer read by the app or any script — it is kept only until a full `npm run test:e2e` pass confirms the migration end to end (see `docs/KNOWN_ISSUES.md`), then it will be deleted. Do not read from it or add a second copy of content anywhere else.

## Required base fields

```json
{
  "id": "home50_001",
  "category": "home",
  "categoryAr": "البيت",
  "subCategory": "home",
  "russian": "дом",
  "transliteration": "dom",
  "transliterationAr": "دوم",
  "arabic": "بيت",
  "english": "house",
  "level": "A1",
  "frequency": 5,
  "type": "noun",
  "exampleRu": "Это наш дом.",
  "exampleAr": "هذا بيتنا.",
  "exampleTransliterationAr": "إتو ناش دوم.",
  "exampleTransliterationEn": "Eto nash dom.",
  "exampleArTransliterationRu": "хаза бейтуна.",
  "exampleEn": "This is our house.",
  "imagePath": "assets/images/words/house.jpg",
  "grammar": {}
}
```

## Pronunciation bridge fields

Each word also carries pronunciation aids for learners crossing between the three languages:

- `englishTransliterationAr`: English word written in Arabic script.
- `englishTransliterationRu`: English word written in Cyrillic script.
- `arabicTransliterationEn`: Arabic word written in Latin script.
- `exampleArTransliterationEn`: Arabic main example written in Latin script.

## Image path convention

**Status (decided 2026-07-13):** All word images live flat in `assets/images/words/`, one file per word, referenced by `imagePath`. Earlier revisions scattered images across `home50/`, `home75/`, `home50_quality/`, `real/`, `scenes/`, and root-level SVGs — those were consolidated and unused/superseded duplicates were deleted (see `docs/KNOWN_ISSUES.md` history / commit log for the cleanup). When adding new words, drop the image straight into `assets/images/words/` and reference it as `assets/images/words/<name>.jpg` — do not recreate per-batch subfolders.

```json
{
  "grammar": {
    "ru": {
      "word": "дом",
      "type": "существительное",
      "singular": "дом",
      "plural": "дома",
      "gender": "masculine"
    },
    "ar": {
      "word": "بيت",
      "type": "اسم",
      "singular": "بيت",
      "plural": "بيوت",
      "gender": "مذكر"
    },
    "en": {
      "word": "house",
      "type": "noun",
      "singular": "house",
      "plural": "houses",
      "gender": "no grammatical gender"
    }
  }
}
```

## Audio policy

Audio fields are optional unless real files exist. Missing audio should not crash the app. Browser TTS fallback is acceptable, but the UI should not pretend real MP3 files exist.

**Status (decided 2026-07-09):** Keep the existing `audioWord*` / `audioSentence*` paths in `data/units/home.json` as-is for now — do not delete them and do not fabricate new ones. The app already falls back to `speechSynthesis` silently when a file is missing (see `playAudio()` / `playExampleAudio()` in `app.js`), so this is not blocking a release. Real audio recording/generation is planned for a later phase once content is stable; at that point the existing paths should be filled in rather than restructured. Run `node scripts/validate-data.mjs --audio=warn` to see the current gap (currently 450 warnings, 0 errors) — do not switch to `--audio=strict` until real files start landing.
