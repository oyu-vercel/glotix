# Global vocabulary

`docs/words/vocabulary.json` is the consolidated global vocabulary for Italian
A2. It is the union of every translated word currently present in the runtime
JSON assets, with duplicates merged.

## Shape

```json
{
  "language": "italian",
  "level": "a2",
  "categories": [
    {
      "key": "noun",
      "label": "Nouns",
      "words": [
        { "n": 1, "italian": "…", "pronunciation": "…", "translation": "…", "examples": "…" }
      ]
    }
  ]
}
```

Within each category, words are sorted alphabetically by `italian` (Italian
collation, case-insensitive) and `n` is resequenced 1, 2, 3, …. Category order
follows the main vocabulary file (`noun`, `verb`, `adjective`, `adverb`,
`article`, `conjunction`, `interjection`, `preposition`, `pronoun`).

## How it was built

One-shot consolidation from these JSON sources (CSVs were intentionally
ignored):

- `web/public/assets/vocabulary-italian-a2.json`
- `web/public/assets/stories/*.json` (each story's `vocabulary` section)

Merge rules:

- Union by `italian` within a category — first occurrence wins (main vocab
  beats story extras when the same word appears in both).
- `extras: true` is dropped on merged entries.
- The `n` field is reassigned after sorting.

The script was a one-shot and was not committed; regenerate by re-reading the
three source files and applying the rules above if the sources change.

## Status

- This file exists as a static snapshot. The Angular app still reads its
  generated assets (`vocabulary-italian-a2.json`, `stories/*.json`); the build
  pipeline has **not** been rewired to read from this file yet.
- The per-POS CSVs at `docs/words/italian/a2/` and the story `*.extras.csv`
  files remain in place and untouched.
