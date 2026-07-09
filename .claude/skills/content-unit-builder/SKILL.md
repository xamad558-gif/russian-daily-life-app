---
name: content-unit-builder
description: Builds or expands vocabulary units for the Russian Daily Life app with consistent trilingual fields, grammar, examples, phrases, image requirements, and validation discipline.
---

# Content Unit Builder

Use this skill when adding a new unit or expanding an existing one.

## Content philosophy

The app must teach daily Russian through useful, visual, simple, high-quality entries. Do not create shallow dictionary rows.

Each word should behave like a small learning card:

- Word.
- Meaning.
- Transliteration.
- Image.
- Grammar.
- Examples.
- Useful phrases.
- Audio or TTS fallback.
- Review/quiz compatibility.

## Before adding content

Check:

- Existing categories and subcategories in `data/words.json`.
- Existing id naming style.
- Existing image folder structure.
- Existing detail schema.
- Whether the user wants real images now or placeholders.

Do not add 50+ words without planning category/subcategory structure first.

## Unit plan format

For a new unit, prepare:

```text
Unit name:
Purpose:
Target learner level:
Subcategories:
Word count target:
Image strategy:
Audio strategy:
Grammar requirements:
Quiz behavior:
```

## Recommended units

Good next units:

- restaurant
- university
- work
- supermarket
- transportation
- documents-and-residence
- hospital-and-pharmacy
- street-and-city
- daily-conversation

## Word entry requirements

Use `templates/word-entry.template.json` as the base shape.

Every entry should include:

- Stable id such as `restaurant_001`.
- Russian word.
- Transliteration.
- Arabic meaning.
- English meaning.
- Level.
- Frequency.
- Type.
- Main example in Russian, Arabic, English.
- Image path.
- Grammar block.
- At least 3 examples when building detail-rich entries.
- At least 3 useful phrases when appropriate.

## Russian content rules

- Keep A1/A2 examples short.
- Prefer daily-life Russian.
- Avoid unnatural textbook phrases.
- Verify gender and plural.
- Use ё where needed if it helps learners.

## Arabic content rules

- Use clear Arabic, not awkward literal translation.
- Egyptian explanations are acceptable only if requested.
- Keep UI/content Arabic simple for learners.

## Output format

When building content, return:

1. Unit plan.
2. Proposed subcategories.
3. JSON entries or patch plan.
4. Image list needed.
5. Audio/TTS decision.
6. Validation checklist.
