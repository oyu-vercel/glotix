# Stories viewer

Per-story reading view + per-story vocabulary, mirroring the A2 vocabulary feature.

## App shell

A `Stories` link sits next to `Vocabulary` in the toolbar ([web/src/app/app.html](../web/src/app/app.html)). Four routes ([web/src/app/app.routes.ts](../web/src/app/app.routes.ts)):

| Path                                                       | Component                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/stories`                                                 | `StoriesSummary` ([summary.ts](../web/src/app/stories/summary/summary.ts))               |
| `/stories/:slug` (optional `?cat=<key>` or `?tab=vocab`)   | `StoryDetail` ([detail.ts](../web/src/app/stories/detail/detail.ts))                     |
| `/stories/:slug/category/:key/memorize` (`?direction=russian` for reverse) | [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) with [`provideStoryDeckSurface()`](../web/src/app/stories/story-deck-surface.ts) |
| `/stories/:slug/category/:key/repeat`                      | [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) with `provideStoryDeckSurface()` |

`StoryDetail`'s `cat` query param drives which category is drilled into and auto-opens the Vocabulary tab. `tab=vocab` (used by the vocabulary index at `/vocabulary` when clicking a story row) opens the Vocabulary tab without pre-selecting a category.

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
StoriesSummary / StoryDetail / MemorizeRoute / RepeatRoute
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
      "vocabCount": 479
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
  - **Vocabulary (N)** — `mat-table` of categories (with row click drilling into the shared [`WordTable`](../web/src/app/shared/word-table/word-table.ts), the same component used by `/category/:key`, columns: #, Word, Pronunciation, Translation, Examples). The drilldown header carries three buttons — **Italian → Russian**, **Russian → Italian**, **Repeat** — that link to the story-scoped `MemorizeRoute` / `RepeatRoute` for that category's word set.
    - Category selection is URL-driven via the `cat` query param, so memorize/repeat can exit back to the same drilled-in state.

## Memorize / Repeat

The story memorize/repeat routes load the shared generic [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) / [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) components (also used by `/category/:key/memorize` and `/category/:key/repeat`) and supply [`provideStoryDeckSurface()`](../web/src/app/stories/story-deck-surface.ts) via per-route `providers`. The story `DeckSurface` resolves the word set through `StoriesService.getStoryResolved(slug)` (filtered to the requested category), produces a `story:<slug>:<key>` scope for the deck's skip storage, and navigates back to `/stories/<slug>?cat=<key>` on exit (auto-opens the Vocabulary tab on the same drilled-in category). Vocabulary routes use the same generic components but with [`provideVocabularyDeckSurface()`](../web/src/app/vocabulary/vocabulary-deck-surface.ts).

Skip state is stored via the shared [`MemorizeStorage`](../web/src/app/shared/storage/memorize-storage.ts) under a per-surface scope so skipping a word in vocabulary memorize does not hide it in story memorize and vice versa. Comments are stored **once per Italian word** and shared across every memorize view (vocabulary and any story containing that word).

| Surface                                              | Skip key                                         | Comment key             |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------- |
| `/category/<key>/memorize`                           | `glotix:skip:<key>`                              | `glotix:comment:<italian>` (shared) |
| `/stories/<slug>/category/<key>/memorize`            | `glotix:skip:story:<slug>:<key>`                 | `glotix:comment:<italian>` (shared) |

## Adding a new story

Use the [`add-story` skill](../.claude/skills/add-story/SKILL.md). Drop two files into a fresh `docs/stories/<folder>/`:

- `<slug>.txt` — the story (first non-empty line is the title).
- `<slug>-words.csv` — vocabulary supplement, 4 columns: Italian phrase, Cyrillic pronunciation, Russian translation, example sentences.

Then ask Claude to "add story `<folder>`" (or invoke the skill directly). It runs the 3 stages: merge CSV into vocabulary.json, categorize new words, rebuild story JSONs.

The two helper scripts the skill calls:

- [`web/scripts/merge-words.mjs <storyFolder>`](../web/scripts/merge-words.mjs) — for each CSV row, looks up the Italian headword in vocabulary.json. **Matched** → appends new unique example sentences (case-insensitive trimmed dedup, capped at 10 per word). Pronunciation and translation are never overwritten. **Unmatched** → written to `docs/stories/<folder>/unmatched.json` for categorization.
- [`web/scripts/append-words.mjs <unmatched.json>`](../web/scripts/append-words.mjs) — after Claude annotates each entry with a `category` field, this appends them to the matching category with `n = max(n) + 1` per category. Examples are truncated to the first 10 sentences. Hard-fails if any entry has a missing or unknown category.

If you only have a `.txt` (no CSV) you can still run `npm --prefix web run build:stories` directly — words not in vocabulary.json are silently dropped from the story's refs, as before.
