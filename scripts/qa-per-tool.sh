#!/bin/bash
# QA Smoke Test — one prompt per tool (68 tools across 20 modules)
# Runs locally via Claude Code MCP client

set -o pipefail

export CLAUDE_CODE_OAUTH_TOKEN=$(grep CLAUDE_CODE_OAUTH_TOKEN ~/.bashrc | cut -d'"' -f2)
MCP='{"mcpServers":{"swiss":{"command":"node","args":["dist/index.js"]}}}'
OPTS="--permission-mode bypassPermissions --max-turns 5 --mcp-config $MCP"
PASS=0
FAIL=0
FAILED_TESTS=()

run_test() {
  local tool="$1"
  local prompt="$2"
  echo ""
  echo "=== [$tool] ==="
  if OUTPUT=$(claude -p "$prompt" $OPTS 2>&1); then
    echo "$OUTPUT" | tail -5
    echo "✅ $tool"
    PASS=$((PASS + 1))
  else
    echo "$OUTPUT" | tail -5
    echo "❌ $tool FAILED"
    FAIL=$((FAIL + 1))
    FAILED_TESTS+=("$tool")
  fi
}

# Build first
npm run build || { echo "BUILD FAILED"; exit 1; }

echo "=========================================="
echo "QA Per-Tool Smoke Tests — 68 tools"
echo "=========================================="

# --- Transport (5) ---
run_test "search_stations" "Search for train stations named Interlaken. Use the search_stations swiss MCP tool."
run_test "get_connections" "Get the next train connection from Bern to Zürich. Use the get_connections swiss MCP tool."
run_test "get_departures" "Show departures from Zürich HB station. Use the get_departures swiss MCP tool."
run_test "get_arrivals" "Show arrivals at Basel SBB. Use the get_arrivals swiss MCP tool."
run_test "get_nearby_stations" "Find train stations near latitude 46.95, longitude 7.44. Use the get_nearby_stations swiss MCP tool."

# --- Weather (6) ---
run_test "get_weather" "Current weather in Bern. Use the get_weather swiss MCP tool."
run_test "list_weather_stations" "List all MeteoSwiss weather stations. Use the list_weather_stations swiss MCP tool."
run_test "get_weather_history" "Weather history for Bern in the last 24 hours. Use the get_weather_history swiss MCP tool."
run_test "get_water_level" "Current water level of the Aare river. Use the get_water_level swiss MCP tool."
run_test "list_hydro_stations" "List all hydrology stations. Use the list_hydro_stations swiss MCP tool."
run_test "get_water_history" "Water level history for the Aare. Use the get_water_history swiss MCP tool."

# --- Geodata (6) ---
run_test "geocode" "Geocode the address Bundesplatz 3 Bern. Use the geocode swiss MCP tool."
run_test "reverse_geocode" "Reverse geocode latitude 46.9481 longitude 7.4474. Use the reverse_geocode swiss MCP tool."
run_test "search_places" "Search for places named Zermatt. Use the search_places swiss MCP tool."
run_test "get_solar_potential" "Solar potential at latitude 46.95 longitude 7.45. Use the get_solar_potential swiss MCP tool."
run_test "identify_location" "Identify what is at latitude 46.95 longitude 7.45. Use the identify_location swiss MCP tool."
run_test "get_municipality" "Get municipality info for Bern. Use the get_municipality swiss MCP tool."

# --- Companies (5) ---
run_test "search_companies" "Search for Nestlé in ZEFIX. Use the search_companies swiss MCP tool."
run_test "get_company" "Get details for company with UID CHE-105.909.036. Use the get_company swiss MCP tool."
run_test "search_companies_by_address" "Search companies at address Vevey. Use the search_companies_by_address swiss MCP tool."
run_test "list_cantons" "List all Swiss cantons. Use the list_cantons swiss MCP tool."
run_test "list_legal_forms" "List Swiss company legal forms. Use the list_legal_forms swiss MCP tool."

# --- Holidays (3) ---
run_test "get_public_holidays" "Public holidays in Zürich 2026. Use the get_public_holidays swiss MCP tool."
run_test "get_school_holidays" "School holidays in Zürich 2026. Use the get_school_holidays swiss MCP tool."
run_test "is_holiday_today" "Is today a public holiday in Switzerland? Use the is_holiday_today swiss MCP tool."

# --- Parliament (4) ---
run_test "search_parliament_business" "Search parliamentary business about climate. Use the search_parliament_business swiss MCP tool."
run_test "get_latest_votes" "Latest 3 parliamentary votes. Use the get_latest_votes swiss MCP tool."
run_test "search_councillors" "Search for councillor named Baume-Schneider. Use the search_councillors swiss MCP tool."
run_test "get_sessions" "List recent parliamentary sessions. Use the get_sessions swiss MCP tool."

# --- Avalanche (2) ---
run_test "get_avalanche_bulletin" "Current avalanche bulletin info. Use the get_avalanche_bulletin swiss MCP tool."
run_test "list_avalanche_regions" "List all avalanche warning regions. Use the list_avalanche_regions swiss MCP tool."

# --- Air Quality (2) ---
run_test "list_air_quality_stations" "List all NABEL air quality stations. Use the list_air_quality_stations swiss MCP tool."
run_test "get_air_quality" "Air quality legal limits in Switzerland. Use the get_air_quality swiss MCP tool."

# --- Post (4) ---
run_test "lookup_postcode" "What is the postcode for Zermatt? Use the lookup_postcode swiss MCP tool."
run_test "search_postcode" "Search for postcodes starting with 80. Use the search_postcode swiss MCP tool."
run_test "list_postcodes_in_canton" "List postcodes in canton Zug. Use the list_postcodes_in_canton swiss MCP tool."
run_test "track_parcel" "Track parcel 990012345678. Use the track_parcel swiss MCP tool."

# --- Energy (3) ---
run_test "get_electricity_tariff" "Electricity tariff in Bern for 2026. Use the get_electricity_tariff swiss MCP tool."
run_test "compare_electricity_tariffs" "Compare electricity tariffs between Zürich and Lugano. Use the compare_electricity_tariffs swiss MCP tool."
run_test "search_municipality_energy" "Search for energy municipality Bern. Use the search_municipality_energy swiss MCP tool."

# --- Statistics (3) ---
run_test "get_population" "Population of canton Zürich. Use the get_population swiss MCP tool."
run_test "search_statistics" "Search for statistics about housing. Use the search_statistics swiss MCP tool."
run_test "get_statistic" "Get a statistic about population. Use the get_statistic swiss MCP tool."

# --- SNB (3) ---
run_test "list_currencies" "List all SNB tracked currencies. Use the list_currencies swiss MCP tool."
run_test "get_exchange_rate" "Current CHF to EUR exchange rate. Use the get_exchange_rate swiss MCP tool."
run_test "get_exchange_rate_history" "EUR/CHF exchange rate history for the last year. Use the get_exchange_rate_history swiss MCP tool."

# --- Traffic (3) ---
run_test "get_traffic_count" "Traffic count at Gotthard. Use the get_traffic_count swiss MCP tool."
run_test "get_traffic_by_canton" "Traffic stations in canton Zürich. Use the get_traffic_by_canton swiss MCP tool."
run_test "get_traffic_nearby" "Traffic stations near latitude 47.37 longitude 8.54. Use the get_traffic_nearby swiss MCP tool."

# --- Recycling (3) ---
run_test "get_waste_collection" "Next waste collection for ZIP 8001. Use the get_waste_collection swiss MCP tool."
run_test "list_waste_types" "List all waste collection types. Use the list_waste_types swiss MCP tool."
run_test "get_waste_calendar" "Waste calendar for ZIP 8005 in March 2026. Use the get_waste_calendar swiss MCP tool."

# --- News (2) ---
run_test "get_swiss_news" "Latest Swiss news headlines. Use the get_swiss_news swiss MCP tool."
run_test "search_swiss_news" "Search Swiss news for climate. Use the search_swiss_news swiss MCP tool."

# --- Voting (3) ---
run_test "get_voting_results" "Recent Swiss popular vote results. Use the get_voting_results swiss MCP tool."
run_test "search_votes" "Search votes about AHV. Use the search_votes swiss MCP tool."
run_test "get_vote_details" "Details of the E-ID vote. Use the get_vote_details swiss MCP tool."

# --- Dams (3) ---
run_test "search_dams" "Search for Grande Dixence dam. Use the search_dams swiss MCP tool."
run_test "get_dams_by_canton" "List dams in canton Valais. Use the get_dams_by_canton swiss MCP tool."
run_test "get_dam_details" "Full details of Grande Dixence dam. Use the get_dam_details swiss MCP tool."

# --- Hiking (2) ---
run_test "get_trail_closures" "Current hiking trail closures in Switzerland. Use the get_trail_closures swiss MCP tool."
run_test "get_trail_closures_nearby" "Trail closures near Interlaken latitude 46.69 longitude 7.85. Use the get_trail_closures_nearby swiss MCP tool."

# --- Real Estate (3) ---
run_test "get_property_price_index" "Swiss property price index trend. Use the get_property_price_index swiss MCP tool."
run_test "search_real_estate_data" "Search for real estate datasets on opendata.swiss. Use the search_real_estate_data swiss MCP tool."
run_test "get_rent_index" "Swiss rent price index. Use the get_rent_index swiss MCP tool."

# --- Earthquakes (3) ---
run_test "get_recent_earthquakes" "Recent earthquakes in Switzerland. Use the get_recent_earthquakes swiss MCP tool."
run_test "get_earthquake_details" "Get details of the most recent Swiss earthquake. Use the get_recent_earthquakes tool first, then get_earthquake_details for the first event."
run_test "search_earthquakes_by_location" "Earthquakes near Bern latitude 46.95 longitude 7.45 in the last 90 days. Use the search_earthquakes_by_location swiss MCP tool."

# --- Summary ---
echo ""
echo "=========================================="
echo "RESULTS: $PASS passed, $FAIL failed out of $((PASS + FAIL))"
echo "=========================================="
if [ $FAIL -gt 0 ]; then
  echo "FAILED TOOLS:"
  for t in "${FAILED_TESTS[@]}"; do echo "  ❌ $t"; done
  exit 1
fi
echo "✅ ALL 68 TOOLS PASSED"
