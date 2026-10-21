#!/usr/bin/env python3
"""Run the theme build and updater self-checks without network access."""

from pathlib import Path
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

from update import changed_sources


ROOT = Path(__file__).resolve().parent.parent


def main():
    with tempfile.TemporaryDirectory(prefix="crouzet theme check ") as directory:
        root = Path(directory)
        shutil.copytree(ROOT / "scripts/scss", root / "scripts/scss")
        shutil.copy2(ROOT / "scripts/build.py", root / "scripts/build.py")
        command = [sys.executable, str(root / "scripts/build.py")]
        subprocess.run(command, cwd="/", check=True)
        css = (root / "theme.css").read_text()
        assert css == (ROOT / "theme.css").read_text(), "theme.css doit etre reconstruit"
        assert "sourceMappingURL" not in css
        assert "@settings" in css and "id: solarized-theme-settings" in css
        for color in ("base03", "base3", "color-red", "color-green", "color-blue"):
            assert re.search(rf"--{color}:\s*rgb\(", css), color
        for selector in (".metadata-container", ".bases-view", ".canvas-wrapper", ".is-mobile"):
            assert selector in css, selector
        assert "var(--interactive-accent-hsl)" not in css
        assert "var(--red)" not in css
        for source in (root / "scripts/scss").glob("*.scss"):
            if source.name != "_palette.scss":
                assert not re.search(r"#[0-9a-fA-F]{3,8}\b|rgb\(\s*\d", source.read_text()), source
        print("OK : compilation reproductible, palette et composants, chemins avec espaces")

        assert changed_sources({"same": "a", "removed": "b", "edited": "c"},
                               {"same": "a", "added": "d", "edited": "e"}) == ["added", "edited", "removed"]
        assert changed_sources({}, {}) == []
        assert changed_sources({"same": "a"}, {"same": "a"}) == []
        print("OK : comparaison des ajouts, modifications, suppressions et sources inchangees")

        palette = root / "scripts/scss/_palette.scss"
        original = palette.read_text()
        palette.write_text(original + "\n.invalid { color: \n")
        failure = subprocess.run(command, capture_output=True, text=True)
        assert failure.returncode != 0 and "Error" in failure.stderr
        assert (root / "theme.css").read_text() == css, "CSS altere apres erreur Sass"
        palette.write_text(original)
        print("OK : erreur Sass signalee, CSS precedent conserve")

        shutil.copy2(ROOT / "scripts/update.py", root / "scripts/update.py")
        report = root / "scripts/upstream-review.md"
        report.write_text("Rapport precedent\n")
        curl = root / "curl"
        curl.write_text("#!/bin/sh\nexit 23\n")
        curl.chmod(0o755)
        environment = dict(os.environ, PATH=str(root) + os.pathsep + os.environ["PATH"])
        failure = subprocess.run([sys.executable, str(root / "scripts/update.py")],
                                 env=environment, capture_output=True, text=True)
        assert failure.returncode != 0 and "interrompue" in failure.stderr
        assert report.read_text() == "Rapport precedent\n"
        assert (root / "theme.css").read_text() == css
        assert palette.read_text() == original
        print("OK : echec reseau signale, rapport, CSS et sources conserves")

        watcher = subprocess.Popen(command + ["--watch"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        try:
            deadline = time.monotonic() + 10
            ready = False
            while time.monotonic() < deadline:
                assert watcher.poll() is None, "La surveillance Sass s'est arretee"
                if not ready:
                    palette.write_text(original + "\n.crouzet-watch-check { color: var(--color-blue); }\n")
                if ".crouzet-watch-check" in (root / "theme.css").read_text():
                    ready = True
                    palette.write_text(original + "\n.crouzet-watch-updated { color: var(--color-green); }\n")
                if ".crouzet-watch-updated" in (root / "theme.css").read_text():
                    break
                time.sleep(0.2)
            else:
                raise AssertionError("La surveillance n'a pas reconstruit le CSS apres modification")
        finally:
            watcher.terminate()
            watcher.communicate(timeout=5)
        print("OK : surveillance et reconstruction apres modification SCSS")


if __name__ == "__main__":
    main()
