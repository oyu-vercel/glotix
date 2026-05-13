# Memorized vocabulary

A parallel concept to **Skip** with persistent + global scope. Marking a word as **Memorized** removes it from every memorize and repeat deck — across categories AND stories — until the user un-memorizes it from the dedicated Memorized words view.

The word stays in the regular vocabulary tables; only the practice decks filter it out.

## Routes

| Path | Component | Notes |
|---|---|---|
| `/vocabulary/memorized` | [`Memorized`](../web/src/app/vocabulary/memorized/memorized.ts) | Category index — `mat-table` with `Category` + `Words` columns and a `Total` footer row, mirroring the Global Vocabulary [`Summary`](../web/src/app/vocabulary/summary/summary.ts) layout. Each row counts the user's memorized words in that category; empty categories are omitted. Click row to drill into `/vocabulary/memorized/:key`. Empty state when no words are memorized. |
| `/vocabulary/memorized/:key` | [`MemorizedCategory`](../web/src/app/vocabulary/memorized/category/category.ts) | Per-category drill-down. Renders the shared [`app-word-table`](../web/src/app/shared/word-table/word-table.ts) (standard columns: `#`, Word, Pronunciation, Translation, Examples) plus a `Restore` action column. Header includes `← Back` to `/vocabulary/memorized`, category label, and count pill. Empty state when every word in this category has been restored. |

Surfaced from the Vocabulary index ([`/vocabulary`](../web/src/app/vocabulary/list/list.ts)) as a second row in the global section, alongside "Global Vocabulary". The row count is read from storage at component construction.

## Storage

| Key | Value |
|---|---|
| `glotix:memorized` | JSON `string[]` — Italian words memorized globally. The key is **deleted entirely** when the set becomes empty (so a clean install never sees `"[]"`). |

The set is `Set<string>` of `word.italian`. All persistence flows through [`MemorizeStorage.getMemorized()` / `addMemorized()` / `removeMemorized()`](../web/src/app/shared/storage/memorize-storage.ts). There is no per-scope variant — the set is global.

## Behavior

### Marking a word as memorized

A `Memorized` button appears in the top-right of the card on both the cards/memorize screen (next to `Skip`, inside a shared `.card-actions` flex container) and the repeat screen (alone — no `Skip` on Repeat). Story memorize/repeat screens reuse the shared decks and therefore inherit the button. No keyboard shortcut — buttons only.

### Filtering decks

[`MemorizeDeck`](../web/src/app/shared/memorize-deck/memorize-deck.ts) and [`RepeatDeck`](../web/src/app/shared/repeat-deck/repeat-deck.ts) load `glotix:memorized` in their category effect and exclude those words from their `cards` computed (alongside skips, on `MemorizeDeck` only). Story memorize/repeat routes inherit this because they reuse the same shared decks via [`MemorizeRoute`](../web/src/app/shared/memorize-route/memorize-route.ts) / [`RepeatRoute`](../web/src/app/shared/repeat-route/repeat-route.ts) — there is no per-story memorized list.

### Restoring a word

`MemorizedCategory` renders the shared [`WordTable`](../web/src/app/shared/word-table/word-table.ts) with `actionLabel="Restore"` to opt the table into its extra `action` column. The `(action)` output removes the word from `glotix:memorized` and the row disappears reactively; when the last word in the category is restored, the table is replaced by an empty state.

The restored word reappears in memorize/repeat decks on the next entry — lazy-route navigation creates a fresh deck instance which re-reads storage on its category effect, so no shared service signal is needed.

## What's intentionally not included

- No "Reset memorized" / clear-all button.
- No badge or strike-through indicator on the regular vocabulary tables.
- No counter on the toolbar.
- No keyboard shortcut.
- No legacy migration.
- No new top-level toolbar item — discovery is via the Vocabulary index row.
