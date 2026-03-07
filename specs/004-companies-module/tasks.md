# Tasks: Companies / ZEFIX Module

**Spec:** 004  
**Status:** All complete ✅

---

## Implementation Tasks

- [x] Create `src/modules/companies.ts`
- [x] Define `companiesTools` array with 5 MCP tool definitions
- [x] Implement `handleCompanies(name, args)` switch
- [x] `search_companies` — POST /api/v1/firm/search.json with JSON body (name, maxEntries, cantonAbbreviation, legalFormCode)
- [x] `get_company` — GET /api/v1/firm/{ehraid}.json
- [x] `search_companies_by_address` — POST /api/v1/firm/search.json with address as name field
- [x] `list_cantons` — hardcoded 26 Swiss cantons (ZEFIX /cantons returns 403)
- [x] `list_legal_forms` — hardcoded 11 legal forms (ZEFIX /legalForms returns 403)
- [x] Document ehraid vs CHE-UID distinction in tool description
- [x] Handle 404 response as empty result (not error)
- [x] Handle `{error: ...}` in ZEFIX body as empty result
- [x] Remove unused `buildUrl` import (companies uses fetch directly for POST)
- [x] Register companies module in `src/index.ts`
- [x] Export tools list from module

## Test Tasks

- [x] Unit tests: `tests/unit/companies.test.ts`
  - [x] Tool definitions schema validation
  - [x] POST body construction tests (mocked fetch)
  - [x] ehraid type validation (number, not string)
  - [x] Hardcoded cantons: exactly 26 entries
  - [x] Hardcoded legal forms: includes 0105 (AG) and 0106 (GmbH)
- [x] Integration tests: `tests/integration/companies.integration.ts`
  - [x] Live `search_companies` for known company
  - [x] Live `get_company` for ehraid from search result
  - [x] Live `search_companies` with canton filter
  - [x] `list_cantons` returns 26
  - [x] `list_legal_forms` returns expected codes

## Documentation Tasks

- [x] README companies section with ehraid warning
- [x] Tool description highlights ehraid usage
- [x] docs/tool-specs.md companies section with ⚠️ warning
- [x] docs/tools.schema.json companies entries
- [x] plan.md documents hardcoded data decision
