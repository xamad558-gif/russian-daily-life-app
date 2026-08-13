# Unit and User Data Architecture

This document defines the migration from the single Home vocabulary file to independent learning units while keeping the current vanilla PWA, local progress, and stable word links intact.

## Goals

- Keep one source of truth for vocabulary content.
- Load one learning unit at a time.
- Keep existing word IDs permanent so local progress and shared links survive the migration.
- Keep rooms as a subdivision inside a unit.
- Hide storage implementation details from UI modules.
- Leave a clean boundary for a future authenticated API without requiring a React rewrite.

## Non-goals

- Do not add a backend during the unit migration.
- Do not copy vocabulary records into localStorage.
- Do not rename `home50_*` or `home75_*` IDs.
- Do not add a second copy of `words.json` under `data/units/`.
- Do not move static content into a user database before user sync is needed.

## Target content layout

```text
data/
├── units.json
└── units/
    ├── home.json
    └── restaurant.json
```

`data/units.json` is the unit registry. It contains only metadata needed to display and select a unit before its word file is loaded:

```json
{
  "schemaVersion": 1,
  "units": [
    {
      "id": "home",
      "dataPath": "data/units/home.json",
      "title": {
        "ar": "المنزل",
        "en": "Home",
        "ru": "Дом"
      },
      "description": {
        "ar": "كلمات من الحياة اليومية في المنزل",
        "en": "Words from everyday life at home",
        "ru": "Слова из повседневной жизни дома"
      },
      "coverImage": "assets/images/words/house.jpg",
      "icon": "🏠",
      "order": 1
    }
  ]
}
```

Each unit file owns its rooms and words. Metadata must not be duplicated between the registry and the unit file:

```json
{
  "schemaVersion": 1,
  "unitId": "home",
  "contentVersion": "home-v1",
  "rooms": [
    {
      "id": "kitchen",
      "title": {
        "ar": "المطبخ",
        "en": "Kitchen",
        "ru": "Кухня"
      },
      "image": "assets/images/words/kitchen.jpg",
      "icon": "🍽️",
      "tone": "amber",
      "order": 4
    }
  ],
  "words": []
}
```

## Word contract

The target word contract is:

- `id`: permanent, globally unique, and never renamed.
- `unitId`: required and equal to the unit file's `unitId`.
- `subCategory`: room ID within the unit.
- Existing language, pronunciation, grammar, example, image, and optional audio fields remain unchanged.

The current `category` and `categoryAr` fields are migration-era fields. New code must use `unitId` and unit metadata. They can be removed only after every consumer and generated artifact has migrated.

New IDs should use a stable unit prefix, for example `restaurant_001`. Existing Home IDs remain `home50_001` through `home75_075` even though their historical prefixes are inconsistent.

## Loading lifecycle

1. Fetch and validate `data/units.json`.
2. Resolve the active unit from the URL, saved settings, or the first registry entry.
3. Fetch the selected unit's `dataPath`.
4. Verify that the response is successful, that `unitId` matches the requested unit, and that every word has the same `unitId`.
5. Replace the active content collection and rebuild room filters, cards, review, quiz, and progress views.
6. Save only the active unit ID and user state locally; never save the vocabulary records as user data.

The unit route should be shareable, for example `#unit/home`. A word route such as `#word/home50_001` must continue to work and should resolve its unit before rendering the word detail page.

## Storage boundary

`js/storage.js` is the only persistence boundary. Feature modules must not call `localStorage` directly or depend on raw storage-key names.

The local adapter should expose domain operations rather than generic UI calls:

```text
loadSettings()
saveSettings(settings)
loadProgress()
saveProgress(progress)
loadFavorites()
saveFavorites(favorites)
loadQuizStats()
saveQuizStats(stats)
```

During the unit migration, preserve the current keys and read them through the adapter. Do not change learning semantics and data migration in the same commit as the content move.

Before cloud sync, define one canonical progress record per word. It should contain `mastery`, `status`, `interval`, `streak`, `correct`, `wrong`, `lapses`, `dueAt`, `lastReviewedAt`, and `updatedAt`. Compatibility code may temporarily expose the current `mastery` and `learningState` maps, but writes must eventually go through one repository method.

## Unit-scoped views

- The active vocabulary, review, quiz, and progress screens operate on the active unit's words.
- Overall progress is derived by aggregating loaded or explicitly requested unit data; it is not a second stored progress structure.
- Favorites remain user state and are filtered against the active unit for display.
- Scheduled review and favorites must remain separate concepts.
- Quiz totals should be scoped deliberately: global totals for account analytics, unit totals for learning screens.

## Service worker policy

- Precache the unit registry and application shell.
- Cache a unit file after it is successfully requested.
- Treat all `data/units/*.json` requests as data requests, not as HTML fallbacks.
- On an offline cache miss, return a clear failed response rather than an HTML page.
- Bump the cache version whenever the registry or unit schema changes.

## Future API and database boundary

Static unit files remain the content source until a content-management requirement exists. The future API stores user state, not duplicate word records.

### Minimum tables

```text
users
user_settings
word_progress
review_events (optional for the first release)
user_favorites (or a favorite field in word_progress)
```

`word_progress` should have a unique `(user_id, word_id)` key. `word_id` refers to the permanent ID in the static content registry. `unit_id` may be stored redundantly for query speed, but the server must verify it against known content metadata.

### Anonymous-to-account migration

1. User learns anonymously with the local adapter.
2. User signs in or creates an account.
3. The client uploads local progress using an idempotent migration request.
4. The server merges records by permanent `word_id`.
5. The client marks the local snapshot as migrated only after a confirmed response.
6. Future reviews are written to an offline queue and synchronized when online.

For a first cloud release, snapshot synchronization with `updatedAt` and server conflict responses is acceptable. If offline multi-device editing becomes important, add immutable `review_events` with an idempotency key and derive the current progress snapshot on the server.

The API must enforce authorization by user ID, validate payloads, support account deletion, and avoid returning another user's progress. These requirements are part of the platform release, not the unit migration.

## Implementation phases

### Phase 0: contracts and safety net

- Add the unit registry schema and validator.
- Make tests derive counts from the loaded unit instead of assuming `75`.
- Add fixtures for a minimal second unit without changing production content.
- Add a stable-ID uniqueness check across every unit.

**Exit criteria:** Existing application behavior passes with the legacy data source and all new contracts are validated.

### Phase 1: unit registry and loader

- Add `data/units.json` with Home metadata.
- Add a unit-loader module with explicit loading and error states.
- Add `activeUnit` to settings.
- Add domain methods to `js/storage.js` and migrate all direct storage callers in `controller.js`, `ui.js`, `filters.js`, `learning.js`, `progress.js`, and `quiz.js`.
- Keep raw localStorage key names inside the storage adapter only.
- Keep `data/words.json` temporarily as the only word source during this phase.

**Exit criteria:** The app can select and load a unit through the new loader, all persistence goes through the storage boundary, and the current Home experience remains unchanged.

### Phase 2: data-driven UI

- Move `ROOM_FEATURES` out of `app.js`.
- Render unit selection, rooms, labels, icons, and cover images from loaded data.
- Add `#unit/<id>` routing and preserve `#word/<id>` links.
- Scope filters, review, quiz, and progress to the active unit.

**Exit criteria:** No unit or room name, image, icon, or count is hardcoded in feature code.

### Phase 3: Home data migration

- Move the 75 records to `data/units/home.json`.
- Add and validate `unitId` on every record.
- Update every consumer: app loader, validator, audio smoke, PDF builder, service worker, documentation, and tests.
- Delete `data/words.json` only after all checks use the unit loader.

**Exit criteria:** There is one content source, all existing IDs resolve, local progress survives, and offline Home loading works.

### Phase 4: learning-state cleanup

- Make due reviews, favorites, new words, and known/mastered states distinct.
- Introduce one canonical progress repository method.
- Redesign the progress page around actionable review queues.
- Add automated tests for state transitions and due-date ordering.

**Exit criteria:** Every answer and manual action produces a consistent progress record.

### Phase 5: learning modes

- Add flashcards first.
- Add fill-in-the-blank, matching, and listening as separate modes.
- Keep free Cyrillic recall deferred until input validation is specified.

**Exit criteria:** Each mode uses the same answer-recording contract and has a smoke test.

### Phase 6: additional units

- Add one reviewed unit at a time, starting with restaurant.
- Require content, image, pronunciation, Arabic, Russian, and responsive review before release.

**Exit criteria:** The new unit can be loaded, filtered, reviewed, tested offline, and built into the matching PDF edition.

### Phase 7: user platform

- Add authentication and API-backed repository adapter.
- Add anonymous-progress migration.
- Add sync queue, retries, conflict handling, and privacy controls.
- Consider a content dashboard only after the user data path is stable.

**Exit criteria:** A user can use the app anonymously offline, sign in later, retain progress, and use the same account across devices.

## Required validation matrix

Every phase that changes content or loading must run:

```text
npm.cmd run test:static
npm.cmd run test:e2e
```

The unit migration additionally requires:

- all unit files parse as JSON;
- all unit IDs and word IDs are unique;
- every word points to an existing image;
- every word's `unitId` matches its file;
- direct unit and word routes work;
- Arabic RTL and Russian/English LTR work after switching units;
- cached units work offline and cache misses fail clearly;
- generated PDF output accepts an explicit unit and language;
- old local progress is visible after migration.

## Rules for implementation commits

- Keep registry, loader, UI, data move, and storage migration in separate commits.
- Do not add a new unit while the Home migration is failing.
- Do not rename existing word IDs.
- Do not stage generated PDFs, temporary files, audio experiments, or unrelated agent files with a unit commit.
- Update `ROADMAP.md`, `KNOWN_ISSUES.md`, and `TESTS.md` when a phase changes status.
