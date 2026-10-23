function hsl(rgb: number[], prefix: string): string {
  const [r, g, b] = rgb.map(value => value / 255);
  const maximum = Math.max(r, g, b), minimum = Math.min(r, g, b);
  const difference = maximum - minimum, lightness = (maximum + minimum) / 2;
  const hue = difference === 0 ? 0 : maximum === r ? (g - b) / difference
    : maximum === g ? (b - r) / difference + 2 : (r - g) / difference + 4;
  const saturation = difference === 0 ? 0 : difference / (1 - Math.abs(2 * lightness - 1));
  return `  --${prefix}-h: ${(hue * 60 + 360) % 360};\n  --${prefix}-s: ${saturation * 100}%;\n  --${prefix}-l: ${lightness * 100}%;`;
}

export function compilePalette(css: string): string {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const definitions = new Map<string, string>();
  for (const [, name, value] of source.matchAll(/--([\w-]+)\s*:\s*([^;{}]+)\s*;/g)) {
    if (definitions.has(name)) throw new Error(`Palette : --${name} defini plusieurs fois`);
    definitions.set(name, value.trim());
  }
  function resolve(name: string, path: string[] = []): number[] {
    if (path.includes(name)) throw new Error(`Palette : reference circulaire --${name}`);
    const value = definitions.get(name) ?? "";
    const reference = value.match(/^var\(--([\w-]+)\)$/);
    if (reference) return resolve(reference[1], [...path, name]);
    if (!/^#[a-f\d]{6}$/i.test(value)) throw new Error(`Palette : --${name} doit avoir une couleur #RRGGBB ou une reference var() valide`);
    return value.slice(1).match(/../g)!.map(channel => parseInt(channel, 16));
  }
  const colors = new Map([...definitions.keys()].map(name => [name, resolve(name)]));
  const names = {
    base3: "screen_background", base2: "panel_background",
    base00: "text_color", base01: "muted_text",
    base1: "faint_text", base0: "inverse_text",
    base03: "inverse_background", base02: "inverse_panel",
    "color-blue": "link_color", "color-cyan": "heading_color",
    "color-purple": "external_link_color", "color-orange": "solarized-orange",
    "color-red": "error_color", "color-yellow": "highlight_color",
    "color-green": "success_color", "color-pink": "chart_color",
  };
  for (const name of [...Object.values(names), "action_color"]) {
    if (!colors.has(name)) throw new Error(`Palette : --${name} manquant`);
  }
  const aliases = Object.entries(names).map(([name, role]) => `  --${name}: var(--${role});`).join("\n");
  const channels = Object.entries(names).filter(([name]) => name.startsWith("color-"))
    .map(([name, role]) => `  --${name}-rgb: ${colors.get(role)!.join(", ")};`).join("\n");
  return `${css}
/* Minimal variables derived from palette.css. */
.theme-light,
.theme-dark,
.theme-light.minimal-solarized-light,
.theme-dark.minimal-solarized-dark {
${aliases}
${channels}
${hsl(colors.get("action_color")!, "accent")}
  --ax1: var(--color-blue);
  --ax2: var(--color-cyan);
  --ax3: var(--action_color);
  --interactive-accent-rgb: ${colors.get("action_color")!.join(", ")};
}
${([
  ["light", "base3", "base2", "base00", "base01", "base1", 0.06],
  ["dark", "base03", "base02", "base0", "base1", "base01", 0.10],
] as const).map(([mode, background, panel, text, muted, faint, hover]) => `
.theme-${mode},
.theme-${mode}.minimal-default-${mode},
.theme-${mode}.minimal-solarized-${mode} {
${hsl(colors.get(names[background])!, "base")}
  --bg1: var(--${background});
  --bg2: var(--${panel});
  --bg3: rgba(var(--color-blue-rgb), ${hover});
  --ui1: color-mix(in srgb, var(--${background}) 88%, var(--${text}));
  --ui2: color-mix(in srgb, var(--${background}) 75%, var(--${text}));
  --ui3: var(--${faint});
  --tx1: var(--${text});
  --tx2: var(--${muted});
  --tx3: var(--${faint});
  --tx4: var(--${muted});
  --sp1: var(--base3);
}`).join("\n")}
`;
}
