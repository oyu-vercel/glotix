# Stories viewer

Per-story reading view + per-story vocabulary, mirroring the A2 vocabulary feature.

## App shell

A `Stories` link sits next to `Vocabulary` in the toolbar ([web/src/app/app.html](../web/src/app/app.html)). Two routes ([web/src/app/app.routes.ts](../web/src/app/app.routes.ts)):

| Path                  | Component                                                                   |
| --------------------- | --------------------------------------------------------------------------- |
| `/stories`            | `StoriesSummary` ([summary.ts](../web/src/app/stories/summary/summary.ts)) |
| `/stories/:slug`      | `StoryDetail` ([detail.ts](../web/src/app/stories/detail/detail.ts))       |

`StoryDetail` reads the route parameter via `input.required<string>()` and `withComponentInputBinding()` (already configured in [app.config.ts](../web/src/app/app.config.ts)).

## Data flow

```
docs/stories/<slug>.txt              (story source)
docs/stories/<slug>.extras.csv       (optional, user-curated non-A2 vocab)
docs/words/italian/a2/*.csv          (A2 vocabulary CSVs, reused via build-vocabulary.mjs)
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

1. **Discover** all `*.txt` files in `docs/stories/` (slug = filename without extension).
2. **Tokenize** each story: NFC normalize → lowercase → split on `\p{L}\p{N}` complement → drop empty/numeric tokens. Italian apostrophes (`l'aria` → `l`, `aria`) and quotation marks are handled.
3. **Match tokens against A2 vocab** (loaded via shared `loadVocabulary()` from [build-vocabulary.mjs](../web/scripts/build-vocabulary.mjs)):
   - **Direct**: token === A2 `italian` headword (after lowercase + slash-variant split).
   - **Indirect**: token appears in any A2 entry's example sentences (first-match wins). Catches inflected forms — e.g. `saliamo` resolves to `salire`, `vado`/`vanno` to `andare`, `può` to `potere`.
4. **Merge optional extras**: if `docs/stories/<slug>.extras.csv` exists, each row (`category, italian, pronunciation, translation, examples`) is added to the named category, overriding any A2 match with the same `italian`. Tokens from both the `italian` field and the row's `examples` are marked as matched, so inflected forms inside the curated examples (e.g. `abituata`, `abituati` under the headword `abituato`) drop out of `untranslated`.
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
  - **Vocabulary (N)** — `mat-table` of categories (with row click drilling into a per-category word table that mirrors the columns of [vocabulary/category](../web/src/app/vocabulary/category/category.ts): #, Word, Pronunciation, Translation, Examples). Below that, a collapsible `<details>` panel labeled "Untranslated (N)" lists stub words as chips.
    - Word rows whose `italian` is not in the A2 vocabulary (i.e. story-only entries from the extras CSV) get a subtle primary-tinted background via the `.story-only-row` class. The build script sets `extras: true` on those `Word`s; the template binds the class with `[class.story-only-row]="row.extras"`.

## CSV format for extras

`docs/stories/<slug>.extras.csv` (optional, no header row required but tolerated):

```
category,italian,pronunciation,translation,examples
noun,traghetto,[трагéтто],паром,Prendiamo il traghetto per la Sicilia.
verb,scappare,[скаппáре],убегать,Scappiamo via!
```

`category` must be one of the 9 keys: `noun`, `verb`, `adjective`, `adverb`, `article`, `conjunction`, `interjection`, `preposition`, `pronoun`. Unknown categories are logged as warnings and skipped.

## Adding a new story

1. Drop `docs/stories/<slug>.txt`.
2. (Optional) Add `docs/stories/<slug>.extras.csv` for non-A2 vocab you want translated.
3. Run `npm --prefix web run build:vocab` (or `build:stories` for the story step only).
4. The story appears automatically at `/stories`.
