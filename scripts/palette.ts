function hsl(rgb: number[]): string {
  const [r, g, b] = rgb.map(value => value / 255);
  const maximum = Math.max(r, g, b), minimum = Math.min(r, g, b);
  const difference = maximum - minimum, lightness = (maximum + minimum) / 2;
  const hue = difference === 0 ? 0 : maximum === r ? (g - b) / difference
    : maximum === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
  const saturation = difference === 0 ? 0 : difference / (1 - Math.abs(2 * lightness - 1));
  return `  --accent-h: ${(hue * 60 + 360) % 360};\n  --accent-s: ${saturation * 100}%;\n  --accent-l: ${lightness * 100}%;`;
}

export function compilePalette(css: string): string {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (source.replace(/:root\s*\{(?:\s*--[\w-]+\s*:[^;{}]+;\s*)*\}/g, "").trim()) {
    throw new Error("Palette : utiliser uniquement des variables dans :root");
  }
  const definitions = new Map<string, string>();
  for (const [, name, value] of source.matchAll(/--([\w-]+)\s*:\s*([^;{}]+)\s*;/g)) {
    if (definitions.has(name)) throw new Error(`Palette : --${name} defini plusieurs fois`);
    definitions.set(name, value.trim());
  }
  function resolve(name: string, dark = false, path: string[] = []): string {
    if (path.includes(name)) throw new Error(`Palette : reference circulaire --${name}`);
    const key = dark ? name.replace(/^solarized-base(0?[0-3])$/, (_, tone: string) =>
      `solarized-base${tone.length === 2 ? tone.slice(1) : `0${tone}`}`) : name;
    const value = definitions.get(key) ?? "";
    const reference = value.match(/^var\(--([\w-]+)\)$/);
    if (reference) return resolve(reference[1], dark, [...path, name]);
    if (!/^#[a-f\d]{6}$/i.test(value)) throw new Error(`Palette : --${name} doit avoir une couleur #RRGGBB ou une reference var() valide`);
    return key;
  }
  function rgb(name: string): number[] {
    return definitions.get(resolve(name))!.slice(1).match(/../g)!.map(channel => parseInt(channel, 16));
  }
  const width = definitions.get("text_max_width") ?? "";
  if (!/^\d+(?:\.\d+)?(?:px|rem|em|ch)$/.test(width) || !Number.isFinite(parseFloat(width)) || parseFloat(width) <= 0) {
    throw new Error("Palette : --text_max_width doit avoir une largeur positive en px, rem, em ou ch");
  }
  for (const name of definitions.keys()) if (name !== "text_max_width") resolve(name);
  const colors = {
    blue: "link_color", cyan: "heading_color", purple: "external_link_color",
    orange: "solarized-orange", red: "error_color", yellow: "highlight_color",
    green: "success_color", pink: "chart_color",
  };
  const neutral = {
    "background-primary": "screen_background", "background-primary-alt": "panel_background",
    "background-secondary": "panel_background", "background-secondary-alt": "screen_background",
    "background-modifier-form-field": "background-modifier-form-field",
    "background-modifier-form-field-hover": "background-modifier-form-field",
    "dropdown-background-theme": "dropdown-background",
    "dropdown-border-color": "dropdown-border-color",
    "dropdown-border-color-hover": "dropdown-border-color-hover",
    "background-modifier-border-focus": "faint_text",
    "text-normal": "text_color", "text-muted": "muted_text", "text-faint": "faint_text",
    "text-blockquote": "muted_text", "code-normal": "muted_text",
    "code-background": "panel_background", "input-border-color": "input-border-color",
    "input-border-color-hover": "input-border-color-hover",
    "metadata-label-text-color": "yaml_key_color", "metadata-input-text-color": "yaml_value_color",
  };
  for (const name of [...Object.values(colors), ...Object.values(neutral), "action_color",
    "inverse_background", "tag_color", "separator_color"]) resolve(name);
  return `${css}
.theme-light,
.theme-dark {
${Object.entries(colors).map(([color, role]) => `  --color-${color}: var(--${role});\n  --color-${color}-rgb: ${rgb(role).join(", ")};`).join("\n")}
${hsl(rgb("action_color"))}
  --color-accent: var(--action_color);
  --color-accent-1: var(--heading_color);
  --color-accent-2: var(--heading_color);
  --interactive-accent: var(--action_color);
  --interactive-accent-hover: var(--link_color);
  --interactive-accent-rgb: ${rgb("action_color").join(", ")};
  --text-accent: var(--link_color);
  --text-accent-hover: var(--heading_color);
  --text-error: var(--error_color);
  --text-on-accent: var(--screen_background);
  --background-modifier-message: var(--inverse_background);
  --background-modifier-error: var(--error_color);
  --background-modifier-warning: var(--action_color);
  --background-modifier-success: var(--success_color);
}
${["light", "dark"].map(mode => {
    const dark = mode === "dark";
    return `.theme-${mode} {
${Object.entries(neutral).map(([name, role]) => `  --${name}: var(--${resolve(role, dark)});`).join("\n")}
  --background-modifier-border: color-mix(in srgb, var(--background-primary) 88%, var(--text-normal));
  --background-modifier-border-hover: color-mix(in srgb, var(--background-primary) 75%, var(--text-normal));
  --background-modifier-hover: rgba(var(--color-blue-rgb), ${dark ? 0.10 : 0.06});
  --background-modifier-active-hover: var(--background-modifier-hover);
  --interactive-normal: ${dark ? "var(--background-modifier-hover)" : "var(--background-modifier-border)"};
  --interactive-hover: var(--background-modifier-border);
  --text-selection: rgba(var(--color-blue-rgb), 0.2);
  --text-highlight-bg: rgba(var(--color-yellow-rgb), 0.25);
}`;
  }).join("\n")}
`;
}
