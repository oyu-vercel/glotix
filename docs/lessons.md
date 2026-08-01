# Lessons

**Status: Steps 1–9 implemented. Later steps not yet defined.**

Top-level feature alongside Vocabulary, Stories and Drills: **Lessons** — conversation-based lessons
derived from audio-course transcripts. Each lesson goes through the same onboarding process,
recorded here so lesson 2, 3, … can repeat it.

Source material lives in `docs/<pair>/transcripts/`. First lesson:
[lesson-1.txt](it-ru/transcripts/lesson-1.txt) — a Pimsleur-style Unit 1 transcript, English
narration interleaved with Italian.

## Scope decisions (answered by the maintainer)

| Question | Decision |
| --- | --- |
| Target-only output content | Ordered, deduplicated phrases — first-appearance order, each distinct phrase once |
| Output path | `docs/<pair>/transcripts/lesson-<n>-target.txt`, next to the source |
| Extraction method | By hand for now; write a script once the rules are proven over several lessons |

## Step log

### Step 1 — strip English, produce an target-only file ✅

Input: `docs/it-ru/transcripts/lesson-1.txt` (379 lines, mixed English/Italian)
Output: `docs/it-ru/transcripts/lesson-1-target.txt` (37 lines, Italian only, one phrase per line)

Rules applied, in the order they resolve:

1. **Drop pure-English narration lines.** The bulk of the source.
2. **Split mixed lines.** Some lines carry both languages and must be split rather than
   kept or dropped whole — source lines 14, 16, 20, 177, 179, 193, 228, 236.
3. **Drop pronunciation fragments.** The course drills words backwards syllable by syllable;
   those syllables are not Italian words. Dropped: `Scu`, `Si` (as the tail of *scusi*), `Ano`,
   `Iano`, `Po'`, `Rina`, `Gnorina`. Also dropped: partial phrase build-ups that are just
   scaffolding for a phrase already listed (`capisco l'italiano` at line 193, `Lei.` at line 51).
4. **Keep standalone words that the lesson explicitly teaches**, even when short — `Io`, `Non`,
   `È`, `Signore`, `Italiano`, `Inglese`. The test is whether the narration introduces it as a
   word ("first the word I alone", "it's the *non* which makes this sentence negative", "what part
   of that do you think means *are*?"), not whether it appears alone.
5. **Deduplicate globally**, keeping first-appearance order. The course repeats every phrase many
   times by design; the output lists each distinct phrase once.
6. **Keep statement and question forms as separate entries.** Intonation is the lesson's teaching
   point, so `Lei capisce.` and `Lei capisce?` are distinct.
7. **Normalize transcription artifacts** (listed below) rather than emitting them verbatim.

Transcription fixes applied in this lesson:

- `Le capisce` (lines 68, 70) → `Lei capisce` — missing *i*.
- `Lei e` (lines 248, 251, 257, 258) → `Lei è` — missing accent.
- `Lei americano.` / `Lei americano?` (lines 263, 265, 267, 269, 273, 290, 350, 352) →
  `Lei è americano.` / `Lei è americano?` — the copula is elided in speech; the source's own
  final conversation (line 312) confirms the full form.
- `un po'l'italiano` (lines 228, 231, 305, 306, 311) → `un po' l'italiano` — missing space.
- `Sì.` at line 94 sits inside the *signore* drill with no prompt; *sì* is formally introduced at
  line 277, so it is listed once at that teaching point.

### Step 2 — convert the target-only file to lesson JSON ✅

Input: `docs/it-ru/transcripts/lesson-1-target.txt`
Output: `web/public/assets/it-ru/lessons/it-ru-1.json` (see Step 8 for the current asset layout)

Shape follows the drills JSON
([days-of-week.json](../web/public/assets/it-ru/drills/days-of-week.json)) with one deliberate
difference:

- `words` — every unique word from the lesson, in first-appearance order. **Stored inline**
  (`{ target, native }`), *not* as `{ category, n }` references into `vocabulary.json` the way
  drills store `wordOrder`. Lesson files are self-contained; `vocabulary.json` is untouched.
- `patterns` — the unique **multi-word phrases** from the lesson file, in file order, as
  `{ target, native }`. Same key and same shape as drills. Single-word lines are excluded —
  they already appear in `words`, and a lone word teaches no sentence structure. `L'inglese.`,
  `L'italiano.` and `Un po'.` count as single words for this rule: article + noun is one lexical
  item, and `un po'` is one expression (it is a single `words` entry).

Word-splitting rules:

- `l'` is listed as its own word — the lesson teaches the elided article explicitly (source lines
  21–28), and it is not part of the noun it attaches to.
- `un po'` is listed as a single entry rather than `un` + `po'`; it is taught as one expression and
  `po'` alone is not a word.

Russian translations are written by hand for both `words` and `patterns` — the source lesson is
English-based and carries no Russian.

Counts: 16 words, 37 patterns.

### Step 3 — Lessons UI ✅

A **Lessons** nav item after Drills, a lessons table, and a lesson detail screen with Words and
Patterns tabs — full parity with the Drills screens, including the deck buttons and the
Pronunciation / Examples columns.

**Decisions**

- Word rows are **resolved against `vocabulary.json`** for `pronunciation` and `examples`.
- `translation` comes from the **lesson's own `native` field**, not from `vocabulary.json`.
  Several vocabulary glosses are wrong for this lesson's meaning — `inglese` is "англичанин"
  (an Englishman) in `vocabulary.json` but means the English *language* here; likewise
  `italiano` ("итальянец"), `signore` ("господин"), `signorina` ("барышня").
- Each lesson word entry gains a `category` field so the lookup is deterministic: `italiano` and
  `sì` each match two `vocabulary.json` entries. Chosen: `italiano` → `adjective` (итальянский,
  the language sense), `sì` → `interjection` (a standalone reply).

**Data changes**

1. Append 4 words missing from `vocabulary.json` using the existing
   [append-words.mjs](../web/scripts/append-words.mjs) (appends at `maxN + 1`, never renumbers, so
   existing drill/story refs stay valid):

   | Word | Category | Pronunciation | Translation |
   | --- | --- | --- | --- |
   | `scusi` | interjection | `[ску́зи]` | извините |
   | `capisco` | verb | `[капи́ско]` | понимаю |
   | `un po'` | adverb | `[ун по́]` | немного |
   | `americano` | noun | `[америка́но]` | американец |

   Examples are taken from the lesson's own phrases.

2. `web/public/assets/it-ru/lessons/it-ru-1.json` — add `category` to each of the 16 word entries.
3. New lessons index, mirroring `drills-index.json`.

**Angular files**

| File | Mirrors |
| --- | --- |
| `app/lessons/lessons.types.ts` | `drills.types.ts` |
| `app/lessons/lessons.service.ts` | `drills.service.ts` |
| `app/lessons/list/` | `drills/list/` |
| `app/lessons/detail/` | `drills/detail/` |
| `app/lessons/memorize/` | `drills/memorize/` (skip scope `lesson:<slug>`) |
| `app/lessons/repeat/` | `drills/repeat/` |
| `app/lessons/patterns-repeat/` | `drills/patterns-repeat/` |

`PatternPair`, `PatternsTable`, `WordTable`, `PageHeader`, `ProgressTable` and the three shared
decks are reused as-is — no new shared components, and no changes to the Drills feature.

**Nav** — `Lessons` link in `app.html`, after Drills.

| Path | Component | Purpose |
| --- | --- | --- |
| `/:pair/lessons` | `LessonsList` | Title-only table of lessons, row click → detail. |
| `/:pair/lessons/:slug` | `LessonDetail` | Tabs: **Listen** (audio + transcript), **Words** (word table + 3 deck buttons), **Patterns** (phrase table + Repeat). |
| `/:pair/lessons/:slug/memorize` | `LessonMemorize` | Words memorize deck. Default direction `target`; `?direction=native` for the reverse. |
| `/:pair/lessons/:slug/repeat` | `LessonRepeat` | Words repeat deck. |
| `/:pair/lessons/:slug/patterns/repeat` | `LessonPatternsRepeat` | Pattern repeat — target + native shown together. |

Lesson words join that pair's `glotix:<pair>:memorized` set like every other deck. Skips live under
`lesson:<slug>` in the memorize-storage scope namespace.

**Verified** — `ng build` clean; `/lessons` lists Lesson 1; the detail screen renders 16 words with
pronunciation and examples and 22 patterns; all three decks load (16 / 16 / 22 cards); no console
errors and every asset returns 200.

### Step 4 — `add-lesson` skill ✅

The onboarding process from Steps 1–3 is captured as [`.claude/skills/add-lesson`](../.claude/skills/add-lesson/SKILL.md),
alongside the existing `add-drill` and `add-story` skills. Trigger it with "add lesson 4" once
`docs/it-ru/transcripts/lesson-4.txt` is in place.

**Cross-lesson rule** (decided here, lesson 1 could not reveal it — Pimsleur units deliberately
re-drill earlier material):

- **`words` — new material only.** A word is listed in lesson N only if it does not already appear
  in any earlier lesson JSON for the same pair. Lesson 2 will not re-list `scusi` or `capisce`.
- **`patterns` — everything in that lesson's file.** Same rule as lesson 1: all unique multi-word
  phrases, in first-appearance order, regardless of whether an earlier lesson drilled them.

### Steps 5–6 — per-pair lesson folders and a language landing page ✅ (superseded by Step 8)

Lessons were the first feature to grow a language-pair layer, ahead of the rest of the app: lesson
JSONs moved into `lessons/<pair>/` subfolders derived from the slug, `lessons-index.json` grew a
`languages[]` wrapper, and `/lessons` became a language table feeding `/lessons/:pair`.

Step 8 generalised all of that to the whole app, so none of those specifics survive — the pair is a
route segment now, not a slug derivation, and the language choice happens once at `/` rather than
per feature. The lesson-facing outcome is unchanged: one folder and one index per pair.

### Step 7 — lesson Text tab ✅ (renamed and moved first in Step 9)

A third tab, **Text**, on the lesson detail screen, showing that lesson's full transcript.

**Asset naming** — the transcript lives next to the lesson JSON, under the same stem:

```
web/public/assets/it-ru/lessons/it-ru-1.json
web/public/assets/it-ru/lessons/it-ru-1.txt
```

The existing transcripts were renamed into this scheme so the URL is derived from the slug — no
index or JSON field points at it, and nothing depends on filesystem case. Contents are untouched.

**Rendering — formatting only, never the text.** Blank lines split the file into paragraphs; inside
a paragraph, source line breaks are preserved by `white-space: pre-line` rather than by rewriting
the string. No trimming of content, no re-wrapping, no reordering. The block is set at a ~68ch
measure with a 1.75 line-height for comfortable reading.

**Files**

| File | Change |
| --- | --- |
| `app/lessons/lessons.service.ts` | `getLessonText(slug)` (`responseType: 'text'`, `catchError` → `null`, cached like the other loads) and `getLessonTextSignal()` |
| `app/lessons/detail/detail.ts` | `text` signal + `paragraphs` computed |
| `app/lessons/detail/detail.html` | Third `mat-tab` with the paragraphs, `Loading...` / `No text for this lesson.` states |
| `app/lessons/detail/detail.scss` | `.lesson-text` reading typography |

A missing `.txt` is not an error: `getLessonText` maps the 404 to `null` and the tab says
"No text for this lesson."

The [`add-lesson` skill](../.claude/skills/add-lesson/SKILL.md) gained the copy step: Stage 4 copies
the source transcript verbatim into the assets folder before updating the index, and Stage 5 checks
the Text tab.

**Verified** — `npm --prefix web run build` clean. In the browser: lessons 1 and 2 render the Text
tab with the full transcript, paragraph breaks intact; all three `.txt` assets return 200; no
console errors.

### Step 8 — app-wide multi-language restructure ✅

The pair layer moved out of Lessons and became the app's top-level axis. See
[multi-language.md](multi-language.md) for the full design; what changed for lessons:

| Before | After |
| --- | --- |
| `assets/lessons/<pair>/<slug>.json` \| `.txt` | `assets/<pair>/lessons/<slug>.json` \| `.txt` |
| `assets/lessons-index.json` with a `languages[]` wrapper | `assets/<pair>/lessons-index.json`, a flat `{ lessons: [...] }` |
| `/lessons` language table → `/lessons/:pair` | `/:pair/lessons` (the language choice happens once at `/`) |
| `/lessons/:pair/:slug/…` | `/:pair/lessons/:slug/…` |
| `pairFolder(slug)` derives the folder | the pair is a route segment; `LanguageService` holds it |
| `LessonWordRef { italian, russian }` | `LessonWordRef { target, native }` |
| `app/lessons/languages/` | deleted — replaced by the `/` picker and the toolbar switcher |
| `glotix:memorized` (shared across languages) | `glotix:<pair>:memorized` |

`LessonsService` keeps the same public surface apart from `getLanguage()` / `lessonsFor(pair)`,
which collapse into a single `lessons$` for the active pair.

### Step 9 — lesson audio, and the Listen tab ✅

The transcript tab gained the lesson's recording, pinned above the text — and with audio on it, the
tab became the lesson itself rather than an appendix to it. So it was **renamed `Text` → `Listen`**
and **moved to the front**, ahead of Words and Patterns. Tab order is now
**Listen · Words · Patterns**, and Listen is what opens by default.

**Asset naming** — the audio sits in an `audio/` subfolder next to the lesson JSON, same stem as the
slug, so the URL is derived rather than declared (no index entry, no lesson-JSON field):

```
web/public/assets/en-ru/lessons/en-ru-1.json
web/public/assets/en-ru/lessons/en-ru-1.txt
web/public/assets/en-ru/lessons/audio/en-ru-1.mp3
```

All five shipping lessons have one. A missing file is not an error — the `<audio>` element's
`error` event hides the player and the transcript renders alone, mirroring the `.txt` → "No text
for this lesson." behaviour.

**Player** — `app/shared/audio-player/`, standalone and `OnPush`, in `shared/` because nothing
about it is lesson-specific. Takes a single `src` input. Themed to the app rather than using
`<audio controls>`: a terracotta round play/pause button, a seek bar, and a `m:ss / m:ss` readout in
a rounded `--mat-sys-surface-container` pill.

- The play/pause glyphs are **inline SVG**. No component in the app imports `MatIconModule` and
  this one does not change that.
- The seek bar is a native `<input type="range">` made transparent and laid over a `.rail` / `.fill`
  pair — keyboard and touch seeking keep working without restyling every vendor pseudo-element.
- A `seeking` flag set on `input` and cleared on `change` keeps `timeupdate` from yanking the thumb
  back mid-drag.
- An effect on `src` resets position, duration and error state, so switching lessons cannot inherit
  the previous one's state.

**Two layout couplings worth knowing about**, both in `detail.scss`:

- Material's tab body chain (`.mat-mdc-tab-body-wrapper`, `.mat-mdc-tab-body`,
  `.mat-mdc-tab-body-content`) is `overflow: hidden`, which makes it the nearest scrollport and pins
  any `position: sticky` descendant to the top of the tab instead of the viewport. `.lesson-tabs`
  overrides all three to `overflow: visible` and contains the horizontal tab-switch animation with
  `overflow-x: clip` — unlike `hidden`, `clip` does not create a scrollport, so vertical stickiness
  survives it.
- `.audio-row` sticks at `top: 70px`, just under the fixed app toolbar (`top: 16px` + `56px`
  min-height = 72px). Sticking 2px *under* it rather than below leaves no gap for a sliver of
  transcript to show through; the toolbar's higher `z-index` paints over the overlap. **If the
  toolbar's height or offset changes in `app.scss`, this value has to follow.**
- The backdrop runs the full width of the tab, not the 68ch text measure — a 68ch backdrop let
  transcript lines show through beside the pill, because `ch` resolves against each element's own
  font size and the player's differed from `.lesson-text`'s.

The player renders regardless of the transcript's state; audio and text are independent. Playback
continues across tab switches, since `mat-tab` content stays in the DOM.

**Files**

| File | Change |
| --- | --- |
| `app/shared/audio-player/audio-player.ts` \| `.html` \| `.scss` | New component |
| `app/lessons/detail/detail.ts` | `audioSrc` computed; `AudioPlayer` import |
| `app/lessons/detail/detail.html` | `<app-audio-player>` atop the tab; tab renamed to `Listen` and moved first |
| `app/lessons/detail/detail.scss` | Sticky `.audio-row`, tab-overflow overrides |

**Verified** — `npm --prefix web run build` clean. In the browser: `/en-ru/lessons/en-ru-1` and
`/it-ru/lessons/it-ru-3` both load durations (29:32 / 28:08); play toggles the glyph and advances
the bar and readout; clicking the bar seeks; the player stays pinned under the toolbar with no
transcript showing through, and no other tab bleeds in through the relaxed overflow. The `.mp3`
serves `206 Partial Content`. After the reorder, Listen opens by default and all three tabs still
render. The missing-audio path is code-verified only — every shipping lesson has a file, so it was
not exercised in the browser.

### Step 10 — not yet defined

## Lesson log

| Pair | Lesson | Source | Target-only | Words | Patterns |
| --- | --- | --- | --- | --- | --- |
| it-ru | 1 | [lesson-1.txt](it-ru/transcripts/lesson-1.txt), 379 lines | [lesson-1-target.txt](it-ru/transcripts/lesson-1-target.txt), 37 phrases | 16 | 22 |
| it-ru | 2 | [lesson-2.txt](it-ru/transcripts/lesson-2.txt), 392 lines | [lesson-2-target.txt](it-ru/transcripts/lesson-2-target.txt), 61 phrases | 11 | 44 |
| it-ru | 3 | [lesson-3.txt](it-ru/transcripts/lesson-3.txt), 434 lines | [lesson-3-target.txt](it-ru/transcripts/lesson-3-target.txt), 87 phrases | 12 | 69 |
| en-ru | 1 | [lesson-1.txt](en-ru/transcripts/lesson-1.txt), 391 lines | [lesson-1-target.txt](en-ru/transcripts/lesson-1-target.txt), 38 phrases | 14 | 25 |
| en-ru | 2 | [lesson-2.txt](en-ru/transcripts/lesson-2.txt), 377 lines | [lesson-2-target.txt](en-ru/transcripts/lesson-2-target.txt), 52 phrases | 12 | 37 |

### Lesson 2 notes

The maintainer trimmed the unit's reading-booklet section (Pimsleur Unit 2 ends with a decoding
drill: *Mio, Topolino, Oliva salata, Stigmata, …*) from the source before ingestion. Lessons cover
the conversational part only; if a later unit's reading section is kept, decide then whether those
words belong in `words` or in `patterns`.

New words (11, all absent from lesson 1): `buongiorno`, `buon`, `signora`, `come`, `sta`, `molto`,
`bene`, `grazie`, `sto`, `arrivederci`, `ah`. Carried over from lesson 1 and therefore not
re-listed: `scusi`, `l'`, `inglese`, `capisce`, `lei`, `no`, `signore`, `io`, `capisco`, `non`,
`italiano`, `un po'`, `americano`, `è`, `sì`, `signorina`.

Appended to `vocabulary.json` via `append-words.mjs` (the other 7 already existed):

| Word | Category | Pronunciation | Translation |
| --- | --- | --- | --- |
| `buon` | adjective | `[буо́н]` | добрый / хороший |
| `sta` | verb | `[ста]` | поживает / находится |
| `sto` | verb | `[сто]` | поживаю / нахожусь |
| `ah` | interjection | `[а]` | ах / а |

Transcription fixes applied:

- `Lei americano?` (lines 5, 14, 121, 123) → `Lei è americano?` — elided copula, same fix as
  lesson 1; the source's own line 127 confirms the full form.
- `un po'l'italiano` (lines 91, 343, 351, 361) → `un po' l'italiano` — missing space.
- `Io sto...` (line 263) → `Io sto.` — trailing ellipsis is a transcription artifact; the narration
  ("Try to say, I stay") introduces it as a form.
- Lines 374 and 385 are the whole final conversation run together without punctuation. Split into
  its constituent phrases; the only one not already listed is `Lei capisce molto bene.` (plus
  `Sì, signorina.`), which line 376's *Grazie, signorina.* confirms.

Judgment calls:

- **Terminal `?` on repeated single words and statements is ASR noise, not intonation.** `Come?`
  (line 192, prompted by "Say the word *how* alone") deduped into `Come.`, and `Lei sta?`
  (line 195, prompted by "say once again, you stay") deduped into `Lei sta.` Rule 6 still holds
  where the narration actually asks for the question form.
- **Whole-word build-up steps are kept, sub-word syllables dropped** — matching lesson 1, which
  kept both `Non.` and `Non capisco.` from the same kind of backwards drill. Kept: `Non.`, `Buon.`,
  `Sta.`, `Sto bene.`, `Signore.`, `Signorina.`, `Bene.`, `Molto.`, `Come.`, `Grazie.`, `Signora.`
  Dropped: `Rina`, `Gno`, `Gnorina`, `Sign`, `On`, `Ne`, `Ci`, `Vederci`, `Ri`, `Arri`.
- **`ah` is listed as a word.** It is the only interjection in the file that the narration does not
  formally introduce, but the rule for `words` is mechanical — every unique word in the
  target-only file — so it is included rather than carved out by exception.
- The transcript drops the answer line after "Now the word day" (line 146) and after "Say hello or
  good day" (line 148), so `Giorno.` never appears. Nothing was invented to fill the gaps;
  `buongiorno` is listed whole and `buon` from line 141.

Verified: `npm --prefix web run build` clean; `/lessons` lists Lesson 2; the detail screen shows
**Words (11)** with a non-empty Pronunciation and Examples cell on every row and **Patterns (44)**;
all three decks load (11 / 11 / 44 cards); no console errors.

Pre-existing, unrelated: `bene`'s examples in `vocabulary.json` include two ungrammatical sentences
(*La lezione è bene.*, *Il bambino è bene.* — should be *buona* / *bravo*). Left untouched, since
the workflow never overwrites existing vocabulary entries.

### Lesson 3 notes

Like lesson 2, the source was trimmed of the unit's reading-booklet section before ingestion, so the
open question from the lesson 2 notes still stands unanswered — lessons remain conversational-only.

New words (12): `ma`, `americana`, `sono`, `italiana`, `e`, `per`, `favore`, `prego`, `trovo`,
`che`, `un`, `parla`. Everything else in the unit is lesson 1 or lesson 2 material and is not
re-listed.

Appended to `vocabulary.json` via `append-words.mjs` (the other 7 already existed):

| Word | Category | Pronunciation | Translation |
| --- | --- | --- | --- |
| `americana` | noun | `[америка́на]` | американка |
| `italiana` | noun | `[италья́на]` | итальянка |
| `favore` | noun | `[фаво́ре]` | одолжение / услуга |
| `trovo` | verb | `[тро́во]` | нахожу / считаю |
| `parla` | verb | `[па́рла]` | говорит / говорите |

Transcription fixes applied:

- `Lei americano?` (lines 79, 111, 393) and `Lei americana?` (82, 107) / `Lei americana, signora?`
  (84, 108) / `Lei americano, signore?` (112) → `Lei è …` — elided copula, the same fix as lessons 1
  and 2; the source's own line 15 (`Lei è americano?`) and 175 (`Lei è italiana?`) confirm the full
  form.
- `un po'l'italiano` (line 32) → `un po' l'italiano` — missing space.
- `Lei è Lei è?` (line 279) — two utterances run together, and the narration ("Now say you are.")
  asks for a statement. Split and deduped into the existing `Lei è.`; the trailing `?` is ASR noise.
- `E?` (lines 196–197) → `E.` — terminal `?` on an isolated word being drilled, same judgment as
  lesson 2's `Come?`. Line 243 (`E. E.`) confirms the statement form.
- `Sì?` (lines 382, 428) deduped into `Sì.` — conversational filler, same word, contributes nothing
  as a single-word line.

Judgment calls:

- **Contrast pairs are dropped.** `Cano, cana.` (96–97), `Americano, americana.` (98–99) and
  `Italiano, italiana.` (153, 155) are minimal-pair drills, not phrases — they teach no sentence
  structure, and both members already appear as standalone words. `Cano` / `Cana` are sub-word
  endings and fall to rule 3 regardless.
- **Whole-word build-up steps kept, syllables dropped** — matching lesson 2. Kept: `Sono.`,
  `Favore.`, `Non è.`, `Parla.`, `Americana.`, `Americano.`, `Italiana.`, `Ma.`, `E.`, `Prego.`,
  `Signorina.` Dropped: `Arri`, `Cana`, `Cano`, `Vore`, `Co`, `Go`.
- **`Lei?` (line 377) is kept** as a genuine conversational turn ("And you?"), not scaffolding —
  unlike lesson 1's `Lei.` at its line 51. It is inert in the output (single word, and `lei` is
  lesson 1 material), but the target-only file stays a faithful record of what is spoken.
- **`italiana` and `americana` are both `noun`.** In this unit they are nationalities applied to a
  person (*Io sono italiana.*), not the language sense that made lesson 1 file `italiano` under
  `adjective`.
- Line 413 (`Prego, trovo che per un americano lei parla molto bene l'italiano.`) is the only
  sentence in the unit the course does not drill — the learner is meant to fail to understand it.
  It is kept as a pattern, and its five new words (`trovo`, `che`, `per`, `un`, `parla`) are listed.

Verified: `npm --prefix web run build` clean; `/lessons` lists Lesson 3; the detail screen shows
**Words (12)** with a non-empty Pronunciation and Examples cell on every row and **Patterns (69)**;
all three decks load (12 / 12 / 69 cards); no console errors; screenshots taken of both tabs.

## en-ru lessons 1–2

The first lessons for the `en-ru` pair (English taught to Russian speakers), from a Pimsleur-style
Russian-narrated course. Structurally the mirror of it-ru: the narration is Russian, the drilled
utterances are English.

`en-ru/vocabulary.json` was empty (`{ "categories": [] }`) before this. It was seeded with the same
nine category skeletons as `it-ru/vocabulary.json` (`noun`, `verb`, `adjective`, `adverb`,
`article`, `conjunction`, `interjection`, `preposition`, `pronoun`) so `append-words.mjs` — which
only appends into categories that already exist — had somewhere to write. All **26** lesson words
were then appended through the script; `article`, `conjunction` and `preposition` remain empty.
Pronunciations follow the it-ru convention: Cyrillic transliteration in square brackets with a
stress mark.

Lesson 1 — 14 words, 25 patterns. Words: `excuse me`, `Russian`, `understand`, `you`, `do`, `no`,
`sir`, `I`, `don't`, `English`, `a little`, `are`, `yes`, `miss`.

Lesson 2 — 12 new words, 37 patterns. Words: `you're`, `I'm`, `hello`, `ma'am`, `how`, `fine`,
`thanks`, `goodbye`, `ah`, `very`, `well`, `not`. Everything else in the unit is lesson 1 material
and is not re-listed.

Category calls, made so the runtime `category` + lowercased-`target` lookup stays deterministic:

- `English` → `noun` (the language), `Russian` → `adjective` — the same split it-ru made between
  `inglese` (noun) and `italiano` (adjective).
- `do` and `don't` → `verb`; they are the auxiliary and its negated contraction.
- `you're` and `I'm` → `pronoun`, keyed on the pronoun head rather than the elided copula.
- `excuse me` and `a little` are single entries, not split into their parts — the same rule that
  keeps it-ru's `un po'` whole.

Transcription fixes and drops (both sources are ASR output):

- Backwards syllable drills dropped as non-words — lesson 1: `Use`, `Shun`, `Ra`, `Stand`, `Der`,
  `Der stand`, `Un`, `Under`; lesson 2: `Use`, `Excuse`, `Ex`, `Bye`, `Good`, `Re`, `There`.
- Repetition artifacts collapsed: `Don't Don't Don't understand.` (lesson 1, line 156) → `Don't.`,
  `I'm I'm.` (lesson 2, line 81) → `I'm.`
- Mixed-language lines split rather than kept or dropped whole — lesson 1 lines 13, 195; lesson 2
  lines 10, 116, 122.
- `your` (lesson 2, lines 65, 68, 69, 71, 73, 90, 96) → `you're` — the ASR heard the contraction of
  *you are* as the possessive; the narration is explicitly about that contraction.
- `You are your.` (line 71) and `I'm your.` (line 96) are contrast drills pairing full form against
  contraction, not utterances. Dropped; both forms are already listed.
- `Are you?` (lesson 1 line 280, lesson 2 line 165) dropped as a build-up of `Are you Russian?`

Judgment calls:

- **Phrases the narration prompts but the ASR did not capture were reconstructed** — this transcript
  drops most of the learner-response gaps, so a strict line-by-line extraction would lose material
  the unit clearly teaches (`No.`, `Sir.`, `Excuse me, sir.`, `I.`, `Hello.`, `Very well.`). The
  it-ru target files were built the same way.
- **Lesson 2, line 153** — "Спросите ее вежливо, американка ли она?" was skipped: answering it needs
  the word *American*, which neither unit teaches, and nothing in the file supplies the English
  form. Nothing was invented to fill the gap.
- `ah` is listed as a word for the same mechanical reason it was in it-ru lesson 2 — it appears in
  the target-only file, so it is included rather than carved out.

Verified: `npm --prefix web run build` clean; `/en-ru/lessons` lists Lesson 1 and Lesson 2; both
detail screens show every word row with a non-empty Pronunciation and Examples cell
(**Words (14)** / **Patterns (25)**, **Words (12)** / **Patterns (37)**); the Text tab renders each
full transcript; all three decks load (12 / 12 / 37 checked on lesson 2); every `assets/en-ru/…`
request returns 200; screenshots taken of both tabs.
