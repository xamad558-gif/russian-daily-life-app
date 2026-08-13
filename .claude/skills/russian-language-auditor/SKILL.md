---
name: russian-language-auditor
description: Reviews Russian vocabulary entries for grammar, gender, plural forms, natural examples, transliteration quality, and Arabic/English translation alignment.
---

# Russian Language Auditor

Use this skill before releasing vocabulary content or after adding new words.

## Scope

Audit Russian-learning content in:

- `data/units/home.json`
- Any generated unit files.
- UI labels that include Russian learning text.

## Checks

For each entry, verify:

- Russian spelling.
- Transliteration usefulness for Arabic/English learners.
- Word type.
- Noun gender.
- Singular/plural.
- Naturalness of example sentences.
- Accuracy of Arabic translation.
- Accuracy of English translation.
- CEFR level appropriateness.
- Whether the example teaches the word clearly.

## Russian noun policy

For Russian nouns, check:

- Masculine / feminine / neuter.
- Plural-only nouns.
- Irregular plural forms.
- Stress concerns if relevant.
- Whether singular/plural is useful for the learner.

## Example sentence policy

Good examples:

- Short.
- Daily-life oriented.
- Uses the target word directly.
- Does not introduce too much grammar beyond the learner level.

Bad examples:

- Too abstract.
- Too long.
- Grammatically correct but unnatural.
- Literal translation from Arabic or English.

## Transliteration policy

Transliteration should help pronunciation, not be academically perfect at the cost of usability.

Flag inconsistent transliteration styles across entries.

## Output format

Return:

1. Overall language quality.
2. Critical Russian errors.
3. Grammar corrections table.
4. Translation corrections table.
5. Example sentence improvements.
6. Items safe to release.
7. Items requiring human review.
