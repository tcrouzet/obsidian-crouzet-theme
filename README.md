# Ultra Minimal

![Ultra Minimal by tcrouzet — Solarized light and dark writing interfaces](doc/cover.png)

Minimal isn't minimal enough. Ultra Minimal turns Obsidian into a Ulysses-like writing environment for long-form texts, with Solarized colors.

Ultra Minimal is also lighter in code: about 17 KB of CSS, compared with roughly 270 KB for Minimal.

Notes use Menlo at `23px` by default, with Consolas, DejaVu Sans Mono and monospace fallbacks. The text column is limited to `750px`. The explorer and command ribbon share the editor background, with thin separators. Interface and code fonts follow Obsidian's settings.

## Edit and build

Requires Node.js ≥ 24.12.0 and npm. No dependencies or package installation are needed.

- [palette.css](palette.css): Solarized swatches, color roles with usage comments, and the maximum text width.
- [scripts/palette.ts](scripts/palette.ts): validates the palette, inverts neutral colors for dark mode and maps colors to Obsidian's native variables.
- [scripts/customize.ts](scripts/customize.ts): typography, spacing and component adjustments.
- [theme.css](theme.css): generated stylesheet loaded by Obsidian.

After editing the palette or TypeScript sources:

```bash
npm run build
```

For automatic rebuilding when either the palette or imported TypeScript files change:

```bash
npm run dev
```

Stop with Ctrl+C. Builds run offline and replace the CSS atomically after validation, preserving the previous file if an input is invalid. Obsidian reloads the generated stylesheet automatically.

Set `--text_max_width` in `palette.css` to adjust the text column width. Obsidian's **Readable line length** setting must be enabled. The native editor handles narrow panes and disabled readable line length.

Obsidian supplies component styles directly, including improvements shipped with app updates. No external theme is downloaded or included. Third-party plugin interfaces use their native styles and inherit the theme's color variables.

## Verify

```bash
npm test
```

Tests cover reproducibility, palette references and validation, light/dark inversion, derived color channels, column width, paths with spaces, automatic rebuilds and release safeguards. Publication commands are simulated in tests.

## Publish a release

From the repository's default branch, with `gh` authenticated and `jq` installed:

```bash
./release.sh
```

The script verifies the build, increments the patch version in `manifest.json`, commits and pushes the current changes, then creates and pushes the matching numeric tag. A tag collision, rejected push or remote manifest mismatch stops publication.

[GitHub Actions](.github/workflows/release.yml) rebuilds the theme with Node.js 24.12.0, runs the tests, checks that the tag matches the manifest, attests the files and publishes `theme.css` and `manifest.json` as release assets.
