# Release Checklist

## Data

- [ ] `data/words.json` is valid JSON.
- [ ] No duplicate ids.
- [ ] Required fields exist.
- [ ] Image paths exist.
- [ ] Audio policy is clear.
- [ ] Missing audio is not a release blocker unless strict audio mode is required.

## UI

- [ ] Arabic RTL works.
- [ ] Russian and English text remain readable.
- [ ] Mobile layout is usable.
- [ ] Cards are clear.
- [ ] Detail page is clear.
- [ ] Quiz works.
- [ ] Review works.
- [ ] Progress persists after reload.

## PWA

- [ ] Manifest is valid.
- [ ] Service worker is registered.
- [ ] Cache version is updated.
- [ ] Offline app shell works.
- [ ] App does not fail when audio is missing.

## Versioning

- [ ] HTML title updated.
- [ ] README updated.
- [ ] Changelog/release notes updated.
- [ ] Known issues listed.
