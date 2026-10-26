import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { ROOT } from "./build.ts";

const driver = `#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
const tool = basename(process.argv[1]);
const args = process.argv.slice(2);
appendFileSync('calls.jsonl', JSON.stringify([tool, ...args]) + '\\n');
if (tool === 'gh') {
  if (args[0] === 'repo' && args[1] === 'view') {
    console.log(JSON.stringify({nameWithOwner: 'test/theme', defaultBranchRef: {name: 'main'}}));
  } else if (args[0] === 'api') {
    const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
    if (process.env.RELEASE_TEST_MISMATCH) manifest.version = '0.0.0';
    console.log(JSON.stringify(manifest));
  } else process.exit(90);
} else if (tool === 'git') {
  if (args[0] === 'branch') console.log(process.env.RELEASE_TEST_BRANCH || 'main');
  else if (args[0] === 'show-ref') process.exit(process.env.RELEASE_TEST_LOCAL_TAG ? 0 : 1);
  else if (args[0] === 'ls-remote') {
    if (process.env.RELEASE_TEST_REMOTE_TAG) console.log('existing-tag');
  } else if (args[0] === 'push' && process.env.RELEASE_TEST_REJECT_PUSH) process.exit(1);
  else if (args[0] === 'status' && process.env.RELEASE_TEST_DIRTY) console.log(' M theme.css');
  else if (!['add', 'commit', 'push', 'status', 'tag'].includes(args[0])) process.exit(91);
} else process.exit(92);
`;

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "crouzet release check "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, "scripts"), join(root, "scripts"), { recursive: true });
  for (const file of ["release.sh", "theme.css", "package.json", "palette.css"]) cpSync(join(ROOT, file), join(root, file));
  mkdirSync(join(root, "bin"));
  for (const tool of ["git", "gh"]) {
    writeFileSync(join(root, "bin", tool), driver);
    chmodSync(join(root, "bin", tool), 0o755);
  }
  return root;
}

function runCase(root: string, version = "0.0.1", overrides: Record<string, string> = {}) {
  const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
  writeFileSync(join(root, "manifest.json"), JSON.stringify({ ...manifest, version }));
  writeFileSync(join(root, "calls.jsonl"), "");
  const result = spawnSync("bash", [join(root, "release.sh")], {
    cwd: "/", encoding: "utf8",
    env: { ...process.env, PATH: join(root, "bin") + delimiter + process.env.PATH, ...overrides },
  });
  const calls: string[][] = readFileSync(join(root, "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  const actual = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).version;
  return { ...result, calls, version: actual };
}

test("release increments patch and publishes a numeric tag matching the manifest", t => {
  const root = fixture(t);
  for (const [current, next] of [["0.0.1", "0.0.2"], ["1.2.9", "1.2.10"]]) {
    const result = runCase(root, current);
    assert.equal(result.status, 0, result.stderr + result.stdout);
    assert.equal(result.version, next);
    assert.ok(result.calls.some(call => JSON.stringify(call) === JSON.stringify(["git", "commit", "-m", `Release ${next}`])));
    assert.deepEqual(result.calls.slice(-2), [["git", "tag", next], ["git", "push", "origin", next]]);
  }
});

test("local or remote tag collisions stop before changing the version or publishing", t => {
  const root = fixture(t);
  for (const flag of ["RELEASE_TEST_LOCAL_TAG", "RELEASE_TEST_REMOTE_TAG"]) {
    const result = runCase(root, "0.0.1", { [flag]: "1" });
    assert.notEqual(result.status, 0);
    assert.equal(result.version, "0.0.1");
    assert.ok(!result.calls.some(call => ["commit", "push", "tag"].includes(call[1])));
  }
});

test("rejected push, dirty tree or remote manifest mismatch prevents tag publication", t => {
  const root = fixture(t);
  for (const flag of ["RELEASE_TEST_REJECT_PUSH", "RELEASE_TEST_DIRTY", "RELEASE_TEST_MISMATCH"]) {
    const result = runCase(root, "0.0.1", { [flag]: "1" });
    assert.notEqual(result.status, 0);
    assert.equal(result.version, "0.0.2");
    assert.ok(!result.calls.some(call => call[1] === "tag"));
  }
});

test("invalid versions or non-default branch stop before commit", t => {
  const root = fixture(t);
  for (const [version, overrides] of [
    ["v1.0.0", {}], ["01.0.0", {}], ["0.0.1", { RELEASE_TEST_BRANCH: "feature" }],
  ] as const) {
    const result = runCase(root, version, overrides);
    assert.notEqual(result.status, 0);
    assert.equal(result.version, version);
    assert.ok(!result.calls.some(call => ["commit", "push", "tag"].includes(call[1])));
  }
});

test("a failed real build stops release before changing the manifest", t => {
  const root = fixture(t);
  writeFileSync(join(root, "scripts/minimal/theme.css"), "corrupt source");
  const result = runCase(root);
  assert.notEqual(result.status, 0);
  assert.equal(result.version, "0.0.1");
  assert.ok(!result.calls.some(call => ["commit", "push", "tag"].includes(call[1])));
});
