#!/bin/bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

repository=$(gh repo view --json nameWithOwner,defaultBranchRef)
release_repo=$(jq -er '.nameWithOwner' <<< "$repository")
release_branch=$(jq -er '.defaultBranchRef.name' <<< "$repository")
current_branch=$(git branch --show-current)
[[ "$current_branch" == "$release_branch" ]] || {
  printf 'Lance release.sh depuis la branche par defaut : %s\n' "$release_branch" >&2
  exit 1
}

current_version=$(jq -er '.version | select(test("^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$"))' manifest.json)
current_patch=${current_version##*.}
release_tag="${current_version%.*}.$((current_patch + 1))"

if git show-ref --verify --quiet "refs/tags/$release_tag"; then
  printf 'Le tag local %s existe deja.\n' "$release_tag" >&2
  exit 1
else
  ref_status=$?
  [[ "$ref_status" -eq 1 ]] || exit "$ref_status"
fi
remote_tag=$(git ls-remote --tags origin "refs/tags/$release_tag")
[[ -z "$remote_tag" ]] || {
  printf 'Le tag distant %s existe deja.\n' "$release_tag" >&2
  exit 1
}

npm run build
npm run check

manifest_temp=$(mktemp .manifest.XXXXXX)
trap 'rm -f "$manifest_temp"' EXIT
jq --arg version "$release_tag" '.version = $version' manifest.json > "$manifest_temp"
mv -- "$manifest_temp" manifest.json

git add .
git commit -m "Release $release_tag"
git push -u origin "$release_branch"
working_state=$(git status --porcelain)
[[ -z "$working_state" ]] || {
  printf 'Arbre git non propre apres publication des sources.\n' >&2
  exit 1
}

published=$(gh api "repos/$release_repo/contents/manifest.json?ref=$release_branch" --jq '.content | @base64d | fromjson')
jq -en --slurpfile local manifest.json --argjson published "$published" '$local[0] == $published' > /dev/null || {
  printf 'Le manifeste GitHub differe du manifeste local ; aucun tag publie.\n' >&2
  exit 1
}

git tag "$release_tag"
git push origin "$release_tag"
printf 'Release %s confiee a GitHub Actions : https://github.com/%s/actions\n' "$release_tag" "$release_repo"
