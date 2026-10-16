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

Warm-neutral greys plus a single accent. The app paints from the semantic tokens below (CSS variables in `src/index.css`), never from raw Tailwind palette classes, so both themes stay honest. `stone-*` appears only in the landing page mocks.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| ground | `#FAFAF9` | `#141413` | Page background, sidebar, title bar |
| surface | `#FFFFFF` | `#1C1C1A` | App main area, cards, inputs, panels |
| ink | `#1C1C1A` | `#F2F2EF` | Primary text, primary button, toggle on-state |
| body | `#4A4A45` | `#C9C8C2` | Paragraph text, row text |
| muted | `#5F5F59` | `#98968E` | Meta text, keys, counts, secondary labels |
| hairline | `#E6E5E1` | `#33322E` | Borders and dividers |
| hover | `#F1F0EC` | `#262523` | Row hover, highlighted launcher result |
| active | `#E9E8E4` | `#302F2C` | Selected nav row, selected segment |
| accent | `#4F46E5` | `#818CF8` | The only brand color |
| warn | `#D97706` | `#FBBF24` | In progress status |
| danger | `#B91C1C` | `#F87171` | Armed delete, reset, close button hover |

The dark palette is the same warm neutrals shifted down, with ink and surface swapped. Nothing else moves: the accent is lifted one step in each hue so it keeps 4.5:1 against the dark ground.

Accent is a Settings choice, applied as `data-accent` on `<html>`:

| Accent | Light | Dark |
| --- | --- | --- |
| Indigo (default) | `#4F46E5` | `#818CF8` |
| Teal | `#0F766E` | `#2DD4BF` |
| Orange | `#C2410C` | `#FB923C` |

Theme is `data-theme` on `<html>`: `light`, `dark`, or `system`, where `system` follows the OS while the app runs. Both windows paint it; the main window paints the saved value, and every window paints the system value first so a dark machine never flashes white.

`color-scheme` follows the palette as well, so the chrome the engine draws itself — scrollbars, the todo checkbox, the caret — is dark on a dark window instead of staying light. The two rules weigh the same, so the light default is declared above the dark block on purpose.

Rules:
- Accent is used sparingly: done status, commands in the launcher, the text caret, focus ring, and text links. The primary button is ink, not accent.
- Text contrast is at least 4.5:1 (3:1 at 24px and up). Do not use lighter greys than `muted` for text.
- Never rely on color alone. Status is told apart by shape as well as color.
- No gradients, no tinted washes, no colored shadows.
- Do not invent colors in a component. Add a token here first, then use it.

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
- The window has no system title bar. A 36px drag bar sits on top, painted in `ground` with a hairline bottom border, the app name at the left and the three window controls at the right (44px wide each, `muted` glyphs). Minimize and maximize/restore hover to `hover`; close hovers to `danger` with a `surface` glyph. Closing hides the window to the tray unless Settings turned that off.
- Sidebar 240px wide, hairline right border, `ground` background.
- Main content is `surface`, centered, max width 768px (`max-w-3xl`), padding 32px horizontal and 40px vertical.
- Rows: 8px horizontal and 8px vertical padding, 12px gap between parts, hover background `hover`.
- Gap between page sections: 32px.
- The launcher is a separate frameless window and is not draggable: it is centered on every open and hides on blur, so it never needs moving.

Landing page:
- Container max width 1120px, side gutter 32px.
- Vertical rhythm: 112 to 128px between major sections, 64px gaps in two-column feature rows.
- Left-aligned text. Two-column rows wrap to one column on narrow widths (`flex-wrap` with 380 to 460px basis).
- Pages must work at phone width. Wide content scrolls inside its own box.

## Shape and depth

| Element | Radius |
| --- | --- |
| Floating launcher | 16 |
| App window, cards, dialogs | 14 |
| Notification card | 18 |
| Buttons (footer scale) | 10 |
| Buttons (row scale), inputs, segmented | 8 |
| Nav rows | 6 to 8 |
| Key chips, small tags | 5 to 6 |
| Pills, toggles | 999 |

- Use a border, not a shadow, to define cards and inputs.
- Shadows are reserved for surfaces that float above others: the app window mock, the launcher, notifications. One soft shadow, never stacked; it is the `--shadow-float` token, used by the launcher and dialogs. Do not reach for `shadow-lg`, which is two shadows.
- Do not apply one radius to everything. Radius follows size.

## Components

**Status icon.** 16px, five states, cycled by click: backlog (dashed ring), todo (ring), in progress (ring with half fill, amber), done (filled with check, accent), canceled (ring with x). Order: Backlog, Todo, In progress, Done, Canceled. Always include an accessible label with the current status and "Click to change". The tone colours the icon only: status text beside it uses `body`, because `text-muted/70` and amber would not both clear 4.5:1 as text. The shape carries the difference, not the colour.

**Priority.** Text label, cycled by click: No priority, Urgent, High, Medium, Low. "No priority" stays hidden until the row is hovered or focused.

**Issue row.** Status icon, key and number (`WEB-14`, muted, fixed width), title (truncates), priority, delete. Grouped under status headings with a count.

**Todo row.** Native checkbox (accent colored), title (struck through and muted when done), delete. Done items sort to the bottom.

**Sidebar row.** Name, optional muted hint (project key), delete on hover. Selected row uses `active` at 70% opacity and `aria-current="page"`. A row that belongs to an unbuilt phase (Sessions, Sign in) is `muted`, not clickable, and carries a one-line note such as "Comes in phase 3" instead of a hover tooltip.

**Section label.** 14px, weight 500, `muted`. Used for sidebar sections, issue status groups, and the two Daily lists. A count follows the label in normal weight.

**Add input.** Full-width input at the top of a view, placeholder says what it does and how to submit ("Add an issue and press Enter"). Sidebar adds use a `+` button that reveals an inline input; Escape cancels.

**Delete button.** Hidden until row hover or focus. First click arms it ("Delete?" on a `danger`-tinted background), second click deletes, losing focus disarms. No confirm dialogs. In a dialog footer it is visible from the start.

**Primary button.** Ink background, `surface` text, 10px radius, 15px vertical and 26px horizontal padding, weight 500. **Secondary:** hairline-weight ink border, same metrics. **Row-scale:** the same two at 8px radius with 6px and 12px padding, for settings rows and inline editors.

**Toggle.** 44 by 24 track, pill radius, `ink` when on and `active` when off, with a `surface` knob that slides 20px. Ink, not accent. A toggle that belongs to an unbuilt phase is `disabled` at 40% opacity.

**Segmented.** Real radio inputs in a hairline-bordered pill, 8px radius, 2px inset. The chosen segment uses `active` with weight 500; the others are `muted`. Used for theme, accent, and server mode.

**Dialog.** A panel over the page, not a new window. Backdrop is `ink` at 30% and is a real button labelled "Close"; the panel is `surface`, 14px radius, hairline border, 24px padding, 16px/600 title, and one soft shadow (it floats). Escape closes it and a click on the backdrop closes it; Tab stays inside. The first focusable control takes focus on open.

**Issue modal.** One issue, opened by clicking its row. View mode first: status icon with its label, priority label, title at 18px/600, description in `body` (or "No description yet."). **Edit** swaps the body for a form of title, description, status and priority, and writes only on **Save**; Escape leaves the edit, not the issue. Titles are edited here, not in the row.

**Settings.** A page of groups. Each group is a 14px-radius hairline card on `surface`, divided by hairlines, with a 16px/600 title and one muted line saying what the group does. A row is a label with an optional muted description on the left and its control on the right. Groups for a phase that is not built yet are shown, with their controls disabled and one line saying which phase they arrive in.

**Daily view.** The home screen and the first screen a new user sees. Quick add at the top, then "Inbox" and "In progress" groups with counts, then one muted line about the launcher shortcut. With no project yet it becomes "Start with a project": one input plus three plain tips (the shortcut, `/todo`, click an issue's status icon).

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
- Tray icon artwork (the tray uses the default icon for now).
- Real screenshots to replace the mock composition on the landing page once phase 2 and 3 exist.
