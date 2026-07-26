# Changelog

## v8.3-visual-guide — 2026-07-23

### Added

- Added a visual home hero with a real home image, progress signal, and review action.
- Added clickable room cards using the real vocabulary images for each home section.
- Refined the word-card hierarchy so Cyrillic is primary and transliteration/English are supporting layers.
- Added a responsive visual field-guide layout for Arabic, Russian, and English interfaces.
- Added an Azure Speech Toolkit sample generator for five Arabic word files.

## v8.3-cleanup — 2026-07-23

### Fixed

- Corrected Arabic definite articles in the home-unit location questions.
- Removed self-referential `related` values from the vocabulary data.
- Replaced duplicated examples for soap, remote control, charger, and mattress.
- Corrected Arabic gender agreement for `кухня` / `مطبخ`.
- Localized quiz feedback and empty-quiz messaging.
- Added keyboard navigation and accessible names for vocabulary cards and controls.
- Aligned the mobile sidebar with the active document direction.
- Replaced generic gender notes with a blue matching/red different comparison card using gender symbols.
- Prevented browser English speech fallback from reading `/` separators aloud.
- Removed redundant generated `note` fields from the vocabulary data.

### Known limitations

- Real audio files are still deferred in favor of the browser speech fallback.
- The app still needs a native-authored sentence-variety pass across the full unit.
- PNG and iOS home-screen icons remain future PWA work.
