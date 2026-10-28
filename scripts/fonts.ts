import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, writeAtomic } from "./build.ts";

export function buildFonts(root = ROOT): void {
  const snippets = [
    ...["Duo", "Mono", "Quattro"].map(family => ({
      name: `iA-Writer-${family}`,
      family: `iA Writer ${family} S`,
      prefix: `iAWriter${family}S`,
      source: "https://github.com/iaolo/iA-Fonts",
    })),
    {
      name: "JetBrains-Mono",
      family: "JetBrains Mono",
      prefix: "JetBrainsMono",
      source: "https://github.com/JetBrains/JetBrainsMono",
    },
    {
      name: "Menlo",
      family: "Menlo",
      prefix: "Menlo",
      source: "https://www.apple.com/legal/sla/",
      format: "woff",
    },
    {
      name: "SF-Mono",
      family: "SF Mono",
      prefix: "SF-Mono",
      source: "https://developer.apple.com/fonts/",
      format: "woff",
    },
  ].map(({ name, family, prefix, source, format = "woff2" }) => {
    const license = readFileSync(join(root, "source_fonts", `${name}-LICENSE.md`), "utf8");
    const faces = [
      ["Regular", 400, "normal"],
      ["Italic", 400, "italic"],
      ["Bold", 700, "normal"],
      ["BoldItalic", 700, "italic"],
    ].map(([variant, weight, style]) => {
      const name = `${prefix}-${variant}.${format}`;
      const font = readFileSync(join(root, "source_fonts", name));
      const signature = format === "woff2" ? "wOF2" : "wOFF";
      if (font.length < (format === "woff2" ? 48 : 44) || font.toString("ascii", 0, 4) !== signature || font.readUInt32BE(8) !== font.length) {
        throw new Error(`Police ${format.toUpperCase()} invalide : ${name}`);
      }
      return `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("data:font/${format};base64,${font.toString("base64")}") format("${format}");
}`;
    });
    const css = `/* ${family.replace(/ S$/, "")} — ${source}
   Activer un seul snippet de police. Licence des polices :

${license.trim()}
*/

${faces.join("\n\n")}

body {
  --font-text-theme: "${family}", monospace;
  --font-editor-theme: var(--font-text-theme);
  --font-text: var(--font-text-theme);
}
`;
    return { name: `${name}.css`, css };
  });
  mkdirSync(join(root, "snippets", "fonts"), { recursive: true });
  for (const { name, css } of snippets) writeAtomic(join(root, "snippets", "fonts", name), css);
}

if (import.meta.main) {
  buildFonts();
  console.log("Snippets de polices reconstruits dans snippets/fonts/");
}
