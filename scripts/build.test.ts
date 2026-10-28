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
const activePalette = palette.replace(/\/\*[\s\S]*?\*\//g, "");
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
  assert.match(output, /--font-text-theme: "SF Mono", SFMono-Regular, ui-monospace, Consolas, "DejaVu Sans Mono", monospace/);
  assert.match(output, /--font-text-size: 23px/);
  assert.match(output, /--file-line-width: var\(--text_max_width\)/);
});

test("palette changes update native color channels, accents and text width", t => {
  const root = fixture(t);
  const edited = activePalette.replace(/--solarized-blue:[^;]+;/, "--solarized-blue: #ff0000;")
    .replace(/--link_color:[^;]+;/, "--link_color: var(--solarized-blue);")
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
    const edited = activePalette.replace(/--screen_background:[^;]+;/,
      `--screen_background: var(--solarized-${light});`);
    const css = compilePalette(edited);
    assert.ok(mode(css, "light").includes(`--background-primary: var(--solarized-${light});`));
    assert.ok(mode(css, "dark").includes(`--background-primary: var(--solarized-${dark});`));
  }
  const edited = activePalette.replace(/--screen_background:[^;]+;/, "--screen_background: #123456;");
  const css = compilePalette(edited);
  for (const theme of ["light", "dark"]) assert.ok(mode(css, theme).includes("--background-primary: var(--screen_background);"));
});

test("missing, invalid, duplicated or cyclic palette values preserve the previous CSS", t => {
  const root = fixture(t);
  const before = readFileSync(join(root, "theme.css"), "utf8");
  for (const edited of [
    activePalette.replace(/--solarized-blue:[^;]+;/, "--solarized-blue: #invalid;"),
    activePalette.replace(/--link_color:[^;]+;/, ""),
    activePalette.replace(/--solarized-orange:[^;]+;/, "--solarized-orange: #invalid;"),
    activePalette + "\n:root { --link_color: #ffffff; }",
    activePalette.replace(/--link_color:[^;]+;/, "--link_color: var(--missing_color);"),
    activePalette.replace(/--link_color:[^;]+;/, "--link_color: var(--link_color);"),
    activePalette.replace(/--text_max_width:[^;]+;/, "--text_max_width: -10px;"),
    activePalette.replace(/--text_max_width:[^;]+;/, "--text_max_width: 0px;"),
    activePalette.replace(/--text_max_width:[^;]+;/, "--text_max_width: invalid;"),
    activePalette + "\na { color red; }",
    activePalette + "\0",
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
  const abort = () => { child.kill(); };
  t.signal.addEventListener("abort", abort, { once: true });
  try {
    let stage = "initial";
    for await (const line of lines) {
      if (!line.includes("theme.css reconstruit")) continue;
      const output = readFileSync(join(root, "theme.css"), "utf8");
      if (stage === "initial") {
        stage = "palette";
        writeFileSync(join(root, "palette.css"), activePalette
          .replace(/--solarized-blue:[^;]+;/, "--solarized-blue: #278bd2;")
          .replace(/--link_color:[^;]+;/, "--link_color: var(--solarized-blue);"));
      } else if (stage === "palette" && output.includes("--color-blue-rgb: 39, 139, 210;")) {
        stage = "hider";
        writeFileSync(join(root, "hider.css"), hider + "\n.prompt-instructions { display: none; }\n");
      } else if (stage === "hider" && output.endsWith("\n.prompt-instructions { display: none; }\n")) {
        stage = "typescript";
        const typography = join(root, "scripts/customize.ts");
        writeFileSync(typography, readFileSync(typography, "utf8").replace("--font-text-size: 23px", "--font-text-size: 24px"));
      } else if (stage === "typescript" && output.includes("--font-text-size: 24px")) {
        stage = "done";
        break;
      }
    }
    assert.equal(stage, "done", `Surveillance bloquee a l'etape ${stage}\n${errors}`);
    const output = readFileSync(join(root, "theme.css"), "utf8");
    assert.match(output, /--solarized-blue: #278bd2;/);
    assert.match(output, /--color-blue-rgb: 39, 139, 210;/);
    assert.ok(output.endsWith("\n.prompt-instructions { display: none; }\n"));
    assert.match(output, /--font-text-size: 24px/);
  } finally {
    t.signal.removeEventListener("abort", abort);
    lines.close();
    child.kill();
    await exited;
  }
});
