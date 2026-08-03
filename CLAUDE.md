# Glotix

Multi-language learning app. Every screen hangs off a **language pair** — a target language taught
to speakers of a native language — written `<target>-<native>`, e.g. `it-ru` (Italian for Russian
speakers). Shipping pairs: `it-ru` (A2, populated), `en-ru` (A2, two lessons plus their vocabulary;
no stories or drills yet) and `pl-ru` (no level label; one book chapter plus its 4,124-word
vocabulary — no stories, drills or lessons yet). See
[docs/multi-language.md](docs/multi-language.md).

## Commands

- Start dev server (web): `npm --prefix web start` → http://localhost:4200
- Build (web): `npm --prefix web run build`
- Test (web): `npm --prefix web test` (Vitest + jsdom; add `-- --watch=false` for a single run)
- Typecheck (web): `npm --prefix web run typecheck` — covers both `tsconfig.app.json` and `tsconfig.spec.json`
- Verify the generated assets still match their sources: `npm --prefix web run verify:generated`
- Rebuild per-story JSONs after editing a story or a `vocabulary.json`: `npm --prefix web run build:stories` (all pairs) or `npm --prefix web run build:stories -- it-ru`
- Rebuild per-drill JSONs after editing a drill CSV or a `vocabulary.json`: `npm --prefix web run build:drills` (all pairs) or `npm --prefix web run build:drills -- it-ru`
- Start API (currently paused): `npm --prefix api run start:dev`

## Stack

- **Frontend** — Angular 21 standalone + Angular Material 21 + Signals, in `web/`. TypeScript strict mode with `strictTemplates: true`. **Visual system: Soft Warm Modern** — terracotta `#C95D3A` primary + sage `#7E9173` tertiary on cream `#F7F1E5`, Inter body with Fraunces italic accents, light color scheme locked. See [docs/visual-redesign.md](docs/visual-redesign.md).
- **Backend** — NestJS 11 + TypeORM + better-sqlite3 (dev) / Postgres (prod), scaffolded in `api/`. Currently paused — nothing in the Angular app calls it.
- **Static data** — Files under `web/public/` are served at the URL root (e.g. `web/public/assets/x.json` → `/assets/x.json`). Everything except `assets/languages.json` lives under `assets/<pair>/`.

## Shared building blocks

Prefer these over hand-rolling a feature-specific copy — that duplication is exactly what
[docs/refactoring-plan.md](docs/refactoring-plan.md) removed.

- **Data services** build on `shared/data/pair-resource.ts` — `KeyedCache` (memoize per pair),
  `pairKey`, `forActivePair`, `ifListed` (guard a per-item fetch on index membership),
  `slugSignal` / `paramsSignal`. Never write a bare `shareReplay` in a service.
- **Summary tables** use `<app-progress-table [rows] [columns] [totals] (rowClick)>` with
  `ProgressRow` / `ProgressColumn` from `shared/progress-table/progress-table.types.ts`.
- **Flashcard decks** use `<app-deck-shell>` for chrome plus `deckCursor()` for position state.
  Projected card content must sit inside one `[card]` element — Angular does not project through
  an `@if`.
- **Deck routes** are three shared shells (`MemorizeRoute`, `RepeatRoute`, `PatternsRepeatRoute`);
  a feature supplies a `DECK_SURFACE` provider on its route rather than its own component.
- **Feature names and segments** come from `shared/features/feature-registry.ts`; back links use
  `<app-back-link>`.

## Conventions

- Standalone Angular components only — no NgModules.
- Component files use short names without the `.component` suffix: `summary.ts`, not `summary.component.ts`.
- Code style: Prettier (`printWidth: 100`, `singleQuote: true`, Angular parser for `.html`). Config at [web/.prettierrc](web/.prettierrc).
- Color scheme is locked to **light** at `web/src/styles.scss:26`. Do not switch to `dark` or `light dark`, and do not add `prefers-color-scheme: dark` overrides.
- Raised surfaces use one of two shadow tokens from `styles.scss` — `var(--glotix-shadow-card)` for resting surfaces (tables, panels, prose) and `var(--glotix-shadow-deck)` for flashcards. Do not paste a literal `box-shadow` stack into a component.
- No language is named in code or data. A word's headword field is `target`, its native-language side is `native`; `Direction` is `'target' | 'native'`. Display labels come from `languages.json` at runtime — never hardcode "Italian" or "Russian" in a component, template or type.
- Language pairs source of truth: `web/public/assets/languages.json` — `{ languages: [{ pair, target, native, targetLabel, nativeLabel, level }] }`. It is the only asset fetched before a pair is chosen. `LanguageService` (`web/src/app/shared/language/`) derives the active pair from the first URL segment, persists it to `localStorage['glotix:pair']`, and every data service builds its URLs from it.
- Routes: `/` is the two-step picker; everything else is `/:pair/…` (`/it-ru/vocabulary`, `/it-ru/stories/:slug`, `/it-ru/lessons/:slug/memorize`). A first segment that is not `xx-xx` falls through to `**` and back to the picker.
- Progress is per pair: `glotix:<pair>:memorized`, `glotix:<pair>:skip:<scope>`, `glotix:<pair>:comment:<word>`.
- Vocabulary source of truth: `web/public/assets/<pair>/vocabulary.json` (hand-edited) — `{ categories: [{ key, label, words: [{ n, target, pronunciation, translation, examples }] }] }`. No build step.
- Stories source of truth: `.txt` files under `docs/<pair>/stories/<folder>/` (one folder per story). The Angular app reads `web/public/assets/<pair>/stories-index.json` and `web/public/assets/<pair>/stories/<slug>.json`, generated by `web/scripts/build-stories.mjs` (walks subfolders recursively, all pairs unless one is named). Each per-story JSON stores `vocabulary` as `Record<categoryKey, n[]>` references into that pair's `vocabulary.json`; the Angular vocabulary service resolves them at runtime. Story tokens not found in `vocabulary.json` are silently excluded — add the word to include it.
- Lessons source of truth: hand-written `web/public/assets/<pair>/lessons/<slug>.json` plus `web/public/assets/<pair>/lessons-index.json` (a flat `{ lessons: [...] }`). No build step — unlike stories and drills, lesson JSON is authored directly. Words are stored inline (not as `vocabulary.json` refs); `pronunciation` and `examples` are looked up from that pair's `vocabulary.json` at runtime by `category` + `target`. Each lesson also has its full transcript at `web/public/assets/<pair>/lessons/<slug>.txt` (same folder and stem as the JSON) and its recording at `web/public/assets/<pair>/lessons/audio/<slug>.mp3`; the detail screen's **Listen** tab (first, and the default) serves the transcript verbatim under a pinned audio player. Both URLs are derived from the slug — nothing points at them. A lesson without a transcript shows "No text for this lesson."; one without audio just gets no player. Raw transcripts live at `docs/<pair>/transcripts/lesson-<n>.txt` — run the `add-lesson` skill to onboard one.
- Books source of truth: hand-authored under `web/public/assets/<pair>/` — `books-index.json`, a
  manifest `books/<book>.json` listing chapters, and per chapter `books/<book>/<chapter>.txt` plus
  `books/<book>/<chapter>.vocab.json` (refs into that pair's `vocabulary.json`, same shape stories
  use). No build step. Chapter text is hard-wrapped PDF prose, re-joined into paragraphs by
  `web/src/app/books/utils/parse-chapter-text.ts` — do not reuse the stories parser, its heading
  heuristic misfires on dialogue. See [docs/books.md](docs/books.md).
- Drills source of truth: one `*.csv` per folder under `docs/<pair>/drills/<folder>/` (5-column format — see [docs/drills.md](docs/drills.md)). The Angular app reads `web/public/assets/<pair>/drills-index.json` and `web/public/assets/<pair>/drills/<slug>.json`, generated by `web/scripts/build-drills.mjs`. Drills with any word missing from that pair's `vocabulary.json` are skipped at build time — run the `add-drill` skill to ingest a new drill.

## Tests

Specs live next to the code they cover (`*.spec.ts`), plus a shared harness at
`web/src/testing/setup.ts` — `testProviders()`, `provideStubLanguage()`, `flushLanguages()`,
`verifyNoOutstandingRequests()`. `LanguageService` fetches `languages.json` from its constructor,
so a spec that boots any component must answer that request or the run fails on an unhandled
rejection. Use `StubLanguageService` to drive the active pair without navigating; use the real
service (as `app.routes.spec.ts` does) when the pair must be derived from the URL. Never put a
real language name or real target-language text in a spec — use neutral placeholders.

## Docs

Feature reference docs live in `docs/`. See:

- [docs/multi-language.md](docs/multi-language.md) — the language-pair axis: asset layout, routes, `LanguageService`, picker and switcher.
- [docs/vocabulary-viewer.md](docs/vocabulary-viewer.md) — vocabulary feature reference (routes, data flow, JSON shape).
- [docs/memorized-vocabulary.md](docs/memorized-vocabulary.md) — per-pair "memorized" set: persistent filter on memorize/repeat decks, plus the `/:pair/vocabulary/memorized` un-memorize view.
- [docs/stories-viewer.md](docs/stories-viewer.md) — stories feature reference (parser, JSON shape).
- [docs/drills.md](docs/drills.md) — drills feature reference (routes, CSV format, build pipeline, skill).
- [docs/books.md](docs/books.md) — books feature reference (asset layout, routes, chapter parser)
  plus the four-stage pipeline used to build a chapter's vocabulary from raw text.
- [docs/lessons.md](docs/lessons.md) — lessons feature reference (routes, JSON shape) plus the step-by-step record of how a raw transcript is onboarded into a lesson.
- [docs/visual-redesign.md](docs/visual-redesign.md) — visual system reference (theme tokens, fonts, reused patterns).
- [docs/refactoring-plan.md](docs/refactoring-plan.md) — the completed 10-step de-duplication pass: what changed, why, and the behaviour decisions taken along the way.

## Files Claude must not read

- `docs/prompts.txt` — personal notes for the maintainer only. Do not open, read, summarize, or reference its contents. Treat it as if it does not exist.
