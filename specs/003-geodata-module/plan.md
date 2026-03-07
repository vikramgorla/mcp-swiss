# Plan: Geodata / swisstopo Module

**Spec:** 003  
**Status:** Implemented ✅

---

## Architectural Vision

Two distinct swisstopo API patterns are used:
1. **SearchServer** — text-based search for addresses, place names, municipalities
2. **MapServer/identify** — point-in-polygon for solar potential and geodata layers

Both return WGS84 (`sr=4326`) when requested. The WGS84→LV95 conversion is needed only for the MapServer identify `mapExtent` and `geometry` parameters.

## Data Flow: SearchServer tools

```
geocode({address: "Bundesplatz 3, Bern"})
    │
    ▼
buildUrl(BASE + "/rest/services/api/SearchServer", {
  searchText: "Bundesplatz 3, Bern",
  type: "locations",
  sr: 4326,
  limit: 10
})
    │
    ▼
GET https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=...&sr=4326
    │
    ▼
{results: [{id, attrs: {label, lat, lon, x, y}}]}
    │
    ▼
JSON.stringify(data, null, 2)
```

## Data Flow: MapServer/identify tools

```
get_solar_potential({lat: 47.377, lng: 8.541})
    │
    ▼
wgs84ToLV95(47.377, 8.541) → {x: 2683123, y: 1248456}  (approx)
    │
    ▼
buildUrl(BASE + "/rest/services/all/MapServer/identify", {
  geometry: "8.541,47.377",
  geometryType: "esriGeometryPoint",
  layers: "all:ch.bfe.solarenergie-eignung-daecher",
  mapExtent: "8.491,47.327,8.591,47.427",
  imageDisplay: "500,500,96",
  tolerance: 100,
  sr: 4326,
  returnGeometry: false
})
    │
    ▼
GET https://api3.geo.admin.ch/rest/services/all/MapServer/identify?...
    │
    ▼
{results: [{layerName, attributes: {gstrahlung, klasse, stromertrag}}]}
```

## Coordinate Conversion (WGS84 → LV95)

The `wgs84ToLV95` function uses the Swiss Approximate Formula (accurate to ~1m):

```
phiPrime = (lat * 3600 - 169028.66) / 10000
lambdaPrime = (lng * 3600 - 26782.5) / 10000
E = 2600072.37 + 211455.93λ' - 10938.51λ'φ' - ...
N = 1200147.07 + 308807.95φ' + 3745.25λ'² + ...
```

This is sufficient for `mapExtent` bounding box calculations. For precise REFRAME conversion, use the official swisstopo REFRAME API (out of scope for v0.1.0).

## Tool Overlap (Intentional)

`geocode`, `search_places`, `get_municipality`, and `reverse_geocode` all use the same SearchServer endpoint with slightly different `searchText` values. This is intentional — the MCP tools expose different semantic intents that AI assistants understand as distinct capabilities.

## Edge Cases Handled

| Case | Handling |
|------|----------|
| No results for address | API returns `{results: []}` — returned as-is |
| Rural area (no solar data) | `identify` returns `{results: []}` — returned as-is |
| `void extent` in reverse_geocode | Computed but intentionally unused (comment explains) — ESLint note |
| Layers param | If provided, prepended with `all:` prefix for MapServer |

## Performance

- SearchServer: fast, ~200–500ms
- MapServer identify: 500ms–2s depending on layers
- `identify_location` with default (all) layers can be slow — suggest specifying layers for production use
