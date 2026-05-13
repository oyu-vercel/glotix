# Visual redesign — Soft Warm Modern

Glotix uses a **Soft Warm Modern** aesthetic: cream surfaces, terracotta accents, sage secondaries, ink ground, **Inter** body, **Fraunces** italic for accent moments.

## Aesthetic system

Defined in [web/src/styles.scss](../web/src/styles.scss) — one place.

**Theme inputs (mat.theme):**

- Color seed palettes: `mat.$orange-palette` (primary), `mat.$green-palette` (tertiary). Angular Material 21's `mat.theme` requires palette maps, not raw hex.
- Typography: `'Inter'` (shorthand applies to both plain-family and brand-family). Chosen for strong Cyrillic legibility alongside Latin.
- Density: 0.

**Token overrides** (in the same `html` block, after `mat.theme`):

| Token | Value | Purpose |
|---|---|---|
| `--mat-sys-surface` | `#F7F1E5` | cream page background |
| `--mat-sys-surface-container` | `#FFFFFF` | card surface |
| `--mat-sys-surface-container-low` | `#FBF6EA` | warm hover tint |
| `--mat-sys-surface-container-high` | `#F1EAD8` | progress-track background |
| `--mat-sys-surface-container-highest` | `#ECE3CC` | depth-3 surface |
| `--mat-sys-on-surface` | `#2B2A26` | ink |
| `--mat-sys-on-surface-variant` | `#6B6961` | muted body |
| `--mat-sys-outline-variant` | `rgba(43, 42, 38, 0.12)` | hairline borders |
| `--mat-sys-primary` | `#C95D3A` | terracotta accent |
| `--mat-sys-primary-container` | `#F6D9C9` | light terracotta surface |
| `--mat-sys-tertiary` | `#7E9173` | sage (progress fill, future secondary actions) |
| `--mat-sys-tertiary-container` | `#D6DCC8` | light sage surface |
| `--mat-sys-secondary-container` | `#ECE0C8` | warm beige (count-pill, totals row) |

**Helper class `.accent-italic`** — Fraunces italic 500 in terracotta, used to highlight one or two words inside H1 / footer labels.

## Fonts

Loaded once via [web/src/index.html](../web/src/index.html) Google Fonts link:

- `Inter` weights 400 / 500 / 600 / 700
- `Fraunces` italic 500 / 600 (variable opsz/wght, used sparingly for accents only)

Material Icons remains as-is.

## Reused visual patterns

Each component .scss defines its own copy of these (Angular component styles are scoped, so they don't collide). Patterns are intentionally not extracted to a global utility — three similar lines beats premature abstraction.

**Card-shell table-wrap** — white `surface-container`, 22px radius, layered shadow `0 1px 0 rgba(43, 42, 38, .05), 0 18px 40px -22px rgba(43, 42, 38, .18)`. Hover row → `surface-container-low` warm tint.

**Page-header eyebrow + H1** — eyebrow is `font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; color: var(--mat-sys-on-surface-variant)`. H1 is 40px desktop / 30px mobile, weight 700, letter-spacing −0.02em. Italic accent words wrapped in `.accent-italic`.

**Practice card** (memorize/repeat decks) — white card with deeper shadow `0 1px 0 rgba(43, 42, 38, .05), 0 30px 60px -32px rgba(43, 42, 38, .25)`, 28px radius (22px mobile), 64px padding. Front word in Inter 700 terracotta, `clamp(48px, 8vw, 76px)` desktop / `clamp(36px, 12vw, 48px)` mobile. Pronunciation 36px desktop / 26px mobile, muted.

**Toolbar pill** — floating white card with 22px radius, layered shadow, sticky 16px from top. Wordmark "Glotix —" with Fraunces italic em-dash accent in terracotta. Nav links are pill buttons with ink-fill active state.

## File map

| File | Purpose |
|---|---|
| [web/src/index.html](../web/src/index.html) | Google Fonts (Inter + Fraunces); page `<title>`. |
| [web/src/styles.scss](../web/src/styles.scss) | `mat.theme` + all token overrides + `.accent-italic`. |
| [web/src/app/app.html](../web/src/app/app.html) · [.scss](../web/src/app/app.scss) | Toolbar pill, nav pills, shell max-width 1120px. |
| [web/src/app/vocabulary/list/list.scss](../web/src/app/vocabulary/list/list.scss) | Landing eyebrow + card tables + section dot. |
| [web/src/app/vocabulary/summary/summary.scss](../web/src/app/vocabulary/summary/summary.scss) | Categorie list with sage-warm totals row. |
| [web/src/app/vocabulary/category/category.scss](../web/src/app/vocabulary/category/category.scss) | Cat-header (eyebrow + H1 + count-pill) + memorize-actions pills. |
| [web/src/app/vocabulary/memorized/memorized.scss](../web/src/app/vocabulary/memorized/memorized.scss) | Memorized summary with `.progress-track` + `.progress-fill` sage bar. |
| [web/src/app/vocabulary/memorized/category/category.scss](../web/src/app/vocabulary/memorized/category/category.scss) | Inner memorized category cat-header. |
| [web/src/app/shared/word-table/word-table.scss](../web/src/app/shared/word-table/word-table.scss) | Card-shell .table-wrap; all three text cells (`.italian-cell`, `.pron-cell`, `.translation-cell`) at 15.5px ink. Italian cell is weight 600, the other two are 400. |
| [web/src/app/stories/summary/summary.scss](../web/src/app/stories/summary/summary.scss) | Stories list card. |
| [web/src/app/stories/detail/detail.scss](../web/src/app/stories/detail/detail.scss) | Reading card with Fraunces italic terracotta H2; vocab tab with cat-actions. |
| [web/src/app/shared/memorize-deck/memorize-deck.scss](../web/src/app/shared/memorize-deck/memorize-deck.scss) | Focal practice card; Inter 700 terracotta front word; rounded comment input and pill action buttons. |
| [web/src/app/shared/repeat-deck/repeat-deck.scss](../web/src/app/shared/repeat-deck/repeat-deck.scss) | Same focal card; translation-only front in Inter 700 terracotta. |

## UI language

UI navigation, headers, buttons, and descriptions are in **English** — the interface speaks to the learner in their non-target language so navigation stays effortless. The learning content (Italian words, examples, story bodies, story titles) stays in Italian. `.accent-italic` accent words ("your", "all") and the Fraunces italic decorative em-dash in the wordmark are typographic devices, not Italian copy.

## Constraints

- Color scheme locked to `light` in [web/src/styles.scss](../web/src/styles.scss) `body { color-scheme: light }`. No dark theme path.
- All Angular Material components stayed (`mat-toolbar`, `mat-table`, `mat-button`, `mat-tab-group`, `mat-stroked-button`, `mat-flat-button`).
- TypeScript / routing / signals / services untouched by the redesign.

## Known cosmetic gap

- `.sage-action` class on the "Repeat" button in [vocabulary/category.html](../web/src/app/vocabulary/category/category.html) was meant to color it sage; Material 21's MDC tokens didn't accept the override at the class level, so the button renders terracotta-outlined like the other secondaries. Cohesive but not the sage planned. Fix would be `::ng-deep` or a stronger inner-selector override.
