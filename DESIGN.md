# Keel design guidelines

Working name: Keel (placeholder). These rules come from the phase 1 app UI and the landing page. Read this file before building or changing any UI, and follow it over personal taste or library defaults.

References:
- Stack board: https://claude.ai/artifact/PvfGL8WCo6hbxAk6oKUqUR
- Landing page: https://claude.ai/artifact/ATVabXovPJkdWfvwjqtrMW
- Phase 1 code: `workspace-phase1.zip`

## Principles

1. **Quiet.** Neutral surfaces, one accent, almost no decoration. The content is the interface.
2. **Fast.** Everything is local and optimistic. No spinners for local writes, no confirm dialogs.
3. **Keyboard first.** Every action reachable without a mouse. Enter adds, Escape closes.
4. **One memorable thing per screen.** The launcher is the signature element. Everything around it stays plain.
5. **Plain words.** Say what happens. Sentence case. No cleverness.

## Color

Warm-neutral greys plus a single accent. Tokens below are canonical; Tailwind stone classes in the app map to the nearest value.

| Token | Hex | Use |
| --- | --- | --- |
| ground | `#FAFAF8` | Landing page background |
| surface | `#FFFFFF` | App main area, cards, inputs, floating windows |
| sidebar | `#F7F7F5` | Sidebar background (`stone-50` in the app) |
| hover | `#F1F0EC` | Row hover, highlighted launcher result, pill backgrounds |
| active | `#E9E8E4` | Selected nav row |
| hairline | `#E6E5E1` | Borders and dividers (`stone-200` in the app) |
| ink | `#1C1C1A` | Primary text, primary button, dark notification card |
| body | `#4A4A45` | Paragraph text |
| muted | `#5F5F59` | Meta text, keys, counts, secondary labels |
| accent | `#4F46E5` | The only brand color (`indigo-600`) |
| warning | `#D97706` icon, `#B45309` text | In progress status |

Accent alternatives available as a tweak on the landing page: teal `#0F766E`, orange `#C2410C`.

Rules:
- Accent is used sparingly: done status, commands in the launcher, the text caret, focus ring, logo mark, and text links. The primary button is ink, not accent.
- Text contrast is at least 4.5:1 (3:1 at 24px and up). Do not use lighter greys than `muted` for text.
- Never rely on color alone. Status is told apart by shape as well as color.
- No gradients, no tinted washes, no colored shadows.
- Dark mode is not designed yet. Do not improvise it; design it as its own pass.

## Typography

- **Geist** for UI and marketing. **Geist Mono** only for slash commands and keyboard keys. In the app, Geist ships through `@fontsource-variable/geist` (family name "Geist Variable"), so it works offline.
- Weights: 400, 500, 600 only.
- Sentence case everywhere. No all-caps labels, no eyebrow labels above headings, no tracked-out small caps.

| Role | Size / line height | Weight | Tracking |
| --- | --- | --- | --- |
| Landing hero h1 | 64 / 1.05 | 600 | -0.03em |
| Landing section h2 | 36 / 1.15 | 600 | -0.02em |
| App page title | 24 | 600 | tight |
| Landing lead paragraph | 20 / 1.55 | 400 | normal |
| Landing body | 17 / 1.6 | 400 | normal |
| App body and rows | 14 | 400 | normal |
| Meta (keys, counts, hints) | 12 to 13 | 400 or 500 | normal |
| Launcher input | 19 | 400 | normal |

- Keep paragraph width under about 80 characters (landing body max width 460px).
- Section labels inside the app (for example "Projects", "Todo lists", status group titles) are 14px, weight 500, `muted`, normal case.

## Layout and spacing

App:
- Sidebar 240px wide, hairline right border, `sidebar` background.
- Main content is centered, max width 768px (`max-w-3xl`), padding 32px horizontal and 40px vertical.
- Rows: 8px horizontal and 8px vertical padding, 12px gap between parts, hover background `#FAFAF8`-level (`stone-50`).
- Gap between page sections: 32px.

Landing page:
- Container max width 1120px, side gutter 32px.
- Vertical rhythm: 112 to 128px between major sections, 64px gaps in two-column feature rows.
- Left-aligned text. Two-column rows wrap to one column on narrow widths (`flex-wrap` with 380 to 460px basis).
- Pages must work at phone width. Wide content scrolls inside its own box.

## Shape and depth

| Element | Radius |
| --- | --- |
| Floating launcher | 16 |
| App window, cards | 14 |
| Notification card | 18 |
| Buttons | 10 |
| Inputs | 8 to 10 |
| Nav rows | 6 to 8 |
| Key chips, small tags | 5 to 6 |
| Pills | 999 |

- Use a border, not a shadow, to define cards and inputs.
- Shadows are reserved for surfaces that float above others: the app window mock, the launcher, notifications. One soft shadow, never stacked.
- Do not apply one radius to everything. Radius follows size.

## Components

**Status icon.** 16px, five states, cycled by click: backlog (dashed ring), todo (ring), in progress (ring with half fill, amber), done (filled with check, accent), canceled (ring with x). Order: Backlog, Todo, In progress, Done, Canceled. Always include an accessible label with the current status and "Click to change".

**Priority.** Text label, cycled by click: No priority, Urgent, High, Medium, Low. "No priority" stays hidden until the row is hovered or focused.

**Issue row.** Status icon, key and number (`WEB-14`, muted, fixed width), title (truncates), priority, delete. Grouped under status headings with a count.

**Todo row.** Native checkbox (accent colored), title (struck through and muted when done), delete. Done items sort to the bottom.

**Sidebar row.** Name, optional muted hint (project key), delete on hover. Selected row uses `active` at 70% opacity and `aria-current="page"`.

**Add input.** Full-width input at the top of a view, placeholder says what it does and how to submit ("Add an issue and press Enter"). Sidebar adds use a `+` button that reveals an inline input; Escape cancels.

**Delete button.** Hidden until row hover or focus. First click arms it ("Delete?" on a red-tinted background), second click deletes, losing focus disarms. No confirm dialogs.

**Primary button.** Ink background, white text, 10px radius, 15px vertical and 26px horizontal padding, weight 500. **Secondary:** hairline-weight ink border, or a plain accent text link.

**Launcher.**
- Frameless, centered, about 640px wide, 16px radius, floating shadow.
- One input at the top. Slash commands render in Geist Mono, weight 500, accent color; the argument text is normal ink. A 2px accent caret.
- Results sit under a hairline divider. The highlighted result uses `hover` background with a muted `Enter` key chip. Each result is: command (mono), one-line description (body color).
- Closes on Escape, on blur, and after a successful command.

**Notification card (phone).** Ink background, white title, `#D9D9D3` body, `#BDBDB7` meta. The only dark surface; use it only for notifications.

## Interaction

- Optimistic updates: change the UI first, persist after.
- Motion answers a user action (open, close, confirm). No entrance animations, no scroll reveals, no hover-lift on cards. Honor `prefers-reduced-motion`.
- Keyboard focus is always visible: 2px accent outline with 2px offset.
- Icon-only buttons have an `aria-label`. Inputs have labels or `aria-label`. Use real `button`, `a`, and `input` elements, never clickable divs.
- Hit targets on the landing page are at least 44px tall. Dense app rows may be smaller but must stay fully clickable.

## Writing

- Plain verbs, active voice, sentence case, no filler.
- Name things the way users do: "todo list", "issue", "project". Not "entity" or "record".
- The same action keeps the same name everywhere ("Add", "Delete").
- Empty states point to the action: "No issues yet. Add the first one above." "Nothing to do here. Add a todo above."
- Errors say what went wrong and how to fix it, with no apology. Example: "Type what to add after /todo."
- Command descriptions are one short line: "Add to your Inbox", "Send to opencode".
- No emoji, no arrow glyphs in button text, no middle-dot strings, no exclamation marks, no invented statistics.

## Avoid

- Cream backgrounds with serif headlines and clay accents.
- Near-black pages with a single neon accent.
- Gradient washes and glassmorphism.
- Grids of identical rounded cards, left-border accent cards, the same shadow under everything.
- Inter, Roboto, Arial as the face of the product.
- Numbered markers (01, 02, 03) unless the content really is a sequence.
- Accenting a single word in a headline.
- Decorative icons that carry no information.

## Open items

- Real app name and logo mark (currently "Keel" and a plain accent square).
- Dark theme.
- App window chrome (title bar, window controls) and tray icon.
- Settings screen, issue detail view, and title editing.
- Real screenshots to replace the mock composition on the landing page once phase 2 and 3 exist.
