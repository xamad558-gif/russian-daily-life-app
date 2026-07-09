---
name: data-auditor
description: Audits data/words.json and related assets for missing fields, duplicate ids, missing images, fake audio paths, schema drift, and release-blocking content issues.
---

# Data Auditor

Use this skill when checking or improving vocabulary data quality.

## Primary files

- `data/words.json`
- `assets/images/**`
- `assets/audio/**`
- `scripts/validate-data.mjs`
- `templates/word-entry.template.json`
- `docs/WORD_SCHEMA.md`

## Core checks

Inspect `data/words.json` for:

- JSON syntax validity.
- Duplicate `id` values.
- Missing required base fields.
- Missing `grammar.ru`, `grammar.ar`, `grammar.en` blocks.
- Missing Russian gender for nouns.
- Missing plural/singular values where applicable.
- Missing `exampleRu`, `exampleAr`, `exampleEn`.
- Missing or broken `imagePath`.
- Audio paths that reference files that do not exist.
- Mixed schema styles that will complicate UI rendering.

## Required base fields

Each item should have:

```text
id
category
subCategory
russian
transliteration
arabic
english
level
frequency
type
exampleRu
exampleAr
exampleEn
imagePath
grammar
```

## Grammar expectations

For nouns:

- `grammar.ru.gender` should be one of: `masculine`, `feminine`, `neuter`, `plural-only`, or an equivalent normalized value.
- `grammar.ru.singular` and `grammar.ru.plural` should exist when applicable.
- Arabic gender should exist when useful, but do not force false grammatical categories for English.
- English may use `no grammatical gender`.

## Audio policy

Treat audio references as release-risk if the file is missing.

Do not silently accept fake MP3 paths. Recommend one of:

1. Remove audio fields until real files exist.
2. Keep fields but mark audio validation as warning only.
3. Generate and commit real audio files.
4. Use `speechSynthesis` fallback and make UI honest.

## Validation script

If `scripts/validate-data.mjs` exists, run:

```bash
node scripts/validate-data.mjs
```

For strict audio mode:

```bash
node scripts/validate-data.mjs --audio=strict
```

For no audio checks:

```bash
node scripts/validate-data.mjs --audio=ignore
```

## Output format

Return:

1. Data status: Pass / Warning / Fail.
2. Number of words checked.
3. Critical blockers.
4. Warnings.
5. Recommended fixes in priority order.
6. Exact files and fields to edit.
7. Whether more words can safely be added.
