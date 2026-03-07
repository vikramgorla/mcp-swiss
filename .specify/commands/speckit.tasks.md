# Speckit Command: /tasks

**Command:** `/tasks <spec-id>`  
**Purpose:** Generate a complete implementation task checklist from a plan. Reads `specs/<NNN>-*/plan.md` and creates `tasks.md`.

---

## Instructions for AI

When the user runs `/tasks <spec-id>`, read both the spec and plan in `specs/0<spec-id>-*/` and generate a `tasks.md` with a complete checklist of implementation and test tasks.

## Tasks Template

```markdown
# Tasks: <Feature Name>

**Spec:** <NNN>
**Status:** Not Started | In Progress | Complete ✅

---

## Implementation Tasks

- [ ] Create `src/modules/<name>.ts`
- [ ] Define `<name>Tools` array with <N> MCP tool definitions
- [ ] Implement `handle<Name>(name, args)` switch
- [ ] `<tool_1>` — <method> <endpoint> with <params>
- [ ] `<tool_2>` — <method> <endpoint> with <params>
- [ ] Register module in `src/index.ts`
- [ ] Export tools list from module

## Test Tasks

- [ ] Unit tests: `tests/unit/<name>.test.ts`
  - [ ] Tool definitions schema validation (required fields present)
  - [ ] Parameter validation (required params)
  - [ ] URL/body construction tests (mocked fetch)
  - [ ] Error handling (404, empty response)
- [ ] Integration tests: `tests/integration/<name>.integration.ts`
  - [ ] Live API call: `<tool_1>` with realistic params
  - [ ] Live API call: `<tool_2>` with realistic params
  - [ ] Edge case: not-found returns empty, not error

## Documentation Tasks

- [ ] README section with tool table
- [ ] Tool descriptions in source (inputSchema.description fields)
- [ ] docs/tool-specs.md section
- [ ] docs/tools.schema.json entries
- [ ] spec.md Known Limitations section updated after implementation
```

## Rules

1. Every tool in the spec gets its own implementation task line
2. Unit tests MUST mock external HTTP (no live calls in unit tests)
3. Integration tests use live APIs — document any known flaky tests
4. Documentation tasks are not optional — README + tool-specs.md must be updated
5. Mark tasks complete `[x]` only after verifying they actually work
6. Add any discovered tasks that weren't in the original list — keep it current

## Status Progression

```
Not Started → In Progress → Complete ✅
```

Change status in the header when starting and when all tasks are checked off.
