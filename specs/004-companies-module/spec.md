# Spec: Companies / ZEFIX Module

**Spec ID:** 004  
**Status:** Implemented ✅  
**Module:** companies  
**Tools:** 5  
**Author:** Vikram Gorla  
**Last Updated:** 2026-03-07

---

## Problem Statement

AI assistants need to look up Swiss companies from the federal commercial register (ZEFIX). Switzerland has 700K+ registered companies and the ZEFIX registry is authoritative for UID numbers, registered addresses, legal purpose, and capital. Without this, users must manually navigate zefix.admin.ch or use commercial data providers.

## Business Value

- Switzerland has a transparent company register — all active/historical registrations are public
- Due diligence, KYC, competitive research, and civic journalism use cases
- ZEFIX search finds companies by name, canton, legal form — covering the full Swiss startup ecosystem
- Zug's "Crypto Valley" is globally known — finding all blockchain/crypto companies in ZG is a real query
- Foundations, NGOs, cooperatives all have ZEFIX entries — useful for research and advocacy

## User Stories

### P0 — Must have (shipped in v0.1.0)

**US-001:** Search for Swiss companies by name.

*Acceptance Criteria:*
- `search_companies(name="Nestlé")` returns ≥1 company with ehraid, UID, status
- `search_companies(name="blockchain", canton="ZG")` filters to Zug canton
- Response includes `ehraid` (ZEFIX integer ID) for use with `get_company`

**US-002:** Get full company details by ZEFIX ID.

*Acceptance Criteria:*
- `get_company(ehraid=<valid-id>)` returns full record with address, purpose, capital
- `ehraid` is the integer from `search_companies` result (NOT CHE-xxx format)

**US-003:** List all Swiss cantons for filtering.

*Acceptance Criteria:*
- `list_cantons()` returns all 26 cantons with code and name
- Returns consistent hardcoded data (ZEFIX endpoint is 403)

### P1 — High value

**US-004:** List all company legal forms.

*Acceptance Criteria:*
- `list_legal_forms()` returns at least 10 legal form codes with German and English names
- Includes 0105 (AG) and 0106 (GmbH) — the two most common forms

**US-005:** Search companies by address/locality.

*Acceptance Criteria:*
- `search_companies_by_address(address="Bahnhofstrasse, Zürich")` returns companies

### P2 — Nice to have

**US-006:** Filter by legal form in search (e.g. "all foundations in BE").
**US-007:** Active vs deleted companies filter.

### P3 — Future

**US-008:** SHAB (Official Gazette) journal entries for a company.
**US-009:** Beneficial owner disclosure data (if made public).

## Tools

| Tool | Method | Endpoint |
|------|--------|----------|
| `search_companies` | POST | `/api/v1/firm/search.json` |
| `get_company` | GET | `/api/v1/firm/{ehraid}.json` |
| `search_companies_by_address` | POST | `/api/v1/firm/search.json` |
| `list_cantons` | — | Hardcoded |
| `list_legal_forms` | — | Hardcoded |

## API Source

**Base URL:** `https://www.zefix.admin.ch/ZefixREST/api/v1`  
**Docs:** https://www.zefix.admin.ch/ZefixREST/swagger-ui.html  
**Auth:** None for search/firm endpoints  
**Rate limits:** None documented  

## ⚠️ Critical: ehraid vs UID

| Identifier | Format | Use |
|-----------|--------|-----|
| `ehraid` | Integer (e.g. `119283`) | Use with `get_company` URL path |
| `uid` | String (e.g. `CHE-116.281.788`) | Display only, NOT for API calls |

The `/firm/{id}.json` endpoint takes the **ehraid integer**, not the CHE UID. Using CHE format returns 404. Always use `ehraid` from `search_companies` results.

## Acceptance Criteria (Integration)

- [ ] `search_companies(name="Migros")` returns ≥1 result with ehraid and status
- [ ] `get_company(ehraid=<from-search>)` returns full company record with address
- [ ] `search_companies(name="blockchain", canton="ZG")` returns ZG crypto companies
- [ ] `list_cantons()` returns exactly 26 entries
- [ ] `list_legal_forms()` returns code "0105" (AG) and "0106" (GmbH)
- [ ] `search_companies_by_address(address="Zug")` returns ≥1 company

## Integration Tests (Human Tester)

1. Ask Claude: *"Look up Migros in ZEFIX"* — verify search returns Migros company, get full details
2. Ask Claude: *"Find all foundations (Stiftung) registered in Basel"* — verify canton+legal_form filter
3. Ask Claude: *"What companies are registered in Zug with 'crypto' in their name?"* — verify crypto valley results
4. Ask Claude: *"List all Swiss cantons"* — verify 26 cantons with codes

## Known Limitations

- `list_cantons` and `list_legal_forms` are hardcoded — ZEFIX endpoints return HTTP 403 for these
- `get_company` requires the `ehraid` integer — the CHE-xxx UID cannot be used directly
- ZEFIX search uses fuzzy name matching — may return unexpected results for common words
- `search_companies_by_address` uses the same name search endpoint (ZEFIX has no dedicated address filter)
- Deleted/archived companies are included in results unless filtered by `status`
- Some international/foreign company branches have limited data
