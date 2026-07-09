---
name: release-manager
description: Prepares versioned releases for the Russian Daily Life app by coordinating data validation, UI checks, PWA checks, smoke tests, changelog, and release notes.
---

# Release Manager

Use this skill when preparing a version such as `v8.3-cleanup`, `v8.4-modularization`, or `v9.0-new-units`.

## Release rule

A release is not stable just because the app opens. It is stable only when data, assets, UI, PWA files, and smoke tests pass or known issues are documented.

## Release phases

### 1. Scope freeze

Define what this release includes and excludes.

Examples:

- v8.3 cleanup: title fix, service worker registration, audio policy, data validator.
- v8.4 modularization: split app logic into modules without changing behavior.
- v8.5 learning engine: review states and quiz weighting.

### 2. Validation

Run or request:

```bash
node scripts/validate-data.mjs
node scripts/check-pwa.mjs
```

### 3. Manual smoke test

Check:

- App opens.
- Search works.
- Filters work.
- Word details open.
- Audio/TTS button does not crash.
- Quiz works.
- Review works.
- Progress persists after reload.
- Arabic RTL remains correct.
- Mobile layout is usable.

### 4. Release notes

Document:

- Added.
- Changed.
- Fixed.
- Known issues.
- Validation results.

## Output format

Return:

1. Release name.
2. Scope.
3. Files changed.
4. Validation results.
5. Smoke test results.
6. Known issues.
7. Final decision: Release / Do not release.
