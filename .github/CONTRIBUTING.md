# Contributing to mcp-swiss

Swiss precision. Clean code. Zero auth. Welcome aboard.

## Philosophy

mcp-swiss has three hard constraints:

1. **Zero auth** — every API must work without any key, token, or registration
2. **TypeScript strict** — no `any`, proper error handling, ESM modules
3. **Ship fast** — working code beats perfect code; iterate in public

If your contribution fits these, it's welcome.

---

## Dev setup

```bash
git clone https://github.com/vikramgorla/mcp-swiss.git
cd mcp-swiss
git checkout develop          # work from develop, not main
npm install
npm run build                 # tsc → dist/
npm test                      # unit tests
npm run test:integration      # live API tests (requires internet)
```

Requirements: Node.js 18+, npm 8+

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Open http://localhost:5173, select stdio, run any tool.

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
  unit/                 # mocked, fast, run in CI
  integration/          # real API calls, tagged separately
  mcp/                  # MCP protocol conformance tests
  fixtures/             # mock response data
```

Each module file exports:
- `const xxxTools` — array of MCP tool definitions (name, description, inputSchema)
- `async function handleXxx(name, args)` — routes tool calls to API fetch

---

## How to add a new tool

Let's say you want to add `get_train_occupancy` to the transport module.

### 1. Verify the API first

```bash
curl -s "https://transport.opendata.ch/v1/occupancy?..." | python3 -m json.tool
```

Make sure it's zero-auth and returns useful data. Document the endpoint in `memory/research.md`.

### 2. Add the tool definition

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

### 3. Add the handler case

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

### 4. Add tests

`tests/unit/transport.test.ts` — add a mocked unit test.
`tests/integration/transport.integration.test.ts` — add a live API test.

### 5. Build and verify

```bash
npm run build
npm test
# Then verify against live API:
node -e "const {handleTransport}=require('./dist/modules/transport.js'); handleTransport('get_train_occupancy',{from:'Bern',to:'Zurich'}).then(console.log)"
```

### 6. Update docs

- Add to the tool table in `README.md`
- Add to `CHANGELOG.md` under `[Unreleased]`

---

## How to add a new module

1. Create `src/modules/mymodule.ts` with `mymoduleTools` array and `handleMymodule()` function
2. Import and register in `src/index.ts`:
   ```typescript
   import { mymoduleTools, handleMymodule } from "./modules/mymodule.js";
   const allTools = [...transportTools, ...weatherTools, ...mymoduleTools];
   // Add to the routing in CallToolRequestSchema handler
   ```
3. Add tests in `tests/unit/mymodule.test.ts` and `tests/integration/mymodule.integration.test.ts`
4. Add fixtures in `tests/fixtures/mymodule.ts`
5. Update README with new module section

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

// ❌ Bad
async function handleFoo(name: any, args: any) {
  const data: any = await fetch(url).then(r => r.json());
  return JSON.stringify(data);
}
```

Rules:
- Use `fetch` (native Node 18+) — never axios, got, or node-fetch
- Use `fetchJSON<T>()` from `utils/http.ts` for all API calls
- Use `buildUrl()` for URL construction — never string concatenation
- Handle errors by letting them propagate (the MCP server catches and returns `isError: true`)
- All imports use `.js` extension (ESM `Node16` module resolution)
- No `console.log` in source — use `process.stderr.write()` if needed

---

## API verification requirement

Before opening a PR with a new tool or bug fix:

1. Test the raw API with `curl` — paste output in the PR
2. Verify the tool works via `node -e "..."` or MCP Inspector
3. Check edge cases: empty results, invalid input, station not found

We won't merge tools that haven't been verified against live APIs.

---

## Commit messages (Conventional Commits)

```
feat(transport): add get_train_occupancy tool
fix(companies): handle ZEFIX 404 for empty search results
docs(readme): add Cursor IDE config example
test(weather): add unit tests for get_weather_history
chore(deps): bump @modelcontextprotocol/sdk to 1.1.0
```

Format: `type(scope): description`

Types: `feat` `fix` `docs` `test` `refactor` `perf` `chore` `ci`
Scopes: `transport` `weather` `geodata` `companies` `core` `ci` `docs` `deps`

---

## Branch naming

```
feature/add-postal-codes       # new tool or module
fix/zefix-uid-lookup           # bug fix
docs/cursor-setup-guide        # docs only
chore/bump-sdk-version         # deps/CI/config
```

Branch from `develop`. Open PRs against `develop`.

---

## PR process

1. Fork the repo (external contributors) or branch from `develop` (maintainers)
2. Write code + tests
3. `npm run build && npm test` — must be green
4. Open PR against `develop` with the PR template filled in
5. CI runs automatically (Node 18/20/22 matrix + security audit)
6. Review by maintainer — expect feedback within a few days
7. Squash merge to `develop`

`main` is only updated via release branches. Don't target `main` in PRs.

---

## Questions?

Open a [GitHub Discussion](https://github.com/vikramgorla/mcp-swiss/discussions) — not an Issue.
