import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ROOT } from "./build.ts";
import { buildFonts } from "./fonts.ts";

test("font snippets reproduce all original faces and include their license offline", t => {
  const root = mkdtempSync(join(tmpdir(), "ultra minimal fonts "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "source_fonts"), join(root, "source_fonts"), { recursive: true });
  buildFonts(root);
  for (const [snippet, family, prefix, format = "woff2", variable = false, medium = false, normalWeight] of [
    ["iA-Writer-Duo", "iA Writer Duo V", "iAWriterDuoV", "ttf", true],
    ["iA-Writer-Duo-Regular", "iA Writer Duo V", "iAWriterDuoV", "ttf", true, false, 400],
    ["iA-Writer-Mono", "iA Writer Mono V", "iAWriterMonoV", "ttf", true],
    ["iA-Writer-Quattro", "iA Writer Quattro V", "iAWriterQuattroV", "ttf", true],
    ["JetBrains-Mono", "JetBrains Mono", "JetBrainsMono", "woff2", false, true],
    ["Menlo", "Menlo", "Menlo", "woff"],
    ["SF-Mono", "SF Mono", "SF-Mono", "woff", false, true],
  ]) {
    const name = `${snippet}.css`;
    const css = readFileSync(join(root, "snippets", "fonts", name), "utf8");
    assert.equal(css, readFileSync(join(ROOT, "snippets", "fonts", name), "utf8"));
    const licenseName = snippet === "iA-Writer-Duo-Regular" ? "iA-Writer-Duo" : snippet;
    assert.ok(css.includes(readFileSync(join(root, "source_fonts", `${licenseName}-LICENSE.md`), "utf8").trim()));
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
    const count = variable ? 2 : medium ? 6 : 4;
    assert.equal(faces.length, count);
    const variants = new Set<string>();
    for (const [, face] of faces) {
      const weight = face.match(/font-weight: ([\d ]+);/)?.[1];
      const style = face.match(/font-style: (\w+);/)?.[1];
      const variant = `${weight === "700" ? "Bold" : weight === "500" ? "Medium" : ""}${style === "italic" ? "Italic" : ""}` || "Regular";
      variants.add(variant);
      const encoded = face.match(/url\("data:font\/(?:woff2?|ttf);base64,([A-Za-z0-9+/=]+)"\)/)?.[1];
      assert.ok(encoded);
      assert.ok(face.includes(`format("${format === "ttf" ? "truetype" : format}")`));
      const source = variable && variant === "Regular" ? `${prefix}.ttf` : `${prefix}-${variant}.${format}`;
      assert.deepEqual(Buffer.from(encoded, "base64"), readFileSync(join(root, "source_fonts", source)));
    }
    assert.equal(variants.size, count);
    assert.ok(css.includes(`.markdown-source-view.mod-cm6 .cm-scroller,
.markdown-preview-view {
  font-family: "${family}", monospace;${normalWeight ? `\n  font-weight: ${normalWeight};` : ""}
}`));
    assert.doesNotMatch(css, /(?:^|})\s*body\s*\{|--font-text|--font-editor-theme|(?:^|[;{])\s*(?:color|background(?:-color)?|all)\s*:/);
    assert.doesNotMatch(css, /@import|url\("https?:|--font-interface|--font-monospace|--font-text-size|--file-line-width/);
  }
});

test("missing or invalid font sources preserve the previous snippets", t => {
  const root = mkdtempSync(join(tmpdir(), "ultra minimal fonts "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "source_fonts"), join(root, "source_fonts"), { recursive: true });
  cpSync(join(ROOT, "snippets", "fonts"), join(root, "snippets", "fonts"), { recursive: true });
  const names = ["iA-Writer-Duo", "iA-Writer-Duo-Regular", "iA-Writer-Mono", "iA-Writer-Quattro", "JetBrains-Mono", "Menlo", "SF-Mono"];
  const before = names.map(name => readFileSync(join(root, "snippets", "fonts", `${name}.css`), "utf8"));
  for (const file of ["iAWriterQuattroV.ttf", "JetBrainsMono-Regular.woff2", "Menlo-Regular.woff"]) {
    const source = join(root, "source_fonts", file);
    const original = readFileSync(source);
    writeFileSync(source, "not a font");
    assert.throws(() => buildFonts(root), new RegExp(`Police ${file.split(".").pop()!.toUpperCase()} invalide`));
    rmSync(source);
    assert.throws(() => buildFonts(root), /ENOENT/);
    writeFileSync(source, original);
  }
  for (const [i, name] of names.entries()) {
    assert.equal(readFileSync(join(root, "snippets", "fonts", `${name}.css`), "utf8"), before[i]);
  }
});

test("font snippets supply the theme's 500 weight in upright and italic styles when available", () => {
  for (const name of ["iA-Writer-Duo", "iA-Writer-Mono", "iA-Writer-Quattro", "JetBrains-Mono", "SF-Mono"]) {
    const css = readFileSync(join(ROOT, "snippets", "fonts", `${name}.css`), "utf8");
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([, face]) => face);
    for (const style of ["normal", "italic"]) {
      assert.ok(faces.some(face => face.includes(`font-style: ${style};`) && /font-weight: (?:500|400 700);/.test(face)), `${name}: weight 500 ${style} missing`);
    }
  }
});
