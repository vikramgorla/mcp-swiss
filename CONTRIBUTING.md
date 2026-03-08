# Contributing to mcp-swiss 🏔️

Thanks for helping make Swiss open data better for AI assistants!

---

## Table of Contents

1. [Development Setup](#1-development-setup)
2. [Branch Model](#2-branch-model)
3. [Workflow Rules (Hard Rules)](#3-workflow-rules-hard-rules)
4. [Adding a New Module](#4-adding-a-new-module)
5. [Integration Checklist](#5-integration-checklist)
6. [Code Standards](#6-code-standards)
7. [PR Checklist](#7-pr-checklist)

---

## 1. Development Setup

```bash
# Clone the repo
git clone https://github.com/vikramgorla/mcp-swiss.git
cd mcp-swiss

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run unit + protocol tests (fast, no network)
npm test

# Run integration tests (live Swiss APIs, needs network)
npm run test:integration

# Lint
npm run lint

# Lint + build + unit tests combined
npm run validate

# Watch mode during development
npm run test:watch

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### Project Structure

```
src/
  index.ts                  — MCP server entry point, tool routing
  modules/
    transport.ts            — SBB / public transport tools
    weather.ts              — MeteoSwiss + BAFU hydrology tools
    geodata.ts              — swisstopo geocoding + geodata tools
    companies.ts            — ZEFIX company registry tools
    holidays.ts             — Swiss public & school holidays
    parliament.ts           — Swiss parliament bills, votes, councillors
    avalanche.ts            — SLF avalanche bulletins
    airquality.ts           — NABEL air quality stations
    post.ts                 — Swiss Post postcodes + parcel tracking
    energy.ts               — ElCom electricity tariffs
    statistics.ts           — BFS population + opendata.swiss datasets
    snb.ts                  — Swiss National Bank exchange rates
    recycling.ts            — Zurich waste collection (OpenERZ)
    news.ts                 — SRF Swiss news headlines + search
    voting.ts               — Swiss popular vote results (Basel-Stadt)
    dams.ts                 — Swiss federal dam registry
    hiking.ts               — Trail closures + hiking alerts (swisstopo)
    realestate.ts           — Property prices + rent index (BFS)
    traffic.ts              — ASTRA traffic counting stations
    earthquakes.ts          — Swiss Seismological Service (SED/ETH)
  utils/
    http.ts                 — fetchWithTimeout, fetchJSON, buildUrl helpers

tests/
  unit/                     — Fast unit tests (mocked HTTP)
  mcp/
    protocol.test.ts        — MCP protocol compliance, tool count assertions
  integration/              — Live API tests (network required)
  fixtures/                 — Mock response fixtures for unit tests

docs/
  tool-specs.md             — Human-readable tool documentation
  tools.schema.json         — Machine-readable tool schemas

.github/
  PULL_REQUEST_TEMPLATE.md  — PR checklist (referenced here)
  workflows/                — CI/CD pipeline definitions
```

---

## 2. Branch Model

```
main         ← production releases only. Never commit here directly.
  ↑
develop      ← integration branch. All features land here first.
  ↑
feature/<name>   ← one branch per feature/module/fix
release/vX.Y.Z   ← version bump branches before merging to main
docs/<name>      ← documentation-only branches
fix/<name>       ← bug fix branches
chore/<name>     ← maintenance branches
```

- **`main`** — stable production code. Every commit here is a released version.
- **`develop`** — the integration branch. Always carries a `-dev` version suffix (e.g. `0.4.1-dev`). All work lands here before main.
- **Feature branches** — short-lived branches off `develop`. One per logical unit of work.
- **Release branches** — `release/vX.Y.Z` created from `develop` solely for the version bump commit.

---

## 3. Workflow Rules (Hard Rules)

These are **non-negotiable**. No exceptions, no shortcuts.

### ❌ Never Do
- `git push origin main` — never push directly to main
- `git push origin develop` — never push directly to develop
- `git merge <branch>` followed by `git push` to main/develop — use PRs
- `gh pr merge --squash` or `gh pr merge --rebase` — always use `--merge`
- Cherry-picking commits across branches
- Force-pushing to shared branches (`main`, `develop`)

### ✅ Always Do
- Create a branch for every change: `git checkout -b feature/<name> develop`
- Push your branch and create a PR: `gh pr create --base develop --head feature/<name>`
- **Verify your push succeeded** before creating a PR: `git ls-remote origin feature/<name>`
- Wait for CI to pass: `gh pr checks <num> --watch`
- Merge with regular merge only: `gh pr merge <num> --merge --delete-branch`
- Every commit on `develop` came through a feature/fix/docs/chore branch PR
- Every commit on `main` came through `develop` via a release PR

### Why These Rules?
- Regular merges preserve full history — you can always trace every commit back to its PR
- PRs ensure CI runs before anything lands on shared branches
- No squash/rebase means `develop` is always a superset of every feature branch
- The release workflow depends on develop → main being a regular merge so `git log` works correctly

---

## 4. Adding a New Module

Follow this sequence **exactly**. Do not skip steps or combine them.

### Step 1 — Create a feature branch from develop

```bash
cd ~/mcp-swiss
git checkout develop
git pull origin develop
git checkout -b feature/<module-name>
```

### Step 2 — Create the module file

Create `src/modules/<name>.ts`. It must export:

```typescript
// src/modules/<name>.ts

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { fetchJSON, buildUrl } from '../utils/http.js';

// Tool definitions
export const <name>Tools: Tool[] = [
  {
    name: 'tool_name',
    description: 'What this tool does',
    inputSchema: {
      type: 'object',
      properties: {
        param: { type: 'string', description: 'Parameter description' }
      },
      required: ['param']
    }
  }
  // ... more tools
];

// Handler function
export async function handle<Name>(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'tool_name':
      return handleToolName(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

async function handleToolName(args: Record<string, unknown>): Promise<string> {
  const param = args.param as string;
  const url = buildUrl('https://api.example.ch/v1/endpoint', { param });
  const data = await fetchJSON<ResponseType>(url);
  return JSON.stringify(data);
}
```

**Rules for module files:**
- Export exactly two things: `<name>Tools` (array) and `handle<Name>` (function)
- No `any` types — TypeScript strict mode is enforced
- Use `fetchWithTimeout` / `fetchJSON` / `buildUrl` from `src/utils/http.ts`
- All responses must be under 50K characters
- Zero API keys — only publicly accessible Swiss data sources
- Prefer Swiss official APIs (admin.ch, geo.admin.ch, etc.) over international alternatives

### Step 3 — Create test fixtures

Create `tests/fixtures/<name>.ts` with realistic mock responses:

```typescript
// tests/fixtures/<name>.ts

export const mock<Name>Response = {
  // realistic mock data matching the actual API response shape
};
```

### Step 4 — Create unit tests

Create `tests/unit/<name>.test.ts`. Unit tests must:
- Mock all HTTP calls (no real network)
- Test every tool in the module
- Test error cases (API down, invalid params, empty results)
- Run fast (milliseconds, not seconds)

```typescript
// tests/unit/<name>.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle<Name> } from '../../src/modules/<name>.js';
import { mock<Name>Response } from '../fixtures/<name>.js';

vi.mock('../../src/utils/http.js', () => ({
  fetchJSON: vi.fn(),
  buildUrl: vi.fn((base: string, params: Record<string, string>) => {
    const url = new URL(base);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
  }),
  fetchWithTimeout: vi.fn()
}));

describe('<name> module', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles tool_name', async () => {
    const { fetchJSON } = await import('../../src/utils/http.js');
    vi.mocked(fetchJSON).mockResolvedValueOnce(mock<Name>Response);

    const result = await handle<Name>('tool_name', { param: 'test' });
    const parsed = JSON.parse(result);
    expect(parsed).toBeDefined();
  });
});
```

### Step 5 — Create integration tests

Create `tests/integration/<name>.integration.test.ts`. Integration tests:
- Hit the **real** Swiss API
- Assert response shape and data types
- Assert response size is under 50K characters
- Are skipped in CI unit-test runs (only in `npm run test:integration`)

```typescript
// tests/integration/<name>.integration.test.ts

import { describe, it, expect } from 'vitest';
import { handle<Name> } from '../../src/modules/<name>.js';

describe('<name> integration', () => {
  it('fetches real data from the API', async () => {
    const result = await handle<Name>('tool_name', { param: 'test' });
    expect(result.length).toBeLessThan(50000);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed) || typeof parsed === 'object').toBe(true);
  });
});
```

### Step 6 — Validate before committing

```bash
npm run lint
npm run build
npm run test:unit
```

Fix all lint errors and test failures before committing. CI will fail on lint errors.

### Step 7 — Commit, push, create PR

```bash
git add -A
git commit -m "feat: add <name> module with X tools"

# Push and verify
git push origin feature/<name>
git ls-remote origin feature/<name>   # confirm push succeeded

# Create PR to develop
gh pr create --base develop --head feature/<name> \
  --title "feat: add <name> module" \
  --body "## <Name> Module

Adds X tools for <description>.

### Tools
- \`tool_name\` — description

### Data Source
- [Source Name](https://api.example.ch) — Swiss official API

### Checklist
- [x] Unit tests with fixtures
- [x] Integration tests with size assertions
- [x] lint + build + test:unit pass
- [x] No \`any\` types"
```

### Step 8 — Wait for CI, then merge

```bash
PR_NUM=$(gh pr list --base develop --head feature/<name> --json number -q '.[0].number')
gh pr checks $PR_NUM --watch
gh pr merge $PR_NUM --merge --delete-branch
```

### Step 9 — Wire into shared files (integration branch)

**IMPORTANT:** Do not modify shared files in the feature branch. After the feature PR merges, create a separate integration branch:

```bash
git checkout develop
git pull origin develop
git checkout -b integration/<name>
```

Update shared files (see [Integration Checklist](#5-integration-checklist)), then PR that to develop.

---

## 5. Integration Checklist

When wiring a new module into the project, update **all** of these:

### `src/index.ts`

```typescript
// 1. Import the new module
import { <name>Tools, handle<Name> } from './modules/<name>.js';

// 2. Add to the tools array
const tools = [
  ...existingTools,
  ...<name>Tools,
];

// 3. Add to the handler routing
case '<tool_name>':
  return handle<Name>(name, args);
```

### `tests/mcp/protocol.test.ts`

Update the expected tool count assertion:

```typescript
// Find and update:
expect(tools.length).toBe(<new_total>);  // was <old_total>, added X for <name>
```

### `README.md`

- Add a feature box in the top emoji list (e.g. `🆕 Module Name — description`)
- Add a detailed tools table section (`### 🆕 Module Name (X tools)`)
- Update the total tool count in the header ("**68 tools**" → "**76 tools**")
- Add the data source to the Data Sources table

### `server.json`

```json
{
  "description": "Swiss open data MCP server. 76 tools, zero API keys. Transport, weather, geodata, news, rates."
}
```

⚠️ Description must be **≤100 characters**. Count before saving.

### `docs/tool-specs.md`

Add a new section documenting each tool:

```markdown
## Module Name

### tool_name

**Description:** What this tool does.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| param | string | Yes | Parameter description |

**Returns:** JSON array of ...

**Example:**
\`\`\`json
{ "result": "example" }
\`\`\`
```

### `docs/tools.schema.json`

Add the tool schema entry to the JSON array.

---

## 6. Code Standards

### TypeScript

- Strict mode enabled — configure in `tsconfig.json`
- **No `any` types** — ESLint enforces `@typescript-eslint/no-explicit-any: error`
- Unused variables are lint errors (except `_prefixed` args)
- `no-console` is a warning — avoid or add `// eslint-disable-line no-console`

### HTTP Utilities

Always use the utilities in `src/utils/http.ts`:

```typescript
import { fetchWithTimeout, fetchJSON, buildUrl } from '../utils/http.js';

// Simple GET → JSON
const data = await fetchJSON<MyType>(url);

// GET with query params
const url = buildUrl('https://api.example.ch/v1/data', {
  param1: 'value1',
  param2: 'value2'
});

// Custom timeout
const data = await fetchWithTimeout(url, { timeoutMs: 5000 });
```

### Response Size

All MCP tool responses must be **under 50K characters**. Add assertions in integration tests:

```typescript
expect(result.length).toBeLessThan(50000);
```

If an API returns large datasets, truncate or paginate the results.

### API Selection

- **Prefer Swiss official APIs** (admin.ch, geo.admin.ch, parlament.ch, etc.)
- Use Swiss-specific providers (existenz.ch, opendata.swiss) second
- Only use international APIs (OpenStreetMap, etc.) if no Swiss source exists
- **Zero API keys** — every data source must be publicly accessible without authentication

### Test Coverage

- **Target: 100% coverage** on module files
- Every tool handler must have a unit test
- Every error path must be tested
- Integration tests verify real API shape and response size

---

## 7. PR Checklist

Every PR must satisfy the checklist in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md):

```
- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] npm run test:unit passes
- [ ] New module? Added to src/index.ts routing
- [ ] New module? Added to tests/mcp/protocol.test.ts tool count
- [ ] New tools? Updated README.md tool count and module section
- [ ] New tools? Updated docs/tool-specs.md
- [ ] New tools? Updated docs/tools.schema.json
- [ ] New tools? Updated server.json description (≤100 chars)
- [ ] Version bumped if needed
- [ ] No `any` types in TypeScript
- [ ] All responses under 50K characters
- [ ] Integration tests added with size assertions
```

**Merging:** Use `gh pr merge <num> --merge --delete-branch`. Never squash or rebase.

---

## License

MIT — contributions are accepted under the same license.

Questions? Open an issue or start a discussion on GitHub.
