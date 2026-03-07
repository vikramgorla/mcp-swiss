# Contributing to mcp-swiss

Swiss precision. Clean code. Zero auth. Welcome aboard.

## Philosophy

mcp-swiss has three hard constraints:

1. **Zero auth** — every API must work without any key, token, or registration
2. **TypeScript strict** — no `any`, proper error handling, ESM modules
3. **Spec first** — every new feature starts with a spec, not code

If your contribution fits these, it's welcome.

---

## Dev setup

```bash
git clone https://github.com/vikramgorla/mcp-swiss.git
cd mcp-swiss
git checkout develop          # work from develop, not main
npm install
npm run build                 # tsc → dist/
npm test                      # unit + MCP protocol tests
npm run test:integration      # live API tests (requires internet)
```

Requirements: Node.js 18+, npm 8+

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Open http://localhost:5173, select stdio, run any tool interactively.

---

## Before committing

Run `npm run validate` — this lints, builds, and runs unit tests in sequence. CI will fail if this fails locally.

```bash
npm run validate   # lint + build + test
```

---

## Project structure

```
src/
  index.ts              # Server entry — registers all tools, routes calls
  modules/
    transport.ts        # tool definitions + handler (transport.opendata.ch)
    weather.ts          # tool definitions + handler (api.existenz.ch)
    geodata.ts          # tool definitions + handler (api3.geo.admin.ch)
    companies.ts        # tool definitions + handler (zefix.admin.ch)
  utils/
    http.ts             # fetchJSON() + buildUrl() helpers

tests/
  unit/                 # mocked, fast (~9s), always run in CI
  integration/          # real API calls, run on push to main/develop
  mcp/                  # MCP protocol conformance tests (12 assertions)
  fixtures/             # mock response data for unit tests

specs/                  # Speckit specification-driven development
  000-project-overview/ # top-level project spec
  001-transport-module/ # spec + plan + tasks per module
  002-weather-module/
  003-geodata-module/
  004-companies-module/

docs/
  tool-specs.md         # full human-readable spec for all 22 tools
  tools.schema.json     # machine-readable JSON schema for all tools

.specify/
  commands/             # AI slash command definitions for spec-driven workflow
    speckit.specify.md  # /specify — generate a new spec
    speckit.plan.md     # /plan — generate plan from spec
    speckit.tasks.md    # /tasks — generate task list from plan
```

Each module file exports:
- `const xxxTools` — array of MCP tool definitions (name, description, inputSchema)
- `async function handleXxx(name, args)` — routes tool calls to API fetch

---

## Spec-driven development (Speckit)

mcp-swiss uses a spec-driven workflow. **Every new tool or module starts with a spec — not code.**

### The workflow

```
specify → plan → tasks → implement → test → document
```

### Step 1: Write the spec

Create `specs/NNN-feature-name/spec.md` using the `/specify` command or the template in `.specify/commands/speckit.specify.md`.

A good spec includes:
- **Problem Statement** — what pain does this solve?
- **Business Value** — why does it matter? what AI queries does it unlock?
- **User Stories** with P0/P1/P2 priority and acceptance criteria
- **API source** — the zero-auth endpoint with docs link
- **Known limitations** — 403s, rate limits, weird response formats

### Step 2: Write the plan

Create `specs/NNN-feature-name/plan.md` using the `/plan` command.

Covers architecture, data flow, edge cases, and implementation approach.

### Step 3: Write the tasks

Create `specs/NNN-feature-name/tasks.md` — an ordered checklist of implementation tasks.

### Step 4: Implement

Only after spec + plan + tasks are reviewed should you write code.

### Existing specs

| Spec | Module | Status |
|------|--------|--------|
| `specs/000-project-overview/` | All | ✅ Implemented |
| `specs/001-transport-module/` | Transport | ✅ Implemented |
| `specs/002-weather-module/` | Weather + Hydrology | ✅ Implemented |
| `specs/003-geodata-module/` | Geodata / swisstopo | ✅ Implemented |
| `specs/004-companies-module/` | Companies / ZEFIX | ✅ Implemented |

---

## How to add a new tool

Let's say you want to add `get_train_occupancy` to the transport module.

### 1. Write the spec first

Create `specs/005-train-occupancy/spec.md` following the Speckit template. Include the API endpoint, acceptance criteria, and known limitations. Open a PR with just the spec for review before writing code.

### 2. Verify the API

```bash
curl -s "https://transport.opendata.ch/v1/occupancy?..." | python3 -m json.tool
```

Must be zero-auth. Document any quirks in the spec's Known Limitations section.

### 3. Add the tool definition

In `src/modules/transport.ts`, add to the `transportTools` array:

```typescript
{
  name: "get_train_occupancy",
  description: "Get expected occupancy level for a Swiss train connection",
  inputSchema: {
    type: "object",
    required: ["from", "to"],
    properties: {
      from: { type: "string", description: "Departure station" },
      to: { type: "string", description: "Arrival station" },
      date: { type: "string", description: "Date YYYY-MM-DD" },
    },
  },
},
```

### 4. Add the handler case

In `handleTransport()`, add a `case`:

```typescript
case "get_train_occupancy": {
  const url = buildUrl(`${BASE}/occupancy`, {
    from: args.from as string,
    to: args.to as string,
    date: args.date as string,
  });
  const data = await fetchJSON<unknown>(url);
  return JSON.stringify(data, null, 2);
}
```

### 5. Add tests

**Unit test** — `tests/unit/transport.test.ts`:
- Mock `fetch` with realistic fixture data
- Test happy path + empty results + error case
- Aim for ≥80% coverage of new code

**Integration test** — `tests/integration/transport.integration.test.ts`:
- Real API call with `it('get_train_occupancy returns data', ...)`
- Assert on response structure, not exact values (live data changes)

**Add fixture data** — `tests/fixtures/transport.ts`:
```typescript
export const mockOccupancy = { ... }; // realistic response
```

### 6. Update documentation

- `docs/tool-specs.md` — add the full tool spec (inputs, outputs, notes)
- `docs/tools.schema.json` — add the JSON schema entry
- `README.md` — add to the tool table under Transport
- `CHANGELOG.md` — add under `[Unreleased]`
- `specs/005-train-occupancy/tasks.md` — check off completed tasks

### 7. Validate everything

```bash
npm run validate          # lint + build + unit tests
npm run test:integration  # live API test
```

---

## How to add a new module

1. **Write the spec** in `specs/NNN-module-name/` — get it reviewed first
2. Create `src/modules/mymodule.ts` with `mymoduleTools` array and `handleMymodule()` function
3. Register in `src/index.ts`:
   ```typescript
   import { mymoduleTools, handleMymodule } from "./modules/mymodule.js";
   const allTools = [...existingTools, ...mymoduleTools];
   // Add routing in the CallToolRequestSchema handler
   ```
4. Add unit tests: `tests/unit/mymodule.test.ts`
5. Add integration tests: `tests/integration/mymodule.integration.test.ts`
6. Add fixtures: `tests/fixtures/mymodule.ts`
7. Update `docs/tool-specs.md` and `docs/tools.schema.json`
8. Update `README.md` with new module section and tool table

---

## Testing requirements

### Unit tests (`npm test`)
- Every tool must have at least one unit test
- Mock `fetch` using `vi.stubGlobal` — no real API calls
- Test: happy path, empty results, error propagation
- Run in ~9s — must stay fast

### Integration tests (`npm run test:integration`)
- Every tool must have at least one integration test against the live API
- Assert structure, not exact values (e.g. `expect(result.length).toBeGreaterThan(0)`)
- Run on push to `main`/`develop` in CI only (not on every PR)

### MCP protocol tests (`tests/mcp/protocol.test.ts`)
- Automatically validates tool count (must be 22 for current release)
- Update the expected tool count when adding new tools

### Coverage
- CI runs `npm run test:coverage` and uploads the report as an artifact
- No hard coverage gate currently, but aim for >80% on new code

---

## Code style

**TypeScript strict — no exceptions.**

```typescript
// ✅ Good
async function handleFoo(name: string, args: Record<string, unknown>): Promise<string> {
  const station = args.station as string;
  const data = await fetchJSON<{ payload: WeatherPayload[] }>(url);
  return JSON.stringify(data, null, 2);
}

// ❌ Bad — ESLint will reject this
async function handleFoo(name: any, args: any) {
  const data: any = await fetch(url).then(r => r.json());
  return JSON.stringify(data);
}
```

Rules:
- Use `fetch` (native Node 18+) — never axios, got, or node-fetch
- Use `fetchJSON<T>()` from `utils/http.ts` for all API calls
- Use `buildUrl()` for URL construction — never string concatenation
- Handle errors by letting them propagate (the MCP server wraps them as `isError: true`)
- All imports use `.js` extension (ESM `Node16` module resolution)
- No `console.log` in `src/` — use `process.stderr.write()` if needed
- ESLint enforces `@typescript-eslint/no-explicit-any` — CI will fail on violations

---

## API verification requirement

Before opening a PR with a new tool or bug fix:

1. Test the raw API with `curl` — paste output in the PR description
2. Verify the tool works via `node -e "..."` or MCP Inspector
3. Check edge cases: empty results, invalid station codes, no-results searches

We won't merge tools that haven't been verified against live APIs.

---

## Commit messages (Conventional Commits)

```
feat(transport): add get_train_occupancy tool
fix(companies): handle ZEFIX 404 for empty search results
docs(specs): add spec for postal codes module
test(weather): add unit tests for get_weather_history
chore(deps): bump @modelcontextprotocol/sdk to 1.1.0
ci: add Node 22 to test matrix
```

Format: `type(scope): description`

Types: `feat` `fix` `docs` `test` `refactor` `perf` `chore` `ci`
Scopes: `transport` `weather` `geodata` `companies` `core` `ci` `docs` `deps` `specs`

---

## Branch naming

```
feature/add-postal-codes       # new tool or module
fix/zefix-uid-lookup           # bug fix
docs/cursor-setup-guide        # docs only
chore/bump-sdk-version         # deps/CI/config
spec/train-occupancy           # new spec (before implementation)
```

Branch from `develop`. Open PRs against `develop`.

---

## PR process

1. Fork the repo (external contributors) or branch from `develop` (maintainers)
2. If adding a new tool/module: open spec PR first, get review, then implement
3. Write code + tests (`npm run validate` must pass)
4. Open PR against `develop` with the PR template filled in
5. CI runs automatically: lint + build (Node 18/20/22) + unit tests + integration tests + security audit
6. Review by maintainer — expect feedback within a few days
7. Squash merge to `develop`

`main` is only updated via release branches. Don't target `main` in PRs.

---

## Questions?

Open a [GitHub Discussion](https://github.com/vikramgorla/mcp-swiss/discussions) — not an Issue.
