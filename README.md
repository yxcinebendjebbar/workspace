# Phase 1: core and data

Overlay for a fresh Tauri 2 + React + TypeScript project.

## Setup

Prerequisites on Windows: Rust (rustup), Visual Studio C++ Build Tools, Node 20+. WebView2 ships with Windows 11.

```bash
npm create tauri-app@latest workspace
# choose: TypeScript / JavaScript > pnpm or npm > React > TypeScript

cd workspace
npm i zustand drizzle-orm @tauri-apps/plugin-sql @fontsource-variable/geist
npm i -D tailwindcss @tailwindcss/vite
cargo add tauri-plugin-sql --features sqlite --manifest-path src-tauri/Cargo.toml
```

Copy this folder's contents over the project (overwrite when asked):

- `vite.config.ts`
- `src/` (delete the template's `src/App.css` and `src/assets/` afterwards)
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/migrations/0001_init.sql`

Then:

```bash
npm run tauri dev
```

The database file `workspace.db` is created in the app data directory on first run.

## What is in here

- `src-tauri/migrations/0001_init.sql`: projects, issues, todo lists, todos, plus a default `inbox` list
- `src/db/`: Drizzle schema, a sqlite-proxy client over `tauri-plugin-sql`, and all queries
- `src/store.ts`: Zustand store (navigation, data, actions)
- `src/views/`: issues grouped by status, todo list
- `src/components/`: sidebar, status icon, two-click delete

## Notes for the next phases

- `addTodo(listId, title)` in `src/db/queries.ts` is the function the launcher's `/todo` command will call. The `inbox` list always exists.
- Schema changes go in new migrations (`0002_*.sql`) added to the `vec![]` in `lib.rs`. Never edit `0001`.
- The launcher window will be a second Tauri window sharing the same database file.
