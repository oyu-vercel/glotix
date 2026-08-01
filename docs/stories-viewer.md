# Stories viewer

Per-story reading view + per-story vocabulary, mirroring the A2 vocabulary feature.

## App shell

A `Stories` link sits next to `Vocabulary` in the toolbar ([web/src/app/app.html](../web/src/app/app.html)). Four routes ([web/src/app/app.routes.ts](../web/src/app/app.routes.ts)), each under the `/:pair/` prefix:

| Path                                                       | Component                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/:pair/stories`                                                 | `StoriesSummary` ([summary.ts](../web/src/app/stories/summary/summary.ts))               |
| `/:pair/stories/:slug` (optional `?cat=<key>` or `?tab=vocab`)   | `StoryDetail` ([detail.ts](../web/src/app/stories/detail/detail.ts))                     |
| `/:pair/stories/:slug/category/:key/memorize` (`?direction=native` for reverse) | [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) with [`provideStoryDeckSurface()`](../web/src/app/stories/story-deck-surface.ts) |
| `/:pair/stories/:slug/category/:key/repeat`                      | [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) with `provideStoryDeckSurface()` |

`StoryDetail`'s `cat` query param drives which category is drilled into and auto-opens the Vocabulary tab. `tab=vocab` (used by the vocabulary index at `/:pair/vocabulary` when clicking a story row) opens the Vocabulary tab without pre-selecting a category.

## Data flow

```
docs/<pair>/stories/<folder>/<slug>.txt           (story source — one folder per story)
web/public/assets/<pair>/vocabulary.json          (single source of truth for words)
        │
        ▼   npm run build:stories -- <pair>
        │
web/public/assets/<pair>/stories-index.json
web/public/assets/<pair>/stories/<slug>.json      (refs into vocabulary.json)
        │
        ▼   StoriesService.getStoryResolved(slug)
        │   (combines story refs with VocabularyService.resolveStoryVocab)
        │
StoriesSummary / StoryDetail / MemorizeRoute / RepeatRoute
```

The build script ([web/scripts/build-stories.mjs](../web/scripts/build-stories.mjs)) does, per pair:

1. **Load** `web/public/assets/<pair>/vocabulary.json` and derive the category order from it.
2. **Discover** all `*.txt` files under `docs/<pair>/stories/` recursively — one folder per story, slug = filename without extension. Duplicate slugs across folders are a build error.
3. **Tokenize** each story: NFC normalize → lowercase → split on `\p{L}\p{N}` complement → drop empty/numeric tokens. Italian apostrophes (`l'aria` → `l`, `aria`) and quotation marks are handled.
4. **Match tokens against the vocabulary**:
   - **Direct**: token === `target` headword (after lowercase + slash-variant split).
   - **Indirect**: token appears in any vocab entry's example sentences (first-match wins). Catches inflected forms — e.g. `saliamo` resolves to `salire`, `vado`/`vanno` to `andare`, `può` to `potere`.
5. For each match, record `{ categoryKey, n }` — the `n` from that pair's `vocabulary.json`. Story tokens that don't match any vocab entry are silently dropped (add the missing word to `vocabulary.json` to include it).

## JSON shape

`stories-index.json`:

```json
{
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

- **`/:pair/stories`** — `mat-table` of stories with `Story` + `Paragraphs` + `Words` (memorized in story) + `Total` (= `vocabCount` from index) + `Progress` columns and a footer Total row. Per-story memorized counts come from resolving each story (one cached HTTP call per story on first visit). Row click navigates to `/:pair/stories/:slug`.
- **`/:pair/stories/:slug`** — header with the title; `mat-tab-group` with two tabs:
  - **Read** — renders the story text as paragraphs. Short standalone lines ending in `.` (≤ 60 chars, ≤ 6 words, no quote characters) auto-promote to `<h2>` section headers. The title line is skipped (already shown as page header).
  - **Vocabulary (N)** — `mat-table` of categories (`Category` + `Words` (memorized in story) + `Total` (this story's per-category word count) + `Progress` columns + footer Total row). Row click drills into the shared [`WordTable`](../web/src/app/shared/word-table/word-table.ts), the same component used by `/:pair/category/:key`, columns: #, Word, Pronunciation, Translation, Examples. The drilldown header carries three buttons, labeled from `languages.json` — **Target → Native**, **Native → Target** (e.g. "Italian → Russian", "Russian → Italian"), **Repeat** — that link to the story-scoped `MemorizeRoute` / `RepeatRoute` for that category's word set.
    - Category selection is URL-driven via the `cat` query param, so memorize/repeat can exit back to the same drilled-in state.

## Memorize / Repeat

The story memorize/repeat routes load the shared generic [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) / [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) components (also used by `/:pair/category/:key/memorize` and `/:pair/category/:key/repeat`) and supply [`provideStoryDeckSurface()`](../web/src/app/stories/story-deck-surface.ts) via per-route `providers`. The story `DeckSurface` resolves the word set through `StoriesService.getStoryResolved(slug)` (filtered to the requested category), produces a `story:<slug>:<key>` scope for the deck's skip storage, and navigates back to `/:pair/stories/<slug>?cat=<key>` on exit (auto-opens the Vocabulary tab on the same drilled-in category). Vocabulary routes use the same generic components but with [`provideVocabularyDeckSurface()`](../web/src/app/vocabulary/vocabulary-deck-surface.ts).

Skip state is stored via the shared [`MemorizeStorage`](../web/src/app/shared/storage/memorize-storage.ts) under a per-surface scope so skipping a word in vocabulary memorize does not hide it in story memorize and vice versa. Comments are stored **once per target word within a language pair** and shared across every memorize view (vocabulary and any story containing that word).

| Surface                                              | Skip key                                         | Comment key             |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------- |
| `/:pair/category/<key>/memorize`                           | `glotix:<pair>:skip:<key>`                              | `glotix:<pair>:comment:<target>` (shared) |
| `/:pair/stories/<slug>/category/<key>/memorize`            | `glotix:<pair>:skip:story:<slug>:<key>`                 | `glotix:<pair>:comment:<target>` (shared) |

## Adding a new story

Use the [`add-story` skill](../.claude/skills/add-story/SKILL.md).

If you only have a `.txt` (no CSV), run `npm --prefix web run build:stories -- <pair>` directly — words not in that pair's vocabulary.json are silently dropped from the story's refs.
