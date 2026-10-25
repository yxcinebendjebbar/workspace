# AGENTS.md

Instructions for AI coding agents (opencode, Antigravity, Cursor, or any other) working on this repository. Read this file and `DESIGN.md` completely before writing code. If your tool does not load `AGENTS.md` automatically, you are being pointed at it explicitly: follow it anyway.

## 1. What this project is

A desktop workspace app (working name: Keel) that combines:

- **Projects, issues, and todo lists** (Linear-style, local-first).
- **A global launcher** with slash commands (Flow Launcher-style). `/todo` adds a todo, `/prompt` sends text to opencode.
- **An opencode bridge** that sends prompts to opencode and tracks sessions.
- **A phone link** (Phone Link-style) for notifications (for example, "opencode finished") and file sharing between phone and PC.

Goals, in priority order: correct, fast, minimal and clean UI, small and readable code.

## 2. Source of truth

| Topic | File |
| --- | --- |
| Look, feel, components, copy | `DESIGN.md` |
| Architecture, conventions, phases | this file |
| Existing schema | `src-tauri/migrations/*.sql` and `src/db/schema.ts` |

If these conflict with your own preferences, they win. If they conflict with each other or are silent on something that matters, stop and ask the human (see section 12). Do not guess.

## 3. Tech stack (fixed, do not swap)

| Layer | Choice |
| --- | --- |
| Desktop shell | Tauri 2 (Rust kept thin) |
| UI | React, TypeScript (strict), Vite, Tailwind CSS v4 |
| State | Zustand |
| Local data | SQLite through `tauri-plugin-sql`, queried with Drizzle ORM (`sqlite-proxy`) |
| Launcher | Second frameless Tauri window, command registry in TypeScript |
| opencode | opencode server mode plus its official JS SDK |
| Phone relay | Hono on Cloudflare Workers, Durable Objects (WebSocket), R2 for files |
| Phone client | Installable PWA with web push and share target |
| Validation | Zod at every trust boundary |
| Lint and format | Biome (if the repo already has ESLint and Prettier configured, keep those instead) |
| Tests | Vitest for TypeScript, `cargo test` for Rust |

Do not add a dependency unless the task cannot reasonably be done without it. Prefer the platform and the libraries above. When you do add one, say why in the commit message.

## 4. Repository layout

```
/
  AGENTS.md
  DESIGN.md
  package.json
  index.html                     main window entry
  launcher.html                  launcher window entry
  vite.config.ts                 multi-page build (index + launcher)
  src/
    main.tsx  App.tsx  store.ts  index.css
    components/                  shared presentational components
    views/                       one file per main-window view
    lib/                         pure helpers and constants (no I/O)
    db/                          schema.ts, client.ts, queries.ts (all SQL lives here)
    launcher/
      main.tsx  Launcher.tsx
      commands/                  one file per command, plus index.ts registry
      parse.ts                   input parser (pure, unit tested)
    opencode/                    bridge: client, session store, event handling
    relay/                       app-side relay client (WebSocket, pairing)
  shared/
    protocol.ts                  Zod schemas and types shared by app and relay
  relay/                         Cloudflare Worker (own package.json and wrangler config)
  phone/                         PWA (served by the Worker as static assets)
  src-tauri/
    migrations/                  numbered SQL migrations
    capabilities/                least-privilege permission files
    src/lib.rs                   plugins, window and tray setup
```

Keep this layout. New top-level folders need a reason.

## 5. Commands

Agents must be able to run these. If a script is missing, add it in the first change that needs it.

```bash
npm install
npm run dev            # vite only
npm run tauri dev      # full desktop app
npm run typecheck      # tsc --noEmit
npm run lint           # biome check
npm run test           # vitest run
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build    # release smoke test before finishing a phase
```

Before you call any task done, `typecheck`, `lint`, `test`, and `clippy` must pass with zero warnings. If you cannot run a command in your environment, say so explicitly instead of claiming it passes.

## 6. Code quality rules

General:
- TypeScript `strict` on. No `any`, no `@ts-ignore`, no non-null assertions without a comment explaining why it is safe.
- Small modules with one job. Functions do one thing. Prefer early returns over nesting.
- One React component per file. Components render and dispatch; they do not contain SQL or business rules.
- All SQL goes through `src/db/queries.ts`. Components and views never import `drizzle-orm` or `db` directly.
- Derive state instead of duplicating it. Do not store what you can compute.
- No dead code, no commented-out code, no TODOs without an issue or a note in section 10.
- Names say what things are. No abbreviations except well-known ones (`id`, `db`, `url`).
- Comments explain why, not what.

Performance:
- Select the smallest slice from Zustand (`useStore((s) => s.x)`), never the whole store.
- Optimistic UI for local writes. Persist after updating state; reload only when order or derived data changes.
- Add an index for every column you filter or sort on in a query. Check for N+1 patterns.
- Do not virtualize lists until a real view exceeds a few hundred rows; then use a small virtualization library.
- Keep the launcher window light: it must show in well under 100 ms. Do not import the main app bundle into it. Keep its entry minimal.
- Lazy-load anything heavy (rare views, QR code generation, the opencode SDK in the main window if the launcher does not need it).

Errors:
- Never swallow errors. Catch at boundaries (command run, relay message, opencode call), convert to a short user-facing message, and show it using the patterns in `DESIGN.md` (plain words, say how to fix it).
- Typed results for expected failures (for example `{ ok: false, message }`). Throw only for programmer errors.
- Log with context, never log secrets, tokens, or file contents.

Rust:
- Rust stays thin: plugin registration, window and tray management, global shortcut, process management for opencode. No business logic in Rust.
- No `unwrap` or `expect` outside startup code and tests. Propagate errors with `?`.
- `cargo clippy -D warnings` clean. Format with `cargo fmt`.

## 7. Data rules

- Schema changes are new numbered migrations (`0002_*.sql`, `0003_*.sql`) added to the migration list in `lib.rs`. Never edit an applied migration.
- Keep `src/db/schema.ts` in lockstep with migrations. A schema change touches both in the same commit.
- IDs are UUID strings generated in the app (`crypto.randomUUID()`). Timestamps are integer milliseconds.
- Deleting a parent cascades. Do not hand-delete children.
- Both windows share one database through the same plugin. After any write from the launcher, emit a `data-changed` Tauri event so the main window reloads.

## 8. Security rules

- Capabilities are least privilege. Each window lists only the permissions it needs. Do not use wildcard permissions.
- Set a strict Content Security Policy in `tauri.conf.json`. No remote scripts, no remote content in the app windows.
- Shell access is limited to launching and talking to `opencode`, scoped by name and arguments. No arbitrary command execution from the UI.
- The relay:
  - HTTPS and WSS only.
  - Pairing uses a short-lived one-time code (shown as a QR code on the PC). The phone exchanges it for a per-device token. Tokens are stored hashed on the server.
  - Validate every message with the Zod schemas in `shared/protocol.ts`. Reject unknown shapes.
  - Rate limit pairing and message endpoints. Enforce file size limits and expiry (R2 objects expire automatically).
  - The PC connects outbound to the relay. Never open inbound ports on the user's machine.
- Never commit secrets. Use `.env` locally and Wrangler secrets for the Worker. Keep `.env*` in `.gitignore`.

## 9. Build plan (phases)

Work one phase at a time, in order. Finish and verify a phase fully before starting the next. Use a branch per phase and conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).

### Phase 0: hygiene (do first)
- [x] Add Biome (or confirm ESLint and Prettier), `typecheck`, and `test` scripts. Add Vitest.
- [x] Add `.gitignore` entries, a strict CSP, and tidy the template leftovers.
- [x] Set window title and a sensible default size and minimum size.

### Phase 1: core and data (done, then extend)
Delivered: SQLite schema, projects, issues, todo lists, todos, sidebar, issue and todo views. Extend before moving on:
- [x] Edit issue title inline, and add an issue detail view with description editing.
- [x] Rename projects and todo lists.
- [x] Unit tests for `lib/constants.ts` helpers and for store actions (mock the queries module).

### Phase 2: launcher
- [x] Add `tauri-plugin-global-shortcut`. Default shortcut `Ctrl+Space`, falling back to `Alt+Shift+Space` if registration fails. Configurable from Settings (done in the UI shell pass).
- [x] Declare a hidden, frameless, always-on-top, centered `launcher` window (about 640 by 400, not resizable, hidden from the taskbar). Add it to the capability's `windows`.
- [x] Add `launcher.html` and `src/launcher/main.tsx` as a second Vite entry. It reuses `src/db` and `index.css`.
- [x] In Rust, toggle the window on shortcut: if visible, hide; otherwise center, show, focus, and emit `launcher-opened` so the input clears and focuses.
- [x] Hide on Escape, on blur (without firing during the initial show), and after a successful command.
- [x] Closing the main window hides it instead of quitting. Add a tray icon with "Open" and "Quit".
- [x] Command registry: each command is a module exporting `{ trigger, title, description, argHint, run(args) }` returning `{ ok: true, message } | { ok: false, message }`. `parse.ts` splits input into trigger and args; unit test it thoroughly.
- [x] Launcher UI per `DESIGN.md`: input, filtered command list on `/`, arrow keys and Enter, result line.
- [x] `/todo <text>` calls `addTodo(defaultTodoList, text)`, falling back to Inbox when that list is gone, shows "Added to <list name>", then hides. Empty text shows the usage hint and writes nothing.
- [x] `/prompt` registered as disabled with "Coming in phase 3".
- [x] After launcher writes, emit `data-changed`; the main window listens and reloads todos and lists.
- Acceptance: shortcut works while another app is focused; launcher opens centered with an empty focused input; Escape and click-away hide it; `/todo buy milk` appears in the Inbox without refresh; closing the main window leaves tray and shortcut working; Quit from the tray exits fully.

### Phase 3: opencode bridge
Before writing any code, read the current opencode documentation (server mode and the JS SDK). Do not guess endpoints, event names, or types. If the docs and this file disagree, the docs win; tell the human.
- [x] Detect an opencode install. If missing, show a clear message with how to install it.
- [x] Start opencode's shared background service when it is not running, and reuse it when it is. Keel never runs a private server and never stops the service, because every other opencode client on the machine shares it. A loopback address in Settings overrides discovery. (Approved change to the original item, which had Keel own a child process.)
- [x] Create `src/opencode/` with a typed client wrapper over the SDK, a Zustand slice for sessions (id, title, status, started, finished), and an event subscription that updates it.
- [x] Enable `/prompt <text>`: continues the newest session in the configured project directory, or starts one there; show "Sent to opencode".
- [x] Add a Sessions view in the main window listing running and finished sessions (use the pill styles in `DESIGN.md`).
- [x] Emit an internal `opencode:finished` event when a session completes, for phase 4 to forward.
- [x] Settings needed: project directory, optional server URL. The `settings` table already exists (migration `0002`), so keys went into it rather than into a new migration for settings alone.
- [x] Rust resolves the CLI and the service registration and hands the renderer a URL and a password; the renderer then talks to opencode over HTTP itself. No window needs a shell permission for opencode, because nothing user-typed ever reaches a command line.
- Acceptance: `/prompt` starts work in opencode; the Sessions view shows progress and completion; quitting the app leaves the shared service running, because it is not Keel's to stop.
- For phase 4: only a window that is watching a server hears `opencode:finished`, and today the Sessions view is what starts the watch. Phase 4 must watch from the main window as soon as it connects, so a notification does not depend on the Sessions view being open.

### Phase 4: phone link
- [x] Create `shared/protocol.ts` with Zod schemas for all relay messages (pairing, notify, file offer, file received, ack). Version the protocol.
- [ ] `relay/`: Hono Worker with routes for pairing and file upload and download; a Durable Object per paired workspace that holds the WebSocket from the PC and fans messages to the phone; R2 for files with automatic expiry; per-device tokens.
- [ ] Notifications: implement Web Push for the PWA using a Workers-compatible Web Push implementation (verify it runs on the Workers runtime). If that proves impractical, stop and ask the human before substituting a different push service. Web Push is viable on Workers: plan on `@block65/webcrypto-web-push` v2 (Web Crypto only, one pure dependency, `aes128gcm` and VAPID). Confirm it with a real push once the Worker is deployed.
- [ ] `phone/`: PWA with a manifest, service worker, pairing screen (opens from the QR code), notification permission flow, a file send screen, a received-files list, and a Web Share Target so files can be shared to it from other phone apps. Styling follows `DESIGN.md`.
- [ ] App side (`src/relay/`): Pairing screen showing a QR code (lazy-loaded), connection status, an outbound WebSocket with reconnect and backoff, and a send-file action. Forward `opencode:finished` as a notification.
- [ ] Receive files from the phone into a configurable folder (default: Downloads), then show a notice in the app.
- Acceptance: pair by scanning the QR code; finishing an opencode task shows a notification on the phone; a file sent from the phone lands on the PC and the reverse works; revoking a device from the app disconnects it.

### Phase 5: polish and release
The Settings screen, the dark theme, the title bar, and the theme and shortcut settings already exist from the UI shell pass; what is left here:
- [ ] Settings entries that need phase 3 or 4 behind them: project directory, received-files folder, paired devices.
- [ ] More launcher commands only when asked by the human.
- [ ] App icon, final name, installer, code signing, and `tauri-plugin-updater` with a signed update feed.
- [ ] Replace the mock composition on the landing page with real screenshots.

## 10. Known open items (ask before deciding)

- Final app name and logo.
- Launcher shortcut default (currently `Ctrl+Space`).
- The sidebar's Sign in row is a placeholder until phase 4; it names the phase it arrives in and shows no content or counts yet.
- Push strategy for the phone if Web Push on Workers is not viable.
- Relay domain and Cloudflare account setup (the human provides credentials and secrets).
- Whether sync across multiple PCs is wanted (not planned; local-first only for now).

## 11. Working agreement

1. Read `AGENTS.md` and `DESIGN.md`. State which phase and checklist items you are doing.
2. Make a short plan, then implement in small, reviewable commits.
3. Match existing patterns before inventing new ones. Reuse components and helpers.
4. Run the checks in section 5. Fix everything you introduced.
5. Update the checklist items you completed in this file, and update `DESIGN.md` if you changed UI conventions.
6. Report what changed, what you verified, what you could not verify, and any decisions the human needs to make.

Do not:
- Skip ahead to a later phase.
- Rewrite working code for style alone.
- Invent APIs, flags, or event names for opencode, Tauri, or Cloudflare. Check the docs.
- Add features, settings, or commands nobody asked for.
- Leave the app in a state that does not build.

## 12. When to stop and ask the human

- Requirements conflict, or a rule here would force a worse result.
- A required credential, domain, or account is missing.
- A dependency or architecture change seems necessary.
- You are about to delete data, change a migration that already shipped, or loosen a security rule.

Ask one clear question with your recommended default, then continue with unrelated work while waiting.
