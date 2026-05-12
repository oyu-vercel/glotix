# Stories viewer

Per-story reading view + per-story vocabulary, mirroring the A2 vocabulary feature.

## App shell

A `Stories` link sits next to `Vocabulary` in the toolbar ([web/src/app/app.html](../web/src/app/app.html)). Four routes ([web/src/app/app.routes.ts](../web/src/app/app.routes.ts)):

| Path                                                       | Component                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/stories`                                                 | `StoriesSummary` ([summary.ts](../web/src/app/stories/summary/summary.ts))               |
| `/stories/:slug` (optional `?cat=<key>` query param)       | `StoryDetail` ([detail.ts](../web/src/app/stories/detail/detail.ts))                     |
| `/stories/:slug/category/:key/memorize` (`?direction=russian` for reverse) | `StoryMemorize` ([memorize.ts](../web/src/app/stories/memorize/memorize.ts)) |
| `/stories/:slug/category/:key/repeat`                      | `StoryRepeat` ([repeat.ts](../web/src/app/stories/repeat/repeat.ts))                     |

`StoryDetail` reads `slug` (route param) and `cat` (query param) via `input` + `withComponentInputBinding()` (configured in [app.config.ts](../web/src/app/app.config.ts)). The `cat` param drives which category is drilled into; entering a `cat`-set URL also auto-opens the Vocabulary tab.

## Data flow

```
docs/stories/<folder>/<slug>.txt           (story source — one folder per story)
docs/stories/<folder>/<slug>.extras.csv    (optional, user-curated non-A2 vocab)
docs/words/italian/a2/*.csv                (A2 vocabulary CSVs, reused via build-vocabulary.mjs)
        │
        ▼   npm run build:vocab   (chains build-vocabulary.mjs + build-stories.mjs)
        │
web/public/assets/stories-index.json
web/public/assets/stories/<slug>.json
        │
        ▼   StoriesService (HttpClient + shareReplay)
        │
StoriesSummary / StoryDetail
```

The build script ([web/scripts/build-stories.mjs](../web/scripts/build-stories.mjs)) does:

1. **Discover** all `*.txt` files under `docs/stories/` recursively — one folder per story, slug = filename without extension. Duplicate slugs across folders are a build error.
2. **Tokenize** each story: NFC normalize → lowercase → split on `\p{L}\p{N}` complement → drop empty/numeric tokens. Italian apostrophes (`l'aria` → `l`, `aria`) and quotation marks are handled.
3. **Match tokens against A2 vocab** (loaded via shared `loadVocabulary()` from [build-vocabulary.mjs](../web/scripts/build-vocabulary.mjs)):
   - **Direct**: token === A2 `italian` headword (after lowercase + slash-variant split).
   - **Indirect**: token appears in any A2 entry's example sentences (first-match wins). Catches inflected forms — e.g. `saliamo` resolves to `salire`, `vado`/`vanno` to `andare`, `può` to `potere`.
4. **Merge optional extras**: if `<slug>.extras.csv` exists next to the `.txt`, each row (`category, italian, pronunciation, translation, examples`) is added to the named category, overriding any A2 match with the same `italian`. Tokens from both the `italian` field and the row's `examples` are marked as matched, so inflected forms inside the curated examples (e.g. `abituata`, `abituati` under the headword `abituato`) drop out of `untranslated`.
5. **Stubs**: any remaining unmatched story tokens become entries in an `untranslated` array (italian-only). Single-letter ASCII tokens are filtered out (Italian elision remnants like `l'`).

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
      "vocabCount": 162,
      "untranslatedCount": 379
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
    "language": "italian",
    "level": "a2",
    "categories": [
      { "key": "noun",  "label": "Nouns", "words": [...] },
      { "key": "verb",  "label": "Verbs", "words": [...] },
      ...
    ]
  },
  "untranslated": ["abituata", "accendono", "afa", "..."]
}
```

`vocabulary` reuses the existing [`Vocabulary` interface](../web/src/app/vocabulary/vocabulary.types.ts) so the same Word/Category types power both features.

## UI

- **`/stories`** — `mat-table` listing each story with title, paragraph count, A2 vocab count, untranslated count. Row click navigates to `/stories/:slug`.
- **`/stories/:slug`** — header with the title; `mat-tab-group` with two tabs:
  - **Read** — renders the story text as paragraphs. Short standalone lines ending in `.` (≤ 60 chars, ≤ 6 words, no quote characters) auto-promote to `<h2>` section headers. The title line is skipped (already shown as page header).
  - **Vocabulary (N)** — `mat-table` of categories (with row click drilling into a per-category word table that mirrors the columns of [vocabulary/category](../web/src/app/vocabulary/category/category.ts): #, Word, Pronunciation, Translation, Examples). The drilldown header carries three buttons — **Italian → Russian**, **Russian → Italian**, **Repeat** — that link to `StoryMemorize` / `StoryRepeat` for that category's full word set (A2 matches + extras). Below the table, a collapsible `<details>` panel labeled "Untranslated (N)" lists stub words as chips.
    - Category selection is URL-driven via the `cat` query param, so memorize/repeat can exit back to the same drilled-in state.

## Memorize / Repeat

`StoryMemorize` and `StoryRepeat` mirror the vocabulary equivalents 1-for-1 ([memorize.ts](../web/src/app/vocabulary/memorize/memorize.ts), [repeat.ts](../web/src/app/vocabulary/repeat/repeat.ts)) — same shuffle, keyboard shortcuts, card layout, skip / comment UX — but pull their word set from `StoriesService.getStory(slug)` filtered to the requested category, so they cover A2 matches + extras (untranslated stubs are excluded).

Skip and comment state is stored via the shared [`MemorizeStorage`](../web/src/app/vocabulary/memorize/memorize-storage.ts) under a per-story scope, isolated from main-vocabulary state:

| Surface                                              | Skip key                                         | Comment key                                                  |
| ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| `/category/<key>/memorize`                           | `glotix:skip:<key>`                              | `glotix:comment:<key>:<italian>`                             |
| `/stories/<slug>/category/<key>/memorize`            | `glotix:skip:story:<slug>:<key>`                 | `glotix:comment:story:<slug>:<key>:<italian>`                |

Exit from memorize/repeat navigates to `/stories/<slug>?cat=<key>`, which auto-opens the Vocabulary tab on the same drilled-in category.

## CSV format for extras

`docs/stories/<folder>/<slug>.extras.csv` (optional, no header row required but tolerated):

```
category,italian,pronunciation,translation,examples
noun,traghetto,[трагéтто],паром,Prendiamo il traghetto per la Sicilia.
verb,scappare,[скаппáре],убегать,Scappiamo via!
```

`category` must be one of the 9 keys: `noun`, `verb`, `adjective`, `adverb`, `article`, `conjunction`, `interjection`, `preposition`, `pronoun`. Unknown categories are logged as warnings and skipped.

## Adding a new story

1. Create a folder `docs/stories/<folder>/` and drop `<slug>.txt` inside.
2. (Optional) Add `<slug>.extras.csv` in the same folder for non-A2 vocab you want translated.
3. Run `npm --prefix web run build:vocab` (or `build:stories` for the story step only).
4. The story appears automatically at `/stories`.
