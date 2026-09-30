# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.x (current) | ✅ Active |
| < 0.1.0 | ❌ No |

## Scope

### What IS a security issue

- **Dependency vulnerabilities** — a transitive dependency with a known CVE that could affect mcp-swiss users
- **Parameter injection** — crafted tool arguments that cause unintended behaviour (e.g. SSRF via URL manipulation in tool parameters)
- **Data leakage** — tool responses that inadvertently expose information beyond what the upstream API returns
- **Prototype pollution** — in JSON parsing or argument handling

### What is NOT a security issue

- Upstream API downtime or data quality issues (report to the data provider)
- API rate limiting by upstream providers
- The fact that all APIs are public/zero-auth by design — this is intentional
- MCP protocol questions — see https://modelcontextprotocol.io

## Reporting a vulnerability

**Open a GitHub issue:** https://github.com/vikramgorla/mcp-swiss/issues/new

Since mcp-swiss handles no credentials, tokens, or personal data (all upstream APIs are public Swiss open data), public issue reporting is fine. If you believe the issue is sensitive, use GitHub's private vulnerability reporting:

- [Security → Report a vulnerability](https://github.com/vikramgorla/mcp-swiss/security/advisories/new)

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Contributing a fix

This is a community-maintained open-source project. If you find a vulnerability, we'd love your help fixing it:

1. Open a GitHub issue describing the vulnerability
2. Fork the repo and submit a PR with the fix
3. We'll review and merge as quickly as we can

We don't guarantee specific response timelines, but we take security seriously and will address issues as fast as possible.

## Notes

mcp-swiss handles **no credentials, tokens, or personal data**. All upstream APIs are public Swiss open data. The tool runs locally via stdio — it does not expose any network port or server.
