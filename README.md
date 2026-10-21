# CrouzetTheme

Minimalist solarized theme for Obsidian, with support for newer components informed by [Minimal](https://github.com/kepano/obsidian-minimal). Based on [Solarized 1.1.5](https://github.com/harmtemolder/obsidian-solarized/tree/11cc702755b912abcedbebb6328a32ffddc03eff) and [Minimal 9.1.4](https://github.com/kepano/obsidian-minimal/tree/93321bdc23fc879966e1e3aa0cfeda77012f540f).

Notes use Menlo at `23px` by default, falling back to Consolas or DejaVu Sans Mono when Menlo is unavailable. The font and text size can be changed in Obsidian's settings.

## Edit and build

Requirements: Dart Sass ≥ 1.79 available as `sass`, Python ≥ 3.9, and `curl`.

- [scripts/scss/_palette.scss](scripts/scss/_palette.scss): tones, accents, default accent color, light/dark base colors, and Style Settings options. Legacy grays remain available to preserve the Solarized appearance.
- [scripts/scss/_variables.scss](scripts/scss/_variables.scss): theme colors and typography variables.
- [scripts/scss/_solarized.scss](scripts/scss/_solarized.scss): Solarized rules and note styling.
- [scripts/scss/_modern.scss](scripts/scss/_modern.scss): additions marked `A AJUSTER` (to adjust) for properties, editable tables, Bases, Canvas, PDF, graph view, navigation, and mobile. Check their appearance in Obsidian in both light and dark modes.

From the repository root, build the `theme.css` file loaded by Obsidian:

```bash
python3 scripts/build.py
```

Rebuild automatically when SCSS files change; stop with Ctrl+C:

```bash
python3 scripts/build.py --watch
```

Edit the SCSS sources; `theme.css` is the compiled output. The build preserves the Style Settings block and produces CSS without a source map. The script compiles in memory and writes the result only after a successful compilation. A Sass error preserves the previous CSS, including in watch mode.

## Compare upstream changes

```bash
python3 scripts/update.py
```

The command checks both public repositories, compares their SCSS sources and manifests against the reviewed revisions recorded in `UPSTREAM`, rebuilds the CSS from local sources, and writes the differences to [scripts/upstream-review.md](scripts/upstream-review.md). It does not execute downloaded code or run Git commands.

Apply relevant changes to the local sources, check the appearance, and update the revisions in `UPSTREAM` once the review is complete. Differences remain listed until then. If a network request fails, the previous report and local sources are preserved.

The comparison reports changes since the reviewed revisions. It does not measure complete coverage of Minimal's features. Layout options, alternative color schemes, and plugin integrations require separate adaptations; native components also retain styles provided by Obsidian.

## Verify the build

```bash
python3 -B scripts/check.py
```

The check compiles in a temporary directory and verifies that the root CSS matches the sources, that settings and added components are present, that the comparator detects additions and deletions, and that a Sass error preserves the previous CSS. It does not replace a visual check in Obsidian.

## Publish a release

From the repository's default branch, with `gh` authenticated and `jq` installed:

```bash
bash release.sh
```

The script verifies the build, automatically increments the patch version in `manifest.json` (`0.0.1` → `0.0.2`), commits all current changes and pushes the branch, then creates and pushes the matching tag without a `v` prefix. A tag collision, rejected push, or mismatched remote manifest stops publication.

[GitHub Actions](.github/workflows/release.yml) rebuilds the theme from the tag using Sass 1.81.0, checks the sources and verifies that the tag matches the manifest, attests the files, and publishes the release with `theme.css` and `manifest.json` attached. These are the files Obsidian installs. The downloaded compiler is verified using SHA-256.

Test the release script without real commits, pushes, or publishing:

```bash
python3 -B scripts/check_release.py
```
