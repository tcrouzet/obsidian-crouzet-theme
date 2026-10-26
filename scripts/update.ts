import { readFileSync } from "node:fs";
import { join } from "node:path";
import { build, compareVersions, render, ROOT, sha256, VERSION, writeAtomic } from "./build.ts";
import type { Minimal } from "./build.ts";

const API = "https://api.github.com/repos/kepano/obsidian-minimal";
const RAW = "https://raw.githubusercontent.com/kepano/obsidian-minimal";

async function download(url: string, request: typeof fetch): Promise<string> {
  const response = await request(url, {
    headers: { "User-Agent": "CrouzetTheme-updater" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} : ${url}`);
  return response.text();
}

export async function update(root = ROOT, request: typeof fetch = fetch): Promise<string> {
  const directory = join(root, "scripts/minimal");
  const previous: Minimal = JSON.parse(readFileSync(join(directory, "version.json"), "utf8"));
  const release = JSON.parse(await download(`${API}/releases/latest`, request));
  if (typeof release.tag_name !== "string" || release.draft || release.prerelease) {
    throw new Error("Release Minimal invalide");
  }
  const version = release.tag_name.replace(/^v/, "");
  if (!VERSION.test(version)) throw new Error("Version Minimal invalide");
  if (compareVersions(version, previous.version) <= 0) {
    build(root);
    return `Minimal ${previous.version} : aucune nouvelle version, theme.css reconstruit`;
  }

  const { sha: commit } = JSON.parse(await download(`${API}/commits/${release.tag_name}`, request));
  if (typeof commit !== "string" || !/^[a-f0-9]{40}$/.test(commit)) throw new Error("Commit Minimal invalide");
  const upstream = JSON.parse(await download(`${RAW}/${commit}/manifest.json`, request));
  if (upstream.version !== version || !VERSION.test(upstream.minAppVersion)) {
    throw new Error("Manifeste Minimal incompatible avec la release");
  }
  const css = await download(`${RAW}/${commit}/theme.css`, request);
  const license = await download(`${RAW}/${commit}/LICENSE`, request);
  if (!license.includes("MIT License") || !license.includes("Steph Ango")) throw new Error("Licence Minimal invalide");
  const minimal: Minimal = { version, commit, sha256: sha256(css), minAppVersion: upstream.minAppVersion };
  const output = render(css, minimal, readFileSync(join(root, "palette.css"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  if (compareVersions(manifest.minAppVersion, minimal.minAppVersion) < 0) {
    manifest.minAppVersion = minimal.minAppVersion;
  }

  // Finish all downloads and validation before replacing local sources.
  writeAtomic(join(directory, "theme.css"), css);
  writeAtomic(join(directory, "LICENSE"), license);
  writeAtomic(join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  writeAtomic(join(root, "theme.css"), output);
  writeAtomic(join(directory, "version.json"), JSON.stringify(minimal, null, 2) + "\n");
  return `Minimal ${previous.version} -> ${version} : theme.css reconstruit`;
}

if (import.meta.main) {
  try {
    console.log(await update());
  } catch (error) {
    console.error(`Mise a jour interrompue : ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
