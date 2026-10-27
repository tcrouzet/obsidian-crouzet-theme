# Ultra Minimal

![Ultra Minimal by tcrouzet — Solarized light and dark writing interfaces](doc/cover.png)

Minimal isn't minimal enough. Ultra Minimal turns Obsidian into a Ulysses-like writing environment for long-form texts, with Solarized colors.

Ultra Minimal is also lighter in code: about 20 KB of CSS, compared with roughly 270 KB for Minimal.

Ultra Minimal handles interface hiding itself, making a plugin such as Hider unnecessary for a distraction-free writing workspace.

Notes use Menlo at `23px` by default, with Consolas, DejaVu Sans Mono and monospace fallbacks. The text column is limited to `750px`. The explorer and command ribbon share the editor background. Interface and code fonts follow Obsidian's settings.

## Interface visibility

The following elements stay hidden:

- The note header, including its file name, breadcrumbs, back/forward navigation and action buttons.
- The note tab bar, with no reserved space or hover detection at the top.
- The automatic file title at the top of the note. Headings written in the note remain visible.
- Scrollbars; scrolling with a mouse wheel, trackpad or keyboard still works.
- Obsidian tooltips.
- Search suggestions.
- YAML properties in Reading view; they remain available in editing views.
- The vault profile footer, including the vault name, vault switcher and settings shortcut.
- The file explorer toolbar for creating notes and folders, sorting and collapsing folders.
- Left sidebar tabs other than Files and Search, plus its sidebar toggle, new-tab and tab-list buttons.
- Borders around the status bar, to the right of the file explorer and below its Files/Search buttons.

On desktop with a mouse or trackpad, these controls appear at the window edges:

- **Left edge:** move the pointer onto the invisible 1 px strip to reveal the command ribbon, then move inside it to use its tools.
- **Right edge:** move the pointer onto the invisible 1 px strip to reveal the right sidebar, then move inside it to use its panels.

The ribbon and right sidebar overlay the workspace without moving the text. They remain visible while the pointer is inside or a control within them has keyboard focus, and hide again when both leave. The side detection strips have no visible color or border. There are no top or bottom detection zones. The left file explorer remains available with Files and Search buttons.

Edge reveal requires the ribbon to be enabled and the right sidebar to be expanded in Obsidian. If either has been closed through Obsidian's own controls, restore it from the command palette first. The status bar, including plugin controls such as Finition's navigation and counters, remains visible.

![Ultra Minimal: pointer revealing the ribbon and right sidebar in light and dark modes](doc/interface.gif)

Animated demonstration rendered with the theme's CSS: a 750 px text column that stays in place while the edge panels appear.

## Edit and build

Requires Node.js ≥ 24.12.0 and npm. No dependencies or package installation are needed.

- [palette.css](palette.css): Solarized swatches, color roles with usage comments, and the maximum text width.
- [hider.css](hider.css): interface hiding and edge reveal rules, each explained in a comment. Search-result counts, prompt instructions, the status bar and the right sidebar toggle have optional hiding rules left commented out.
- [scripts/palette.ts](scripts/palette.ts): validates the palette, inverts neutral colors for dark mode and maps colors to Obsidian's native variables.
- [scripts/customize.ts](scripts/customize.ts): typography, spacing and component adjustments.
- [theme.css](theme.css): generated stylesheet loaded by Obsidian.

Comment out a hiding rule in `hider.css` to restore its element, or uncomment an optional block to enable its hiding. To restore the native ribbon and sidebar layout, comment out the entire edge-reveal `@media` block. The build includes this file directly in the root `theme.css`; it does not require a CSS snippet or the Hider plugin.

After editing the palette, `hider.css` or TypeScript sources:

```bash
npm run build
```

For automatic rebuilding when the palette, `hider.css` or imported TypeScript files change:

```bash
npm run dev
```

Stop with Ctrl+C. Builds run offline and replace the CSS atomically. Palette or manifest validation errors and missing input files preserve the previous stylesheet. `hider.css` is included as written, without CSS syntax validation. Obsidian reloads the generated stylesheet automatically.

Set `--text_max_width` in `palette.css` to adjust the text column width. Obsidian's **Readable line length** setting must be enabled. The native editor handles narrow panes and disabled readable line length.

Obsidian supplies component styles directly, including improvements shipped with app updates. No external theme is downloaded or included. Third-party plugin interfaces use their native styles and inherit the theme's color variables.

## Verify

```bash
npm test
```

Tests cover reproducibility, palette references and validation, light/dark inversion, derived color channels, column width, inclusion of `hider.css`, paths with spaces, automatic rebuilds and release safeguards. Publication commands are simulated in tests.

## Publish a release

From the repository's default branch, with `gh` authenticated and `jq` installed:

```bash
./release.sh
```

The script verifies the build, increments the patch version in `manifest.json`, commits and pushes the current changes, then creates and pushes the matching numeric tag. A tag collision, rejected push or remote manifest mismatch stops publication.

[GitHub Actions](.github/workflows/release.yml) rebuilds the theme with Node.js 24.12.0, runs the tests, checks that the tag matches the manifest, attests the files and publishes `theme.css` and `manifest.json` as release assets.
