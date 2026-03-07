#!/usr/bin/env bash
# MCP Swiss comprehensive test runner
# Output: JSON results for each test

MCP="node /home/vikram/mcp-swiss/dist/index.js"
RESULTS_FILE="/home/vikram/mcp-swiss/test_results.jsonl"
> "$RESULTS_FILE"

call_tool() {
  local test_id="$1"
  local tool_name="$2"
  local args_json="$3"
  local description="$4"
  
  local payload="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$tool_name\",\"arguments\":$args_json}}"
  
  local start=$(date +%s%N)
  local response=$(echo "$payload" | timeout 30 $MCP 2>/dev/null)
  local end=$(date +%s%N)
  local ms=$(( (end - start) / 1000000 ))
  
  echo "{\"id\":\"$test_id\",\"tool\":\"$tool_name\",\"desc\":\"$description\",\"ms\":$ms,\"response\":$(echo "$response" | python3 -c 'import sys,json; d=sys.stdin.read(); print(json.dumps(d))')}" >> "$RESULTS_FILE"
  echo "$response"
}

# Test 1: tools/list
echo "=== TEST: tools/list ===" >&2
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 10 $MCP 2>/dev/null
echo "" >&2
