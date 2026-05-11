# Glotix

Italian language-learning app for Russian-speaking learners (currently: Italian A2 vocabulary).

## Commands

- Start dev server (web): `npm --prefix web start` → http://localhost:4200
- Build (web): `npm --prefix web run build`
- Test (web): `npm --prefix web test`
- Regenerate vocabulary JSON from CSVs: `npm --prefix web run build:vocab`
- Start API (currently paused): `npm --prefix api run start:dev`

## Stack

- **Frontend** — Angular 21 standalone + Angular Material 21 (azure-blue palette, **light** color scheme) + Signals, in `web/`. TypeScript strict mode with `strictTemplates: true`.
- **Backend** — NestJS 11 + TypeORM + better-sqlite3 (dev) / Postgres (prod), scaffolded in `api/`. Currently paused — nothing in the Angular app calls it.
- **Static data** — Files under `web/public/` are served at the URL root (e.g. `web/public/assets/x.json` → `/assets/x.json`).

## Conventions

- Standalone Angular components only — no NgModules.
- Component files use short names without the `.component` suffix: `summary.ts`, not `summary.component.ts`.
- Code style: Prettier (`printWidth: 100`, `singleQuote: true`, Angular parser for `.html`). Config at [web/.prettierrc](web/.prettierrc).
- Color scheme is locked to **light** at `web/src/styles.scss:26`. Do not switch to `dark` or `light dark`, and do not add `prefers-color-scheme: dark` overrides.
- Vocabulary source of truth: CSVs at `docs/words/italian/a2/`. The Angular app reads `web/public/assets/vocabulary-italian-a2.json`, generated from those CSVs by `web/scripts/build-vocabulary.mjs`. Regenerate via `build:vocab` after changing CSVs.

## Docs

Feature reference docs live in `docs/`. See:

- [docs/initial-stack-scaffolding.md](docs/initial-stack-scaffolding.md) — stack overview, dev commands.
- [docs/vocabulary-viewer.md](docs/vocabulary-viewer.md) — vocabulary feature reference (routes, data flow, JSON shape).
