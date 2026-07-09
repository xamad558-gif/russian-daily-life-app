---
name: ui-rtl-reviewer
description: Reviews UI, layout, mobile behavior, accessibility, Arabic RTL support, mixed-language rendering, vocabulary cards, and detail pages.
---

# UI and RTL Reviewer

Use this skill for interface changes, Arabic layout, word cards, detail pages, filters, quiz, review, and progress screens.

## Primary files

- `index.html`
- `styles.css`
- `app.js`
- Future `src/**` modules if the app is refactored.

## RTL rules

Arabic UI must be RTL.

Check:

- `<html dir="rtl">` or dynamic direction handling.
- Body-level UI language state.
- Navigation alignment.
- Search input behavior.
- Card content alignment.
- Mixed Russian/English readability inside Arabic UI.
- Buttons and icon spacing.
- Mobile layout.

## Vocabulary card rules

A card should show:

- Image.
- Russian word.
- Transliteration.
- Arabic meaning.
- English meaning when useful.
- Level/frequency/mastery if present.
- Clear action to open details or play audio.

Avoid visual clutter.

## Detail page rules

The detail page should be a real learning screen:

- Word header.
- Image.
- Pronunciation/TTS.
- Grammar table for RU/AR/EN where useful.
- Examples.
- Useful phrases.
- Related words.
- Review/quiz actions.

## Accessibility checks

- Buttons have clear text or aria-label.
- Images have useful alt text or decorative handling.
- Keyboard navigation is not broken.
- Color contrast is acceptable.
- Mobile tap targets are not tiny.

## Output format

Return:

1. UI status.
2. RTL issues.
3. Mobile issues.
4. Accessibility issues.
5. Concrete CSS/HTML/JS fixes.
6. Screens that need manual visual testing.
