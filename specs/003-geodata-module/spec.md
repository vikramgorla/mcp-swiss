# Spec: Geodata / swisstopo Module

**Spec ID:** 003  
**Status:** Implemented ✅  
**Module:** geodata  
**Tools:** 6  
**Author:** Vikram Gorla  
**Last Updated:** 2026-03-07

---

## Problem Statement

AI assistants need to resolve Swiss addresses to coordinates, discover Swiss geographic features (mountains, lakes, municipalities), and access specialized Swiss geodata (solar potential, land use, municipality boundaries). The swisstopo API is authoritative but uses Swiss-specific coordinate systems (LV95) that require conversion from/to WGS84.

## Business Value

- swisstopo is Switzerland's national mapping authority — highest quality geodata available
- Solar potential is a hot topic in Switzerland (pun intended) — the SFOE solar cadastre is unique
- Municipality data is needed for any civic/government query
- Geocoding Swiss addresses from German/French/Italian names is non-trivial without swisstopo

## User Stories

### P0 — Must have (shipped in v0.1.0)

**US-001:** Convert a Swiss address to coordinates.

*Acceptance Criteria:*
- `geocode(address="Bundesplatz 3, Bern")` returns lat/lon within 100m of actual location
- Returns both WGS84 and Swiss LV95 coordinates

**US-002:** Convert coordinates to a Swiss address.

*Acceptance Criteria:*
- `reverse_geocode(lat=46.9469, lng=7.4442)` returns an address in Bern city centre

**US-003:** Search Swiss place names and geographic features.

*Acceptance Criteria:*
- `search_places(query="Matterhorn")` returns the Matterhorn's coordinates
- `search_places(query="Zürichsee")` returns the lake

### P1 — High value

**US-004:** Get solar potential for a rooftop location.

*Acceptance Criteria:*
- `get_solar_potential(lat=46.947, lng=7.444)` returns `gstrahlung` and `klasse`
- Works for buildings in major Swiss cities

**US-005:** Identify all geodata at a specific Swiss location.

*Acceptance Criteria:*
- `identify_location(lat=46.947, lng=7.444)` returns municipality boundaries
- Returns multiple layers including swissBOUNDARIES data

**US-006:** Get Swiss municipality information by name.

*Acceptance Criteria:*
- `get_municipality(name="Zermatt")` returns BFS number, canton, coordinates

### P2 — Nice to have

**US-007:** Filter identify_location by specific layer IDs.
**US-008:** Height/elevation data at coordinates.

### P3 — Future

**US-009:** Swiss hiking trail data (SwitzerlandMobility integration).
**US-010:** Ski resort and cable car data.

## Tools

| Tool | Method | Endpoint |
|------|--------|----------|
| `geocode` | GET | `/rest/services/api/SearchServer?type=locations` |
| `reverse_geocode` | GET | `/rest/services/api/SearchServer?type=locations` |
| `search_places` | GET | `/rest/services/api/SearchServer?type=locations` |
| `get_solar_potential` | GET | `/rest/services/all/MapServer/identify` (layer: ch.bfe.solarenergie-eignung-daecher) |
| `identify_location` | GET | `/rest/services/all/MapServer/identify` |
| `get_municipality` | GET | `/rest/services/api/SearchServer?type=locations` |

## API Source

**Base URL:** `https://api3.geo.admin.ch`  
**Docs:** https://api3.geo.admin.ch/api/doc.html  
**Auth:** None  
**Rate limits:** None documented; Swiss federal open data  
**Coordinate system:** API accepts/returns both WGS84 (sr=4326) and LV95 (sr=2056)

## Coordinate Systems

Switzerland uses LV95 (EPSG:2056) natively. The API accepts `sr=4326` for WGS84 input/output.
For identify calls (MapServer), we convert WGS84→LV95 internally using the approximate Helmert formula.

```
WGS84 (lat/lng)  ←→  LV95 (E/N, ~2600000/1200000 range)
```

## Acceptance Criteria (Integration)

- [ ] `geocode(address="Bundeshaus, Bern")` returns lat≈46.946, lng≈7.444
- [ ] `reverse_geocode(lat=46.9469, lng=7.4442)` returns Bern centre address
- [ ] `search_places(query="Matterhorn")` returns lat≈45.976, lng≈7.658
- [ ] `get_solar_potential(lat=47.377, lng=8.541)` returns results for Zürich building
- [ ] `identify_location(lat=46.947, lng=7.444)` returns Bern municipality layer
- [ ] `get_municipality(name="Zermatt")` returns BFS number 6130

## Integration Tests (Human Tester)

1. Ask Claude: *"What are the coordinates of Bundeshaus in Bern?"* — verify lat≈46.946, lng≈7.444
2. Ask Claude: *"What's at 47.37, 8.54 in Switzerland?"* — verify Zürich area address returned
3. Ask Claude: *"What is the solar potential of Laubeggstrasse 1, Bern?"* — verify kWh/m² and suitability class
4. Ask Claude: *"Search for Riederalp"* — verify mountain village in VS returned

## Known Limitations

- `reverse_geocode` uses SearchServer (not a true reverse geocode endpoint) — results are approximate
- `get_solar_potential` only covers mapped building rooftops — returns empty in rural areas
- `identify_location` with no `layers` param queries ALL layers — can be slow and return large responses
- WGS84→LV95 conversion is approximate (Helmert formula, not official swisstopo REFRAME)
- Some layer IDs change between swisstopo API versions
