# Spec: Transport Module

**Spec ID:** 001  
**Status:** Implemented ✅  
**Module:** transport  
**Tools:** 5  
**Author:** Vikram Gorla  
**Last Updated:** 2026-03-07

---

## Problem Statement

AI assistants need real-time access to Swiss public transport data to answer natural language questions like "next train from Bern to Zürich" or "which buses leave from my nearest stop in 10 minutes?". Without this, users must context-switch to SBB Mobile or Google Maps.

## Business Value

- Enables the most common Swiss travel planning queries in natural language
- SBB operates one of the world's most punctual rail networks — real-time departure data is high quality
- Zero auth required — transport.opendata.ch is a free, open Swiss government API
- Covers all modes: trains, PostBus, trams, S-Bahn, boats

## User Stories

### P0 — Must have (shipped in v0.1.0)

**US-001:** As a user, I can ask "next trains from Zürich HB to Bern" and get departure times, platforms, and journey duration.

*Acceptance Criteria:*
- `get_connections(from="Zürich HB", to="Bern")` returns ≥1 connection
- Response includes departure time, arrival time, platform, operator
- Works for both station names and addresses

**US-002:** As a user, I can ask "live departures from Bern HB" and see the next trains leaving.

*Acceptance Criteria:*
- `get_departures(station="Bern")` returns ≥1 departure
- Response includes line, destination, platform, delay
- Delay is shown in minutes (null if no real-time data)

**US-003:** As a user, I can find the nearest SBB station to my location.

*Acceptance Criteria:*
- `get_nearby_stations(x=7.44, y=46.95)` returns ≥1 station with distance in meters
- Results are sorted by distance ascending

### P1 — High value

**US-004:** As a user, I can look up live arrivals at a station.

*Acceptance Criteria:*
- `get_arrivals(station="Zürich HB")` returns ≥1 arrival with train origin, platform, delay

**US-005:** As a user, I can search stations by name to confirm spelling or find a stop ID.

*Acceptance Criteria:*
- `search_stations(query="Zürich")` returns multiple matching stations
- Filtering by `type=station` excludes addresses/POIs

### P2 — Nice to have

**US-006:** Journey planning with specific date/time (e.g. "trains tomorrow at 9am").
**US-007:** Arrival-time planning (e.g. "I need to be in Basel by 10am, when should I leave?").

### P3 — Future

**US-008:** Real-time disruption alerts and track changes.
**US-009:** Accessibility information (low-floor, lift, ramps).

## Tools

| Tool | Method | Endpoint |
|------|--------|----------|
| `search_stations` | GET | `/v1/locations` |
| `get_connections` | GET | `/v1/connections` |
| `get_departures` | GET | `/v1/stationboard?type=departure` |
| `get_arrivals` | GET | `/v1/stationboard?type=arrival` |
| `get_nearby_stations` | GET | `/v1/locations` (with x/y) |

## API Source

**Base URL:** `https://transport.opendata.ch/v1`  
**Docs:** http://transport.opendata.ch/docs.html  
**Auth:** None  
**Rate limits:** Reasonable use; no documented hard limit  
**Coverage:** All Swiss public transport (SBB, PostAuto, ZVV, BLS, etc.)

## Acceptance Criteria (Integration)

- [ ] `search_stations(query="Zürich HB")` returns station with id `8503000`
- [ ] `get_connections(from="Bern", to="Zürich")` returns connections with valid departure/arrival times
- [ ] `get_departures(station="Bern", limit=5)` returns exactly 5 departures
- [ ] `get_arrivals(station="Bern", limit=5)` returns exactly 5 arrivals
- [ ] `get_nearby_stations(x=7.44744, y=46.94797)` returns stations near Bern city centre
- [ ] All tools handle station-not-found gracefully (empty array, not error)

## Integration Tests (Human Tester)

1. Ask Claude: *"Next 3 trains from Zürich HB to Geneva right now"* — verify realistic departure times and platforms appear
2. Ask Claude: *"Live departures from Bern HB"* — verify list of trains with SBB/BLS operators
3. Ask Claude: *"What's the nearest train station to lat 47.37, lng 8.54?"* — should return Zürich HB area stations
4. Ask Claude: *"Plan a trip from Lucerne to Lugano tomorrow at 2pm"* — verify cross-canton connection with transfers

## Known Limitations

- No historical data (past connections/departures not available)
- `delay` field is `null` during off-peak or for some operators
- `get_nearby_stations` does not support a custom `distance` radius filter via this API (workaround: filter client-side)
- Station names must be in Swiss spelling (e.g. "Zürich", not "Zurich") — though the API fuzzy-matches reasonably well
- No cancellation or disruption data in this API version
