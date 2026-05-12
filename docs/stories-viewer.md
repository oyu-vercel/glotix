# Stories viewer

Per-story reading view + per-story vocabulary, mirroring the A2 vocabulary feature.

## App shell

A `Stories` link sits next to `Vocabulary` in the toolbar ([web/src/app/app.html](../web/src/app/app.html)). Four routes ([web/src/app/app.routes.ts](../web/src/app/app.routes.ts)):

| Path                                                       | Component                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/stories`                                                 | `StoriesSummary` ([summary.ts](../web/src/app/stories/summary/summary.ts))               |
| `/stories/:slug` (optional `?cat=<key>` or `?tab=vocab`)   | `StoryDetail` ([detail.ts](../web/src/app/stories/detail/detail.ts))                     |
| `/stories/:slug/category/:key/memorize` (`?direction=russian` for reverse) | `StoryMemorize` ([memorize.ts](../web/src/app/stories/memorize/memorize.ts)) |
| `/stories/:slug/category/:key/repeat`                      | `StoryRepeat` ([repeat.ts](../web/src/app/stories/repeat/repeat.ts))                     |

`StoryDetail` reads `slug` (route param) plus `cat` and `tab` (query params) via `input` + `withComponentInputBinding()` (configured in [app.config.ts](../web/src/app/app.config.ts)). The `cat` param drives which category is drilled into and auto-opens the Vocabulary tab. `tab=vocab` (used by the vocabulary index at `/vocabulary` when clicking a story row) opens the Vocabulary tab without pre-selecting a category.

## Data flow

```
docs/stories/<folder>/<slug>.txt           (story source — one folder per story)
web/public/assets/vocabulary.json          (single source of truth for words)
        │
        ▼   npm run build:stories
        │
web/public/assets/stories-index.json
web/public/assets/stories/<slug>.json      (refs into vocabulary.json)
        │
        ▼   StoriesService.getStoryResolved(slug)
        │   (combines story refs with VocabularyService.resolveStoryVocab)
        │
StoriesSummary / StoryDetail / StoryMemorize / StoryRepeat
```

The build script ([web/scripts/build-stories.mjs](../web/scripts/build-stories.mjs)) does:

1. **Load** `web/public/assets/vocabulary.json` and derive the category order from it.
2. **Discover** all `*.txt` files under `docs/stories/` recursively — one folder per story, slug = filename without extension. Duplicate slugs across folders are a build error.
3. **Tokenize** each story: NFC normalize → lowercase → split on `\p{L}\p{N}` complement → drop empty/numeric tokens. Italian apostrophes (`l'aria` → `l`, `aria`) and quotation marks are handled.
4. **Match tokens against the vocabulary**:
   - **Direct**: token === `italian` headword (after lowercase + slash-variant split).
   - **Indirect**: token appears in any vocab entry's example sentences (first-match wins). Catches inflected forms — e.g. `saliamo` resolves to `salire`, `vado`/`vanno` to `andare`, `può` to `potere`.
5. For each match, record `{ categoryKey, n }` — the global `n` from `vocabulary.json`. Story tokens that don't match any vocab entry are silently dropped (add the missing word to `vocabulary.json` to include it).

## JSON shape

`stories-index.json`:

```json
{
  "language": "italian",
  "level": "a2",
  "stories": [
    {
      "slug": "benvenute-al-sud",
      "title": "Benvenute al Sud",
      "paragraphs": 130,
      "vocabCount": 435
    }
  ]
}
```

`stories/<slug>.json`:

```json
{
  "slug": "benvenute-al-sud",
  "title": "Benvenute al Sud",
  "text": "<full story text, line breaks preserved>",
  "vocabulary": {
    "noun":      [2, 3, 4, 5, 6, 8, 10],
    "verb":      [1, 7, 14],
    "adjective": [3, 9]
  }
}
```

`vocabulary` is `Record<categoryKey, number[]>` — each array is sorted ascending `n` values referencing entries in `vocabulary.json` for that category. Categories with no matches are omitted. Types live in [`web/src/app/stories/stories.types.ts`](../web/src/app/stories/stories.types.ts) (`Story`, `StoryVocabRefs`, `StoryResolved`).

`StoriesService.getStoryResolved(slug)` ([stories.service.ts](../web/src/app/stories/stories.service.ts)) combines the raw `Story` with `VocabularyService.resolveStoryVocab(refs)` ([vocabulary.service.ts](../web/src/app/vocabulary/vocabulary.service.ts)) to produce a `StoryResolved` whose `vocabulary` is a fully populated `Vocabulary` (filtered to the referenced words, preserving category order from `vocabulary.json`). All story components consume `getStoryResolved`.

## UI

- **`/stories`** — `mat-table` listing each story with title, paragraph count, and matched vocab count. Row click navigates to `/stories/:slug`.
- **`/stories/:slug`** — header with the title; `mat-tab-group` with two tabs:
  - **Read** — renders the story text as paragraphs. Short standalone lines ending in `.` (≤ 60 chars, ≤ 6 words, no quote characters) auto-promote to `<h2>` section headers. The title line is skipped (already shown as page header).
  - **Vocabulary (N)** — `mat-table` of categories (with row click drilling into the shared [`WordTable`](../web/src/app/shared/word-table/word-table.ts), the same component used by `/category/:key`, columns: #, Word, Pronunciation, Translation, Examples). The drilldown header carries three buttons — **Italian → Russian**, **Russian → Italian**, **Repeat** — that link to `StoryMemorize` / `StoryRepeat` for that category's word set.
    - Category selection is URL-driven via the `cat` query param, so memorize/repeat can exit back to the same drilled-in state.

## Memorize / Repeat

`StoryMemorize` and `StoryRepeat` are thin route wrappers that render the shared [`MemorizeDeck`](../web/src/app/shared/memorize-deck/memorize-deck.ts) and [`RepeatDeck`](../web/src/app/shared/repeat-deck/repeat-deck.ts) — the same presentational components used by the vocabulary [`Memorize`](../web/src/app/vocabulary/memorize/memorize.ts) and [`Repeat`](../web/src/app/vocabulary/repeat/repeat.ts) wrappers. They resolve the word set via `StoriesService.getStoryResolved(slug)` filtered to the requested category, pass it to the deck, and handle exit navigation back to `/stories/<slug>?cat=<key>` (auto-opens the Vocabulary tab on the same drilled-in category).

Skip state is stored via the shared [`MemorizeStorage`](../web/src/app/shared/storage/memorize-storage.ts) under a per-surface scope so skipping a word in vocabulary memorize does not hide it in story memorize and vice versa. Comments are stored **once per Italian word** and shared across every memorize view (vocabulary and any story containing that word).

| Surface                                              | Skip key                                         | Comment key             |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------- |
| `/category/<key>/memorize`                           | `glotix:skip:<key>`                              | `glotix:comment:<italian>` (shared) |
| `/stories/<slug>/category/<key>/memorize`            | `glotix:skip:story:<slug>:<key>`                 | `glotix:comment:<italian>` (shared) |

## Adding a new story

1. Create a folder `docs/stories/<folder>/` and drop `<slug>.txt` inside.
2. If the story uses words not yet in `web/public/assets/vocabulary.json`, add them there first (otherwise they're silently excluded from the story's vocabulary).
3. Run `npm --prefix web run build:stories`.
4. The story appears automatically at `/stories`.
