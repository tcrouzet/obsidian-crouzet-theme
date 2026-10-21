#!/usr/bin/env python3
"""Build theme.css and optionally rebuild it when SCSS sources change."""

import argparse
from pathlib import Path
import subprocess
import sys
import time


ROOT = Path(__file__).resolve().parent.parent


def build():
    result = subprocess.run(
        ["sass", "--no-source-map", "--no-error-css", "--style=expanded",
         str(ROOT / "scripts/scss/theme.scss")],
        capture_output=True, text=True
    )
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    if result.returncode == 0:
        (ROOT / "theme.css").write_text(result.stdout, encoding="utf-8")
        print("theme.css reconstruit", flush=True)
    return result.returncode


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--watch", action="store_true", help="Reconstruire apres chaque modification SCSS")
    args = parser.parse_args()
    if not args.watch:
        return build()
    previous = None
    try:
        while True:
            current = {str(path): path.read_bytes() for path in (ROOT / "scripts/scss").rglob("*.scss")}
            if current != previous:
                build()
                previous = current
            time.sleep(0.5)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except OSError as error:
        print(f"Construction interrompue : {error}", file=sys.stderr)
        sys.exit(1)
