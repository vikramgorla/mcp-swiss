# Plan: Weather & Hydrology Module

**Spec:** 002  
**Status:** Implemented ✅

---

## Architectural Vision

Thin adapter over `api.existenz.ch/apiv1`. The API unifies MeteoSwiss SMN (weather) and BAFU (hydrology) under one host with consistent parameter naming. Response format is identical for both domains — `{payload: [{loc, date, par, val}]}` — making the module internally symmetric.

SMN and hydro follow the exact same pattern:
- `/smn/latest` ↔ `/hydro/latest`
- `/smn/locations` ↔ `/hydro/locations`
- `/smn/daterange` ↔ `/hydro/daterange`

This symmetry means 6 tools are implemented with essentially the same 3 patterns.

## Data Flow

```
MCP Tool Call: get_weather({station: "BER"})
    │
    ▼
handleWeather("get_weather", {station: "BER"})
    │
    │ buildUrl("https://api.existenz.ch/apiv1/smn/latest", {
    │   locations: "BER",
    │   app: "mcp-swiss",
    │   version: "0.1.0"
    │ })
    ▼
fetchJSON<unknown>(url)
    │
    │ GET https://api.existenz.ch/apiv1/smn/latest?locations=BER&app=mcp-swiss&version=0.1.0
    ▼
api.existenz.ch
    │
    │ {payload: [{loc:"BER", date:"...", par:"tt", val:8.4}, ...]}
    ▼
JSON.stringify(data, null, 2)  →  MCP Tool Result
```

## Module Symmetry (SMN vs Hydro)

```
SMN (weather)               Hydro
──────────────────────      ──────────────────────
/smn/latest      ←→         /hydro/latest
/smn/locations   ←→         /hydro/locations
/smn/daterange   ←→         /hydro/daterange

params: locations=BER        params: locations=2135
```

## Edge Cases Handled

| Case | Handling |
|------|----------|
| Invalid station code | API returns empty payload or error; returned as-is |
| Night time (ss=null) | Sunshine duration naturally null at night; not an error |
| Out-of-range date | API returns empty payload for future/too-old dates |
| Station without hydro sensor | Some parameters missing from payload — handled by AI parsing |

## Identification of Station Codes

A known friction point: weather station codes are not obvious (SMA for Zürich/Fluntern, not ZUE).
Mitigation: `list_weather_stations` tool lets AI look up codes by name or canton before querying.

## App Attribution

All API calls include `app=mcp-swiss&version=0.1.0` query parameters as courtesy to the api.existenz.ch maintainers. This is recommended in their docs for analytics/abuse prevention.

## Performance

- Single HTTP request per tool call
- `list_hydro_stations` returns 400+ stations — ~20–50KB JSON, ~1–3 seconds
- No caching implemented in v0.1.0
