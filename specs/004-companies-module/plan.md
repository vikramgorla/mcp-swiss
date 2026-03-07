# Plan: Companies / ZEFIX Module

**Spec:** 004  
**Status:** Implemented ✅

---

## Architectural Vision

The ZEFIX module is slightly different from the others — `search_companies` uses a POST with JSON body (not a GET with query params). `get_company` uses a simple GET on a path-based URL. `list_cantons` and `list_legal_forms` return hardcoded data because the ZEFIX API requires authentication for those endpoints.

## Data Flow: search_companies

```
search_companies({name: "blockchain", canton: "ZG", limit: 10})
    │
    ▼
body = {
  name: "blockchain",
  maxEntries: 10,
  languageKey: "en",
  cantonAbbreviation: ["ZG"]
}
    │
    ▼
fetch("https://www.zefix.admin.ch/ZefixREST/api/v1/firm/search.json", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(body)
})
    │
    ▼
{list: [...companies], hasMoreResults: false}
    │
    ▼
JSON.stringify({companies: data.list, hasMoreResults: data.hasMoreResults})
```

## Data Flow: get_company

```
get_company({ehraid: 119283})
    │
    ▼
fetchJSON("https://www.zefix.admin.ch/ZefixREST/api/v1/firm/119283.json")
    │
    ▼
GET https://www.zefix.admin.ch/ZefixREST/api/v1/firm/119283.json
    │
    ▼
{ehraid: 119283, name: "...", address: {...}, purpose: "...", ...}
    │
    ▼
JSON.stringify(data, null, 2)
```

## Why POST for Search?

ZEFIX search requires a JSON body with `cantonAbbreviation` as an array. This can't be expressed cleanly as query params. The POST pattern is the ZEFIX API's own design choice.

## Hardcoded Data Decision

`/cantons` and `/legalForms` on the ZEFIX REST API return HTTP 403 (authentication required) for anonymous requests. Rather than fail or require auth, we return hardcoded canonical lists:
- 26 Swiss cantons: stable, won't change
- 11 legal forms: stable Swiss commercial law categories

This is documented in code comments and in spec notes. If ZEFIX opens these endpoints, the tools can be updated to use live data.

## Error Handling

| Scenario | HTTP Status | Handling |
|---------|-------------|----------|
| Company name not found | 404 | Return `{companies: [], hasMoreResults: false}` |
| Invalid ehraid | 404 | fetchJSON throws — propagated to MCP error |
| ZEFIX server error | 5xx | fetchJSON throws — propagated to MCP error |
| Partial result (limit hit) | 200 | `hasMoreResults: true` in response |
| ZEFIX error in body | 200 | `{error: ...}` body detected → return empty list |

## Important: buildUrl Not Used

Unlike other modules, `search_companies` uses `fetch()` directly (POST with JSON body). The `buildUrl` utility is for GET query params only. The `buildUrl` import was removed from companies.ts since it's unused.

## Performance

- `search_companies`: POST, ~300–800ms
- `get_company`: GET, ~200–500ms
- No caching — ZEFIX data changes (new registrations, address updates)
