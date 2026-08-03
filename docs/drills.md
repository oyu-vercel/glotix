# Drills feature

Drills are small thematic dictionaries (e.g. days of the week, months of the year) — each is one CSV with a handful of target-language words and rich native-language-aligned example sentences. They live alongside Vocabulary and Stories as a third top-level study section.

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/:pair/drills` | `DrillsList` | Title-only table of drills, row click → detail. |
| `/:pair/drills/:slug` | `DrillDetail` | Two tabs: **Words** (flat word table + 3 deck buttons) and **Patterns** (one-column phrase table + Repeat button). |
| `/:pair/drills/:slug/memorize` | `DrillMemorize` | Words memorize deck. Default direction `target`; pass `?direction=native` for the reverse. Reuses [memorize-deck](../web/src/app/shared/memorize-deck). |
| `/:pair/drills/:slug/repeat` | `DrillRepeat` | Words repeat deck. Reuses [repeat-deck](../web/src/app/shared/repeat-deck). |
| `/:pair/drills/:slug/patterns/repeat` | `DrillPatternsRepeat` | Pattern repeat — each card shows the target phrase AND its native translation simultaneously. Uses the new [pattern-repeat-deck](../web/src/app/shared/pattern-repeat-deck). |

The three word-deck buttons mirror the buttons on the story-detail Vocabulary tab. The single Patterns Repeat button is unique to drills.

## Data flow

Source of truth: CSV files under `docs/<pair>/drills/<folder>/`. One CSV per folder. Filename → slug (e.g. `days-of-week.csv` → `days-of-week`).

```
docs/it-ru/drills/d1/days-of-week.csv    ─┐
                                          │  npm run build:drills -- it-ru
                                          ▼
web/public/assets/it-ru/drills-index.json
web/public/assets/it-ru/drills/days-of-week.json
```

### CSV format (5 columns)

```
Target Phrase, Native Phonetic Transcription, Native Translation, Example Sentences, Native Translation of Examples
```

Example sentences and their native-language translations live in two parallel multi-line cells. Each line in column 4 corresponds (by index) to the same line in column 5. Build hard-errors if a row's two lists differ in length.

### Per-drill JSON — `web/public/assets/<pair>/drills/<slug>.json`

```json
{
  "slug": "days-of-week",
  "title": "Days of Week",
  "wordOrder": [
    { "category": "noun", "n": 160 },
    { "category": "noun", "n": 170 }
  ],
  "patterns": [
    { "target": "Oggi è lunedì.", "native": "Сегодня понедельник." }
  ]
}
```

`wordOrder` is the flat list of word references in CSV row order — drives the Words tab ordering (so a days-of-week drill renders Monday → Sunday, not vocabulary.json insertion order). The Angular service resolves each `{category, n}` against that pair's `vocabulary.json` at runtime.

`patterns` is flat — drills do not group patterns by source word.

### Drills index — `web/public/assets/<pair>/drills-index.json`

```json
{
  "drills": [
    { "slug": "days-of-week", "title": "Days of Week", "wordCount": 7, "patternCount": 70 }
  ]
}
```

The list page only renders `title`. `wordCount` and `patternCount` are emitted for build-time sanity checks.

## Build pipeline

Two scripts under `web/scripts/`:

- **`merge-csv-words.mjs`** — merges a words CSV into a pair's `vocabulary.json`, invoked as `node web/scripts/merge-csv-words.mjs drill <pair> <drillFolder>`. The same script serves stories via the `story` format; `drill` means 5 columns with newline-separated examples, `story` means 4 with period-separated ones. For matched target phrases: appends unique new examples up to 10 per word (pronunciation/translation never overwritten). For unmatched: writes `unmatched.json` alongside the CSV (rows use `target` as the headword field). Row 1 is always treated as a header and dropped; if its first cell turns out to be a real headword the script fails rather than silently eating a word.
- **`build-drills.mjs`** — walks `docs/<pair>/drills/*/`, builds `wordOrder` from each CSV row's target phrase (looked up in that pair's `vocabulary.json`), and zips columns 4+5 to build `patterns`. **Skips drills with any missing word** (with a warning) — incomplete drills do not appear in `/:pair/drills` until their words are merged + appended. Cleans the output directory before writing.

NPM script: `npm --prefix web run build:drills` (rebuilds all pairs; pass one pair with `npm --prefix web run build:drills -- it-ru`).

## Onboarding a new drill

Use the [`add-drill` skill](../.claude/skills/add-drill/SKILL.md).

## Components

- [`DrillDetail`](../web/src/app/drills/detail) — tabbed view; hosts `<app-word-table>` for Words and `<app-patterns-table>` for Patterns.
- [`PatternsTable`](../web/src/app/drills/patterns-table) — single-column target-phrase table with a sequential `#` row-number column. Standalone component (matches the WordTable pattern) so Material's content-children query is scoped to its own template.
- [`PatternRepeatDeck`](../web/src/app/shared/pattern-repeat-deck) — slim variant of `RepeatDeck`: shuffles a `PatternPair[]`, shows target + native together on each card, advances on click / Space / Enter. No flip, no memorize button, no memorized-set filter.

## Notes

- **Memorized integration** — drill words share the pair's `glotix:<pair>:memorized` set (per [memorized-vocabulary.md](memorized-vocabulary.md)). Marking `lunedì` from a drill memorize deck removes it from `/:pair/category/noun` and any story deck.
- **Skips scope** — drill skips live under the `drill:<slug>` scope within `glotix:<pair>:skip:*`.
- **Patterns** — phrases aren't part of the memorized set. The pattern repeat deck deliberately omits the Memorized button.
- **Row numbering** — both the Words tab table (via shared `WordTable`) and the Patterns tab table show sequential `1, 2, 3, …` in the `#` column, not the underlying `vocabulary.json` `n` value. The `n` field is still emitted in the per-drill JSON for runtime lookup.
