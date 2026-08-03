# Books

> **Status: implemented.** Nav entry, routes, three screens and the decks are live; `pl-ru` ships
> chapter 1 of *Wiedźmin: Miecz Przeznaczenia* with a 4,124-word vocabulary.

A fourth content axis alongside vocabulary, stories, drills and lessons: full-length books read
chapter by chapter. Like every other feature it hangs off the language pair, so the same screens
serve `it-ru`, `en-ru` and `pl-ru`. The first book is Polish — *Wiedźmin: Miecz Przeznaczenia*,
chapter 1 (`Granica Możliwości`).

Books are the closest sibling to **stories**: a chapter is a body of target-language prose with a
vocabulary attached, readable in one tab and drillable in another. The difference is the extra
level of nesting (book → chapter) and the fact that book content is **hand-authored directly in
`web/public/assets/<pair>/`** with no build step, following the lessons convention rather than the
stories one.

---

## Decisions already taken

| Question | Decision |
| --- | --- |
| Corrupted `ż` in the source files | Fix `ch-1.txt` and the book JSON **in place** — done |
| Word-list form | **Base forms (lemmas)** — one entry per dictionary word |
| Coverage | **Every lemma except proper nouns** |
| Pipeline | **Hand-authored in `assets/`** — no `build-books.mjs` |
| Pronunciation | **Phonetic** Cyrillic: `ł`→`у`, `ą`→`он`, `ę`→`эн` (`był`→`[быу]`, `słowo`→`[суо́во]`) |
| Examples | **Simple constructed** beginner sentences, not fragments of the novel |

### Assumptions

Stated here so they can be rejected before implementation starts:

1. `web/public/assets/pl-ru/books/ch-1.txt` moves into a per-book subfolder,
   `books/witcher-the-sword-of-destiny/ch-1.txt`. The current flat layout collides as soon as a
   second book is added, and the `"file": "ch-1.txt"` field reads naturally as relative to the
   book's own folder.
2. Polish needs two vocabulary categories that `pl-ru/vocabulary.json` did not have: `numeral` and
   `particle` (`nie`, `się`, `by`, `czy`, `no`, `to`…). Both were added.
   **Deviation from this plan:** the `article` category was going to stay as an empty placeholder,
   but it was dropped instead — Polish has no articles, it would never be populated, and the UI
   filters empty categories anyway. `pl-ru/vocabulary.json` therefore has 10 categories, not 11.
3. Because every word in the vocabulary comes from chapter 1, chapter 1's vocabulary refs cover the
   whole file. The per-chapter refs file is still emitted, because chapter 2 onwards will only
   reference a subset.

---

## Data layout

```
web/public/assets/<pair>/
  books-index.json                             ← list of books for the pair
  books/
    <book-slug>.json                           ← book manifest: chapter list
    <book-slug>/
      <chapter-slug>.txt                       ← chapter prose
      <chapter-slug>.vocab.json                ← refs into <pair>/vocabulary.json
```

### `books-index.json`

```json
{
  "books": [
    { "slug": "witcher-the-sword-of-destiny", "name": "Wiedźmin: Miecz Przeznaczenia", "chapters": 1 }
  ]
}
```

### `books/<book-slug>.json`

The user's existing file, extended with `slug`, per-chapter `slug` and `vocabCount`:

```json
{
  "slug": "witcher-the-sword-of-destiny",
  "name": "Wiedźmin: Miecz Przeznaczenia",
  "chapters": [
    { "slug": "ch-1", "name": "Granica Możliwości", "file": "ch-1.txt", "vocabCount": 3012 }
  ]
}
```

### `books/<book-slug>/<chapter-slug>.vocab.json`

Same `Record<categoryKey, n[]>` shape stories use, so `VocabularyService.resolveStoryVocab()` is
reused unchanged:

```json
{ "vocabulary": { "noun": [1, 2, 5], "verb": [3, 7], "particle": [1] } }
```

---

## Routes

Added under the existing `:pair` child block in
[web/src/app/app.routes.ts](web/src/app/app.routes.ts):

| Path | Screen |
| --- | --- |
| `/:pair/books` | Books list |
| `/:pair/books/:slug` | Book detail — chapter list with progress |
| `/:pair/books/:slug/:chapter` | Chapter reader — Read tab + Vocabulary tab |
| `/:pair/books/:slug/:chapter/category/:key/memorize` | Memorize deck for one category of the chapter |
| `/:pair/books/:slug/:chapter/category/:key/repeat` | Repeat deck for one category of the chapter |

Navigation entry `Books` is added to [web/src/app/app.html:10](web/src/app/app.html), after
`Lessons`.

---

## Angular files

All new, under `web/src/app/books/`, mirroring `web/src/app/stories/`:

| File | Purpose |
| --- | --- |
| `books.types.ts` | `BookIndexEntry`, `BookIndex`, `ChapterEntry`, `Book`, `Chapter`, `ChapterResolved` |
| `books.service.ts` | Loads `books-index.json`, `books/<slug>.json`, chapter `.txt` and `.vocab.json`; caches per pair; resolves vocab refs through `VocabularyService.resolveStoryVocab()` |
| `list/list.ts \| .html \| .scss` | Books list — reuses `PageHeader` + `ProgressTable`, one row per book (chapters, words, total, progress) |
| `detail/detail.ts \| .html \| .scss` | Chapter list for one book — same progress table, one row per chapter |
| `chapter/chapter.ts \| .html \| .scss` | Reader: `mat-tab-group` with **Read** (parsed prose) and **Vocabulary (n)** (category progress table → `WordTable` + memorize/repeat buttons). Structurally a copy of `stories/detail` |
| `utils/parse-chapter-text.ts` | Book-specific text parser (below) |
| `memorize/memorize.ts` | Wraps `MemorizeDeck`; scope `book:<book>:<chapter>:<key>`, exit returns to the chapter's Vocabulary tab |
| `repeat/repeat.ts` | Wraps `RepeatDeck`, same routing |

**Why books do not use `DECK_SURFACE`.** Vocabulary and stories use the shared `MemorizeRoute` /
`RepeatRoute`, which bind a single `slug` param and delegate to a `DeckSurface` provided in the
route's `providers`. A chapter needs *two* identifiers (book + chapter), and a service provided
that way cannot read the activated route's params — `inject(ActivatedRoute)` there resolves to an
injector without them, so the deck silently hangs on "Loading...". Books therefore follow the
drills/lessons pattern instead: dedicated components taking `book`, `slug` and `key` as inputs.

`parseStoryText` is **not** reused. Its `isSectionHeader` heuristic (line ends in `.`, ≤ 6 words)
misfires constantly on novel dialogue — `- Ano - powiedział rzeźnik.` would render as a heading.

### `parse-chapter-text.ts`

The source is hard-wrapped prose extracted from a PDF: paragraphs span several lines with no blank
line between them. The parser un-wraps them:

1. Skip line 1 — it is the chapter title, already shown in the page header.
2. A line matching `^[IVXLC]+$` is a section marker → `h2`.
3. Otherwise accumulate lines into the current paragraph, emitting it when either
   - the current line is short (well under the file's wrap width — threshold derived from the
     measured line-length distribution), or
   - the next line starts with a dialogue dash `- `.

Emits the same `TextNode[]` (`h2` | `p`) shape `parse-story-text.ts` does, so the Read tab template
and `.story-text` styling port over directly.

---

## Source-file repair

Every `ż` in `ch-1.txt` is stored as the wrong codepoint (`JuŜ`, `moŜe`, `noŜem`, `Ŝółtym`), and
the book JSON title reads `Granica Mośliwości` instead of `Granica Możliwości`. Roughly 1,500
occurrences — the word list is worthless until this is fixed.

Repair procedure:

1. Dump the codepoint histogram of the file and list every non-ASCII character with its count.
2. Derive an exact replacement table from that histogram (the corruption is a Central-European
   codepage round-trip, so it is expected to be a small fixed set, not just one character).
3. Case is not recoverable by a blanket replacement — the same corrupted codepoint stands for both
   `ż` and `Ż`. Resolve by word shape: all-caps word → `Ż`, otherwise `ż`.
4. Rewrite `ch-1.txt` and fix the title in `witcher-the-sword-of-destiny.json`.
5. Re-dump the histogram and confirm only legitimate Polish letters (`ąćęłńóśźżĄĆĘŁŃÓŚŹŻ`) and
   punctuation remain.

---

## Vocabulary authoring

The chapter is 1,944 lines / 19,761 tokens / 6,709 distinct surface forms.
`web/public/assets/pl-ru/vocabulary.json` is empty, so all of it is new.

It runs as **three separate stages**, each finishing completely before the next begins. Authoring
per surface form was tried first and abandoned: it writes a full entry for `powiedział`,
`powiedziała` and `powiedzieli` and then throws two away — roughly 55% waste, and it creates
conflicts over which duplicate's pronunciation wins.

### Stage 1 — collect

The chapter is cut into **10 chunks of 200 lines**. One worker per chunk reads its slice of prose
and returns only `{ lemma, category }` for each distinct base form it contains — no pronunciation,
no translation, no examples. Proper nouns are skipped outright. Deduplication happens within a
chunk only; overlap between chunks is expected.

Small output per row keeps a chunk inside a single atomic write, which is what makes the stage
reliable.

### Stage 2 — unique filter

The 10 chunk files are merged into one vocabulary list, deduplicated by `(category, lemma)`.

Closed-class words — pronouns, prepositions, conjunctions, particles, numerals — are audited
against a known Polish list at this point. Stage 1 gets ~0.2% of them wrong (chunk 01 dropped `wy`
and kept the dative `komu` as its own headword), and unlike open-class vocabulary this set is short
and fully checkable.

### Stage 3 — enrich

Every unique lemma gets its `pronunciation`, `translation` and `examples` written **once**, in 21
units of 200 grouped by part of speech so a worker stays in one register.

### Stage 4 — write

A gate script assembles `eout/*.json` into the app's data files. It refuses to write unless all 21
units exist, all 4,124 agreed lemmas are enriched, and there are zero validation failures. Beyond
per-row checks (bracketed Cyrillic pronunciation, Cyrillic gloss, ≥2 example sentences, no Cyrillic
leaking into the Polish examples) it catches what workers cannot self-report: a lemma appearing in
two units, or a lemma not on the agreed list at all.

### Result

**4,124 words** in `web/public/assets/pl-ru/vocabulary.json`, `n` sequential per category:

| Category | n | Category | n |
| --- | --- | --- | --- |
| Verbs | 1,580 | Pronouns | 55 |
| Nouns | 1,419 | Particles | 52 |
| Adjectives | 532 | Prepositions | 46 |
| Adverbs | 350 | Conjunctions | 36 |
| Numerals | 31 | Interjections | 23 |

Chapter refs — all 4,124 — are in
`web/public/assets/pl-ru/books/witcher-the-sword-of-destiny/ch-1.vocab.json`.
`vocabCount` still needs writing into the book manifest when the feature is built.

### Running the workers

- Trial exactly one worker synchronously and inspect its output file before launching any batch.
- Then run **3 at a time**. A 20-wide fan-out was tried and every worker died — server-side rate
  limiting plus watchdog stalls — leaving one truncated file and nothing else.
- A status script reports per-chunk completeness so a batch can be resumed rather than restarted.
- One chunk takes roughly 20 minutes.

---

## Other pairs

`books-index.json` with `{ "books": [] }` is created for `it-ru` and `en-ru` so the Books tab
renders its empty state instead of 404-ing.

---

## Verification

1. `npm --prefix web run build` — typecheck with `strictTemplates`.
2. `npm --prefix web start`, then via Claude_Preview:
   - `/pl-ru/books` lists the book;
   - `/pl-ru/books/witcher-the-sword-of-destiny` lists chapter 1;
   - the chapter reader shows correctly-accented Polish with paragraphs and section breaks intact;
   - the Vocabulary tab lists categories, a category opens a word table, and memorize/repeat launch;
   - `/it-ru/books` shows the empty state;
   - console and network are clean.
3. Screenshot the chapter reader and the vocabulary tab.

---

## Docs to update on landing

- This file — rewritten from plan into feature reference.
- [CLAUDE.md](CLAUDE.md) — add the books source-of-truth convention next to stories/lessons/drills,
  and add this doc to the Docs list.
