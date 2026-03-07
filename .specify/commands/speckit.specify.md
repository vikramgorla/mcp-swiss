# Speckit Command: /specify

**Command:** `/specify <feature-name>`  
**Purpose:** Generate a new spec for a feature or module using the mcp-swiss spec format.

---

## Instructions for AI

When the user runs `/specify <feature-name>`, generate a complete `spec.md` for the requested feature. Place it in `specs/<NNN>-<feature-name>/spec.md` where NNN is the next sequential number.

## Spec Template

Generate a `spec.md` that follows this exact structure:

```markdown
# Spec: <Feature Name>

**Spec ID:** <NNN>
**Status:** Draft
**Module:** <module name>
**Tools:** <count>
**Author:** <author>
**Last Updated:** <date>

---

## Problem Statement

<1-3 sentences: what problem does this solve? Be specific about the pain.>

## Business Value

<bullet list: why does this matter? real-world use cases.>

## User Stories

### P0 — Must have

**US-001:** As a <user type>, I can <action>.

*Acceptance Criteria:*
- <specific, testable criterion>
- <specific, testable criterion>

### P1 — High value

<additional stories>

### P2 — Nice to have

<optional stories>

### P3 — Future

<future consideration stories>

## Tools

| Tool | Method | Endpoint |
|------|--------|----------|
| `tool_name` | GET/POST | `/endpoint/path` |

## API Source

**Base URL:** `https://...`
**Docs:** https://...
**Auth:** <None / API key / OAuth>
**Rate limits:** <known limits>

## Acceptance Criteria (Integration)

- [ ] <concrete, testable criterion against live API>
- [ ] <concrete, testable criterion>

## Integration Tests (Human Tester)

1. Ask Claude: *"..."* — verify <expected outcome>
2. Ask Claude: *"..."* — verify <expected outcome>

## Known Limitations

- <limitation 1>
- <limitation 2>
```

## Rules

1. Be concrete — acceptance criteria must be testable (specific values, not "should work")
2. P0 stories are shipped in v0.1.0; P1+ are future work unless explicitly stated
3. Document every known limitation, especially API quirks (auth issues, 403s, weird formats)
4. Include real station codes, real company names, real place names in examples
5. If an API endpoint returns 403, document it as a known limitation and note the hardcoded workaround
