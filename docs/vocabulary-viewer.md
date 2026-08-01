# Vocabulary viewer

An English-UI vocabulary viewer for a language pair's word list (e.g. Italian A2 for Russian speakers). UI labels are English; the native language appears only inside table cells (translation, transcription).

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | language picker | Two-step picker (native language, then target language). Redirects straight to the remembered pair on later visits. |
| `/:pair/vocabulary` | [`List`](../web/src/app/vocabulary/list/list.ts) | Landing page — index of vocabulary sources, split into two `mat-table`s with `Source/Story` + `Words` + `Total` + `Progress` columns. First (untitled) table has two rows — "Global Vocabulary" (→ `/:pair/vocabulary/summary`) and "Memorized Words" (→ `/:pair/vocabulary/memorized`, see [Memorized vocabulary](memorized-vocabulary.md)) — and has **no** footer Total row (would be redundant since both rows describe the same global vocab and show identical numbers; the row is kept so the Memorized Words entry remains the only nav entry to its drill-down). Second table is titled **Stories**, lists per-story vocabularies from `stories-index.json`, and **does** have a footer Total row aggregating across stories; each row navigates to `/:pair/stories/:slug?tab=vocab` so the story opens directly on its Vocabulary tab. The stories section hides itself when there are no stories. Per-story memorized counts are computed by resolving each story (one cached HTTP call per story on first visit). |
| `/:pair/vocabulary/summary` | [`Summary`](../web/src/app/vocabulary/summary/summary.ts) | Global vocabulary categories — `mat-table` with `Category` + `Words` (memorized) + `Total` + `Progress` columns + footer Total row. All 9 categories are shown regardless of memorized count. Click row to drill into `/:pair/category/:key`. |
| `/:pair/vocabulary/memorized` | [`Memorized`](../web/src/app/vocabulary/memorized/memorized.ts) | Category index of memorized words — same `Category` / `Words` / `Total` / `Progress` layout as `/:pair/vocabulary/summary`, but filters out categories with 0 memorized. See [Memorized vocabulary](memorized-vocabulary.md). |
| `/:pair/vocabulary/memorized/:key` | [`MemorizedCategory`](../web/src/app/vocabulary/memorized/category/category.ts) | Per-category memorized-words drill-down with a `Restore` action on each row. See [Memorized vocabulary](memorized-vocabulary.md). |
| `/:pair/category/:key` | [`Category`](../web/src/app/vocabulary/category/category.ts) | Per-category page. The five-column word table (`#`, `Word`, `Pronunciation`, `Translation`, `Examples`) is the shared [`WordTable`](../web/src/app/shared/word-table/word-table.ts) (also used by the story detail page). Header row includes three practice buttons, labeled from `languages.json` (e.g. `Italian → Russian`, `Russian → Italian`), and `Repeat`. The back link returns to `/:pair/vocabulary/summary`. |
| `/:pair/category/:key/memorize` | [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) | Generic route component that renders the shared [`MemorizeDeck`](../web/src/app/shared/memorize-deck/memorize-deck.ts) against the [`DeckSurface`](../web/src/app/shared/deck-surface/deck-surface.ts) provided per-route. Vocabulary routes plug in [`provideVocabularyDeckSurface()`](../web/src/app/vocabulary/vocabulary-deck-surface.ts) so the surface resolves the category from [`VocabularyService`](../web/src/app/vocabulary/vocabulary.service.ts) and exits to `/:pair/category/:key`. See [Memorize mode](#memorize-mode) below. Accepts `?direction=native` for the reverse mode. |
| `/:pair/category/:key/repeat` | [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) | Same `DeckSurface`-driven pattern; renders [`RepeatDeck`](../web/src/app/shared/repeat-deck/repeat-deck.ts). See [Repeat mode](#repeat-mode) below. |

## Data flow

1. [`web/public/assets/<pair>/vocabulary.json`](../web/public/assets/) is the single source of truth — hand-edited there, one file per language pair. Within each category, the `n` field is a 1-indexed id used by stories to reference words.
2. Angular's existing `public/` asset glob ([web/angular.json](../web/angular.json)) serves the file directly at `/assets/<pair>/vocabulary.json` — no build step.
3. [`VocabularyService`](../web/src/app/vocabulary/vocabulary.service.ts) fetches that JSON once via `HttpClient` and caches with `shareReplay(1)`. Components consume it through `toSignal()`.

## JSON shape

```ts
interface Vocabulary {
  categories: Category[];
}

interface Category {
  key: 'noun' | 'verb' | 'adjective' | 'adverb' | 'article'
     | 'conjunction' | 'interjection' | 'preposition' | 'pronoun';
  label: string;   // English plural, e.g. "Nouns"
  words: Word[];
}

interface Word {
  n: number;             // 1-indexed within its category; stable ref id for stories
  target: string;
  pronunciation: string; // Cyrillic transcription
  translation: string;   // Russian
  examples: string;      // target-language example sentences
}
```

Types live in [`web/src/app/vocabulary/vocabulary.types.ts`](../web/src/app/vocabulary/vocabulary.types.ts). The service also exposes `resolveStoryVocab(refs)` which the stories feature uses to expand `{ categoryKey: n[] }` refs into a filtered `Vocabulary`.

## Memorize mode

Reached by one of two buttons on the category page, labeled from `languages.json`'s `targetLabel`/`nativeLabel`:

- **Target → Native** (e.g. "Italian → Russian") → `/:pair/category/:key/memorize` (default).
- **Native → Target** (e.g. "Russian → Italian") → `/:pair/category/:key/memorize?direction=native`.

The direction is bound from the `direction` query param via the component's `direction = input<string>('target')`. Anything other than the literal string `native` is treated as target-first.

### Card flow

- The category's words are **shuffled** (Fisher–Yates) on each entry; the shuffled deck is held in `fullShuffled`. The visible `cards` is `fullShuffled` filtered against the persisted skip list.
- Each card has **two stages**, advanced by clicking the card, pressing `Space`, or pressing `Enter`:
  - **Target → Native** mode (default):
    1. **Front** — target word + Cyrillic transcription.
    2. **Back** — translation + examples.
  - **Native → Target** mode (`?direction=native`):
    1. **Front** — native translation only.
    2. **Back** — target word + transcription + examples.
- Examples on the back render as a numbered list (`<ol>`), one sentence per line, regardless of mode.
- After the back of the last card, the deck wraps to index 0 — forward-only, no previous-word/previous-stage navigation.
- A progress indicator `n / total` is shown in the top bar.
- Exit only via the `← Exit` link.

### Skip

A word can be skipped from three places, all wired to the same `skip()` action:

- The `Skip` button at the top-right of the card (inside the `.card-actions` group, to the right of `Memorized`).
- Right-click anywhere on the card (`(contextmenu)`, with `preventDefault()` to suppress the browser menu).
- The `S` key.

Skipping a word adds it to the persisted skip list **and** removes it from the current session's deck immediately (`cards` is `computed` over `fullShuffled` and the skip + memorized sets, so it auto-updates). If the skip empties out the rest of the deck, `index` wraps to `0`. If every word is skipped, the empty-state message replaces the card.

### Memorized

A `Memorized` button sits to the left of `Skip` in the `.card-actions` group at the top-right of the card. Unlike skips, the memorized set is **persistent**, scoped to the current language pair — see [Memorized vocabulary](memorized-vocabulary.md) for the full behavior and storage layout. Marking a word as memorized hides it from this deck immediately and from every other memorize/repeat deck for that pair (category and story) until the user un-memorizes it from `/:pair/vocabulary/memorized`.

### Reset skips

A `Reset Skips (N)` button sits in the top bar next to the progress indicator. It is **disabled** when `skips.size === 0` and enabled otherwise. Clicking it clears **this category's** skip list only — other categories' skips remain.

### Comment per word

A textarea below the card stores a per-word note. Layout: label, textarea, then `Save` / `Cancel` buttons (right-aligned). Both buttons are disabled when the draft equals the saved value (no dirty state). Save persists; Cancel reverts the draft. **No keymap** for save/cancel — buttons only.

While the textarea has focus, the page-level keyboard handlers for `Space` / `Enter` / `S` short-circuit so typing in the comment does not advance, reveal, or skip the card.

### Persistence

All state lives in `localStorage` under the `glotix:<pair>:` prefix, via [`MemorizeStorage`](../web/src/app/shared/storage/memorize-storage.ts):

| Key | Value |
|---|---|
| `glotix:<pair>:skip:<categoryKey>` | JSON `string[]` — target words skipped for that category |
| `glotix:<pair>:memorized` | JSON `string[]` — target words memorized for that pair (see [Memorized vocabulary](memorized-vocabulary.md)). Deleted when the set becomes empty. |
| `glotix:<pair>:comment:<target>` | Plain string — the user's comment for that word, shared across every memorize view (vocabulary and any story that contains the word). Deleted when emptied. |

## Repeat mode

Reached by the third header button on the category page (`Repeat` → `/:pair/category/:key/repeat`). A minimal, single-stage iterator over the native-language translations of the category — for plain repetition without a reveal.

- The deck is shuffled on each entry (same Fisher–Yates as Memorize) and held in `fullShuffled`. The whole category is iterated, minus any words in `glotix:<pair>:memorized` (see [Memorized vocabulary](memorized-vocabulary.md)). Repeat is **independent** of Memorize's `glotix:<pair>:skip:*` list and does not read, write, or apply it.
- Each card shows only `card.translation` (native language), styled like the Memorize prompt (display-large, primary color, centered). No target word, no transcription, no examples.
- A `Memorized` button sits at the top-right of the card. Clicking it adds the current word to the pair's memorized set and removes it from the deck immediately. There is no `Skip` button on Repeat.
- Advance to the next word by clicking the card, pressing `Space`, or pressing `Enter`. There is no reveal/back stage — the card advances directly to the next word.
- After the last card, the index wraps to `0`. Forward-only.
- The top bar shows `← Exit` on the left and `n / total` progress on the right. No `Reset Skips` button.
- No skip (no button, no `Esc` binding, no right-click handler), no comment textarea, no per-category persistence.
- Exit returns to `/:pair/category/:key`.

## Theming

See [docs/visual-redesign.md](visual-redesign.md) for the full visual system.
