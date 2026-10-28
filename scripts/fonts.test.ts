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
  for (const family of ["Duo", "Mono", "Quattro"]) {
    const name = `iA-Writer-${family}.css`;
    const css = readFileSync(join(root, "snippets", "fonts", name), "utf8");
    assert.equal(css, readFileSync(join(ROOT, "snippets", "fonts", name), "utf8"));
    assert.ok(css.includes(readFileSync(join(root, "source_fonts", `iA-Writer-${family}-LICENSE.md`), "utf8").trim()));
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
    assert.equal(faces.length, 4);
    const variants = new Set<string>();
    for (const [, face] of faces) {
      const weight = face.match(/font-weight: (\d+);/)?.[1];
      const style = face.match(/font-style: (\w+);/)?.[1];
      const variant = `${weight === "700" ? "Bold" : ""}${style === "italic" ? "Italic" : ""}` || "Regular";
      variants.add(variant);
      const encoded = face.match(/url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/)?.[1];
      assert.ok(encoded);
      assert.deepEqual(Buffer.from(encoded, "base64"), readFileSync(join(root, "source_fonts", `iAWriter${family}S-${variant}.woff2`)));
    }
    assert.equal(variants.size, 4);
    assert.match(css, new RegExp(`--font-text-theme: "iA Writer ${family} S", monospace;`));
    assert.match(css, /--font-text: var\(--font-text-theme\);/);
    assert.doesNotMatch(css, /@import|url\("https?:|--font-interface|--font-monospace|--font-text-size|--file-line-width/);
  }
});

test("missing or invalid font sources preserve the previous snippets", t => {
  const root = mkdtempSync(join(tmpdir(), "ultra minimal fonts "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "source_fonts"), join(root, "source_fonts"), { recursive: true });
  cpSync(join(ROOT, "snippets", "fonts"), join(root, "snippets", "fonts"), { recursive: true });
  const before = ["Duo", "Mono", "Quattro"].map(family => readFileSync(join(root, "snippets", "fonts", `iA-Writer-${family}.css`), "utf8"));
  const source = join(root, "source_fonts", "iAWriterQuattroS-Regular.woff2");
  writeFileSync(source, "not a font");
  assert.throws(() => buildFonts(root), /WOFF2 invalide/);
  rmSync(source);
  assert.throws(() => buildFonts(root), /ENOENT/);
  for (const [i, family] of ["Duo", "Mono", "Quattro"].entries()) {
    assert.equal(readFileSync(join(root, "snippets", "fonts", `iA-Writer-${family}.css`), "utf8"), before[i]);
  }
});
