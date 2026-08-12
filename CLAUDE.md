# Russian Daily Life App — Project Rules

## Project identity

This project is a trilingual Russian learning Progressive Web App for Arabic and English speakers.

Current technical baseline:

- Static web app.
- HTML, CSS, vanilla JavaScript.
- Vocabulary content stored per learning unit under `data/units/` (e.g. `data/units/home.json`), indexed by the registry at `data/units.json`. See `docs/UNIT_ARCHITECTURE.md`.
- Images stored under `assets/images/`.
- Audio paths may exist in data, but audio files may be missing. Do not assume audio exists.
- Arabic UI must support RTL correctly.
- Russian and English content must remain readable in LTR contexts.

## Main development principle

Data quality comes before feature quantity.

Do not add large sets of words until the validation scripts pass and the existing content schema is stable.

## Architecture rules

- Do not keep adding unrelated logic to `app.js`.
- Prefer small modules when refactoring.
- Keep content in JSON, not hardcoded inside JavaScript.
- Keep UI text inside a clear i18n layer.
- Preserve current app behavior unless the task explicitly requests a redesign.
- Avoid introducing React, TypeScript, backend, or build tooling unless there is a clear migration plan.
- For now, improve the vanilla PWA step by step.

## Data rules

Every vocabulary item should eventually include:

- Stable `id`.
- `category` and `subCategory`.
- Russian word.
- Transliteration.
- Arabic meaning.
- English meaning.
- CEFR level such as `A1`, `A2`, or `B1`.
- Frequency score.
- Word type.
- Main example in Russian, Arabic, and English.
- Image path.
- Grammar block for Russian, Arabic, and English.
- Singular/plural where applicable.
- Gender where applicable.
- Detail examples and phrases where available.

## Audio rule

Do not create fake audio references.

Acceptable options:

1. Use browser `speechSynthesis` as fallback and mark audio as optional.
2. Generate real audio files and verify every referenced path.
3. Remove fake audio paths from content until real files exist.

## Image rule

Images must teach the word clearly. A decorative or vague image is not enough.

For each image change, check:

- Does the image directly represent the target word?
- Is it culturally neutral enough for Arabic/Russian learners?
- Is it not confusingly similar to another word image?
- Does it load from the path in `words.json`?

## Arabic and RTL rules

- Arabic labels must be natural, not literal machine translation.
- Russian pronunciation aids for Arabic learners belong in `transliterationAr` and `exampleTransliterationAr`.
- Arabic interface must keep RTL layout.
- Mixed Russian/English inside Arabic UI should remain readable.
- Avoid awkward business-like Arabic inside learning screens.

## Russian language rules

- Russian examples must be natural daily-life Russian.
- Verify grammatical gender.
- Verify plural forms.
- Avoid textbook-only unnatural sentences.
- Keep examples short for A1/A2 learners.

## Testing and validation rules

Before release:

- Run `node scripts/validate-data.mjs` if Node is available.
- Run `node scripts/validate-arabic.mjs` for the Arabic content inventory.
- Run `node scripts/validate-arabic.mjs --edition=ru-ar` before building the Russian-to-Arabic edition.
- Check duplicate ids.
- Check missing images.
- Check missing required fields.
- Check fake audio references.
- Check service worker registration.
- Check manifest file.
- Test mobile layout.
- Test Arabic RTL.
- Test offline/PWA behavior if service worker is enabled.

## Release naming

Use clear versions:

- `v8.3-cleanup`
- `v8.4-modularization`
- `v8.5-learning-engine`
- `v9.0-new-units`

Do not call a release final unless validation and manual smoke testing are done.

## Response style for Claude

When completing work, respond with:

1. What changed.
2. Files edited.
3. Validation performed.
4. Remaining issues.
5. Recommended next step.

Be direct. Do not hide uncertainty.
