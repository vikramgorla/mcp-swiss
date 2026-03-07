## Summary

<!-- What does this PR do? One paragraph. -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New tool (within existing module)
- [ ] New module
- [ ] Spec only (no code — for review before implementation)
- [ ] Documentation update
- [ ] Refactor (no functional change)
- [ ] Tests
- [ ] Chore (deps, CI, config)
- [ ] **Breaking change** — describe migration path below

## Module affected

- [ ] Transport
- [ ] Weather / Hydrology
- [ ] Geodata / swisstopo
- [ ] Companies / ZEFIX
- [ ] Core / MCP protocol
- [ ] None (docs/CI only)

## Spec link

<!-- If this implements a new tool/module, link to the spec PR or spec file -->
Spec: `specs/NNN-feature-name/spec.md` — <!-- link or N/A -->

## Checklist

- [ ] `npm run validate` passes locally (lint + build + unit tests)
- [ ] Integration test added and verified against live API
- [ ] `docs/tool-specs.md` updated (if tool added/changed)
- [ ] `docs/tools.schema.json` updated (if tool added/changed)
- [ ] `README.md` tool table updated (if tool added)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] Spec `tasks.md` updated (tasks checked off)
- [ ] No breaking changes — or migration steps documented below

## How to test

<!-- Show the exact verification command -->

```bash
node -e "const { handleX } = require('./dist/modules/X.js'); handleX('tool_name', {...}).then(console.log)"
```

Or via MCP Inspector:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## API verification

<!-- Paste raw curl output from the live API to confirm it works -->

```bash
curl -s "https://..." | python3 -m json.tool
```

## Breaking changes / migration

<!-- If breaking: what changes, and how should users update? -->
N/A

## Output sample

<!-- Paste actual tool output here if helpful -->
