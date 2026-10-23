export function customize(): string {
  return `
/* CrouzetTheme: Solarized palette and note defaults. MIT; see LICENSE. */
.theme-light,
.theme-dark,
.theme-light.minimal-solarized-light,
.theme-dark.minimal-solarized-dark {
  --color-accent: var(--ax3);
  --color-accent-1: var(--ax2);
  --color-accent-2: var(--ax2);
  --hl1: rgba(var(--color-blue-rgb), 0.2);
  --hl2: rgba(var(--color-yellow-rgb), 0.25);
  --active-line-bg: transparent;
  --text-title: var(--color-cyan);
  --caret-color: var(--text-title);
  --heading-formatting: var(--text-title);
  --inline-title-color: var(--text-title);
  --h1-color: var(--text-title);
  --h2-color: var(--text-title);
  --h3-color: var(--text-title);
  --h4-color: var(--text-title);
  --h5-color: var(--text-title);
  --h6-color: var(--text-title);
  --link-color: var(--color-blue);
  --link-color-hover: var(--color-cyan);
  --link-external-color: var(--color-purple);
  --link-external-color-hover: var(--color-cyan);
  --link-unresolved-color: var(--color-red);
  --background-modifier-message: var(--base03);
  --setting-items-background: transparent;
  --setting-items-border-width: 0;
  --font-text-theme: Menlo, Consolas, "DejaVu Sans Mono", monospace;
  --font-editor-theme: var(--font-text-theme);
  --font-text-size: 23px;
  --line-width: var(--text_max_width);
}
.mod-warning {
  --text-on-accent: var(--base3);
}

.workspace-split.mod-left-split {
  --bg2: var(--bg1);
  --background-secondary: var(--background-primary);
  --background-secondary-alt: var(--background-primary);
  --tab-container-background: var(--background-primary);
  --divider-width: 1px;
}

.workspace-ribbon.mod-primary {
  --ribbon-background: var(--background-primary);
  --ribbon-background-collapsed: var(--background-primary);
  --titlebar-background: var(--background-primary);
  --titlebar-background-focused: var(--background-primary);
  background-color: var(--background-primary);
}

.markdown-source-view,
.markdown-preview-view {
  --normal-weight: 500;
  --font-normal: 500;
  --font-weight: var(--font-normal);
  --bold-weight: 700;
  --link-weight: inherit;
  --h1-size: 1.5em;
  --h2-size: 1.3em;
  --h3-size: 1.125em;
  --h1-weight: var(--bold-weight);
  --h2-weight: var(--bold-weight);
  --h3-weight: var(--bold-weight);
  --h4-weight: var(--bold-weight);
  --h5-weight: var(--bold-weight);
  --h6-weight: var(--bold-weight);
  --line-height-normal: calc(1ex / 0.28);
}

.notice {
  --text-normal: var(--base3);
  color: var(--text-normal);
}
`;
}
