# Glotix — stack reference

**Implemented 2026-05-11. Updated 2026-05-11 — API put on hold; Angular-only mode.**

## Current state

- **Frontend** — Angular 21 standalone + Angular Material 21 (azure-blue theme) + Signals, running on port 4200.
- **Backend** — NestJS 11 + TypeORM + better-sqlite3 + pg scaffolded in [`api/`](../api) but **paused**. Nothing in the Angular app calls it.
- **Static data pattern** — Files dropped under [`web/public/`](../web/public) are served at the URL root (e.g. `public/words.json` → `http://localhost:4200/words.json`).

## Local dev

```
# Web only — http://localhost:4200
npm run --prefix web start
```

## When the API resumes

The `api/` folder is scaffolded with an env-driven DB driver (`better-sqlite3` for dev → `postgres` for prod). To restart it:

```
npm run --prefix api start:dev
```

Postgres swap (when ready): set `DB_DRIVER=postgres` plus `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASS`/`DB_NAME` in the api env, flip `synchronize: false` in [`api/src/app.module.ts`](../api/src/app.module.ts), generate the first migration via `typeorm migration:generate`. Entity column types stay portable if you keep to `varchar`, `text`, `int`, `boolean`, `timestamp`, `decimal`, `uuid`.

## Suggestions — not in scope, want any of these added?

- Wire the German A2 CSVs at [`docs/words/a2/`](words/a2) into JSON under [`web/public/`](../web/public) + an Angular service that loads them
- Docker Compose for Postgres (for when API resumes)
- i18n setup on the frontend
- State management library (NgRx Signals Store)
- CI workflow
- `@nestjs/swagger` for OpenAPI docs when API resumes
