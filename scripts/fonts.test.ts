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
  for (const [snippet, family, prefix, format = "woff2"] of [
    ["iA-Writer-Duo", "iA Writer Duo S", "iAWriterDuoS"],
    ["iA-Writer-Mono", "iA Writer Mono S", "iAWriterMonoS"],
    ["iA-Writer-Quattro", "iA Writer Quattro S", "iAWriterQuattroS"],
    ["JetBrains-Mono", "JetBrains Mono", "JetBrainsMono"],
    ["Menlo", "Menlo", "Menlo", "woff"],
    ["SF-Mono", "SF Mono", "SF-Mono", "woff"],
  ]) {
    const name = `${snippet}.css`;
    const css = readFileSync(join(root, "snippets", "fonts", name), "utf8");
    assert.equal(css, readFileSync(join(ROOT, "snippets", "fonts", name), "utf8"));
    assert.ok(css.includes(readFileSync(join(root, "source_fonts", `${snippet}-LICENSE.md`), "utf8").trim()));
    const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
    assert.equal(faces.length, 4);
    const variants = new Set<string>();
    for (const [, face] of faces) {
      const weight = face.match(/font-weight: (\d+);/)?.[1];
      const style = face.match(/font-style: (\w+);/)?.[1];
      const variant = `${weight === "700" ? "Bold" : ""}${style === "italic" ? "Italic" : ""}` || "Regular";
      variants.add(variant);
      const encoded = face.match(/url\("data:font\/woff2?;base64,([A-Za-z0-9+/=]+)"\)/)?.[1];
      assert.ok(encoded);
      assert.ok(face.includes(`format("${format}")`));
      assert.deepEqual(Buffer.from(encoded, "base64"), readFileSync(join(root, "source_fonts", `${prefix}-${variant}.${format}`)));
    }
    assert.equal(variants.size, 4);
    assert.ok(css.includes(`--font-text-theme: "${family}", monospace;`));
    assert.match(css, /--font-text: var\(--font-text-theme\);/);
    assert.doesNotMatch(css, /@import|url\("https?:|--font-interface|--font-monospace|--font-text-size|--file-line-width/);
  }
});

test("missing or invalid font sources preserve the previous snippets", t => {
  const root = mkdtempSync(join(tmpdir(), "ultra minimal fonts "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "source_fonts"), join(root, "source_fonts"), { recursive: true });
  cpSync(join(ROOT, "snippets", "fonts"), join(root, "snippets", "fonts"), { recursive: true });
  const names = ["iA-Writer-Duo", "iA-Writer-Mono", "iA-Writer-Quattro", "JetBrains-Mono", "Menlo", "SF-Mono"];
  const before = names.map(name => readFileSync(join(root, "snippets", "fonts", `${name}.css`), "utf8"));
  for (const file of ["iAWriterQuattroS-Regular.woff2", "Menlo-Regular.woff"]) {
    const source = join(root, "source_fonts", file);
    const original = readFileSync(source);
    writeFileSync(source, "not a font");
    assert.throws(() => buildFonts(root), /WOFF2? invalide/);
    rmSync(source);
    assert.throws(() => buildFonts(root), /ENOENT/);
    writeFileSync(source, original);
  }
  for (const [i, name] of names.entries()) {
    assert.equal(readFileSync(join(root, "snippets", "fonts", `${name}.css`), "utf8"), before[i]);
  }
});
