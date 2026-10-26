export function customize(): string {
  return `
body {
  --font-text-theme: Menlo, Consolas, "DejaVu Sans Mono", monospace;
  --font-editor-theme: var(--font-text-theme);
  --font-text-size: 23px;
  --font-ui-smaller: 11px;
  --file-line-width: var(--text_max_width);
  --file-margins: 8px 32px;
  --inline-title-size: 1.125em;
  --inline-title-weight: 600;
  --inline-title-margin-bottom: 1rem;
  --p-spacing: 1.75rem;
  --heading-spacing: 2em;
  --list-spacing: 0.075em;
  --list-indent: 2em;
  --input-height: 32px;
  --input-shadow: none;
  --input-shadow-hover: none;
  --link-decoration: none;
  --link-external-decoration: none;
  --embed-max-height: none;
  --embed-block-shadow-hover: none;
  --divider-width: 1px;
  --tab-outline-color: var(--background-modifier-border);
  --tab-container-background: var(--background-primary);
  --sidebar-tab-container-background: var(--background-secondary);
  --tab-text-color-focused-active: var(--text-normal);
  --nav-item-white-space: nowrap;
  --nav-indentation-guide-color: var(--background-modifier-border);
  --nav-collapse-icon-color: var(--text-muted);
  --nav-collapse-icon-color-collapsed: var(--text-muted);
  --nav-item-background-active: var(--background-modifier-hover);
  --nav-item-background-hover: var(--background-modifier-hover);
  --nav-item-color: var(--text-muted);
  --nav-item-color-active: var(--text-normal);
  --nav-item-color-hover: var(--text-normal);
  --nav-item-color-selected: var(--text-normal);
  --icon-color: var(--text-muted);
  --icon-color-hover: var(--text-muted);
  --icon-color-active: var(--text-normal);
  --icon-color-focused: var(--text-normal);
  --ribbon-background: var(--background-secondary);
  --ribbon-background-collapsed: var(--background-secondary);
  --search-result-background: var(--background-primary);
  --setting-items-background: transparent;
  --setting-items-border-width: 0;
  --metadata-label-font-size: calc(var(--font-ui-small) * 1.07);
  --metadata-input-font-size: var(--metadata-label-font-size);
  --metadata-input-height: calc(var(--metadata-input-font-size) * 2.2);
  --metadata-label-width: calc(var(--metadata-label-font-size) * 9);
  --blockquote-border-thickness: 1px;
  --blockquote-border-color: var(--background-modifier-border-hover);
  --blockquote-color: var(--text-muted);
  --tag-background: transparent;
  --tag-background-hover: transparent;
  --tag-border-color: var(--background-modifier-border);
  --tag-border-color-hover: var(--background-modifier-border-hover);
  --tag-size: 0.8em;
  --tag-border-width: 1px;
  --tag-padding-y: 0.2em;
  --tag-padding-x: 0.65em;
  --tag-color: var(--tag_color);
  --tag-color-hover: var(--tag_color);
  --text-title: var(--heading_color);
  --caret-color: var(--text-title);
  --heading-formatting: var(--text-title);
  --inline-title-color: var(--text-title);
  --h1-color: var(--text-title);
  --h2-color: var(--text-title);
  --h3-color: var(--text-title);
  --h4-color: var(--text-title);
  --h5-color: var(--text-title);
  --h6-color: var(--text-title);
  --link-color: var(--link_color);
  --link-color-hover: var(--heading_color);
  --link-external-color: var(--external_link_color);
  --link-external-color-hover: var(--heading_color);
  --link-unresolved-color: var(--error_color);
  --text-highlight-bg-active: var(--text-selection);
  --table-header-border-width: 0;
  --table-header-size: calc(var(--font-text-size) * 0.875);
  --table-text-size: calc(var(--font-text-size) * 0.875);
  --table-column-first-border-width: 0;
  --table-column-last-border-width: 0;
  --table-row-last-border-width: 0;
  --table-edge-cell-padding-first: 0;
  --table-edge-cell-padding-last: 0;
  --table-cell-padding: 4px 10px;
  --table-selection: var(--text-selection);
  --table-selection-border-color: var(--link_color);
  --table-selection-border-width: 0;
  --table-selection-border-radius: 0;
  --table-drag-handle-background-active: var(--text-selection);
  --table-drag-handle-color-active: var(--link_color);
  --table-add-button-border-width: 0;
}

:is(
  input:not([type]),
  input[type="text"], input[type="search"], input[type="email"],
  input[type="password"], input[type="number"],
  input[type="date"], input[type="datetime-local"],
  textarea, .multi-select-container
) {
  --background-modifier-border: var(--input-border-color);
  --background-modifier-border-hover: var(--input-border-color-hover);
}

:is(select, .dropdown, .combobox-button) {
  --dropdown-background: var(--dropdown-background-theme);
  --dropdown-background-hover: var(--dropdown-background-theme);
  border: var(--input-border-width) solid var(--dropdown-border-color);
}

@media (hover: hover) {
  :is(select, .dropdown, .combobox-button):where(:not(:disabled):not(.mod-disabled)):hover {
    border-color: var(--dropdown-border-color-hover);
  }
}

:is(.vertical-tab-header, .horizontal-tab-header, [role="tablist"]) {
  --divider-color: var(--input-border-color);
  --background-modifier-border: var(--input-border-color);
  --tab-outline-color: var(--input-border-color);
}

.metadata-container {
  line-height: 1.5;
}

.metadata-input-longtext,
.metadata-input-text,
.metadata-property-value .multi-select-container {
  line-height: 1.5;
}

.inline-title {
  padding-top: 16px;
}

.markdown-preview-view {
  padding-top: 1rem;
  padding-bottom: 0;
}

.markdown-rendered blockquote {
  padding-inline-start: 1.1em;
  font-style: normal;
}

.markdown-rendered table {
  margin-block: 0.5em;
  color: var(--text-normal);
  border-collapse: collapse;
  border-color: var(--text-normal);
}

.markdown-rendered :is(th, td):first-child {
  padding-inline-start: var(--table-edge-cell-padding-first);
}

.markdown-rendered :is(th, td):last-child {
  padding-inline-end: var(--table-edge-cell-padding-last);
}

body.show-inline-title .view-header-title-container {
  opacity: 0;
}

body.show-inline-title .view-header:hover .view-header-title-container,
body.show-inline-title .view-header:focus-within .view-header-title-container {
  opacity: 1;
}

.nav-buttons-container {
  justify-content: flex-start;
}

.markdown-source-view.mod-cm6 .cm-hmd-frontmatter {
  color: var(--yaml_value_color);
}

.markdown-source-view.mod-cm6 .cm-hmd-frontmatter.cm-atom {
  color: var(--yaml_key_color);
}

.markdown-source-view.mod-cm6 .cm-hmd-frontmatter.cm-def {
  color: var(--text-muted);
}

.markdown-source-view.mod-cm6 .cm-hmd-frontmatter.cm-meta {
  color: var(--separator_color);
}

.mod-warning {
  --text-on-accent: var(--screen_background);
}

.workspace-split.mod-left-split,
.workspace-split.mod-right-split,
.workspace-drawer {
  --background-secondary: var(--background-primary);
  --background-secondary-alt: var(--background-primary);
  --tab-container-background: var(--background-primary);
  --sidebar-tab-container-background: var(--background-primary);
  --mobile-sidebar-background: var(--background-primary);
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
  --font-normal: 500;
  --font-weight: var(--font-normal);
  --bold-weight: 700;
  --link-weight: 400;
  --h1-size: 1.5em;
  --h2-size: 1.3em;
  --h3-size: 1.125em;
  --h4-size: 0.9em;
  --h5-size: 0.85em;
  --h6-size: 0.85em;
  --h5-variant: small-caps;
  --h6-variant: small-caps;
  --h1-weight: var(--bold-weight);
  --h2-weight: var(--bold-weight);
  --h3-weight: var(--bold-weight);
  --h4-weight: var(--bold-weight);
  --h5-weight: var(--bold-weight);
  --h6-weight: var(--bold-weight);
  --line-height-normal: calc(1ex / 0.28);
  --code-normal: var(--text-normal);
  font-weight: var(--font-normal);
}

.markdown-rendered :not(pre) > code,
.markdown-source-view.mod-cm6 .cm-inline-code {
  background-color: transparent;
  padding: 0;
}

.notice {
  --text-normal: var(--screen_background);
  color: var(--text-normal);
}
`;
}
