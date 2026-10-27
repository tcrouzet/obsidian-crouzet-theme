import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { build, render, ROOT } from "./build.ts";
import { compilePalette } from "./palette.ts";

const palette = readFileSync(join(ROOT, "palette.css"), "utf8");
const hider = readFileSync(join(ROOT, "hider.css"), "utf8");
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "crouzet build check "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "scripts"), join(root, "scripts"), { recursive: true });
  for (const file of ["manifest.json", "package.json", "palette.css", "hider.css", "theme.css"]) cpSync(join(ROOT, file), join(root, file));
  return root;
}

function mode(css: string, name: string): string {
  const block = css.match(new RegExp(`(?:^|})\\s*\\.theme-${name} \\{([^}]+)\\}`));
  assert.ok(block, `${name} palette missing`);
  return block[1];
}

test("root CSS is reproducible, standalone and uses native Obsidian variables", () => {
  const output = render(palette, hider);
  assert.equal(output, readFileSync(join(ROOT, "theme.css"), "utf8"));
  assert.ok(output.includes(palette));
  assert.ok(output.endsWith(hider));
  assert.ok(Buffer.byteLength(output) < 100_000);
  assert.doesNotMatch(output, /minimal-|@import|!important|:has\(/);
  assert.match(output, /--font-text-theme: Menlo, Consolas, "DejaVu Sans Mono", monospace/);
  assert.match(output, /--font-text-size: 23px/);
  assert.match(output, /--file-line-width: var\(--text_max_width\)/);
});

test("palette changes update native color channels, accents and text width", t => {
  const root = fixture(t);
  const edited = palette.replace("#268bd2", "#ff0000")
    .replace(/--action_color:\s*[^;]+/, "--action_color: var(--solarized-blue)")
    .replace(/--text_max_width:\s*[^;]+/, "--text_max_width: 45rem");
  writeFileSync(join(root, "palette.css"), edited);
  build(root);
  const output = readFileSync(join(root, "theme.css"), "utf8");
  assert.ok(output.includes(edited));
  assert.match(output, /--text_max_width: 45rem;/);
  assert.match(output, /--color-blue-rgb: 255, 0, 0;/);
  assert.match(output, /--accent-h: 0;/);
  assert.match(output, /--accent-s: 100%;/);
  assert.match(output, /--accent-l: 50%;/);
  assert.match(output, /--interactive-accent-rgb: 255, 0, 0;/);
});

test("dark mode inverts every Solarized neutral pair and preserves custom colors", () => {
  for (const [light, dark] of [
    ["base03", "base3"], ["base02", "base2"], ["base01", "base1"], ["base00", "base0"],
    ["base0", "base00"], ["base1", "base01"], ["base2", "base02"], ["base3", "base03"],
    ["orange", "orange"],
  ]) {
    const edited = palette.replace(/--screen_background:[^;]+;/,
      `--screen_background: var(--solarized-${light});`);
    const css = compilePalette(edited);
    assert.ok(mode(css, "light").includes(`--background-primary: var(--solarized-${light});`));
    assert.ok(mode(css, "dark").includes(`--background-primary: var(--solarized-${dark});`));
  }
  const edited = palette.replace(/--screen_background:[^;]+;/, "--screen_background: #123456;");
  const css = compilePalette(edited);
  for (const theme of ["light", "dark"]) assert.ok(mode(css, theme).includes("--background-primary: var(--screen_background);"));
});

test("missing, invalid, duplicated or cyclic palette values preserve the previous CSS", t => {
  const root = fixture(t);
  const before = readFileSync(join(root, "theme.css"), "utf8");
  for (const edited of [
    palette.replace("#268bd2", "#invalid"),
    palette.replace(/--link_color:[^;]+;/, ""),
    palette.replace("#cb4b16", "#invalid"),
    palette + "\n:root { --link_color: #ffffff; }",
    palette.replace("var(--solarized-blue)", "var(--missing_color)"),
    palette.replace("var(--solarized-blue)", "var(--link_color)"),
    palette.replace(/--text_max_width:[^;]+;/, "--text_max_width: -10px;"),
    palette.replace(/--text_max_width:[^;]+;/, "--text_max_width: 0px;"),
    palette.replace(/--text_max_width:[^;]+;/, "--text_max_width: invalid;"),
    palette + "\na { color red; }",
    palette + "\0",
  ]) {
    writeFileSync(join(root, "palette.css"), edited);
    assert.throws(() => build(root), /Palette/);
    assert.equal(readFileSync(join(root, "theme.css"), "utf8"), before);
  }
});

test("hider CSS edits reach the build and a missing file preserves the previous CSS", t => {
  const root = fixture(t);
  const edited = hider + "\n.prompt-instructions { display: none; }\n";
  writeFileSync(join(root, "hider.css"), edited);
  build(root);
  const output = readFileSync(join(root, "theme.css"), "utf8");
  assert.ok(output.endsWith(edited));
  rmSync(join(root, "hider.css"));
  assert.throws(() => build(root), /hider\.css/);
  assert.equal(readFileSync(join(root, "theme.css"), "utf8"), output);
});

test("build supports paths with spaces without modifying palette, hider or manifest", t => {
  const root = fixture(t);
  build(root);
  assert.equal(readFileSync(join(root, "theme.css"), "utf8"), render(palette, hider));
  assert.equal(readFileSync(join(root, "palette.css"), "utf8"), palette);
  assert.equal(readFileSync(join(root, "hider.css"), "utf8"), hider);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")), manifest);
});

test("invalid manifest versions preserve the previous stylesheet", t => {
  const root = fixture(t);
  const previous = readFileSync(join(root, "theme.css"), "utf8");
  for (const value of ["v1.0.0", "01.0.0", "1.0", "1.0.0-beta", "../../main"]) {
    for (const key of ["version", "minAppVersion"]) {
      writeFileSync(join(root, "manifest.json"), JSON.stringify({ ...manifest, [key]: value }));
      assert.throws(() => build(root), /version/);
      assert.equal(readFileSync(join(root, "theme.css"), "utf8"), previous);
    }
  }
});

test("dev watch rebuilds after palette, hider CSS and TypeScript changes", { timeout: 15_000 }, async t => {
  const root = fixture(t);
  const child = spawn(process.execPath, ["--watch", "scripts/build.ts", "--watch"], { cwd: root });
  const exited = once(child, "exit");
  let errors = "";
  child.stderr.on("data", data => { errors += data; });
  const lines = createInterface({ input: child.stdout });
  try {
    let builds = 0;
    for await (const line of lines) {
      if (!line.includes("theme.css reconstruit")) continue;
      builds++;
      if (builds === 1) {
        writeFileSync(join(root, "palette.css"), palette.replace("#268bd2", "#278bd2"));
      } else if (builds === 2) {
        assert.match(readFileSync(join(root, "theme.css"), "utf8"), /--color-blue-rgb: 39, 139, 210;/);
        writeFileSync(join(root, "hider.css"), hider + "\n.prompt-instructions { display: none; }\n");
      } else if (builds === 3) {
        assert.ok(readFileSync(join(root, "theme.css"), "utf8").endsWith("\n.prompt-instructions { display: none; }\n"));
        const typography = join(root, "scripts/customize.ts");
        writeFileSync(typography, readFileSync(typography, "utf8").replace("--font-text-size: 23px", "--font-text-size: 24px"));
      } else break;
    }
    assert.equal(builds, 4, errors);
    assert.match(readFileSync(join(root, "theme.css"), "utf8"), /--solarized-blue: #278bd2;/);
    assert.match(readFileSync(join(root, "theme.css"), "utf8"), /--font-text-size: 24px/);
  } finally {
    lines.close();
    child.kill();
    await exited;
  }
});
