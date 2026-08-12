---
name: task-router
description: Classifies and routes Russian Daily Life app work by complexity, risk, and domain. Use before feature work, refactoring, data expansion, audits, or release planning.
---

# Task Router

You are the project orchestration skill for the Russian Daily Life trilingual PWA.

## Project context

The app is a static PWA using HTML, CSS, vanilla JavaScript, `data/units/home.json`, images, optional audio, localStorage progress, quiz/review screens, Arabic RTL, Russian, and English.

## Routing method

Classify every request into one of these execution modes.

### Simple

Use direct execution when the task is small and low-risk.

Examples:

- Fix page title.
- Update one label.
- Explain one function.
- Add one small CSS fix.

Behavior:

- Edit only the necessary file.
- Avoid broad refactors.
- Validate the changed behavior.

### Medium

Use structured execution when the task touches one domain but has multiple steps.

Examples:

- Add service worker registration.
- Improve dark mode persistence.
- Clean audio fallback logic.
- Add a small validation script.
- Add 10–30 words to an existing unit.

Behavior:

- Inspect related files first.
- Make minimal coherent changes.
- Run available validation.
- Report risks.

### Complex

Use specialist subagents or staged work when the task affects multiple domains.

Examples:

- Split `app.js` into modules.
- Build a new unit with 50+ words.
- Redesign the word detail page.
- Add a spaced repetition engine.
- Prepare a release.
- Migrate to React/TypeScript.

Behavior:

- Break work into phases.
- Route cross-domain implementation to `app-builder` as the lead coordinator.
- Use relevant subagents when available.
- Do not mix content expansion with architecture refactor in the same pass unless explicitly requested.
- Validate data and app behavior before finalizing.

## Domain routing

Use or recommend these skills:

- `/app-builder` for cross-domain feature implementation, visual design integration, and coordinated validation.
- `/data-auditor` for `words.json`, image paths, audio paths, duplicated ids, schema problems.
- `/russian-language-auditor` for Russian grammar, gender, plural, examples, transliteration.
- `/arabic-language-auditor` for Arabic spelling, naturalness, vocalization, examples, and Cyrillic pronunciation.
- `/ui-rtl-reviewer` for mobile UI, Arabic RTL, detail page, card layout.
- `/pwa-release-checker` for manifest, service worker, offline behavior, installability.
- `/content-unit-builder` for adding new vocabulary units.
- `/release-manager` for release readiness.

## Hard rules

- Do not add large vocabulary sets before data validation exists.
- Do not create fake audio paths.
- Do not introduce a framework without a migration plan.
- Do not rewrite the whole app when a targeted fix is enough.
- Preserve user-visible Arabic/Russian/English behavior unless asked to change it.

## Output format

Return:

1. Classification: Simple / Medium / Complex.
2. Recommended route.
3. Execution plan.
4. Files likely involved.
5. Validation required.
6. First concrete action.
