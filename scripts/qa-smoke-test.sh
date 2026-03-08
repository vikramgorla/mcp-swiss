#!/bin/bash
set -e

# Load OAuth token
export CLAUDE_CODE_OAUTH_TOKEN=$(grep CLAUDE_CODE_OAUTH_TOKEN ~/.bashrc | cut -d'"' -f2)
MCP='{"mcpServers":{"swiss":{"command":"node","args":["dist/index.js"]}}}'
OPTS="--permission-mode bypassPermissions --max-turns 5 --mcp-config $MCP"
FAIL=0
PASS=0
FAILED_TESTS=()

run_test() {
  local name="$1"
  local prompt="$2"
  echo ""
  echo "=== $name ==="
  if OUTPUT=$(claude -p "$prompt" $OPTS 2>&1); then
    echo "$OUTPUT"
    echo "✅ $name passed"
    PASS=$((PASS + 1))
  else
    echo "$OUTPUT"
    echo "❌ $name FAILED"
    FAIL=1
    FAILED_TESTS+=("$name")
  fi
}

# Build first
npm run build

# ── Original 11 modules ──────────────────────────────────────────────────────
run_test "Transport"    "Next train from Bern to Zürich. Use swiss MCP tools only."
run_test "Weather"      "Current weather in Bern. Use swiss MCP tools only."
run_test "Geodata"      "Geocode Bundesplatz 3 Bern. Use swiss MCP tools only."
run_test "Companies"    "Search for Nestlé in ZEFIX. Use swiss MCP tools only."
run_test "Holidays"     "Public holidays in Zürich 2026. Use swiss MCP tools only."
run_test "Parliament"   "Latest 2 parliamentary votes. Use swiss MCP tools only."
run_test "Avalanche"    "Avalanche bulletin info. Use swiss MCP tools only."
run_test "Air Quality"  "Air quality stations list. Use swiss MCP tools only."
run_test "Post"         "What is the postcode for Zermatt? Use swiss MCP tools only."
run_test "Energy"       "Electricity cost in Bern. Use swiss MCP tools only."
run_test "Statistics"   "Population of Zürich canton. Use swiss MCP tools only."

# ── 9 new modules ────────────────────────────────────────────────────────────
run_test "SNB Exchange Rates"      "What is the current CHF to EUR exchange rate? Use swiss MCP tools only."
run_test "ASTRA Traffic"           "Traffic count at Gotthard. Use swiss MCP tools only."
run_test "Recycling"               "Next waste collection for ZIP 8001. Use swiss MCP tools only."
run_test "Swiss News"              "Latest Swiss news headlines. Use swiss MCP tools only."
run_test "Voting Results"          "Recent Swiss popular vote results. Use swiss MCP tools only."
run_test "Dams & Reservoirs"       "Search for Grande Dixence dam. Use swiss MCP tools only."
run_test "Hiking Trail Closures"   "Any hiking trail closures? Use swiss MCP tools only."
run_test "Real Estate"             "Swiss property price index trend. Use swiss MCP tools only."
run_test "Earthquakes"             "Recent earthquakes in Switzerland. Use swiss MCP tools only."

# ── Multi-tool chain test (updated) ──────────────────────────────────────────
run_test "Multi-tool" "Plan a trip from Zürich to Zermatt: train schedule, weather, exchange rate CHF/EUR, any trail closures near Zermatt. Use swiss MCP tools."

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "  QA SMOKE TEST SUMMARY"
echo "════════════════════════════════════════"
echo "  ✅ Passed: $PASS / $((PASS + ${#FAILED_TESTS[@]}))"

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo "  ❌ Failed: ${#FAILED_TESTS[@]}"
  echo ""
  echo "  Failed tests:"
  for t in "${FAILED_TESTS[@]}"; do
    echo "    - $t"
  done
fi

echo "════════════════════════════════════════"

if [ $FAIL -eq 1 ]; then
  echo ""
  echo "❌ SOME SMOKE TESTS FAILED"
  exit 1
fi

echo ""
echo "✅ ALL SMOKE TESTS PASSED"
