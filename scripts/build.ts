import { createHash, randomUUID } from "node:crypto";
import { readFileSync, renameSync, rmSync, watchFile, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import { customize } from "./customize.ts";
import { compilePalette } from "./palette.ts";

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export type Minimal = { version: string; commit: string; sha256: string; minAppVersion: string };

export function sha256(css: string): string {
  return createHash("sha256").update(css).digest("hex");
}

export function compareVersions(left: string, right: string): number {
  if (!VERSION.test(left) || !VERSION.test(right)) throw new Error("Version invalide");
  const a = left.split(".").map(BigInt), b = right.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

export function render(css: string, minimal: Minimal, palette: string): string {
  if (!VERSION.test(minimal.version) || !VERSION.test(minimal.minAppVersion)
      || !/^[a-f0-9]{40}$/.test(minimal.commit)
      || sha256(css) !== minimal.sha256) throw new Error("Copie Minimal invalide ou empreinte incorrecte");
  for (const token of [".theme-light", ".theme-dark", "--bg1:", "--ui1:", "--tx1:", "--ax1:"]) {
    if (!css.includes(token)) throw new Error(`Minimal incompatible : ${token} absent`);
  }
  if (css.includes("\0") || /^\s*</.test(css)) throw new Error("CSS Minimal invalide");
  const result = transformSync(`${css}\n${compilePalette(palette)}\n${customize()}`, {
    loader: "css", minifyWhitespace: true, legalComments: "none",
  });
  if (result.warnings.length) throw new Error(`CSS : ${result.warnings.map(warning => warning.text).join("; ")}`);
  return result.code;
}

export function renderLicenses(css: string, upstream: string, own: string): string {
  const notices = [...css.matchAll(/\/\*[\s\S]*?\*\//g)]
    .map(([comment]) => comment.slice(2, -2).trim())
    .filter(comment => /copyright|license/i.test(comment));
  return [...new Set([own.trim(), upstream.trim(), ...notices])].join("\n\n") + "\n";
}

// A failed build must leave the stylesheet Obsidian is reading intact.
export function writeAtomic(path: string, content: string): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, content);
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function build(root = ROOT): string {
  const minimal: Minimal = JSON.parse(readFileSync(join(root, "scripts/minimal/version.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  if (compareVersions(manifest.minAppVersion, minimal.minAppVersion) < 0) {
    throw new Error(`Minimal exige Obsidian ${minimal.minAppVersion}`);
  }
  const css = readFileSync(join(root, "scripts/minimal/theme.css"), "utf8");
  const output = render(css, minimal,
    readFileSync(join(root, "palette.css"), "utf8"));
  const licenses = renderLicenses(css, readFileSync(join(root, "scripts/minimal/LICENSE"), "utf8"),
    readFileSync(join(root, "LICENSE"), "utf8"));
  writeAtomic(join(root, "LICENSES.txt"), licenses);
  writeAtomic(join(root, "theme.css"), output);
  return minimal.version;
}

if (import.meta.main) {
  const rebuild = () => {
    try {
      console.log(`theme.css reconstruit depuis Minimal ${build()}`);
      process.exitCode = 0;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  };
  rebuild();
  if (process.argv.includes("--watch")) {
    watchFile(join(ROOT, "palette.css"), { interval: 200 }, rebuild);
  }
}
