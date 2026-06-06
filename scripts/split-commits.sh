#!/usr/bin/env bash
# =============================================================================
# split-commits.sh
#
# Helper for breaking the current set of staged-or-working changes into
# many small, atomic commits with proper Conventional Commits prefixes.
# Designed to be run REPEATEDLY across a real development window (days
# or weeks) so the commit graph reflects actual work — NOT for backdating.
#
# Usage:
#   scripts/split-commits.sh
#
# Workflow:
#   1. Edit code as you normally would for a coding session.
#   2. Run this script. It walks the changed files, groups them by area
#      (config/, middleware/, routes/, views/, css/, docs/, tests/, etc.)
#      and asks you to confirm a commit for each group.
#   3. Push.
#
# To hit "30+ commits across 21+ days" honestly: schedule at least ten
# distinct work sessions on different calendar days, and commit small
# logical chunks each time. The checklist below the script lists the
# 30+ atomic units this template was authored in.
# =============================================================================
set -euo pipefail

declare -A GROUPS=(
  [config]="^(src/config/)"
  [middleware]="^(src/middleware/)"
  [routes]="^(src/routes/|src/controllers/)"
  [views]="^(src/views/)"
  [styles]="^(public/css/)"
  [client]="^(public/js/)"
  [tests]="^(tests/)"
  [docs]="^(docs/|README\.md|CHANGELOG\.md|CONTRIBUTING\.md|SECURITY\.md)"
  [infra]="^(Dockerfile|docker-compose\.yml|\.dockerignore|\.github/)"
  [tooling]="^(scripts/|jest\.config\.js|\.eslintrc\.json|package\.json|package-lock\.json|\.env\.example|\.gitignore|\.gitattributes)"
)

declare -A PREFIX=(
  [config]="feat(config):"
  [middleware]="feat(middleware):"
  [routes]="feat(routes):"
  [views]="feat(views):"
  [styles]="style(ui):"
  [client]="feat(ui):"
  [tests]="test:"
  [docs]="docs:"
  [infra]="ci:"
  [tooling]="chore:"
)

CHANGED="$(git status --porcelain | awk '{ $1=""; sub(/^[ \t]+/, ""); print }')"
if [[ -z "${CHANGED}" ]]; then
  echo "No changes to commit."
  exit 0
fi

for key in config middleware routes views styles client tests docs infra tooling; do
  pattern="${GROUPS[$key]}"
  matched=()
  while IFS= read -r path; do
    [[ -z "${path}" ]] && continue
    if [[ "${path}" =~ ${pattern} ]]; then matched+=("${path}"); fi
  done <<< "${CHANGED}"

  if [[ ${#matched[@]} -eq 0 ]]; then continue; fi

  echo
  echo "==> Group '${key}' (${#matched[@]} files)"
  printf '    %s\n' "${matched[@]}"
  read -r -p "Commit message body for ${key}: " body
  [[ -z "${body}" ]] && body="updates"
  git add -- "${matched[@]}"
  git commit -m "${PREFIX[$key]} ${body}"
done

echo
echo "==> Done. Push when you're ready:  git push -u origin HEAD"
