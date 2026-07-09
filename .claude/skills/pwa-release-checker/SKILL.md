---
name: pwa-release-checker
description: Checks Progressive Web App readiness: manifest, service worker registration, cache strategy, offline behavior, installability, versioning, and release risk.
---

# PWA Release Checker

Use this skill before publishing or calling a version stable.

## Primary files

- `index.html`
- `manifest.webmanifest`
- `service-worker.js`
- `app.js`
- `styles.css`
- `assets/**`

## Checks

### Manifest

Verify:

- Valid JSON.
- App name and short name.
- Start URL.
- Display mode.
- Theme/background colors.
- Icons exist.
- Icon paths are correct.

### Service worker

Verify:

- `service-worker.js` exists.
- It is registered in the app.
- Cache version is clear.
- Core files are cached.
- `data/words.json` caching behavior is intentional.
- Cache invalidation will not trap users on old data forever.

### Offline behavior

Check:

- App shell loads offline.
- Existing cached images work offline.
- Missing audio does not break the UI.
- Failed network fetch has safe fallback.

### Release metadata

Check:

- Page `<title>` matches version.
- README version matches release.
- Cache version matches release.
- Changelog is updated.

## Suggested commands

If Node is available:

```bash
node scripts/check-pwa.mjs
```

If the app is opened locally, manually test:

```text
1. Open app.
2. Reload.
3. Disable network.
4. Reload again.
5. Check vocabulary, details, quiz, and review.
```

## Output format

Return:

1. PWA status: Pass / Warning / Fail.
2. Manifest issues.
3. Service worker issues.
4. Offline risks.
5. Release blockers.
6. Exact fixes.
