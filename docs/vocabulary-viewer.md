# Vocabulary viewer — Italian A2

An English-UI vocabulary viewer for the Italian A2 word list. UI labels are English; Russian appears only inside table cells (translation, transcription).

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | redirect | Forwards to `/vocabulary` (also catches unknown paths via `**`) |
| `/vocabulary` | [`List`](../web/src/app/vocabulary/list/list.ts) | Landing page — index of vocabulary sources, split into two `mat-table`s. First (untitled) table has two rows: "Global Vocabulary" (→ `/vocabulary/a2`) and "Memorized Words" with the current count from `glotix:memorized` (→ `/vocabulary/memorized`, see [Memorized vocabulary](memorized-vocabulary.md)). Second table is titled **Stories** and lists per-story vocabularies from `stories-index.json`, each row navigating to `/stories/:slug?tab=vocab` so the story opens directly on its Vocabulary tab. The stories section hides itself when there are no stories. |
| `/vocabulary/a2` | [`Summary`](../web/src/app/vocabulary/summary/summary.ts) | Global vocabulary categories — `mat-table` with `Category` + `Words` columns, click row to drill into `/category/:key`, footer row shows the grand total. Page header reads "Global Vocabulary". |
| `/vocabulary/memorized` | [`Memorized`](../web/src/app/vocabulary/memorized/memorized.ts) | Category index of memorized words (same `Category`/`Words` + `Total` table layout as `/vocabulary/a2`). See [Memorized vocabulary](memorized-vocabulary.md). |
| `/vocabulary/memorized/:key` | [`MemorizedCategory`](../web/src/app/vocabulary/memorized/category/category.ts) | Per-category memorized-words drill-down with a `Restore` action on each row. See [Memorized vocabulary](memorized-vocabulary.md). |
| `/category/:key` | [`Category`](../web/src/app/vocabulary/category/category.ts) | Per-category page. The five-column word table (`#`, `Word`, `Pronunciation`, `Translation`, `Examples`) is the shared [`WordTable`](../web/src/app/shared/word-table/word-table.ts) (also used by the story detail page). Header row includes three practice buttons: `Italian → Russian`, `Russian → Italian`, and `Repeat`. The back link returns to `/vocabulary/a2`. |
| `/category/:key/memorize` | [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) | Generic route component that renders the shared [`MemorizeDeck`](../web/src/app/shared/memorize-deck/memorize-deck.ts) against the [`DeckSurface`](../web/src/app/shared/deck-surface/deck-surface.ts) provided per-route. Vocabulary routes plug in [`provideVocabularyDeckSurface()`](../web/src/app/vocabulary/vocabulary-deck-surface.ts) so the surface resolves the category from [`VocabularyService`](../web/src/app/vocabulary/vocabulary.service.ts) and exits to `/category/:key`. See [Memorize mode](#memorize-mode) below. Accepts `?direction=russian` for the reverse mode. |
| `/category/:key/repeat` | [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) | Same `DeckSurface`-driven pattern; renders [`RepeatDeck`](../web/src/app/shared/repeat-deck/repeat-deck.ts). See [Repeat mode](#repeat-mode) below. |

## Data flow

1. [`web/public/assets/vocabulary.json`](../web/public/assets/vocabulary.json) is the single source of truth — hand-edited there. Within each category, the `n` field is a 1-indexed id used by stories to reference words.
2. Angular's existing `public/` asset glob ([web/angular.json](../web/angular.json)) serves the file directly at `/assets/vocabulary.json` — no build step.
3. [`VocabularyService`](../web/src/app/vocabulary/vocabulary.service.ts) fetches that JSON once via `HttpClient` and caches with `shareReplay(1)`. Components read it via the async pipe.

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
  n: number;             // 1-indexed within its category; stable ref id for stories
  italian: string;
  pronunciation: string; // Cyrillic transcription
  translation: string;   // Russian
  examples: string;      // Italian example sentences
}
```

Types live in [`web/src/app/vocabulary/vocabulary.types.ts`](../web/src/app/vocabulary/vocabulary.types.ts). The service also exposes `resolveStoryVocab(refs)` which the stories feature uses to expand `{ categoryKey: n[] }` refs into a filtered `Vocabulary`.

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
- After the back of the last card, the deck wraps to index 0 — forward-only, no previous-word/previous-stage navigation.
- A progress indicator `n / total` is shown in the top bar.
- Exit only via the `← Exit` link. `Esc` is repurposed (see Skip below).

### Skip

A word can be skipped from three places, all wired to the same `skip()` action:

- The `Skip` button at the top-right of the card (inside the `.card-actions` group, to the right of `Memorized`).
- Right-click anywhere on the card (`(contextmenu)`, with `preventDefault()` to suppress the browser menu).
- The `Esc` key.

Skipping a word adds it to the persisted skip list **and** removes it from the current session's deck immediately (`cards` is `computed` over `fullShuffled` and the skip + memorized sets, so it auto-updates). If the skip empties out the rest of the deck, `index` wraps to `0`. If every word is skipped, the empty-state message replaces the card.

### Memorized

A `Memorized` button sits to the left of `Skip` in the `.card-actions` group at the top-right of the card. Unlike skips, the memorized set is **persistent + global** — see [Memorized vocabulary](memorized-vocabulary.md) for the full behavior and storage layout. Marking a word as memorized hides it from this deck immediately and from every other memorize/repeat deck (category and story) until the user un-memorizes it from `/vocabulary/memorized`.

### Reset skips

A `Reset Skips (N)` button sits in the top bar next to the progress indicator. It is **disabled** when `skips.size === 0` and enabled otherwise. Clicking it clears **this category's** skip list only — other categories' skips remain.

### Comment per word

A textarea below the card stores a per-word note. Layout: label, textarea, then `Save` / `Cancel` buttons (right-aligned). Both buttons are disabled when the draft equals the saved value (no dirty state). Save persists; Cancel reverts the draft. **No keymap** for save/cancel — buttons only.

While the textarea has focus, the page-level keyboard handlers for `Space` / `Enter` / `Esc` short-circuit so typing in the comment does not advance, reveal, or skip the card.

### Persistence

All state lives in `localStorage` under the `glotix:` prefix, via [`MemorizeStorage`](../web/src/app/shared/storage/memorize-storage.ts):

| Key | Value |
|---|---|
| `glotix:skip:<categoryKey>` | JSON `string[]` — Italian words skipped for that category |
| `glotix:memorized` | JSON `string[]` — Italian words memorized **globally** (see [Memorized vocabulary](memorized-vocabulary.md)). Deleted when the set becomes empty. |
| `glotix:comment:<italian>` | Plain string — the user's comment for that word, shared across every memorize view (vocabulary and any story that contains the word). Deleted when emptied. |
| `glotix:legacy-comments-wiped-v1` | One-time flag set after the per-scope legacy comment keys (`glotix:comment:<scope>:<italian>`) have been cleared on first load. |

## Repeat mode

Reached by the third header button on the category page (`Repeat` → `/category/:key/repeat`). A minimal, single-stage iterator over the Russian translations of the category — for plain repetition without a reveal.

- The deck is shuffled on each entry (same Fisher–Yates as Memorize) and held in `fullShuffled`. The whole category is iterated, minus any words in `glotix:memorized` (see [Memorized vocabulary](memorized-vocabulary.md)). Repeat is **independent** of Memorize's `glotix:skip:*` list and does not read, write, or apply it.
- Each card shows only `card.translation` (Russian), styled like the Memorize prompt (display-large, primary color, centered). No Italian word, no transcription, no examples.
- A `Memorized` button sits at the top-right of the card. Clicking it adds the current word to the global memorized set and removes it from the deck immediately. There is no `Skip` button on Repeat.
- Advance to the next word by clicking the card, pressing `Space`, or pressing `Enter`. There is no reveal/back stage — the card advances directly to the next word.
- After the last card, the index wraps to `0`. Forward-only.
- The top bar shows `← Exit` on the left and `n / total` progress on the right. No `Reset Skips` button.
- No skip (no button, no `Esc` binding, no right-click handler), no comment textarea, no per-category persistence.
- Exit returns to `/category/:key`.

## Theming

The color scheme is locked to **light** at [`web/src/styles.scss:26`](../web/src/styles.scss) (`color-scheme: light;`). Do not introduce `prefers-color-scheme: dark` overrides or switch this to `dark` / `light dark` without a deliberate design decision.
