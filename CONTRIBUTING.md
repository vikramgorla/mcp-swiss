# Contributing to mcp-swiss

Thanks for helping make Swiss open data better for AI assistants! 🏔️

## Getting started

```bash
git clone https://github.com/vikramgorla/mcp-swiss.git
cd mcp-swiss
npm install
npm run build
```

## Running tests

```bash
# Unit + protocol tests (no network, fast)
npm test

# Integration tests (live Swiss APIs, needs network)
npm run test:integration

# Watch mode during development
npm run test:watch
```

## Before committing

Run `npm run validate` — this lints, builds, and runs unit tests. CI will fail if this fails.

```bash
npm run validate
```

This runs: `eslint src/` → `tsc` → `vitest run tests/unit tests/mcp`

## Project structure

```
src/
  index.ts              — MCP server entry point
  modules/
    transport.ts        — SBB / public transport tools
    weather.ts          — MeteoSwiss + BAFU hydrology tools
    geodata.ts          — swisstopo geocoding + geodata tools
    companies.ts        — ZEFIX company registry tools
  utils/
    http.ts             — fetchJSON + buildUrl helpers

tests/
  unit/                 — Fast unit tests (mocked HTTP)
  mcp/                  — MCP protocol compliance tests
  integration/          — Live API tests (network required)

specs/                  — Speckit specs for each module
docs/                   — Tool documentation and JSON schema
.specify/               — Speckit AI command definitions
```

## Adding a new tool

1. Write the spec first: `specs/<NNN>-<module>/spec.md`
2. Add the tool definition to the appropriate `src/modules/*.ts` `toolsArray`
3. Add the handler case to `handle*()` in the same file
4. Add unit tests in `tests/unit/<module>.test.ts`
5. Add integration tests in `tests/integration/<module>.integration.ts`
6. Update `docs/tool-specs.md` and `docs/tools.schema.json`
7. Update README tool table

## Code style

- TypeScript strict mode
- No `any` types (ESLint enforces `@typescript-eslint/no-explicit-any: error`)
- Unused variables cause lint errors (except `_prefixed` args)
- `no-console` is a warning — use it sparingly or add `// eslint-disable-line no-console`

## API conventions

- All tools return `string` (JSON.stringify'd)
- Return empty arrays/objects on not-found, not errors
- Use `fetchJSON<T>(url)` for GET requests
- Use `buildUrl(base, params)` for query string construction
- For POST requests, use `fetch()` directly with JSON body

## Speckit workflow

Use the Speckit slash commands when adding new modules:

```
/specify <feature>   — generate spec.md
/plan <spec-id>      — generate plan.md from spec
/tasks <spec-id>     — generate tasks.md checklist
```

See `.specify/commands/` for the command definitions.

## Releases

Releases are managed by @vikramgorla. To suggest a release:
- Open an issue with the `release` label
- Or mention it in a PR description

## License

MIT — contributions are accepted under the same license.
