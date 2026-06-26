#!/usr/bin/env bash
# run-lighthouse.sh — wrapper around `npx lighthouse` for the lighthouse-audit skill.
#
# Runs Google Lighthouse against a storefront URL for BOTH form-factors
# (mobile = Lighthouse default, and desktop via --preset=desktop) and writes
# JSON + HTML reports to a tmp output dir. Prints the JSON report paths on the
# last two lines (mobile first, then desktop) so the caller can feed them to
# parse-report.py.
#
# Usage:
#   run-lighthouse.sh <url> [outdir] [formfactor]
#     <url>         storefront URL to audit (REQUIRED, must be a public/preview
#                   storefront page — NOT the admin /editor URL)
#     [outdir]      where to write reports (default: ./.lighthouse)
#     [formfactor]  mobile | desktop | both  (default: both)
#
# Requires: Node + npx (lighthouse is fetched on demand via `npx --yes`),
# and Google Chrome installed. Nothing is installed into the repo.

set -euo pipefail

URL="${1:-}"
OUTDIR="${2:-./.lighthouse}"
FORM="${3:-both}"

if [[ -z "$URL" ]]; then
  echo "ERROR: no URL given. Usage: run-lighthouse.sh <storefront-url> [outdir] [mobile|desktop|both]" >&2
  exit 2
fi

case "$URL" in
  *"/admin/"*|*"/editor"*)
    echo "ERROR: '$URL' looks like an admin/editor URL. Lighthouse needs a STOREFRONT URL" >&2
    echo "       (e.g. https://<store>.myshopify.com/?preview_theme_id=<id>)." >&2
    exit 2
    ;;
esac

mkdir -p "$OUTDIR"

# Slugify the URL into a filename stem so repeated runs on different pages don't clobber.
STEM="$(printf '%s' "$URL" | sed -E 's#https?://##; s#[^a-zA-Z0-9]+#-#g; s#^-+|-+$##g' | cut -c1-60)"
[[ -z "$STEM" ]] && STEM="report"

COMMON_FLAGS=(--quiet --chrome-flags="--headless=new --no-sandbox" --output=json --output=html)

run_one() {
  local ff="$1"          # mobile | desktop
  local base="$OUTDIR/${STEM}-${ff}"
  local extra=()
  [[ "$ff" == "desktop" ]] && extra+=(--preset=desktop)

  echo ">> Lighthouse ($ff): $URL" >&2
  # --output-path with multiple --output writes <path>.report.json and <path>.report.html
  npx --yes lighthouse "$URL" "${COMMON_FLAGS[@]}" "${extra[@]}" --output-path="$base" >&2
  echo "${base}.report.json"
}

JSONS=()
case "$FORM" in
  mobile)  JSONS+=("$(run_one mobile)") ;;
  desktop) JSONS+=("$(run_one desktop)") ;;
  both)    JSONS+=("$(run_one mobile)"); JSONS+=("$(run_one desktop)") ;;
  *) echo "ERROR: formfactor must be mobile|desktop|both, got '$FORM'" >&2; exit 2 ;;
esac

echo "" >&2
echo "JSON reports written:" >&2
# Final stdout lines = the JSON paths, one per line, for the caller to parse.
for j in "${JSONS[@]}"; do echo "$j"; done
