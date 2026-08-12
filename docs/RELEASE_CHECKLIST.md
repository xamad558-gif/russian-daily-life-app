# Release Checklist

## Data

- [x] `data/units.json` and `data/units/home.json` are valid JSON.
- [x] No duplicate ids.
- [x] Required fields exist.
- [x] Image paths exist.
- [x] Audio policy is clear.
- [x] Missing audio is not a release blocker unless strict audio mode is required.

## UI

- [ ] Arabic RTL works.
- [ ] Russian and English text remain readable.
- [ ] Mobile layout is usable.
- [ ] Cards are clear.
- [ ] Detail page is clear.
- [ ] Quiz works.
- [ ] Review works.
- [ ] Progress persists after reload.

Mobile detail verification is covered automatically by `npm run test:e2e` at a 390px-wide viewport; complete the manual UI checks before release.

## PWA

- [x] Manifest is valid.
- [x] Service worker is registered.
- [x] Cache version is updated.
- [x] Offline app shell works — verified by `npm run test:e2e`.
- [x] App does not fail when audio is missing.

## Versioning

- [x] HTML title updated.
- [x] README updated.
- [x] Changelog/release notes updated.
- [x] Known issues listed.

The remaining unchecked UI items require a visual desktop/mobile review; static validation and the browser smoke test do not replace that review.
