# Plan: Transport Module

**Spec:** 001  
**Status:** Implemented ✅

---

## Architectural Vision

The transport module is a thin, stateless adapter over `transport.opendata.ch/v1`. No transformation beyond JSON serialization — pass query parameters through, return API responses directly. The API is well-designed and AI-readable as-is.

Key design choices:
- **No response transformation** — the API output is already clean JSON, AI can parse it natively
- **Graceful degradation** — 404 responses return empty arrays, not errors
- **Type params forwarded** — `get_departures` and `get_arrivals` use the same endpoint with a `type` param

## Data Flow

```
MCP Tool Call
    │
    │  name="get_connections", args={from:"Bern", to:"Zürich", limit:4}
    ▼
handleTransport(name, args)
    │
    │  buildUrl("https://transport.opendata.ch/v1/connections", {from, to, limit})
    ▼
fetchJSON<{connections: unknown[]}>(url)
    │
    │  GET https://transport.opendata.ch/v1/connections?from=Bern&to=Z%C3%BCrich&limit=4
    ▼
transport.opendata.ch API
    │
    │  {connections: [...]}
    ▼
JSON.stringify(data.connections, null, 2)
    │
    ▼
MCP Tool Result (string)
```

## Utility Functions

- `buildUrl(base, params)` — constructs query strings, skips undefined/null values
- `fetchJSON<T>(url)` — fetch + JSON parse + basic error handling

## Edge Cases Handled

| Case | Handling |
|------|----------|
| Station not found | API returns `{stations: []}` → empty array returned |
| No connections | API returns `{connections: []}` → empty array returned |
| Invalid station name | API fuzzy-matches or returns empty — graceful |
| `isArrivalTime: false` | Coerced to `undefined` so it's not sent as a param |
| Large `limit` (>16) | API caps at 16 silently |

## Security & Privacy

- No user data stored or logged
- All queries are read-only GET requests
- No authentication tokens to manage

## Performance

- Single HTTP request per tool call
- No caching (stateless, real-time data)
- Typical response time: 100–500ms
- Timeout: Node.js default (no explicit timeout set — relies on fetch)
