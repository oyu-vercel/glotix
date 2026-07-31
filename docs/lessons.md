# Lessons

**Status: Steps 1–3 implemented. Later steps not yet defined.**

New top-level feature alongside Vocabulary, Stories and Drills: **Lessons** — conversation-based
Italian lessons derived from audio-course transcripts. Each lesson goes through the same
onboarding process, recorded here so lesson 2, 3, … can repeat it.

Source material lives in `docs/italian/`. First lesson: [italian-1.txt](italian/italian-1.txt) —
a Pimsleur-style Unit 1 transcript, English narration interleaved with Italian.

## Scope decisions (answered by the maintainer)

| Question | Decision |
| --- | --- |
| Italian-only output content | Ordered, deduplicated phrases — first-appearance order, each distinct phrase once |
| Output path | `docs/italian/italian-<n>-it.txt`, next to the source |
| Extraction method | By hand for now; write a script once the rules are proven over several lessons |

## Step log

### Step 1 — strip English, produce an Italian-only file ✅

Input: `docs/italian/italian-1.txt` (379 lines, mixed English/Italian)
Output: `docs/italian/italian-1-it.txt` (37 lines, Italian only, one phrase per line)

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

### Step 2 — convert the Italian-only file to lesson JSON ✅

Input: `docs/italian/italian-1-it.txt`
Output: `web/public/assets/lessons/it-ru-1.json` (new `lessons/` asset folder)

Shape follows the drills JSON ([days-of-week.json](../web/public/assets/drills/days-of-week.json))
with one deliberate difference:

- `words` — every unique word from the lesson, in first-appearance order. **Stored inline**
  (`{ italian, russian }`), *not* as `{ category, n }` references into `vocabulary.json` the way
  drills store `wordOrder`. Lesson files are self-contained; `vocabulary.json` is untouched.
- `patterns` — the unique **multi-word phrases** from the lesson file, in file order, as
  `{ italian, russian }`. Same key and same shape as drills. Single-word lines are excluded —
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
- `translation` comes from the **lesson's own `russian` field**, not from `vocabulary.json`.
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

2. `web/public/assets/lessons/it-ru-1.json` — add `category` to each of the 16 word entries.
3. New `web/public/assets/lessons-index.json`, mirroring `drills-index.json`.

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
| `/lessons` | `LessonsList` | Title-only table of lessons, row click → detail. |
| `/lessons/:slug` | `LessonDetail` | Two tabs: **Words** (word table + 3 deck buttons) and **Patterns** (phrase table + Repeat). |
| `/lessons/:slug/memorize` | `LessonMemorize` | Words memorize deck. Default direction `italian`; `?direction=russian` for the reverse. |
| `/lessons/:slug/repeat` | `LessonRepeat` | Words repeat deck. |
| `/lessons/:slug/patterns/repeat` | `LessonPatternsRepeat` | Pattern repeat — italian + russian shown together. |

Lesson words join the global `glotix:memorized` set like every other deck. Skips live under
`lesson:<slug>` in the memorize-storage scope namespace.

**Verified** — `ng build` clean; `/lessons` lists Lesson 1; the detail screen renders 16 words with
pronunciation and examples and 22 patterns; all three decks load (16 / 16 / 22 cards); no console
errors and every asset returns 200.

### Step 4 — `add-lesson` skill ✅

The onboarding process from Steps 1–3 is captured as [`.claude/skills/add-lesson`](../.claude/skills/add-lesson/SKILL.md),
alongside the existing `add-drill` and `add-story` skills. Trigger it with "add lesson 2" once
`docs/italian/italian-2.txt` is in place.

**Cross-lesson rule** (decided here, lesson 1 could not reveal it — Pimsleur units deliberately
re-drill earlier material):

- **`words` — new material only.** A word is listed in lesson N only if it does not already appear
  in any earlier `it-ru-*.json`. Lesson 2 will not re-list `scusi` or `capisce`.
- **`patterns` — everything in that lesson's file.** Same rule as lesson 1: all unique multi-word
  phrases, in first-appearance order, regardless of whether an earlier lesson drilled them.

### Step 5 — not yet defined

## Lesson log

| Lesson | Source | Italian-only | Words | Patterns |
| --- | --- | --- | --- | --- |
| 1 | [italian-1.txt](italian/italian-1.txt), 379 lines | [italian-1-it.txt](italian/italian-1-it.txt), 37 phrases | 16 | 22 |
| 2 | [Italian-2.txt](italian/Italian-2.txt), 392 lines | [italian-2-it.txt](italian/italian-2-it.txt), 61 phrases | 11 | 44 |
| 3 | [Italian-3.txt](italian/Italian-3.txt), 434 lines | [italian-3-it.txt](italian/italian-3-it.txt), 87 phrases | 12 | 69 |

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
  Italian-only file — so it is included rather than carved out by exception.
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
  lesson 1 material), but the Italian-only file stays a faithful record of what is spoken.
- **`italiana` and `americana` are both `noun`.** In this unit they are nationalities applied to a
  person (*Io sono italiana.*), not the language sense that made lesson 1 file `italiano` under
  `adjective`.
- Line 413 (`Prego, trovo che per un americano lei parla molto bene l'italiano.`) is the only
  sentence in the unit the course does not drill — the learner is meant to fail to understand it.
  It is kept as a pattern, and its five new words (`trovo`, `che`, `per`, `un`, `parla`) are listed.

Verified: `npm --prefix web run build` clean; `/lessons` lists Lesson 3; the detail screen shows
**Words (12)** with a non-empty Pronunciation and Examples cell on every row and **Patterns (69)**;
all three decks load (12 / 12 / 69 cards); no console errors; screenshots taken of both tabs.
