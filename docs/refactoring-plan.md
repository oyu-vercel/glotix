# Refactoring plan

> **Status: Step 0 done. Steps 1–10 planned, not implemented.**
> Scope: `web/src/app/**`, `web/src/**/*.spec.ts` and `web/scripts/**`.

## Decisions taken

- **All steps get done**, one at a time, in the order below. Each ends with a verification
  checkpoint before the next begins.
- **Tests come first.** Steps 0 and 1 build the safety net before any production code moves.
- **The memorized set becomes live-synced** (Step 7). A word memorized anywhere immediately
  disappears from an open deck. Existing `localStorage` contents are not a constraint.

## Why now

The app has five features (`vocabulary`, `stories`, `books`, `drills`, `lessons`) that were added
one at a time, each built by copying the previous one. There are now five parallel implementations
of the same four ideas: *fetch a pair-scoped JSON*, *show a progress table*, *show a deck*,
*navigate back*. The shared abstractions that do exist (`DECK_SURFACE`, `ProgressTable`,
`MemorizeStorage`) are each used by only a subset of the features, so adding a sixth feature means
touching ~12 files and copying ~250 lines.

## Execution order

| Step | What | Was |
| --- | --- | --- |
| 0 | Green the test runner — **done** | — |
| 1 | Characterization test suite | — |
| 2 | Dead code and inconsistency cleanup | Phase 9 |
| 3 | Shared types | Phase 7 |
| 4 | Merge the two CSV scripts | Phase 8 |
| 5 | Collapse the five data services | Phase 1 |
| 6 | Data-driven progress table | Phase 3 |
| 7 | Single source of truth for the memorized set | Phase 5 |
| 8 | One deck shell for the three decks | Phase 4 |
| 9 | Feature registry | Phase 6 |
| 10 | One deck route instead of eight wrappers | Phase 2 |

Rationale for the order: cleanup and types are free and reduce noise in every later diff; the
scripts are isolated from the app entirely; services are the foundation the table and decks sit
on; the progress table must be generic before the feature registry can drive it; the memorized set
must be settled before the deck shell is extracted, so the shell is extracted once, not twice;
the deck routes go last because they depend on the services, the decks and the registry all being
in their final shape.

---

## Step 0 — Green the test runner ✅ done

**Problem.** `npm --prefix web test -- --watch=false` currently **exits 1**, even though both
assertions pass. Verified output:

```
 RUN  v4.1.5 D:/projects/ai/claude/glotix/web
 Test Files  1 passed (1)
      Tests  2 passed (2)
     Errors  1 error
HttpErrorResponse: Http failure response for /assets/languages.json: 0 Unknown Error
```

`App` boots `LanguageService`, which fetches `/assets/languages.json` over the real `HttpClient`.
Under jsdom there is no server, the XHR rejects, and the rejection escapes outside any test.
`web/src/app/app.spec.ts:7-10` provides only `provideRouter([])` — there is no
`provideHttpClientTesting`.

A red suite is worthless as a safety net, so this is step zero.

**Change.**

1. Add `web/src/testing/setup.ts` exporting a single `testProviders()` helper that wires
   `provideHttpClient()`, `provideHttpClientTesting()`, `provideRouter([])` and a stub
   `LanguageService` pair, so no spec has to rediscover this.
2. Fix `app.spec.ts` to use it and flush the `languages.json` request.
3. Add a `typecheck` script to `web/package.json` (`tsc -p tsconfig.app.json --noEmit`) — right
   now `ng build` is the only type gate, which is slow to run per step.

**Done when:** `npm --prefix web test -- --watch=false` exits 0 with zero unhandled errors, and
`npm --prefix web run typecheck` exits 0.

**Outcome.** `web/src/testing/setup.ts` added (`TEST_LANGUAGES`, `testProviders(routes)`,
`flushLanguages()`, `verifyNoOutstandingRequests()`); `web/src/app/app.spec.ts` rewritten onto it;
`typecheck` script added to `web/package.json`. Both commands now exit 0 — `Tests 2 passed (2)`,
no unhandled errors. No production code changed.

---

## Step 1 — Characterization test suite

**Principle.** Test at the surfaces that *survive* the refactor. Do not write specs for the eight
deck wrapper components or the per-feature table markup — those are deleted in Steps 6 and 10, and
tests for them would be thrown away with them.

**Change.** Add specs covering:

| Target | Why it needs cover | Guards step |
| --- | --- | --- |
| `MemorizeStorage` — all nine public methods, pair namespacing, the legacy-key migration | Step 7 rewrites how it is read | 2, 7 |
| `shared/utils/*` — `shuffle`, `countWords`, `countMemorizedInVocabulary`, `isFormField`, `splitExamples` | Cheap; `splitExamples` moves in Step 2 | 2 |
| `parse-chapter-text` / `parse-story-text` | Not refactored, but they are the two most logic-dense pure functions in the app and currently have zero cover | — |
| The five services' **public APIs** via `HttpTestingController` — index load, per-item load, ref resolution, and that each URL is fetched once per pair | Step 5 rewrites their internals while promising an unchanged public API | 5 |
| Route-render smoke tests: one per feature list, detail, memorize and repeat route, asserting the screen renders its rows/cards | The broadest net for Steps 6, 8, 9, 10 | 6, 8, 9, 10 |
| A golden-file check for `build-stories.mjs` / `build-drills.mjs` output | Step 4 must not change generated JSON | 4 |

**Done when:** suite is green, and the service specs fail if you deliberately break a cache key.

**Checkpoint:** run the dev server and confirm the app still works — Step 1 touches no production
code, so any difference means something else is wrong.

---

## Step 2 — Dead code and inconsistency cleanup *(was Phase 9)*

Independent, zero-risk, and it shrinks every later diff.

| Item | Location |
| --- | --- |
| Dead `.back-row` rule — the template has no such element | `lessons/list/list.scss:5-12` (verified) |
| Orphan class names with no CSS rule (`memorized-btn`, `skip-btn`) | `memorize-deck.html:22,25`, `repeat-deck.html:12` |
| Unreachable default — all four call sites override it | `repeat-deck.ts:32` (`'No words to practice.'`) |
| Two names styled for one column, acknowledged as drift in the docblock | `progress-table.scss:35-42,117-120` (`.num-col` / `.count-col`) |
| Hardcoded DOM id — breaks if two decks ever render at once | `memorize-deck.html:61,63` (`memorize-comment`) |
| `splitExamples` — single call site; inline it or keep it, but stop it being a lone util | `shared/utils/split-examples.ts` → `memorize-deck.ts:57` |
| Duplicated card treatment outside the shared component | `stories/detail/detail.scss:20-30` repeats `progress-table.scss:11-19` verbatim |
| `WordTable`'s `actionLabel`/`action`/`'action'` column — one consumer | `word-table.ts:16-22` ← `vocabulary/memorized/category/category.html:15` |
| Category lookup re-implemented instead of using `getCategorySignal` | `vocabulary/memorized/category/category.ts:28-32` |
| Also fix: `pattern-repeat-deck.html:14` renders `class="native"` but the SCSS styles `.russian` — the element is unstyled, and `.russian` is a language name in code | `pattern-repeat-deck.scss:79,112` |

**Checkpoint:** tests green; browse every deck and the memorized-restore flow.

---

## Step 3 — Shared types *(was Phase 7)*

Three pairs of interfaces are duplicate declarations of one shape:

| Duplicate | Location |
| --- | --- |
| `StoryVocabRefs` / `ChapterVocabRefs` (`Record<string, number[]>`) | `stories.types.ts:14`, `books.types.ts:29` — the latter's comment already says "same shape stories use" |
| `DrillResolved` / `LessonResolved` (`{slug, title, words, patterns}`) | `drills.types.ts:32-37`, `lessons.types.ts:33-38` |
| `DrillIndexEntry` / `LessonIndexEntry` (`{slug, title, wordCount, patternCount}`) | `drills.types.ts:3-8`, `lessons.types.ts:4-9` |

**Change.** Move each into `shared/` under one name; keep per-feature aliases only where a feature
genuinely extends the shape.

**Checkpoint:** `typecheck` and tests green. Type-only change — no browser verification needed.

---

## Step 4 — Merge the two CSV scripts *(was Phase 8)*

`web/scripts/merge-words.mjs` (125 lines) and `web/scripts/merge-drill-words.mjs` (128 lines) are
~95% identical — same argv parsing, same CSV discovery, same headword lookup, same 10-example cap
loop, same `unmatched.json` output, same seven-line console report. They differ in exactly three
places: the CSV column count (4 vs 5), the example splitter (`splitSentences` vs `splitLines`),
and how unmatched examples are joined.

They also both hardcode a language name to detect the CSV header row, which contradicts the
project's own rule that no language is named in code or data:

- `merge-drill-words.mjs:10` — `const CSV_HEADER_FIRST_CELL = 'italian phrase';`
- `merge-words.mjs:10` — `const CSV_HEADER_FIRST_CELL_PREFIX = 'Итальянская';`
- `build-drills.mjs:9` — the same `'italian phrase'` constant again

**Change.** One `merge-csv-words.mjs` taking a `{ columns, splitter }` config, with header
detection replaced by a language-neutral rule (skip a first row whose target cell matches no
headword). `web/scripts/lib/` is already well-factored — this belongs there.

The `add-story` and `add-drill` skills invoke these scripts by name; update both skill definitions
in the same step so they do not break.

**Checkpoint:** re-run `build:stories` and `build:drills` for all pairs and confirm the generated
JSON under `web/public/assets/` is byte-identical to before (this is what the Step 1 golden files
are for).

---

## Step 5 — Collapse the five data services *(was Phase 1)*

**Problem.** The five services each re-implement the same caching machine:

| Repeated mechanic | Where | Similarity |
| --- | --- | --- |
| `index$ = pair$.pipe(switchMap(p => this.indexFor(p)), shareReplay(...))` | books:22, drills:22, lessons:23, stories:22, vocabulary:17 | verbatim modulo generic |
| `indexFor(pair)` memoize-and-fetch | books:27-36, drills:27-36, lessons:30-39, stories:27-36, vocabulary:22-31 | verbatim except URL + generic |
| Per-item fetch guarded by index membership, keyed `` `${pair}:${slug}` `` | books:42-56, drills:42-57, lessons:45-60, stories:42-57 | drills/lessons/stories are line-for-line identical |
| `resolvedFor(pair, slug)` memoized resolve wrapper | books:64-99, drills:63-97, lessons:66-107, stories:63-84 | same scaffolding, only the `map` body differs |
| `getXResolvedSignal(slug)` | drills:99-101, lessons:130-136, stories:86-88 | verbatim except method name |
| `shareReplay({ bufferSize: 1, refCount: false })` literal | 18 occurrences across 6 files | verbatim |

**Change.**

1. Add `web/src/app/shared/data/pair-resource.ts`:
   ```ts
   export function pairResource<T>(url: (pair: string) => string): PairResource<T>;
   export function keyedPairResource<T>(url: (pair: string, key: string) => string):
     KeyedPairResource<T>;
   ```
   Each owns the `Map` cache and the single `shareReplay` constant.
2. Rewrite the five services on top of it, keeping every public API byte-for-byte identical so no
   call site changes in this step. The Step 1 service specs are the contract.
3. Delete the copy-pasted ref resolvers at `drills.service.ts:72-82` and `lessons.service.ts:75-92`
   — both rebuild a `Map<category, Map<key, Word>>` index that
   `VocabularyService.resolveStoryVocab` (`vocabulary.service.ts:45-56`) already does. Rename that
   method to `resolveVocabRefs` (books already uses it, so `Story` in the name is wrong) and add an
   ordered-output variant for the drills/lessons `wordOrder` case.

**Expected size change:** the five services total 548 lines; helper plus rewrites should land
around 300.

**Checkpoint:** tests green. In the browser, load a route from each of the five features and
confirm the network tab shows each JSON fetched exactly once per pair.

---

## Step 6 — Data-driven progress table *(was Phase 3)*

**Problem.** `ProgressTable` is slot-based: it supplies the card shell and the CSS classes, but
every call site hand-writes the full `mat-table` column definitions. This is the single largest
block of duplicated markup in the app:

| Block | Occurrences |
| --- | --- |
| `count` / `total` / `percent` column trio incl. footer cells | 4 — `books/detail:19-53`, `stories/summary:21-55`, `vocabulary/summary:18-50`, `stories/detail:42-76`, verbatim apart from the loop variable |
| `progress-cell`/`track`/`fill`/`num` markup | 8 — twice per file in the four above |
| Footer `Total` label cell | 4 — verbatim |
| `<tr mat-row class="clickable-row" tabindex="0" (click)/(keyup.enter)>` | 7 files |
| Header + `totals-row` footer declarations | 4 — verbatim |
| Whole single-column clickable list table | `drills/list.html:5-22` and `lessons/list.html:5-22` are **verbatim** apart from the `<th>` text |

**Change.** Replace the slot API with a data API:

```ts
readonly rows     = input.required<ProgressRow[]>();
readonly columns  = input<ProgressColumn[]>(DEFAULT_PROGRESS_COLUMNS);
readonly totals   = input<boolean>(false);
readonly rowClick = output<ProgressRow>();
```

`ProgressRow` already exists three times over — `vocabulary/list/list.ts:16-23`,
`books/chapter/chapter.ts:25-31` (`VocabProgressRow`), plus inline shapes in the two summaries.
Promote one definition into `shared/progress-table/progress-table.types.ts` and delete the rest.
Move the totals arithmetic (currently three `rows.reduce(...)` calls re-derived in every summary
component) into the table. Keep an `<ng-content>` escape hatch for a genuinely custom column.

This turns `drills/list.html` and `lessons/list.html` (32 and 28 lines) into about four lines each.

**Checkpoint:** tests green; compare `/it-ru/vocabulary`, `/it-ru/vocabulary/summary`,
`/it-ru/stories`, `/it-ru/books`, `/it-ru/books/<book>`, `/it-ru/drills`, `/it-ru/lessons` against
screenshots taken before the change — row counts, totals row, progress-bar widths.

---

## Step 7 — Single source of truth for the memorized set *(was Phase 5)*

**Problem.** The same `Set<string>` lives in three places. `MemorizeStorage.memorized` is already
a signal (`memorize-storage.ts:20-23`, revision-bumped on every write), but both decks keep a
local mirror (`memorize-deck.ts:45`, `repeat-deck.ts:39`), seed it from `getMemorized()`, and
**dual-write** on every mark:

```ts
this.storage.addMemorized(card.target);
this.memorized.update((s) => new Set([...s, card.target]));   // repeat-deck.ts:72-73
```

The mirror exists to stop the reset effect re-tracking storage — but that effect already wraps its
body in `untracked()`, so the mirror defends against a problem `untracked` solves. Consumers also
split arbitrarily between the two read paths: `storage.memorized()` at five call sites,
`storage.getMemorized()` at six.

**Change.** Read `storage.memorized()` directly in both decks, delete both local mirrors and both
dual-writes, and delete the `getMemorized()` alias (`memorize-storage.ts:44-46`) in favour of the
signal. Decks become live-synced, as decided.

**Checkpoint:** tests green. In the browser: memorize a word in a deck, exit, re-enter, confirm it
stays out; confirm the counts on `/it-ru/vocabulary` update; exercise the
`/it-ru/vocabulary/memorized` restore flow and confirm a restored word reappears in a deck.

---

## Step 8 — One deck shell for the three decks *(was Phase 4)*

**Problem.** `memorize-deck`, `repeat-deck` and `pattern-repeat-deck` share nearly all chrome and
cursor logic:

| Concern | Status |
| --- | --- |
| `onSpace` / `onEnter` handler bodies | **verbatim in all 3** (memorize:158-173, repeat:79-88, pattern:52-61) |
| `advance()` | verbatim in repeat + pattern; memorize adds a front/back stage |
| `progress` / `hasCards` / `current` computeds | verbatim modulo the backing signal name |
| Reset effect (`untracked` deck seed, incl. the same two-line comment) | near-identical in memorize:67-81 and repeat:49-61 |
| SCSS shell + topbar + `.progress` | verbatim apart from the wrapper class name |
| SCSS `.card` block | identical except one `gap` value — `12px` vs `16px` (diffed) |
| SCSS `.hint`, `.loading`, mobile media query | byte-identical in all 3 |

**Change.**

1. `shared/deck-shell/` — a component owning the topbar, progress readout, card frame, hint line,
   loading state and the whole SCSS block. The three decks project content into it.
2. `shared/deck-cursor.ts` — a helper owning `index`, `current`, `progress`, `hasCards`,
   `advance()` and the space/enter host handlers.
3. Reconcile the `gap` difference deliberately — pick one value, do not parameterise it.

**Checkpoint:** tests green; all three decks at desktop and mobile width; keyboard space, enter and
`s`; the memorize deck's comment box and skip button.

---

## Step 9 — Feature registry *(was Phase 6)*

**Problem.** Each feature's route segment is a bare string literal repeated across the app —
`'books'` at 13 sites, `'drills'` at 12, `'lessons'` at 13, `'stories'` at 12, `'vocabulary'` /
`'category'` at 18. Plural and singular display labels are likewise duplicated per feature across
the nav, page header, back link and table headers. One visible symptom:
`drills/list/list.html:1` passes `eyebrow="Drills" title="Drills"` (the eyebrow duplicates the
title) while `lessons/list/list.html:1` passes `[eyebrow]="targetLabel()"`; nothing enforces
consistency.

**Change.** Add `shared/features/feature-registry.ts`:

```ts
export interface FeatureDef {
  readonly segment: string;       // 'drills'
  readonly labelPlural: string;   // 'Drills'
  readonly labelSingular: string; // 'Drill'
  readonly hasPatterns: boolean;
}
export const FEATURES: readonly FeatureDef[];
```

Drive the nav (`app.html`), the back links, the page headers and the deck-surface exit navigation
from it. Add `shared/back-link/` (`<app-back-link [feature]="…" />`) to absorb the `.back-row`
block, which is verbatim in seven templates with near-identical SCSS in four.

**Checkpoint:** tests green; click every nav item and every back link in all five features.

---

## Step 10 — One deck route instead of eight wrappers *(was Phase 2)*

**Problem.** `shared/deck-surface/deck-surface.ts` already defines the abstraction:

```ts
export interface DeckSurface {
  resolveCategory(slug: Signal<string>, key: Signal<string>): Signal<Category | undefined>;
  resolveScope(slug: Signal<string>, key: Signal<string>): Signal<string>;
  exit(slug: string, key: string): void;
}
```

Only `vocabulary` and `stories` use it (wired at `app.routes.ts:44,50,64,70`). Books, drills and
lessons each ship their own wrapper instead — eight files, **269 lines, of which roughly 35 carry
unique behaviour**. `drills/memorize/memorize.ts` and `lessons/memorize/memorize.ts` are identical
apart from six tokens (diffed):

```
DrillsService/LessonsService · import path · selector · class name
getDrillCategorySignal/getLessonCategorySignal · 'drills'/'lessons'
```

The same holds for the `repeat` pair and the `patterns-repeat` pair.

**Two blockers, and how each is handled.**

- *Books needs three route params* (`book`, `slug`, `key`), but `DeckSurface` hardcodes
  `(slug, key)`. The comment at `books/memorize/memorize.ts:9-13` records why the shared route was
  skipped. **Change:** widen the interface to take the whole param bag —
  `resolveCategory(params: Signal<Record<string, string>>)` — and have the shells read route params
  generically instead of through fixed `input()`s.
- *Patterns-repeat renders a different deck* (`PatternRepeatDeck` bound to `[patterns]`, not a
  `Category`). **Change:** add a third shell, `PatternsRepeatRoute`, plus an optional
  `resolvePatterns(params)` member on the surface. It has no `key` param, so the shells must stop
  declaring `key = input.required<string>()` (`memorize-route.ts:20`, `repeat-route.ts:17`) —
  that would fail to resolve on `drills/:slug/patterns/repeat` today.

**Change.** Write one `<feature>-deck-surface.ts` per feature (five files, ~30 lines each,
mirroring the existing `story-deck-surface.ts`), point every deck route at the three shared shells
via `providers:`, and delete all eight wrapper components. Move the per-feature `emptyMessage`
(`"No words in this drill."` etc.) onto the surface so `repeat-route.ts:12` stops hardcoding
`"No words in this category."`.

**Open question to resolve at the start of this step:** whether a service in a route's `providers`
can inject `ActivatedRoute` on Angular 21 — the existing comment asserts it cannot. Passing the
param bag as a method argument (as sketched above) sidesteps the question entirely, so plan for
that shape and treat DI access as a possible simplification, not a dependency.

**Checkpoint:** tests green; every memorize, repeat and patterns route for all five features,
including the `?direction=native` variant and the `?cat=` query param on exit from books and
stories.

---

## Not in scope

Noted while reading; each would be a separate piece of work.

1. **Feature gap:** the landing dashboard (`vocabulary/list/list.ts`) builds progress sections for
   vocabulary and stories only — books, drills and lessons have no row. Step 9's registry makes
   adding them easy, but adding them is a feature change, not a refactor.
2. **Route-shape inconsistencies** left as they are: vocabulary's category routes are unprefixed
   (`category/:key`) while every other feature namespaces under its own segment; `patterns/repeat`
   exists only for drills and lessons; drills and lessons memorize the whole `:slug` with no
   category granularity.
3. **The legacy-key migration** in `memorize-storage.ts:98-123` stays. It is a one-time
   `it-ru` namespace move that will eventually be retirable, but not as part of this work.
