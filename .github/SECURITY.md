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

**Do not open a public GitHub issue for security vulnerabilities.**

Use one of:

1. **GitHub private vulnerability reporting** — preferred  
   Go to [Security → Report a vulnerability](https://github.com/vikramgorla/mcp-swiss/security/advisories/new)

2. **Email**  
   Send details to: `security@[maintainer-domain]` *(update this before going public)*

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Response timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | 48 hours |
| Triage & severity assessment | 7 days |
| Patch released | 30 days |
| Public disclosure | After patch is released |

## Notes

mcp-swiss handles **no credentials, tokens, or personal data**. All upstream APIs are public Swiss open data. The tool runs locally via stdio — it does not expose any network port or server.
