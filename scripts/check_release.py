#!/usr/bin/env python3
"""Exercise release.sh with real builds and simulated Git/GitHub commands."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parent.parent
DRIVER = '''#!INTERPRETER
import json, os, sys
from pathlib import Path
tool = Path(sys.argv[0]).name
args = sys.argv[1:]
with Path('calls.jsonl').open('a') as log:
    log.write(json.dumps([tool, *args]) + '\\n')
if tool == 'gh':
    if args[:2] == ['repo', 'view']:
        print(json.dumps({'nameWithOwner': 'test/theme', 'defaultBranchRef': {'name': 'main'}}))
    elif args[:1] == ['api']:
        manifest = json.loads(Path('manifest.json').read_text())
        if os.environ.get('RELEASE_TEST_MISMATCH'):
            manifest['version'] = '0.0.0'
        print(json.dumps(manifest))
    else:
        sys.exit(90)
elif tool == 'git':
    if args[:2] == ['branch', '--show-current']:
        print(os.environ.get('RELEASE_TEST_BRANCH', 'main'))
    elif args[:1] == ['show-ref']:
        sys.exit(0 if os.environ.get('RELEASE_TEST_LOCAL_TAG') else 1)
    elif args[:1] == ['ls-remote']:
        if os.environ.get('RELEASE_TEST_REMOTE_TAG'):
            print('existing-tag')
    elif args[:1] == ['push'] and os.environ.get('RELEASE_TEST_REJECT_PUSH'):
        print('push rejected', file=sys.stderr)
        sys.exit(1)
    elif args[:1] not in (['ls-remote'], ['add'], ['commit'], ['push'], ['status'], ['tag']):
        sys.exit(91)
'''


def run_case(root, version="0.0.1", **overrides):
    manifest = json.loads((ROOT / "manifest.json").read_text())
    manifest["version"] = version
    (root / "manifest.json").write_text(json.dumps(manifest))
    (root / "calls.jsonl").write_text("")
    environment = dict(os.environ, PATH=str(root / "bin") + os.pathsep + os.environ["PATH"], **overrides)
    result = subprocess.run(["bash", str(root / "release.sh")], cwd="/", env=environment,
                            capture_output=True, text=True)
    calls = [json.loads(line) for line in (root / "calls.jsonl").read_text().splitlines()]
    return result, calls, json.loads((root / "manifest.json").read_text())["version"]


def main():
    with tempfile.TemporaryDirectory(prefix="crouzet release check ") as directory:
        root = Path(directory)
        shutil.copy2(ROOT / "release.sh", root / "release.sh")
        shutil.copy2(ROOT / "theme.css", root / "theme.css")
        shutil.copytree(ROOT / "scripts", root / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
        (root / "bin").mkdir()
        for name in ("git", "gh"):
            tool = root / "bin" / name
            tool.write_text(DRIVER.replace("INTERPRETER", sys.executable))
            tool.chmod(0o755)

        for current, expected in (("0.0.1", "0.0.2"), ("1.2.9", "1.2.10")):
            result, calls, version = run_case(root, current)
            assert result.returncode == 0, result.stderr
            assert version == expected
            assert ["git", "commit", "-m", f"Release {expected}"] in calls
            assert calls[-2:] == [["git", "tag", expected], ["git", "push", "origin", expected]]
            print(f"OK : {current} -> {expected}, manifeste et tag identiques sans prefixe v")

        for flag in ("RELEASE_TEST_LOCAL_TAG", "RELEASE_TEST_REMOTE_TAG"):
            result, calls, version = run_case(root, **{flag: "1"})
            assert result.returncode != 0 and version == "0.0.1"
            assert not any(call[:2] in (["git", "commit"], ["git", "push"], ["git", "tag"]) for call in calls)
            print(f"OK : collision refusee avant modification ({flag})")

        for flag in ("RELEASE_TEST_REJECT_PUSH", "RELEASE_TEST_MISMATCH"):
            result, calls, version = run_case(root, **{flag: "1"})
            assert result.returncode != 0 and version == "0.0.2"
            assert not any(call[:2] == ["git", "tag"] for call in calls)
            print(f"OK : publication du tag bloquee ({flag})")

        for version, overrides in (("v1.0.0", {}), ("01.0.0", {}), ("0.0.1", {"RELEASE_TEST_BRANCH": "feature"})):
            result, calls, actual = run_case(root, version, **overrides)
            assert result.returncode != 0 and actual == version
            assert not any(call[:2] == ["git", "commit"] for call in calls)
        print("OK : versions invalides et branche non principale refusees")


if __name__ == "__main__":
    main()
