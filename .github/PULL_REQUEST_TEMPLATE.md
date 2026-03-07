## Summary

<!-- What does this PR do? One paragraph. -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New tool (within existing module)
- [ ] New module
- [ ] Documentation update
- [ ] Refactor (no functional change)
- [ ] Tests
- [ ] Chore (deps, CI, config)
- [ ] **Breaking change** — describe migration path below

## Module affected

- [ ] Transport
- [ ] Weather
- [ ] Geodata
- [ ] Companies
- [ ] Core / MCP protocol
- [ ] None (docs/CI only)

## Checklist

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm test` passes (all unit tests green)
- [ ] New tests added for new/changed behaviour
- [ ] README updated if tool list or usage changed
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] No breaking changes — or migration steps documented below
- [ ] API calls verified against **live endpoints** (not just mocked)

## How to test

<!-- Show the exact MCP tool call to verify this PR works. -->

```
Tool: <tool_name>
Input: { ... }
Expected: ...
```

Or via node directly:
```bash
node -e "const { handleX } = require('./dist/modules/X.js'); handleX('tool_name', {...}).then(console.log)"
```

## Breaking changes / migration

<!-- If breaking: what changes, and how should users update their config? -->
N/A

## Output sample

<!-- Paste actual tool output here if helpful. -->
