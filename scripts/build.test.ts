import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { transformSync } from "esbuild";
import { build, compareVersions, render, renderLicenses, ROOT } from "./build.ts";
import { compilePalette } from "./palette.ts";
import { update } from "./update.ts";

const minimal = JSON.parse(readFileSync(join(ROOT, "scripts/minimal/version.json"), "utf8"));
const css = readFileSync(join(ROOT, "scripts/minimal/theme.css"), "utf8");
const license = readFileSync(join(ROOT, "scripts/minimal/LICENSE"), "utf8");
const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const palette = readFileSync(join(ROOT, "palette.css"), "utf8");
const ownLicense = readFileSync(join(ROOT, "LICENSE"), "utf8");

function minified(css: string): string {
  return transformSync(css, { loader: "css", minifyWhitespace: true, legalComments: "none" }).code.trimEnd();
}

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "crouzet build check "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "scripts"), join(root, "scripts"), { recursive: true });
  for (const file of ["manifest.json", "package.json", "palette.css", "theme.css", "LICENSE", "LICENSES.txt"]) cpSync(join(ROOT, file), join(root, file));
  symlinkSync(join(ROOT, "node_modules"), join(root, "node_modules"), "dir");
  return root;
}

const api = "https://api.github.com/repos/kepano/obsidian-minimal";
const raw = `https://raw.githubusercontent.com/kepano/obsidian-minimal/${minimal.commit}`;
function responses(): Map<string, string> {
  return new Map([
    [`${api}/releases/latest`, JSON.stringify({ tag_name: minimal.version, draft: false, prerelease: false })],
    [`${api}/commits/${minimal.version}`, JSON.stringify({ sha: minimal.commit })],
    [`${raw}/manifest.json`, JSON.stringify({ version: minimal.version, minAppVersion: minimal.minAppVersion })],
    [`${raw}/theme.css`, css],
    [`${raw}/LICENSE`, license],
  ]);
}

function requester(replies: Map<string, string>, calls: string[] = []): typeof fetch {
  return async (input, options) => {
    const url = String(input);
    calls.push(url);
    assert.ok(options?.signal, "Network requests need a timeout");
    assert.equal(new Headers(options?.headers).get("User-Agent"), "CrouzetTheme-updater");
    assert.ok(replies.has(url), `Unexpected request: ${url}`);
    return new Response(replies.get(url));
  };
}

function olderCopy(root: string): void {
  writeFileSync(join(root, "scripts/minimal/version.json"), JSON.stringify({ ...minimal, version: "0.0.1" }));
  writeFileSync(join(root, "manifest.json"), JSON.stringify({ ...manifest, minAppVersion: "0.0.1" }));
}

const outputs = ["theme.css", "LICENSES.txt", "palette.css", "manifest.json", "scripts/minimal/theme.css", "scripts/minimal/version.json", "scripts/minimal/LICENSE"];
function snapshot(root: string): string[] {
  return outputs.map(file => readFileSync(join(root, file), "utf8"));
}

test("root CSS is reproducible and retains all pinned Minimal rules after minification", () => {
  const output = render(css, minimal, palette);
  assert.equal(output, readFileSync(join(ROOT, "theme.css"), "utf8"));
  assert.ok(output.startsWith(minified(css)));
  assert.ok(output.includes(minified(palette)));
  assert.ok(!output.includes("/*"));
  assert.equal(output.trimEnd().split("\n").length, 1);
  assert.match(output, /--font-text-theme: Menlo, Consolas, "DejaVu Sans Mono", monospace/);
  assert.match(output, /--font-text-size: 23px/);
  assert.match(output, /--caret-color: var\(--text-title\)/);
  assert.match(output, /--active-line-bg: transparent/);
});

test("licenses retain upstream copyright notices outside the CSS", () => {
  const notices = renderLicenses("/* Ordinary documentation. */\n/* Copyright (c) Example Author */\n/* Copyright (c) Example Author */", license, ownLicense);
  assert.ok(notices.includes(license.trim()));
  assert.ok(notices.includes(ownLicense.trim()));
  assert.ok(notices.includes("Copyright (c) Example Author"));
  assert.equal(notices.split("Copyright (c) Example Author").length, 2);
  assert.ok(!notices.includes("Ordinary documentation"));
  const built = readFileSync(join(ROOT, "LICENSES.txt"), "utf8");
  assert.equal(built, renderLicenses(css, license, ownLicense));
  assert.ok(built.includes("Steph Ango"));
  assert.ok(built.includes("Catppuccin"));
});

test("render removes comments without changing quoted text, data URLs or calc expressions", () => {
  const extra = `
/* remove this ordinary comment */
/*! remove this legal comment */
.minify-check::before {
  content: "/* literal text */";
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E");
  width: calc(100% - 2px);
}`;
  const output = render(css, minimal, palette + extra);
  assert.ok(!output.includes("remove this ordinary comment"));
  assert.ok(!output.includes("remove this legal comment"));
  assert.ok(!output.includes("@settings"));
  assert.ok(output.includes('"/* literal text */"'));
  assert.ok(output.includes("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E"));
  assert.ok(output.includes("calc(100% - 2px)"));
});

test("CSS palette changes inject column width, interface backgrounds and derived color channels", t => {
  const root = fixture(t);
  const edited = palette.replaceAll("#268bd2", "#ff0000")
    .replace(/--action_color:\s*[^;]+/, "--action_color: var(--solarized-blue)")
    .replace(/--text_max_width:\s*[^;]+/, "--text_max_width: 45rem")
    .replace(/--background-secondary:\s*[^;]+/, "--background-secondary: #112233")
    .replace(/--dropdown-background:\s*[^;]+/, "--dropdown-background: #445566")
    .replace(/--background-modifier-form-field:\s*[^;]+/, "--background-modifier-form-field: #778899")
    .replace(/--input-border-color:\s*[^;]+/, "--input-border-color: var(--solarized-blue)");
  writeFileSync(join(root, "palette.css"), edited);
  build(root);
  const output = readFileSync(join(root, "theme.css"), "utf8");
  assert.ok(output.includes(minified(edited)));
  assert.match(output, /--text_max_width: 45rem(?:;|})/);
  assert.match(output, /--line-width: var\(--text_max_width\)(?:;|})/);
  assert.match(output, /--color-blue-rgb: 255, 0, 0;/);
  assert.match(output, /--accent-h: 0;/);
  assert.match(output, /--accent-s: 100%;/);
  assert.match(output, /--accent-l: 50%;/);
  assert.match(output, /--interactive-accent-rgb: 255, 0, 0(?:;|})/);
  assert.match(output, /--color-orange-rgb: 203, 75, 22;/);
  assert.match(output, /--input-border-color: rgb\(255, 0, 0\);/);
  assert.match(output, /--dropdown-border-color: rgb\(255, 0, 0\);/);
  const generated = compilePalette(edited);
  assert.match(generated, /\.theme-light\.minimal-solarized-light \{[^}]*--bg1: var\(--base3\);[^}]*--tx1: var\(--base00\);/);
  assert.match(generated, /\.theme-dark\.minimal-solarized-dark \{[^}]*--bg1: var\(--base03\);[^}]*--tx1: var\(--base0\);/);
});

test("interface backgrounds invert Solarized neutral pairs only in dark mode", () => {
  const backgrounds = ["background-secondary", "dropdown-background", "background-modifier-form-field", "input-border-color", "dropdown-border-color", "dropdown-border-color-hover"];
  const pairs = [
    ["base3", "#fdf6e3", "base03", "#002b36"],
    ["base2", "#eee8d5", "base02", "#073642"],
    ["base1", "#93a1a1", "base01", "#586e75"],
    ["base0", "#839496", "base00", "#657b83"],
  ];
  let source = palette;
  for (const [a, hexA, b, hexB] of pairs) {
    for (const [tone, hex] of [[a, hexA], [b, hexB]]) {
      source = source.replace(new RegExp(`--solarized-${tone}:\\s*#[a-f\\d]{6}`, "gi"), `--solarized-${tone}: ${hex}`);
    }
  }
  const cases = pairs.flatMap(([a, hexA, b, hexB]) => [
    [`var(--solarized-${a})`, hexA, hexB], [`var(--solarized-${b})`, hexB, hexA],
  ]).concat([["var(--solarized-orange)", "#cb4b16", "#cb4b16"], ["#123456", "#123456", "#123456"]]);
  for (const [value, light, dark] of cases) {
    let edited = source;
    for (const name of backgrounds) edited = edited.replace(new RegExp(`--${name}:[^;]+;`), `--${name}: ${value};`);
    const output = compilePalette(edited);
    for (const [mode, hex] of [["light", light], ["dark", dark]]) {
      const block = output.match(new RegExp(`\\.theme-${mode}\\.minimal-default-${mode},[^\\{]+\\{([^}]+)\\}`))![1];
      const rgb = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16)).join(", ");
      for (const name of backgrounds) assert.ok(block.includes(`--${name}: rgb(${rgb});`), `${name}: ${value} in ${mode}`);
    }
  }
});

test("invalid or missing palette colors preserve the previous CSS", t => {
  const root = fixture(t);
  const before = readFileSync(join(root, "theme.css"), "utf8");
  for (const edited of [
    palette.replaceAll("#268bd2", "#invalid"),
    palette.replace(/--link_color:[^;]+;/, ""),
    palette.replaceAll("#cb4b16", "#invalid"),
    palette.replace(/--dropdown-background:[^;]+;/, "--dropdown-background: #invalid;"),
    palette.replace(/--dropdown-background:[^;]+;/, ""),
    palette + "\n:root { --link_color: #ffffff; }",
    palette.replace("var(--solarized-blue)", "var(--missing_color)"),
    palette.replace("var(--solarized-blue)", "var(--link_color)"),
  ]) {
    writeFileSync(join(root, "palette.css"), edited);
    assert.throws(() => build(root), /Palette/);
    assert.equal(readFileSync(join(root, "theme.css"), "utf8"), before);
  }
});

test("a CSS minification warning preserves the previous stylesheet and licenses", t => {
  const root = fixture(t);
  const previous = ["theme.css", "LICENSES.txt"].map(name => readFileSync(join(root, name), "utf8"));
  writeFileSync(join(root, "palette.css"), palette + "\na { color red; }\n");
  assert.throws(() => build(root), /CSS/);
  assert.deepEqual(["theme.css", "LICENSES.txt"].map(name => readFileSync(join(root, name), "utf8")), previous);
});

test("numeric versions order correctly and reject invalid tags", () => {
  assert.equal(compareVersions("9.1.10", "9.1.9"), 1);
  assert.equal(compareVersions("9.1.4", "10.0.0"), -1);
  assert.equal(compareVersions("9.1.4", "9.1.4"), 0);
  for (const version of ["v1.0.0", "01.0.0", "1.0", "1.0.0-beta", "../../main"]) {
    assert.throws(() => compareVersions(version, "1.0.0"));
  }
});

test("build supports paths with spaces and preserves CSS on corrupt sources", t => {
  const root = fixture(t);
  build(root);
  const before = readFileSync(join(root, "theme.css"), "utf8");
  writeFileSync(join(root, "scripts/minimal/theme.css"), css + "corruption");
  assert.throws(() => build(root), /empreinte/);
  assert.equal(readFileSync(join(root, "theme.css"), "utf8"), before);
});

test("build refuses an unsupported Obsidian minimum without replacing CSS", t => {
  const root = fixture(t);
  writeFileSync(join(root, "manifest.json"), JSON.stringify({ ...manifest, minAppVersion: "0.0.1" }));
  const before = snapshot(root);
  assert.throws(() => build(root), /exige Obsidian/);
  assert.deepEqual(snapshot(root), before);
});

test("update installs a newer release by immutable commit and preserves the theme version", async t => {
  const root = fixture(t);
  olderCopy(root);
  const localPalette = palette.replaceAll("#268bd2", "#ff0000");
  writeFileSync(join(root, "palette.css"), localPalette);
  const calls: string[] = [];
  const replies = responses();
  replies.set(`${raw}/LICENSE`, license + "\nCopyright (c) Updated upstream notice\n");
  assert.match(await update(root, requester(replies, calls)), /0\.0\.1 ->/);
  assert.deepEqual(calls, [...responses().keys()]);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "scripts/minimal/version.json"), "utf8")), minimal);
  assert.equal(readFileSync(join(root, "theme.css"), "utf8"), render(css, minimal, localPalette));
  assert.equal(readFileSync(join(root, "palette.css"), "utf8"), localPalette);
  assert.ok(readFileSync(join(root, "LICENSES.txt"), "utf8").includes("Updated upstream notice"));
  const updated = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  assert.equal(updated.minAppVersion, minimal.minAppVersion);
  assert.equal(updated.version, manifest.version);
  assert.equal(updated.author, manifest.author);
});

test("an unchanged release rebuilds locally without downloading Minimal again", async t => {
  const root = fixture(t);
  writeFileSync(join(root, "theme.css"), "stale CSS");
  const calls: string[] = [];
  assert.match(await update(root, requester(responses(), calls)), /aucune nouvelle version/);
  assert.deepEqual(calls, [`${api}/releases/latest`]);
  assert.equal(readFileSync(join(root, "theme.css"), "utf8"), render(css, minimal, palette));
});

test("a newer local copy is never downgraded", async t => {
  const root = fixture(t);
  const replies = responses();
  replies.set(`${api}/releases/latest`, JSON.stringify({ tag_name: "0.0.1" }));
  const before = snapshot(root);
  await update(root, requester(replies));
  assert.deepEqual(snapshot(root), before);
});

test("network or HTTP failure at any download preserves all sources and output", async t => {
  const root = fixture(t);
  olderCopy(root);
  const before = snapshot(root);
  for (const failedUrl of responses().keys()) {
    const normal = requester(responses());
    const request: typeof fetch = async (url, options) => {
      if (String(url) === failedUrl) throw new Error("Simulated network failure");
      return normal(url, options);
    };
    await assert.rejects(update(root, request), /Simulated network failure/);
    assert.deepEqual(snapshot(root), before);
  }
  await assert.rejects(update(root, async () => new Response("rate limited", { status: 403 })), /HTTP 403/);
  assert.deepEqual(snapshot(root), before);
});

test("invalid release, commit, manifest, CSS or license cannot replace local files", async t => {
  const root = fixture(t);
  olderCopy(root);
  const before = snapshot(root);
  for (const [url, content] of [
    [`${api}/releases/latest`, "not JSON"],
    [`${api}/releases/latest`, JSON.stringify({ tag_name: "../../main" })],
    [`${api}/releases/latest`, JSON.stringify({ tag_name: minimal.version, prerelease: true })],
    [`${api}/commits/${minimal.version}`, JSON.stringify({ sha: "main" })],
    [`${raw}/manifest.json`, JSON.stringify({ version: "0.0.1", minAppVersion: "1.0.0" })],
    [`${raw}/theme.css`, "<html>Error</html>"],
    [`${raw}/theme.css`, css.replaceAll("--bg1:", "--missing-bg:")],
    [`${raw}/LICENSE`, "unknown license"],
  ]) {
    const replies = responses();
    replies.set(url, content);
    await assert.rejects(update(root, requester(replies)));
    assert.deepEqual(snapshot(root), before);
  }
});

test("dev watch rebuilds after CSS palette and TypeScript changes", { timeout: 15_000 }, async t => {
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
        writeFileSync(join(root, "palette.css"), palette.replaceAll("#268bd2", "#278bd2"));
      } else if (builds === 2) {
        assert.match(readFileSync(join(root, "theme.css"), "utf8"), /--color-blue-rgb: 39, 139, 210;/);
        const typography = join(root, "scripts/customize.ts");
        writeFileSync(typography, readFileSync(typography, "utf8").replace("--font-text-size: 23px", "--font-text-size: 24px"));
      } else break;
    }
    assert.equal(builds, 3, errors);
    assert.match(readFileSync(join(root, "theme.css"), "utf8"), /--solarized-blue: #278bd2;/);
    assert.match(readFileSync(join(root, "theme.css"), "utf8"), /--font-text-size: 24px/);
  } finally {
    lines.close();
    child.kill();
    await exited;
  }
});
