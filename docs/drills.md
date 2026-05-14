# Drills feature

Drills are small thematic dictionaries (e.g. days of the week, months of the year) — each is one CSV with a handful of Italian words and rich Russian-aligned example sentences. They live alongside Vocabulary and Stories as a third top-level study section.

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/drills` | `DrillsList` | Title-only table of drills, row click → detail. |
| `/drills/:slug` | `DrillDetail` | Two tabs: **Words** (flat word table + 3 deck buttons) and **Patterns** (one-column phrase table + Repeat button). |
| `/drills/:slug/memorize` | `DrillMemorize` | Words memorize deck. Default direction `italian`; pass `?direction=russian` for the reverse. Reuses [memorize-deck](../web/src/app/shared/memorize-deck). |
| `/drills/:slug/repeat` | `DrillRepeat` | Words repeat deck. Reuses [repeat-deck](../web/src/app/shared/repeat-deck). |
| `/drills/:slug/patterns/repeat` | `DrillPatternsRepeat` | Pattern repeat — each card shows the italian phrase AND its russian translation simultaneously. Uses the new [pattern-repeat-deck](../web/src/app/shared/pattern-repeat-deck). |

The three word-deck buttons mirror the buttons on the story-detail Vocabulary tab. The single Patterns Repeat button is unique to drills.

## Data flow

Source of truth: CSV files under `docs/drills/<folder>/`. One CSV per folder. Filename → slug (e.g. `days-of-week.csv` → `days-of-week`).

```
docs/drills/d1/days-of-week.csv          ─┐
                                          │  npm run build:drills
                                          ▼
web/public/assets/drills-index.json
web/public/assets/drills/days-of-week.json
```

### CSV format (5 columns)

```
Italian Phrase, Russian Phonetic Transcription, Russian Translation, Example Sentences, Russian Translation of Examples
```

Example sentences and their Russian translations live in two parallel multi-line cells. Each line in column 4 corresponds (by index) to the same line in column 5. Build hard-errors if a row's two lists differ in length.

### Per-drill JSON — `web/public/assets/drills/<slug>.json`

```json
{
  "slug": "days-of-week",
  "title": "Days of Week",
  "wordOrder": [
    { "category": "noun", "n": 160 },
    { "category": "noun", "n": 170 }
  ],
  "patterns": [
    { "italian": "Oggi è lunedì.", "russian": "Сегодня понедельник." }
  ]
}
```

`wordOrder` is the flat list of word references in CSV row order — drives the Words tab ordering (so a days-of-week drill renders Monday → Sunday, not vocabulary.json insertion order). The Angular service resolves each `{category, n}` against `vocabulary.json` at runtime.

`patterns` is flat — drills do not group patterns by source word.

### Drills index — `web/public/assets/drills-index.json`

```json
{
  "language": "italian",
  "level": "a2",
  "drills": [
    { "slug": "days-of-week", "title": "Days of Week", "wordCount": 7, "patternCount": 70 }
  ]
}
```

The list page only renders `title`. `wordCount` and `patternCount` are emitted for build-time sanity checks.

## Build pipeline

Two scripts under `web/scripts/`:

- **`merge-drill-words.mjs`** — drill-specific merge into `vocabulary.json`. Variant of `merge-words.mjs` that expects 5 columns and newline-separated examples (vs period-separated for stories). For matched italian phrases: appends unique new examples up to 10 per word (pronunciation/translation never overwritten). For unmatched: writes `unmatched.json` alongside the CSV.
- **`build-drills.mjs`** — walks `docs/drills/*/`, builds `wordOrder` from each CSV row's italian phrase (looked up in `vocabulary.json`), and zips columns 4+5 to build `patterns`. **Skips drills with any missing word** (with a warning) — incomplete drills do not appear in `/drills` until their words are merged + appended. Cleans the output directory before writing.

NPM script: `npm --prefix web run build:drills`.

## Onboarding a new drill

Use the [`add-drill` skill](../.claude/skills/add-drill/SKILL.md).

## Components

- [`DrillDetail`](../web/src/app/drills/detail) — tabbed view; hosts `<app-word-table>` for Words and `<app-patterns-table>` for Patterns.
- [`PatternsTable`](../web/src/app/drills/patterns-table) — single-column italian-phrase table with a sequential `#` row-number column. Standalone component (matches the WordTable pattern) so Material's content-children query is scoped to its own template.
- [`PatternRepeatDeck`](../web/src/app/shared/pattern-repeat-deck) — slim variant of `RepeatDeck`: shuffles a `PatternPair[]`, shows italian + russian together on each card, advances on click / Space / Enter. No flip, no memorize button, no memorized-set filter.

## Notes

- **Memorized integration** — drill words share the global `glotix:memorized` set (per [memorized-vocabulary.md](memorized-vocabulary.md)). Marking `lunedì` from a drill memorize deck removes it from `/category/noun` and any story deck.
- **Skips scope** — drill skips live under `drill:<slug>` in the memorize-storage scope namespace.
- **Patterns** — phrases aren't part of the memorized set. The pattern repeat deck deliberately omits the Memorized button.
- **Row numbering** — both the Words tab table (via shared `WordTable`) and the Patterns tab table show sequential `1, 2, 3, …` in the `#` column, not the underlying `vocabulary.json` `n` value. The `n` field is still emitted in the per-drill JSON for runtime lookup.
