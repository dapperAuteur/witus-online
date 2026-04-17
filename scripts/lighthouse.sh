#!/usr/bin/env bash
# scripts/lighthouse.sh
# Runs Lighthouse mobile on every public route and summarises the scores.
# Fails (exit 1) if any route drops below the guardrail thresholds.
# Lighthouse 12+ removed the PWA category; we audit installability separately
# via DevTools, not this script.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
OUT_DIR="${OUT_DIR:-plans/reports/assets/05-lighthouse}"
THRESH_A11Y=95
THRESH_SEO=95
THRESH_PERF=90

ROUTES=(
  "/"
  "/about"
  "/learn"
  "/learn/bio"
  "/learn/curriculum"
  "/learn/research"
  "/learn/partnerships"
  "/roadmap"
  "/account"
  "/terms"
  "/privacy"
)

mkdir -p "$OUT_DIR"
SUMMARY="$OUT_DIR/summary.md"
echo "# Lighthouse mobile summary" > "$SUMMARY"
echo "" >> "$SUMMARY"
echo "Run: $(date -u +"%Y-%m-%dT%H:%M:%SZ") against $BASE_URL" >> "$SUMMARY"
echo "" >> "$SUMMARY"
echo "| Route | A11y | SEO | Perf |" >> "$SUMMARY"
echo "|---|---|---|---|" >> "$SUMMARY"

fail=0
for path in "${ROUTES[@]}"; do
  slug="${path//\//_}"
  [ "$slug" = "_" ] && slug="_home"
  json="$OUT_DIR/${slug}.json"
  echo "--- Lighthouse: $path ---" >&2
  npx --yes lighthouse "$BASE_URL$path" \
    --only-categories=accessibility,seo,performance \
    --form-factor=mobile \
    --output=json \
    --output-path="$json" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet >/dev/null

  read -r a11y seo perf <<EOF
$(node -e "const r=JSON.parse(require('fs').readFileSync('$json'));console.log(Math.round(r.categories.accessibility.score*100), Math.round(r.categories.seo.score*100), Math.round(r.categories.performance.score*100))")
EOF

  echo "| \`$path\` | $a11y | $seo | $perf |" >> "$SUMMARY"

  [ "$a11y" -ge $THRESH_A11Y ] || { echo "FAIL a11y on $path: $a11y < $THRESH_A11Y" >&2; fail=1; }
  [ "$seo"  -ge $THRESH_SEO  ] || { echo "FAIL seo  on $path: $seo  < $THRESH_SEO"  >&2; fail=1; }
  [ "$perf" -ge $THRESH_PERF ] || { echo "FAIL perf on $path: $perf < $THRESH_PERF" >&2; fail=1; }
done

echo "" >> "$SUMMARY"
echo "Thresholds: A11y ≥ $THRESH_A11Y, SEO ≥ $THRESH_SEO, Perf ≥ $THRESH_PERF." >> "$SUMMARY"
echo "PWA installability verified separately via Chrome DevTools → Application → Manifest." >> "$SUMMARY"

cat "$SUMMARY"
exit $fail
