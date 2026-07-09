# Word Schema Guide

This project uses `data/words.json` as the core content database.

## Required base fields

```json
{
  "id": "home50_001",
  "category": "home",
  "categoryAr": "البيت",
  "subCategory": "home",
  "russian": "дом",
  "transliteration": "dom",
  "arabic": "بيت / منزل",
  "english": "house / home",
  "level": "A1",
  "frequency": 5,
  "type": "noun",
  "exampleRu": "Это наш дом.",
  "exampleAr": "هذا بيتنا.",
  "exampleEn": "This is our house.",
  "imagePath": "assets/images/home50/house.jpg",
  "grammar": {}
}
```

## Recommended grammar block

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

**Status (decided 2026-07-09):** Keep the existing `audioWord*` / `audioSentence*` paths in `data/words.json` as-is for now — do not delete them and do not fabricate new ones. The app already falls back to `speechSynthesis` silently when a file is missing (see `playAudio()` / `playExampleAudio()` in `app.js`), so this is not blocking a release. Real audio recording/generation is planned for a later phase once content is stable; at that point the existing paths should be filled in rather than restructured. Run `node scripts/validate-data.mjs --audio=warn` to see the current gap (currently 450 warnings, 0 errors) — do not switch to `--audio=strict` until real files start landing.
