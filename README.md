# GSR Case Manager

A local-only Windows desktop application for managing Genuine Student
Requirement (GSR) case preparation across multiple clients — see
[`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) for the full product and
technical specification.

Built with Electron + React + TypeScript, a local SQLite database, and
per-client file storage on disk. No cloud dependency for core features; AI
features (Google AI Studio / Gemini, added in a later phase) require
internet access.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

On first launch you'll be prompted to set an app password (§18/§19 of the
spec — a local password lock, no disk encryption). All data is stored under
Electron's per-OS `userData` directory: a `gsr-case-manager.sqlite3`
database plus a `ClientData/<clientId>/` folder per client for documents,
evidence, GSR drafts, and exports.

### Database schema changes

The schema lives in `src/main/db/schema.ts` (Drizzle ORM). After changing
it, generate a new migration:

```bash
$ npm run db:generate
```

Then add the new migration file's import to `src/main/db/migrations/index.ts`
(migration SQL is bundled into the app via Vite's `?raw` import rather than
read from disk at runtime, so it works identically in dev and in the
packaged app).

### Lint & typecheck

```bash
$ npm run lint
$ npm run typecheck
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Project status

Phase 1 (Foundation) is complete: app shell, local SQLite schema covering
the full data model, password lock, multi-client dashboard (add/delete/
search/sort/filter, status, stage, pending actions), and the client
workspace shell with 7-stage navigation. See §24 of the specification for
the full phased roadmap — later phases build out each stage's actual
workspace (documents, verification, evidence, GSR writing, AI, checklist).
