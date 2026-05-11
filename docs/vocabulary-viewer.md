# Vocabulary viewer — Italian A2

An English-UI vocabulary viewer for the Italian A2 word lists at [`words/italian/a2/`](words/italian/a2). UI labels are English; Russian appears only inside table cells (translation, transcription).

## App shell

[`web/src/app/app.html`](../web/src/app/app.html) renders a `mat-toolbar` (sticky, primary color) with the app title and a `Vocabulary` link that points to `/vocabulary`. The toolbar is visible on every page; the active link is highlighted via `routerLinkActive`.

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | redirect | Forwards to `/vocabulary` (also catches unknown paths via `**`) |
| `/vocabulary` | [`Summary`](../web/src/app/vocabulary/summary/summary.ts) | Landing page — `mat-table` with `Category` + `Words` columns, click row to drill in, footer row shows the grand total |
| `/category/:key` | [`Category`](../web/src/app/vocabulary/category/category.ts) | Per-category table with columns `#`, `Word`, `Pronunciation`, `Translation`, `Examples`. Words are numbered `1..N` after sorting alphabetically by the Italian word. Header row includes two `Memorize` buttons (`Italian → Russian` and `Russian → Italian`) |
| `/category/:key/memorize` | [`Memorize`](../web/src/app/vocabulary/memorize/memorize.ts) | Flashcard mode — see [Memorize mode](#memorize-mode) below. Accepts `?direction=russian` for the reverse mode |

## Data flow

1. The CSVs at [`words/italian/a2/*.csv`](words/italian/a2) are the source of truth.
2. [`web/scripts/build-vocabulary.mjs`](../web/scripts/build-vocabulary.mjs) reads them, sorts each category by Italian word (locale-aware via `localeCompare(b, 'it', { sensitivity: 'base' })`), assigns `n`, and writes a single JSON to [`web/public/assets/vocabulary-italian-a2.json`](../web/public/assets/vocabulary-italian-a2.json).
3. [`VocabularyService`](../web/src/app/vocabulary/vocabulary.service.ts) fetches that JSON once via `HttpClient` and caches with `shareReplay(1)`. Components read via the async pipe.

**Regenerate the JSON** when CSVs change:

```
npm --prefix web run build:vocab
```

## JSON shape

```ts
interface Vocabulary {
  language: 'italian';
  level: 'a2';
  categories: Category[];
}

interface Category {
  key: 'noun' | 'verb' | 'adjective' | 'adverb' | 'article'
     | 'conjunction' | 'interjection' | 'preposition' | 'pronoun';
  label: string;   // English plural, e.g. "Nouns"
  words: Word[];
}

interface Word {
  n: number;
  italian: string;
  pronunciation: string;   // Cyrillic transcription
  translation: string;     // Russian
  examples: string;        // Italian example sentences
}
```

Types live in [`web/src/app/vocabulary/vocabulary.types.ts`](../web/src/app/vocabulary/vocabulary.types.ts).

## Category labels

| key | label |
|---|---|
| `noun` | Nouns |
| `verb` | Verbs |
| `adjective` | Adjectives |
| `adverb` | Adverbs |
| `article` | Articles |
| `conjunction` | Conjunctions |
| `interjection` | Interjections |
| `preposition` | Prepositions |
| `pronoun` | Pronouns |

## Memorize mode

Reached by one of two buttons on the category page:

- **Italian → Russian** → `/category/:key/memorize` (default).
- **Russian → Italian** → `/category/:key/memorize?direction=russian`.

The direction is bound from the `direction` query param via the component's `direction = input<string>('italian')`. Anything other than the literal string `russian` is treated as Italian-first.

### Card flow

- The category's words are **shuffled** (Fisher–Yates) on each entry; the shuffled deck is held in `fullShuffled`. The visible `cards` is `fullShuffled` filtered against the persisted skip list.
- Each card has **two stages**, advanced by clicking the card, pressing `Space`, or pressing `Enter`:
  - **Italian → Russian** mode (default):
    1. **Front** — Italian word + Cyrillic transcription.
    2. **Back** — translation + examples.
  - **Russian → Italian** mode (`?direction=russian`):
    1. **Front** — Russian translation only.
    2. **Back** — Italian word + transcription + examples.
- Examples on the back render as a numbered list (`<ol>`), one sentence per line, regardless of mode.
- Whichever element is in `.front` gets prompt-level styling (large + primary); whichever is in `.back` gets the smaller answer-level styling. CSS selectors are scoped under `.front` / `.back` parents so the same `.italian` / `.translation` class adapts.
- After the back of the last card, the deck wraps to index 0 — forward-only, no previous-word/previous-stage navigation.
- A progress indicator `n / total` is shown in the top bar.
- Exit only via the `← Exit` link. `Esc` is repurposed (see Skip below).

### Skip

A word can be skipped from three places, all wired to the same `skip()` action:

- The `Skip` button at the top-right corner of the card.
- Right-click anywhere on the card (`(contextmenu)`, with `preventDefault()` to suppress the browser menu).
- The `Esc` key.

Skipping a word adds it to the persisted skip list **and** removes it from the current session's deck immediately (`cards` is `computed` over `fullShuffled` and `skips`, so it auto-updates). If the skip empties out the rest of the deck, `index` wraps to `0`. If every word is skipped, the empty-state message replaces the card.

### Reset skips

A `Reset Skips (N)` button sits in the top bar next to the progress indicator. It is **disabled** when `skips.size === 0` and enabled otherwise. Clicking it clears **this category's** skip list only — other categories' skips remain.

### Comment per word

A textarea below the card stores a per-word note. Layout: label, textarea, then `Save` / `Cancel` buttons (right-aligned). Both buttons are disabled when the draft equals the saved value (no dirty state). Save persists; Cancel reverts the draft. **No keymap** for save/cancel — buttons only.

While the textarea has focus, the page-level keyboard handlers for `Space` / `Enter` / `Esc` short-circuit so typing in the comment does not advance, reveal, or skip the card.

### Persistence

All state lives in `localStorage` under the `glotix:` prefix, via [`MemorizeStorage`](../web/src/app/vocabulary/memorize/memorize-storage.ts):

| Key | Value |
|---|---|
| `glotix:skip:<categoryKey>` | JSON `string[]` — Italian words skipped for that category |
| `glotix:comment:<categoryKey>:<italian>` | Plain string — the user's comment for that word (deleted when emptied) |

Skips persist across sessions and reloads. Re-entering memorize re-shuffles the deck but keeps the persisted skip list applied. The screen's `fullShuffled` signal is set once on entry; `cards` is a computed filter.

## Theming

The color scheme is locked to **light** at [`web/src/styles.scss:26`](../web/src/styles.scss) (`color-scheme: light;`). Do not introduce `prefers-color-scheme: dark` overrides or switch this to `dark` / `light dark` without a deliberate design decision.

The category-page table cells are uniform `body-medium` (14px) and **not italic** — the `Examples` column included.

## CSV format

Each CSV has 4 comma-separated columns (with quoting where examples contain internal commas):

```
Итальянская фраза,Как произносить (по-русски),Перевод на русский,"Примеры использования в предложении (3-5, только слова из списка)"
```

The build script uses [`csv-parse`](https://www.npmjs.com/package/csv-parse) so quoted fields with internal commas are parsed correctly.
