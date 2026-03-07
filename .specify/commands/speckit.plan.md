# Speckit Command: /plan

**Command:** `/plan <spec-id>`  
**Purpose:** Generate an architectural plan from a spec. Reads `specs/<NNN>-*/spec.md` and creates `plan.md`.

---

## Instructions for AI

When the user runs `/plan <spec-id>` (e.g. `/plan 005`), read the corresponding `specs/0<spec-id>-*/spec.md` and generate a `plan.md` in the same directory.

## Plan Template

```markdown
# Plan: <Feature Name>

**Spec:** <NNN>
**Status:** Draft | In Progress | Implemented ✅

---

## Architectural Vision

<2-4 sentences describing the overall approach. What pattern is used? Why?>

## Data Flow

\```
<ASCII diagram showing the data flow from MCP tool call → implementation → API → response>
\```

## Key Design Decisions

1. **<decision title>:** <rationale>
2. **<decision title>:** <rationale>

## Module Structure

\```
src/modules/<name>.ts
├── <ToolName>Tools: array    — MCP tool definitions
└── handle<Name>(name, args)  — tool call dispatcher
\```

## Edge Cases

| Case | Handling |
|------|----------|
| <edge case> | <how handled> |

## Error Handling

| Scenario | HTTP Status | Handling |
|---------|-------------|----------|
| <scenario> | <status> | <handling> |

## Performance Notes

- <performance characteristic>
- <caching approach if any>
- <timeout considerations>

## Security & Privacy

- <note on data handling>
- <auth requirements if any>
```

## Rules

1. Plan must match the spec — every P0 tool in spec.md must be covered in the plan
2. Data flow diagram must be ASCII art — no images
3. Edge cases must include: not-found, API error, missing required params
4. If using a new HTTP pattern (POST body, path params, etc), document it explicitly
5. Flag any dependencies on other modules or external systems
6. Note coordinate system quirks (WGS84 vs LV95 for geodata)
