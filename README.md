# checklist-wallpaper

A Windows CLI that manages a categorized checklist and renders it as your desktop
wallpaper in an Excalidraw-like hand-drawn style (rough.js strokes + Virgil font,
dark-mode with switchable terminal/neovim palettes).


## Install

```powershell
npm install
npm link          # exposes the `todo` command globally
```

Everything lives in `dist/` in this project (gitignored):

- `sets/<name>.json` — your checklists as named **sets** (e.g. `Personal`, `Work`)
- `config.json` — active set, theme, screen resolution, layout margins
- `wallpaper-*.png`, `wallpaper.svg`, `wallpaper.excalidraw` — rendered output
  (each render is a fresh timestamped PNG because Windows locks the file while
  it's the active wallpaper)

Every command operates on the active set — `todo set switch work` swaps and refreshes.
On first run the checklist seeds the 5 categories from `To be Done.excalidraw`.

## Commands

| Command | Description |
|---|---|
| `todo list` | Show the checklist (struck items dimmed) |
| `todo set` | List named sets (active marked) |
| `todo set new <name>` | Create an empty set (e.g. `todo set new Work`) |
| `todo set switch <query>` | Fuzzy-switch active set + refresh wallpaper |
| `todo set rename <query> <new name>` | Rename a set |
| `todo set rm <query> [--yes]` | Delete a set (asks to confirm) |
| `todo add "<text>" [--cat <query>]` | Add an item; fuzzy category or interactive picker |
| `todo rm <query> [--cat <query>]` | Remove item(s) — fuzzy, or a number within a category (`todo rm 2 --cat job`) |
| `todo edit <n> "<new text>" [--cat <query>]` | Edit an item's text by its number (`todo edit 2 "New text" --cat job`) |
| `todo cat add "<name>"` | Add a category |
| `todo cat rm <query> [--yes]` | Remove a category (asks to confirm) |
| `todo cat swap <a> <b>` | Swap the display order of two categories (fuzzy names) |
| `todo hide [query]` | Hide a category from the wallpaper (keeps its items; fuzzy or picker) |
| `todo unhide [query]` | Show a hidden category again |
| `todo tick <query> [--cat <query>]` | Fuzzy-tick item(s) → strikethrough + wallpaper refresh |
| `todo untick <query> [--cat <query>]` | Remove strikethrough |
| `todo clean [--cat <query>]` | Delete all struck-through items, renumber, refresh |
| `todo theme` | List themes with color swatches |
| `todo theme <name>` | Apply a preset theme |
| `todo theme custom <bg> <fg> [--dim c] [--accent c]` | Custom palette (quote `#hex` in PowerShell!) |
| `todo render` | Force re-render + set wallpaper |
| `todo export [-o file]` | Write an `.excalidraw` scene (open in your local Excalidraw) |

### Fuzzy selection

`tick`/`untick` take a fuzzy query (fzf-style subsequence) instead of numbers:

```powershell
todo tick leetcode                 # unambiguous → ticks immediately
todo tick "aws cert"
todo tick bids --cat upwork        # restrict to a category
todo tick setup                    # ambiguous → interactive multi-select picker
```

### Themes

Presets: `mono`, `gruvbox` (default), `nord`, `catppuccin-mocha`, `tokyo-night`,
`dracula`, `one-dark`, `rose-pine`, `solarized-dark`, `kanagawa`, `everforest`.

Each theme defines `background` / `fg` (text + strokes) / `dim` (struck items) /
`accent` ("Requirements:" labels).

## How it renders

1. `src/layout.js` computes a 3-over-2 section grid anchored to the **right** of the
   screen (left ~30% stays clear for desktop icons), with text wrapping and font
   auto-shrink if a section overflows its row.
2. `src/render.js` builds an SVG: `roughjs` hand-drawn rounded rectangles and
   strikethrough lines, text in the Virgil font (`assets/fonts/Virgil-Regular.ttf`).
3. `src/wallpaper.js` rasterizes with `@resvg/resvg-js` at native screen resolution
   (auto-detected, overridable via `width`/`height` in `config.json`) and sets it as
   the wallpaper.

`todo export` maps the same layout into a real `.excalidraw` scene (fontFamily 5,
roundness type 3 rectangles) that you can open at your local Excalidraw instance.

## Notes

- In PowerShell, quote hex colors: `todo theme custom '#282828' '#d5c4a1'`
  (`#` starts a comment otherwise).
- Interactive pickers require a TTY; in scripts/non-interactive shells ambiguous
  queries fail with a list of matches so you can refine them.
