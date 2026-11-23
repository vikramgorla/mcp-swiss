# AGENTS.md: rules for anyone changing mcp-swiss

Read by Claude Code (via `CLAUDE.md`), Cursor, Copilot, Codex and humans. Every change follows these rules. `CONTRIBUTING.md` has the step-by-step module recipe and `RELEASING.md` has the release runbook. This file is the short version that always applies.

The recurring maintenance routine is in `.claude/agents/maintainer.md`.

## What this project is

A zero-API-key MCP server for Swiss open data: 27 modules and 94 tools as of 0.9.x, published to npm (`mcp-swiss`), the MCP Registry (`server.json`), Docker and `.mcpb`. Every tool is a read-only lookup against a public Swiss source.

## Hard rules

1. **Branches.** Work on `feat/*`, `fix/*`, `chore/*`, `docs/*` or `refactor/*` cut from `develop`. Open PRs against `develop`. Only `develop` merges into `main` (`guard-main.yml` enforces this). Merge with `--merge`; never squash or rebase merges. Never force-push, and never push straight to `develop` or `main`.
2. **Required checks.** Lint, Build (Node 20 and 22) and Unit Tests must pass. Integration tests hit live APIs and can flake. A red integration run may only be ignored once you have confirmed the failure is unrelated to the change (it reproduces on `develop`, or passes locally, or is a timeout) and said so in the PR.
3. **No AI attribution.** Commits and PRs carry no `Co-Authored-By` AI trailers, session links or "Generated with" footers, and are not authored or signed as an AI.
4. **Zero API keys.** A data source that needs a key, signup or paid plan doesn't go in.
5. **Read-only only.** Tools fetch and summarise; they never write anywhere. `swiss_call_tool` is annotated read-only on this basis, and `tests/unit/discovery.test.ts` checks it. If a tool with side effects is ever truly needed, split the execute tool into read and write variants (Atlassian's `executeRead` and `executeWrite`) in the same PR.
6. **One concern per PR.** A fix, a feature, a refactor, or a dependency bump, not a mix. Small and reviewable beats complete.
7. **Credit.** Anything ported from a fork or derivative names the author and links the repo in the commit body, the PR description and `CHANGELOG.md` (see the 0.9.0 entry for the format).

## Tool design (token budget matters)

The full tool list costs about 9,300 tokens. Every new tool makes every conversation more expensive, so:

- **Prefer extending a tool** (a new optional parameter) over adding a near-duplicate.
- **Descriptions:** one or two plain sentences, at most about 300 characters. Say what it returns and when to use it instead of its sibling. No marketing, no long examples. Put detail in parameter descriptions.
- **Discoverable by plain words.** Discovery mode (`--discovery`) ranks tools by the words an agent types. Use everyday words in the description ("trains", "exchange rate", "public holiday"). If users will say something the text can't contain, add it to `SYNONYMS` in `src/discovery.ts` and add a case to the plain-language test.
- **Run `npm run docs:tokens`** after changing any tool and put the before and after total in the PR. A PR that adds more than about 400 tokens per tool needs a reason.
- **Responses** stay under 50,000 characters (tested), with long text truncated and a hint to narrow the query.
- **Use the shared helpers:** `src/utils/http.ts` (timeouts, retry, User-Agent), `src/utils/cache.ts` and `src/utils/validate.ts`. No ad-hoc `fetch`.
- **Errors** are actionable sentences ("Unknown region X. Use list_avalanche_regions…"), never stack traces or upstream internals.
- **Upstream quirks:** when a source changes shape, handle it defensively and add a unit test with a fixture copied from the new real response.

## Every change to tools must also update

- Unit tests with fixtures in `tests/fixtures/` (no network), plus an integration test in `tests/integration/`.
- `src/index.ts` and `tests/mcp/protocol.test.ts` tool counts.
- `README.md`: the tool and module counts and the topic list in the intro. Per-tool docs are not in the README; the site generates them.
- `docs/tool-specs.md` and `docs/tools.schema.json` (`npm run docs:tools`).
- `server.json` and `manifest.json` descriptions and counts (the `server.json` description is at most 100 characters), `llms.txt` and `llms-install.md`.
- The GitHub Pages site builds itself from the code (`npm run site`, deployed by `pages.yml` on every push to `main`) and `tests/unit/site.test.ts` checks it lists every tool. Edit `site/template.html` only for wording, install steps or layout, and `site/sources.json` when a data source is added.
- `tests/fixtures/discovery-queries.ts`: at least two plain-language questions per new tool, written the way a user would ask.
- `CHANGELOG.md` under `[Unreleased]` (Added, Changed, Fixed, Security, Removed), in user-facing language.

## Validation before any PR

```bash
npm run validate          # lint + build + unit/protocol tests
npm run test:integration  # live APIs, for anything touching a module
npm run docs:tokens       # when tools changed
```

## Versioning

See `RELEASING.md`. `develop` carries `X.Y.Z-dev`. A new tool or module is a minor bump; fixes, security, docs and chores are patches. A breaking change to an existing tool is a minor bump with a changelog note explaining migration.
