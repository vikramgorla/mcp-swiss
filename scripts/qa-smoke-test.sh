#!/bin/bash
set -e

# Load OAuth token
export CLAUDE_CODE_OAUTH_TOKEN=$(grep CLAUDE_CODE_OAUTH_TOKEN ~/.bashrc | cut -d'"' -f2)
MCP='{"mcpServers":{"swiss":{"command":"node","args":["dist/index.js"]}}}'
OPTS="--permission-mode bypassPermissions --max-turns 5 --mcp-config $MCP"
FAIL=0

run_test() {
  local name="$1"
  local prompt="$2"
  echo ""
  echo "=== $name ==="
  if OUTPUT=$(claude -p "$prompt" $OPTS 2>&1); then
    echo "$OUTPUT"
    echo "✅ $name passed"
  else
    echo "$OUTPUT"
    echo "❌ $name FAILED"
    FAIL=1
  fi
}

# Build first
npm run build

# Test each module
run_test "Transport" "Next train from Bern to Zürich. Use swiss MCP tools only."
run_test "Weather" "Current weather in Bern. Use swiss MCP tools only."
run_test "Geodata" "Geocode Bundesplatz 3 Bern. Use swiss MCP tools only."
run_test "Companies" "Search for Nestlé in ZEFIX. Use swiss MCP tools only."
run_test "Holidays" "Public holidays in Zürich 2026. Use swiss MCP tools only."
run_test "Parliament" "Latest 2 parliamentary votes. Use swiss MCP tools only."
run_test "Avalanche" "Avalanche bulletin info. Use swiss MCP tools only."
run_test "Air Quality" "Air quality stations list. Use swiss MCP tools only."
run_test "Post" "What is the postcode for Zermatt? Use swiss MCP tools only."
run_test "Energy" "Electricity cost in Bern. Use swiss MCP tools only."
run_test "Statistics" "Population of Zürich canton. Use swiss MCP tools only."
run_test "Multi-tool" "Plan a trip from Zürich to Lugano: train, weather, electricity cost. Use swiss MCP tools."

if [ $FAIL -eq 1 ]; then
  echo ""
  echo "❌ SOME SMOKE TESTS FAILED"
  exit 1
fi

echo ""
echo "✅ ALL SMOKE TESTS PASSED"
