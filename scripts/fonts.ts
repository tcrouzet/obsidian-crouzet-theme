import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, writeAtomic } from "./build.ts";

export function buildFonts(root = ROOT): void {
  const snippets = ["Duo", "Mono", "Quattro"].map(family => {
    const license = readFileSync(join(root, "source_fonts", `iA-Writer-${family}-LICENSE.md`), "utf8");
    const faces = [
      ["Regular", 400, "normal"],
      ["Italic", 400, "italic"],
      ["Bold", 700, "normal"],
      ["BoldItalic", 700, "italic"],
    ].map(([variant, weight, style]) => {
      const name = `iAWriter${family}S-${variant}.woff2`;
      const font = readFileSync(join(root, "source_fonts", name));
      if (font.length < 48 || font.toString("ascii", 0, 4) !== "wOF2" || font.readUInt32BE(8) !== font.length) {
        throw new Error(`Police WOFF2 invalide : ${name}`);
      }
      return `@font-face {
  font-family: "iA Writer ${family} S";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("data:font/woff2;base64,${font.toString("base64")}") format("woff2");
}`;
    });
    const css = `/* iA Writer ${family} — https://github.com/iaolo/iA-Fonts
   Activer un seul snippet de police. Licence des polices :

${license.trim()}
*/

${faces.join("\n\n")}

body {
  --font-text-theme: "iA Writer ${family} S", monospace;
  --font-editor-theme: var(--font-text-theme);
  --font-text: var(--font-text-theme);
}
`;
    return { name: `iA-Writer-${family}.css`, css };
  });
  mkdirSync(join(root, "snippets", "fonts"), { recursive: true });
  for (const { name, css } of snippets) writeAtomic(join(root, "snippets", "fonts", name), css);
}

if (import.meta.main) {
  buildFonts();
  console.log("Snippets de polices reconstruits dans snippets/fonts/");
}
