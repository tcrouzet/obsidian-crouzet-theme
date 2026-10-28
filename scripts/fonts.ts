import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, writeAtomic } from "./build.ts";

export function buildFonts(root = ROOT): void {
  const snippets = [
    ...["Duo", "Mono", "Quattro"].map(family => ({
      name: `iA-Writer-${family}`,
      family: `iA Writer ${family} V`,
      prefix: `iAWriter${family}V`,
      source: "https://github.com/iaolo/iA-Fonts",
      format: "ttf",
      variable: true,
    })),
    {
      name: "iA-Writer-Duo-Regular",
      family: "iA Writer Duo V",
      prefix: "iAWriterDuoV",
      source: "https://github.com/iaolo/iA-Fonts",
      format: "ttf",
      variable: true,
      licenseName: "iA-Writer-Duo",
      normalWeight: 400,
    },
    {
      name: "JetBrains-Mono",
      family: "JetBrains Mono",
      prefix: "JetBrainsMono",
      source: "https://github.com/JetBrains/JetBrainsMono",
      medium: true,
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
      medium: true,
    },
  ].map(({ name, family, prefix, source, format = "woff2", variable = false, medium = false, licenseName = name, normalWeight }) => {
    const license = readFileSync(join(root, "source_fonts", `${licenseName}-LICENSE.md`), "utf8");
    const faces = (variable ? [
      ["Regular", "400 700", "normal"],
      ["Italic", "400 700", "italic"],
    ] : [
      ["Regular", 400, "normal"],
      ["Italic", 400, "italic"],
      ...(medium ? [["Medium", 500, "normal"], ["MediumItalic", 500, "italic"]] : []),
      ["Bold", 700, "normal"],
      ["BoldItalic", 700, "italic"],
    ]).map(([variant, weight, style]) => {
      const name = variable && variant === "Regular" ? `${prefix}.ttf` : `${prefix}-${variant}.${format}`;
      const font = readFileSync(join(root, "source_fonts", name));
      const signature = format === "woff2" ? "wOF2" : "wOFF";
      const valid = format === "ttf"
        ? font.length >= 12 && font.readUInt32BE(0) === 0x00010000
        : font.length >= (format === "woff2" ? 48 : 44) && font.toString("ascii", 0, 4) === signature && font.readUInt32BE(8) === font.length;
      if (!valid) {
        throw new Error(`Police ${format.toUpperCase()} invalide : ${name}`);
      }
      return `@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("data:font/${format};base64,${font.toString("base64")}") format("${format === "ttf" ? "truetype" : format}");
}`;
    });
    const css = `/* ${family.replace(/ S$/, "")} — ${source}
   Activer un seul snippet de police. Licence des polices :

${license.trim()}
*/

${faces.join("\n\n")}

.markdown-source-view.mod-cm6 .cm-scroller,
.markdown-preview-view {
  font-family: "${family}", monospace;${normalWeight ? `\n  font-weight: ${normalWeight};` : ""}
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
