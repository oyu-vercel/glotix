# Multi-language

Glotix is organised around **language pairs**. A pair is a target language taught to speakers of a
native language, written `<target>-<native>` — `it-ru` is Italian for Russian speakers. The pair is
the first URL segment, the asset folder name, and the namespace for saved progress. Vocabulary,
stories, drills and lessons all live inside one.

Shipping pairs: `it-ru` (A2, populated), `en-ru` (A2, two lessons and their vocabulary; no stories
or drills yet) and `pl-ru` (no level, no content yet — index stubs only).

```
Glotix
└── it-ru
    ├── vocabulary
    ├── stories
    ├── drills
    └── lessons
```

No language is named in code or data. A word's headword field is `target`, its native-language side
is `native`, and every visible language name is read from `languages.json` at runtime.

## languages.json

`web/public/assets/languages.json` is the only asset fetched before a pair is chosen.

```json
{
  "languages": [
    {
      "pair": "it-ru",
      "target": "it",
      "native": "ru",
      "targetLabel": "Italian",
      "nativeLabel": "Russian",
      "level": "a2"
    }
  ]
}
```

`level` lives here rather than in each index file, which is why the vocabulary summary route is
`/:pair/vocabulary/summary` and not `/vocabulary/a2`.

A pair may set `level` to `""` when it should carry no CEFR label. Every place that renders it
guards on the empty string: the picker drops the chip
([picker.html](../web/src/app/shared/language/picker/picker.html)), the vocabulary summary eyebrow
falls back to plain `Vocabulary` ([summary.html](../web/src/app/vocabulary/summary/summary.html)),
and the story empty state reads "No vocabulary matched…"
([detail.html](../web/src/app/stories/detail/detail.html)). `pl-ru` ships this way.

## Asset layout

```
web/public/assets/
  languages.json
  it-ru/
    vocabulary.json          { categories: [{ key, label, words: [{ n, target, pronunciation, translation, examples }] }] }
    stories-index.json       { stories: [...] }
    stories/<slug>.json
    drills-index.json        { drills: [...] }
    drills/<slug>.json
    lessons-index.json       { lessons: [...] }
    lessons/<slug>.json
    lessons/<slug>.txt
  en-ru/
    …same files; lessons and vocabulary populated, stories and drills still empty
  pl-ru/
    …same files; all four are empty stubs
```

Sources mirror it:

```
docs/
  it-ru/
    stories/<folder>/       *.txt + *-words.csv
    drills/<folder>/        *.csv
    transcripts/            lesson-<n>.txt + lesson-<n>-target.txt
```

A pair with no content still needs its four index files, or its screens error instead of showing an
empty state. `en-ru` still ships `{ "stories": [] }` and `{ "drills": [] }`; its `vocabulary.json`
and `lessons-index.json` are populated. `pl-ru` ships all four empty.

Stories, drills and lessons each render their own "No … yet." empty state, but the vocabulary
summary has none — an empty `categories` array leaves a bare table header. So a content-free pair's
`vocabulary.json` lists all nine categories with `"words": []`, which renders as a full table of
zeroes instead.

## Routes

`/` is the picker; everything else hangs off `:pair`.

| Path | Screen |
| --- | --- |
| `/` | Two-step language picker |
| `/:pair` | → `/:pair/vocabulary` |
| `/:pair/vocabulary` | Vocabulary landing (global + per-story progress) |
| `/:pair/vocabulary/summary` | Category progress table |
| `/:pair/vocabulary/memorized[/:key]` | Memorized categories, then words |
| `/:pair/category/:key[/memorize\|/repeat]` | Category words and decks |
| `/:pair/stories[/:slug]` | Stories list and detail |
| `/:pair/stories/:slug/category/:key/memorize\|repeat` | Story-scoped decks |
| `/:pair/drills[/:slug]` | Drills list and detail |
| `/:pair/drills/:slug/memorize\|repeat\|patterns/repeat` | Drill decks |
| `/:pair/lessons[/:slug]` | Lessons list and detail |
| `/:pair/lessons/:slug/memorize\|repeat\|patterns/repeat` | Lesson decks |

The `:pair` route is componentless and guarded by `pairMatch`
([pair-match-guard.ts](../web/src/app/shared/language/pair-match-guard.ts)), which requires the
segment to look like `xx-xx`. Anything else falls through to `**` and back to the picker, so a typo
never reaches `/assets/<typo>/…`.

Reverse decks use `?direction=native` (the forward default is `target`).

## LanguageService

[`web/src/app/shared/language/language.service.ts`](../web/src/app/shared/language/language.service.ts)
is the single source of the active pair.

- `pair: Signal<string>` — the first URL segment, updated on every `NavigationEnd`. Empty string
  while the picker is showing.
- `pair$: Observable<string>` — the same value with empties filtered out, so a data service never
  fetches `/assets//…`.
- `languages`, `current`, `targetLabel`, `nativeLabel`, `level` — for anything that needs to name a
  language on screen.
- `select(pair)` / `remembered()` — persist and read `localStorage['glotix:pair']`.

Every data service is built the same way: an index observable that `switchMap`s on `pair$`, and
per-item caches keyed `` `${pair}:${slug}` ``. Component-facing method signatures are unchanged —
they still take just a slug — because the pair comes from the service, not the caller.

The URL is the source of truth, so switching course is a navigation, not a state mutation.

## Picker and switcher

- [`shared/language/picker/`](../web/src/app/shared/language/picker/) renders `/`: "I speak…" over
  the distinct `native` values, then "I'm learning…" over that native's targets. Once
  `languages.json` is in, a remembered pair short-circuits straight to it.
- [`shared/language/switcher/`](../web/src/app/shared/language/switcher/) is the toolbar dropdown.
  It lists every pair and navigates to `/<pair>`.

The nav links in `app.html` are hidden until a pair is active, and each one is built from it.

## Progress storage

Progress is per pair — the same headword can mean different things in two courses.

| Key | Holds |
| --- | --- |
| `glotix:<pair>:memorized` | JSON array of memorized `target` headwords |
| `glotix:<pair>:skip:<scope>` | JSON array of skipped headwords for one deck scope |
| `glotix:<pair>:comment:<word>` | Free-text note on one word |
| `glotix:pair` | Last pair used, so `/` can skip the picker |
| `glotix:migrated:pairs` | Guard for the one-time legacy migration |

[`MemorizeStorage`](../web/src/app/shared/storage/memorize-storage.ts) prefixes every key with the
active pair, and its `memorized` signal is a `computed` over that pair, so a course switch swaps the
whole set. On first construction it moves any legacy unprefixed key (`glotix:memorized`,
`glotix:skip:*`, `glotix:comment:*`) into the `it-ru` namespace and sets the guard.

## Build scripts

`build-stories.mjs` and `build-drills.mjs` rebuild every pair by default, or one when named:

```bash
npm --prefix web run build:stories -- it-ru
```

The merge and append helpers take the pair as their first argument:

```bash
node web/scripts/merge-csv-words.mjs story it-ru docs/it-ru/stories/s3
node web/scripts/merge-csv-words.mjs drill it-ru docs/it-ru/drills/d2
node web/scripts/append-words.mjs it-ru docs/it-ru/drills/d2/unmatched.json
```

[`lib/pairs.mjs`](../web/scripts/lib/pairs.mjs) resolves those paths and validates the pair against
`languages.json`, so a typo fails loudly instead of writing into a new folder.

## Adding a pair

1. Add an entry to `languages.json` (`level: ""` if it should carry no CEFR label).
2. Create `web/public/assets/<pair>/` with `vocabulary.json` (the nine categories with empty `words`
   arrays, or a real one) plus `stories-index.json`, `drills-index.json` and `lessons-index.json`
   stubs. Copy `pl-ru/` for a blank starting point.
3. Create `docs/<pair>/` folders as content arrives, then run the `add-story`, `add-drill` or
   `add-lesson` skill with the pair.

The categories in a new pair's `vocabulary.json` must use the same nine keys (`noun`, `verb`,
`adjective`, `adverb`, `article`, `conjunction`, `interjection`, `preposition`, `pronoun`) — the
authoring skills and `append-words.mjs` validate against them.
