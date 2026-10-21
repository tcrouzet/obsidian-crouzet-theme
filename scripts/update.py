#!/usr/bin/env python3
"""Compare upstream SCSS with the reviewed revisions, then rebuild locally."""

import difflib
import json
from pathlib import Path
import subprocess
import sys
from urllib.parse import quote


ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = {
    "harmtemolder/obsidian-solarized": "11cc702755b912abcedbebb6328a32ffddc03eff",
    "kepano/obsidian-minimal": "93321bdc23fc879966e1e3aa0cfeda77012f540f",
}


def fetch(url):
    return subprocess.run(
        ["curl", "--fail", "--silent", "--show-error", "--location",
         "--max-time", "30", "--user-agent", "CrouzetTheme-updater", url],
        check=True, capture_output=True, encoding="utf-8"
    ).stdout


def source_tree(repo, revision):
    data = json.loads(fetch(
        f"https://api.github.com/repos/{repo}/git/trees/{revision}?recursive=1"
    ))
    if data.get("truncated"):
        raise ValueError(f"Liste des sources incomplete : {repo}")
    sources = {
        entry["path"]: entry["sha"] for entry in data["tree"]
        if entry["type"] == "blob"
        and (entry["path"].endswith(".scss") or entry["path"] == "manifest.json")
    }
    if not sources:
        raise ValueError(f"Aucune source trouvee : {repo}")
    return sources


def changed_sources(before, after):
    return sorted(path for path in before.keys() | after.keys()
                  if before.get(path) != after.get(path))


def upstream_report():
    report = ["# Styles amont à ajuster", "",
              "Rapport généré. Conserver les ajustements dans les sources SCSS locales.", "",
              "Les différences couvrent les sources SCSS et le manifeste des deux thèmes. Les fonctionnalités propres à Minimal demandent une adaptation de leurs variables et options.", ""]
    for repo, baseline in UPSTREAM.items():
        before = source_tree(repo, baseline)
        revision = json.loads(fetch(f"https://api.github.com/repos/{repo}/commits/HEAD"))["sha"]
        after = before if revision == baseline else source_tree(repo, revision)
        changes = changed_sources(before, after)
        report += [f"## {repo}", "",
                   f"Référence examinée : [{baseline}](https://github.com/{repo}/tree/{baseline}).", "",
                   f"Révision disponible : [{revision}](https://github.com/{repo}/tree/{revision}).", ""]
        if not changes:
            report += ["Aucune modification des sources depuis la référence examinée.", ""]
        for path in changes:
            texts = []
            for ref, sources in ((baseline, before), (revision, after)):
                texts.append(fetch(f"https://raw.githubusercontent.com/{repo}/{ref}/{quote(path)}")
                             if path in sources else "")
            patch = "".join(difflib.unified_diff(
                texts[0].splitlines(keepends=True), texts[1].splitlines(keepends=True),
                fromfile=f"{baseline}/{path}", tofile=f"{revision}/{path}"
            ))
            report += [f"### À AJUSTER : {path}", "", "````diff", patch.rstrip(), "````", ""]
    return "\n".join(report)


def main():
    try:
        report = upstream_report()
        subprocess.run([sys.executable, str(ROOT / "scripts/build.py")], check=True)
        destination = ROOT / "scripts/upstream-review.md"
        destination.write_text(report, encoding="utf-8")
        print(f"Comparaison : {destination}\nCSS reconstruit : {ROOT / 'theme.css'}")
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        detail = (error.stderr or str(error)) if isinstance(error, subprocess.CalledProcessError) else str(error)
        print(f"Mise à jour interrompue : {detail}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
