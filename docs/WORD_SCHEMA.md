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
