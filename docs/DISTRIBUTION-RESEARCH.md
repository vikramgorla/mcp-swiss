# MCP-Swiss Distribution Research Report

**Date:** 2026-03-08
**Package:** `mcp-swiss` v0.4.3
**npm:** https://www.npmjs.com/package/mcp-swiss
**GitHub:** https://github.com/vikramgorla/mcp-swiss

---

## Table of Contents

1. [MCP Directories & Marketplaces](#1-mcp-directories--marketplaces)
2. [AI Platform Integration](#2-ai-platform-integration)
3. [One-Click / Easy Install Mechanisms](#3-one-click--easy-install-mechanisms)
4. [SEO & Discoverability](#4-seo--discoverability)
5. [Competitive Analysis](#5-competitive-analysis)
6. [Recommendations & Action Plan](#6-recommendations--action-plan)

---

## 1. MCP Directories & Marketplaces

### 1.1 Official MCP Registry (registry.modelcontextprotocol.io) — ⭐ CRITICAL

| Field | Detail |
|-------|--------|
| **URL** | https://registry.modelcontextprotocol.io |
| **Submission** | Publish to npm → use `mcp-publisher` CLI → `mcp-publisher init` creates `server.json` → publish metadata |
| **Status** | ✅ Already listed (via GitHub Actions workflow in our CI) |
| **Priority** | 🔴 Critical — this is the canonical source of truth. All other registries sync from here. |

**Key details:**
- Launched preview Sept 2025 by the MCP working group (Anthropic, GitHub, Microsoft)
- Identifies servers with stable UUIDs and authenticated namespaces
- Other registries (Glama, Smithery, etc.) can sync from this registry
- Our `server.json` + GitHub Actions already handles this — verify after each release

**Action:** Verify our listing is current after v0.4.3 release. Run `mcp-publisher` to ensure metadata is up-to-date.

---

### 1.2 mcp.so (Smithery) — ⭐ HIGH

| Field | Detail |
|-------|--------|
| **URL** | https://mcp.so |
| **Submission** | Create a GitHub issue on their repo with server name, description, features, connection info. Submit button in navbar. |
| **Status** | ❓ Needs verification — check if auto-indexed from npm/registry |
| **Priority** | 🔴 High — 18,000+ servers listed, high traffic, appears in Google searches prominently |

**How to submit:**
1. Go to https://mcp.so and click "Submit" in the navbar
2. Opens a GitHub issue template
3. Fill in: server name (`mcp-swiss`), description, GitHub URL, npm package, features list
4. Wait for review and listing

**Smithery CLI integration:**
```bash
# Users can install via Smithery CLI
npx @smithery/cli@latest install mcp-swiss --client claude
```

**Action:** Submit mcp-swiss to mcp.so immediately if not already listed.

---

### 1.3 Glama.ai MCP Directory — ⭐ HIGH

| Field | Detail |
|-------|--------|
| **URL** | https://glama.ai/mcp/servers |
| **Submission** | Push/upload server → manual review (license check, capability inspection in isolated VM, dependency scan) |
| **Status** | ❓ Needs verification |
| **Priority** | 🔴 High — ~10,000 servers, polished interface, editorial quality standards, powers awesome-mcp-servers web directory |

**How to submit:**
1. Visit https://glama.ai/mcp/servers
2. Look for "Submit" or "Add Server" option
3. Provide GitHub URL and npm package
4. Server undergoes automated + manual review

**Bonus:** Glama powers the web version of awesome-mcp-servers — getting listed here may auto-populate there.

**Action:** Submit to Glama.ai after verifying mcp.so listing.

---

### 1.4 awesome-mcp-servers (GitHub) — ⭐ HIGH

| Field | Detail |
|-------|--------|
| **URL** | https://github.com/punkpeye/awesome-mcp-servers |
| **Submission** | Fork repo → edit README.md → submit PR |
| **Status** | ❓ Not listed (needs PR) |
| **Priority** | 🔴 High — most starred MCP list, 738+ open PRs, community authority |

**How to submit:**
1. Fork `punkpeye/awesome-mcp-servers`
2. Edit `README.md` — add mcp-swiss under appropriate category (likely "Data & Information" or create "Government & Public Data")
3. Format: `- [mcp-swiss](https://github.com/vikramgorla/mcp-swiss) - Swiss open data MCP server with 68 tools: transport, weather, geodata, companies, parliament, avalanche, and more. Zero API keys required. 🏷️`
4. Maintain alphabetical order within category
5. Submit PR with title "Add mcp-swiss - Swiss open data server"

**Note:** There's also `appcypher/awesome-mcp-servers` — less active but worth a PR too.

**Action:** Submit PR immediately. This is the highest-impact listing.

---

### 1.5 mcpservers.org — MEDIUM

| Field | Detail |
|-------|--------|
| **URL** | https://mcpservers.org |
| **Submission** | Free submission form at https://mcpservers.org/submit. Optional premium ($39) for faster review + badge + dofollow link. |
| **Status** | ❓ Not listed |
| **Priority** | 🟡 Medium — decent SEO, free to list |

**How to submit:**
1. Go to https://mcpservers.org/submit
2. Fill in category, server details
3. Free listing available (slower review)
4. Optional: $39 premium for faster review + official badge + dofollow backlink

**Action:** Submit free listing. Consider premium only if budget allows — the dofollow link has SEO value.

---

### 1.6 PulseMCP — MEDIUM

| Field | Detail |
|-------|--------|
| **URL** | https://www.pulsemcp.com |
| **Submission** | Email hello@pulsemcp.com |
| **Status** | ❓ Not listed |
| **Priority** | 🟡 Medium — clean layout, newsletter with good reach, co-founder is on MCP Steering Committee |

**Key detail:** Tadas Antanavicius (PulseMCP co-founder) is on the MCP Steering Committee and maintains the official MCP Registry. Getting featured in their newsletter would be high-value.

**How to submit:**
1. Email hello@pulsemcp.com
2. Include: package name, GitHub URL, description, key features (68 tools, 20 modules, zero API keys, Swiss open data)
3. Ask about newsletter feature possibility

**Action:** Send a well-crafted email to hello@pulsemcp.com.

---

### 1.7 Cline MCP Marketplace — ⭐ HIGH

| Field | Detail |
|-------|--------|
| **URL** | https://github.com/cline/mcp-marketplace |
| **Submission** | Open GitHub issue with template |
| **Status** | ❓ Not listed |
| **Priority** | 🔴 High — one-click install for millions of Cline users, VS Code integration |

**How to submit:**
1. Go to https://github.com/cline/mcp-marketplace/issues/new?template=mcp-server-submission.yml
2. Provide:
   - GitHub Repo URL: `https://github.com/vikramgorla/mcp-swiss`
   - Logo Image: 400×400 PNG (we need to create this)
   - Reason for Addition: "68 tools for Swiss open data — transport, weather, geodata, companies, parliament, and more. Zero API keys required. Unique niche: Switzerland-specific data."
3. Confirm: test that Cline can install from README.md
4. Consider adding `llms-install.md` to repo for guided AI installation

**Pre-requisite:** Create a 400×400 logo PNG. Add `llms-install.md` to repo root.

**Action:** Create logo, add llms-install.md, then submit to Cline marketplace.

---

### 1.8 MCP Market (mcpmarket.com) — LOW-MEDIUM

| Field | Detail |
|-------|--------|
| **URL** | https://mcpmarket.com |
| **Submission** | Likely auto-indexed or manual submission |
| **Status** | ❓ Unknown |
| **Priority** | 🟡 Low-Medium — newer platform, growing |

---

### 1.9 MCP Directory (mcpdirectory.app) — LOW

| Field | Detail |
|-------|--------|
| **URL** | https://mcpdirectory.app |
| **Submission** | Unknown — likely auto-indexed from registry |
| **Status** | ❓ Unknown |
| **Priority** | 🟢 Low — claims 2,500+ servers |

---

### 1.10 OpenTools / mcpt (Mintlify) — LOW

| Field | Detail |
|-------|--------|
| **URL** | Various emerging platforms |
| **Submission** | Varies |
| **Priority** | 🟢 Low — still emerging |

---

### Directory Summary Table

| Directory | Priority | Submission Method | Status | Effort |
|-----------|----------|-------------------|--------|--------|
| Official MCP Registry | Critical | `mcp-publisher` CLI | ✅ Listed | Done |
| mcp.so (Smithery) | High | GitHub issue | ❓ Check | Low |
| Glama.ai | High | Web submission | ❓ Check | Low |
| awesome-mcp-servers | High | GitHub PR | ❌ Not listed | Low |
| Cline Marketplace | High | GitHub issue + logo | ❌ Not listed | Medium |
| mcpservers.org | Medium | Web form | ❌ Not listed | Low |
| PulseMCP | Medium | Email | ❌ Not listed | Low |
| MCP Market | Low-Med | Unknown | ❓ Check | Low |
| MCP Directory | Low | Auto-indexed? | ❓ Check | None |

---

## 2. AI Platform Integration

### 2.1 Claude Desktop (Anthropic) — ✅ FULL SUPPORT

**Status:** Full MCP support, primary MCP client
**Config file:** `claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Config snippet for mcp-swiss:**
```json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**Desktop Extensions (.mcpb):** Since June 2025, Anthropic supports `.mcpb` files — zip archives containing MCP server code + `manifest.json`. One-click install by double-clicking or drag-and-drop.

**Action items:**
1. Add the config snippet to README prominently
2. Consider creating a `.mcpb` package for one-click Claude Desktop install
3. Explore if we can host a deeplink like `claude://install/mcp-swiss`

**Marketplace:** No built-in marketplace yet in Claude Desktop, but `.mcpb` distribution is the closest equivalent.

---

### 2.2 Claude.ai (Web) — ⚠️ LIMITED/REMOTE ONLY

**Status:** Supports remote MCP servers via Streamable HTTP transport
**Limitation:** Does not support stdio (local) servers — only remote/hosted servers
**Our status:** mcp-swiss is stdio-only today → NOT compatible with Claude.ai web

**Action:** To support Claude.ai web, we'd need to add SSE/Streamable HTTP transport and deploy a hosted instance. This is a medium-term goal.

---

### 2.3 Claude Mobile (iOS/Android) — ❌ NO MCP SUPPORT

**Status:** No MCP support on mobile as of March 2026
**Roadmap:** Unknown — Anthropic hasn't announced mobile MCP plans

**Action:** None for now. Monitor announcements.

---

### 2.4 ChatGPT (OpenAI) — ✅ FULL SUPPORT (Developer Mode)

**Status:** Full MCP read/write support in Developer Mode (beta, launched Sept-Oct 2025)
**Available to:** Pro, Plus, Business, Enterprise, Education accounts
**How to enable:**
1. ChatGPT Settings → Connectors → Advanced → Developer Mode
2. Add MCP server configuration

**Config for mcp-swiss:**
Users need to configure via ChatGPT's connector settings. The exact config UI differs from Claude Desktop's JSON file approach — it's more GUI-driven within ChatGPT settings.

**Important:** ChatGPT primarily supports remote MCP servers. Our stdio transport may need an adapter or remote deployment for ChatGPT compatibility.

**Action:** Investigate ChatGPT's exact MCP configuration flow. Adding remote transport would unlock ChatGPT's massive user base.

---

### 2.5 Google Gemini — ⚠️ SDK/CLI ONLY

**Status:** Native SDK support for MCP in Gemini API. Gemini CLI supports MCP servers.
**Limitation:** NOT available as tools in the Gemini web app (as of recent data). Works within ADK (Agent Development Kit) framework and Gemini CLI.

**Gemini CLI config:**
```bash
# Gemini CLI can discover and use MCP servers
gemini --mcp-server "npx mcp-swiss"
```

**Action:** Add Gemini CLI configuration example to README. Monitor Gemini web app MCP support.

---

### 2.6 GitHub Copilot / VS Code — ✅ FULL SUPPORT (GA)

**Status:** GA since VS Code 1.102 (June 2025). MCP servers are first-class resources.
**Config:** `~/.vscode/mcp.json` or project-level `.vscode/mcp.json`

**Config snippet:**
```json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**MCP Gallery:** VS Code has a dedicated MCP view/gallery for browsing and installing servers.

**Admin control:** Organizations can enable/disable MCP via "MCP servers in Copilot" policy.

**Action:** Add VS Code config snippet to README. Investigate listing in VS Code MCP gallery.

---

### 2.7 Cursor — ✅ FULL SUPPORT

**Status:** Full MCP support
**Config file:** `~/.cursor/mcp.json`

**Config snippet:**
```json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**How to add:**
1. Cursor Settings → Tools & Integrations → MCP Tools → Add Custom MCP
2. Paste config into `mcp.json`

**Action:** Add Cursor config to README.

---

### 2.8 Windsurf (Codeium) — ✅ FULL SUPPORT

**Status:** Full MCP support with curated one-click servers
**Config file:** `~/.codeium/windsurf/mcp_config.json`

**Config snippet:**
```json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**Action:** Add Windsurf config to README. Investigate getting listed as a curated one-click server.

---

### 2.9 Continue.dev — ✅ FULL SUPPORT (Agent Mode)

**Status:** Full MCP support, but only in Agent mode
**Config:** `.continue/mcpServers/mcp-swiss.yaml` in workspace root

**Config snippet:**
```yaml
name: Swiss Open Data MCP
version: 0.4.3
schema: v1
mcpServers:
  - name: mcp-swiss
    command: npx
    args:
      - "-y"
      - "mcp-swiss"
```

**Action:** Add Continue.dev config to README.

---

### 2.10 Cline — ✅ FULL SUPPORT + MARKETPLACE

**Status:** Full MCP support with dedicated marketplace
**Config:** `cline_mcp_settings.json` in VS Code global storage
**Marketplace:** https://cline.bot/mcp-marketplace — one-click install

**Action:** Submit to Cline Marketplace (covered in Section 1.7). Add config snippet to README.

---

### 2.11 Amazon Q Developer — ✅ FULL SUPPORT

**Status:** Full MCP support in CLI (April 2025) and IDE plugins (mid-2025)
**Config files:**
- Global: `~/.aws/amazonq/mcp.json`
- Project: `.amazonq/mcp.json`

**Config snippet:**
```json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

**Remote support:** Available since Sept 2025 for HTTP-based servers.

**Action:** Add Amazon Q config to README.

---

### 2.12 Perplexity — ✅ LOCAL MCP SUPPORT

**Status:** Local MCP support via Mac app. Remote MCP planned for paid subscribers.
**Limitation:** Mac-only currently. Local MCP = stdio works.

**Action:** Monitor remote MCP rollout. Add Perplexity config to README when stable.

---

### Platform Summary Table

| Platform | MCP Support | Transport | Config Method | Marketplace? |
|----------|-------------|-----------|---------------|-------------|
| Claude Desktop | ✅ Full | stdio ✅ | JSON file | .mcpb extensions |
| Claude.ai (web) | ⚠️ Remote only | SSE/HTTP ❌ | Web UI | No |
| Claude Mobile | ❌ None | N/A | N/A | No |
| ChatGPT | ✅ Dev Mode | Remote preferred | GUI settings | Connectors |
| Gemini | ⚠️ SDK/CLI | stdio ✅ | CLI flags | No |
| GitHub Copilot/VS Code | ✅ GA | stdio ✅ | JSON file | MCP Gallery |
| Cursor | ✅ Full | stdio ✅ | JSON file | No |
| Windsurf | ✅ Full | stdio ✅ | JSON file | Curated list |
| Continue.dev | ✅ Agent mode | stdio ✅ | YAML file | No |
| Cline | ✅ Full | stdio ✅ | JSON/UI | Marketplace ✅ |
| Amazon Q | ✅ Full | stdio + HTTP | JSON file | No |
| Perplexity | ✅ Local (Mac) | stdio ✅ | App settings | No |

---

## 3. One-Click / Easy Install Mechanisms

### 3.1 Current: `npx mcp-swiss` ✅

Already works. This is the standard mechanism. Most config snippets use:
```json
"command": "npx",
"args": ["-y", "mcp-swiss"]
```

### 3.2 Smithery CLI Install

```bash
npx @smithery/cli@latest install mcp-swiss --client claude
```

**Pre-req:** Server must be listed on Smithery (mcp.so). Once listed, this auto-generates configs for supported clients.

**Action:** List on Smithery first, then document this install method.

### 3.3 Claude Desktop Extensions (.mcpb)

The `.mcpb` format is a zip containing:
```
mcp-swiss.mcpb/
├── manifest.json
├── package.json
├── dist/
│   └── index.js
└── node_modules/
```

`manifest.json` example:
```json
{
  "name": "mcp-swiss",
  "displayName": "Swiss Open Data",
  "description": "68 tools for Swiss open data — transport, weather, geodata, companies, parliament, and more",
  "version": "0.4.3",
  "mcpConfig": {
    "command": "node",
    "args": ["dist/index.js"]
  }
}
```

**Distribution:** Users double-click the `.mcpb` file → Claude Desktop auto-installs.

**Action:** Create `.mcpb` package. Host on GitHub Releases. Add download link to README.

### 3.4 VS Code MCP Gallery

VS Code 1.102+ has an MCP gallery. Investigate how to get listed there — likely auto-indexed from VS Code marketplace or MCP registry.

### 3.5 Docker-Based Option

For remote/hosted deployments:
```dockerfile
FROM node:22-alpine
RUN npm install -g mcp-swiss
CMD ["mcp-swiss"]
EXPOSE 3000
```

Could enable SSE/Streamable HTTP transport for web-based clients (Claude.ai, ChatGPT).

**Action:** Medium-term — add Dockerfile to repo. Consider deploying to Railway/Fly.io for a hosted instance.

### 3.6 Remote/Hosted MCP Server (SSE Transport)

Adding Streamable HTTP transport would unlock:
- Claude.ai (web)
- ChatGPT Developer Mode
- Amazon Q remote
- Any web-based MCP client

**Implementation:** Use `@modelcontextprotocol/sdk` transport layer to add HTTP in addition to stdio.

**Action:** Medium-term feature. Add SSE transport alongside stdio.

### 3.7 Install Scripts / One-Liner

Create copy-pasteable one-liners for each platform:

```bash
# Claude Desktop (macOS)
echo '{"mcpServers":{"mcp-swiss":{"command":"npx","args":["-y","mcp-swiss"]}}}' > ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Claude Desktop (Linux)
mkdir -p ~/.config/Claude && echo '{"mcpServers":{"mcp-swiss":{"command":"npx","args":["-y","mcp-swiss"]}}}' > ~/.config/Claude/claude_desktop_config.json

# Cursor
mkdir -p ~/.cursor && echo '{"mcpServers":{"mcp-swiss":{"command":"npx","args":["-y","mcp-swiss"]}}}' > ~/.cursor/mcp.json

# VS Code
mkdir -p .vscode && echo '{"mcpServers":{"mcp-swiss":{"command":"npx","args":["-y","mcp-swiss"]}}}' > .vscode/mcp.json
```

**Caveat:** These overwrite existing configs. Better to provide merge-aware scripts or just config snippets.

**Action:** Add platform-specific config snippets to README and docs site.

### 3.8 QR Code / Short URL

Create a short URL like `mcp.swiss` or use bit.ly pointing to:
- GitHub README with install instructions
- Or a landing page with platform-specific install buttons

**Action:** Register a short domain or create short URL. Generate QR code for conference materials.

---

## 4. SEO & Discoverability

### 4.1 How MCP Servers Get Discovered

1. **Directory listings** — Most users browse mcp.so, Glama, awesome-mcp-servers
2. **Google searches** — "MCP server for [use case]", "Swiss data MCP"
3. **npm search** — `npm search mcp` returns results based on keywords
4. **AI assistant recommendations** — Claude/ChatGPT themselves suggest MCP servers
5. **Social media** — Twitter/X, Reddit r/mcp, Hacker News
6. **Newsletter features** — PulseMCP newsletter, AI newsletters
7. **Conference talks** — MCP-related events, Swiss tech events

### 4.2 Metadata That Matters

**package.json keywords (current + recommended additions):**
```json
{
  "keywords": [
    "mcp",
    "model-context-protocol",
    "mcp-server",
    "swiss",
    "switzerland",
    "open-data",
    "transport",
    "weather",
    "sbb",
    "train",
    "geodata",
    "companies",
    "parliament",
    "avalanche",
    "ai",
    "claude",
    "llm",
    "api",
    "public-transport",
    "swiss-data"
  ]
}
```

**server.json:** Must have accurate description ≤100 chars, correct version, proper tool definitions.

**README badges to add:**
```markdown
[![npm version](https://img.shields.io/npm/v/mcp-swiss.svg)](https://www.npmjs.com/package/mcp-swiss)
[![npm downloads](https://img.shields.io/npm/dm/mcp-swiss.svg)](https://www.npmjs.com/package/mcp-swiss)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![GitHub stars](https://img.shields.io/github/stars/vikramgorla/mcp-swiss)](https://github.com/vikramgorla/mcp-swiss/stargazers)
```

### 4.3 Landing Page / Docs Site

**Recommendation:** YES — create a simple landing page.

Options (ranked by effort):
1. **GitHub Pages** (lowest effort) — Use repo's GitHub Pages with a nice README + docs
2. **Mintlify / Docusaurus** (medium) — Proper docs site
3. **Custom domain** (mcp-swiss.dev or swiss-mcp.dev) — Professional presence

A landing page should have:
- Hero: "68 tools for Swiss open data. Zero API keys. One command."
- Platform install buttons (Claude, Cursor, VS Code, etc.)
- Tool catalog (searchable list of all 68 tools)
- Config snippets per platform
- Demo GIFs showing real usage

**Action:** Start with enhanced GitHub README. Consider GitHub Pages or Mintlify later.

### 4.4 Social Proof & Promotion

**GitHub Stars Strategy:**
- Cross-post to relevant communities (see below)
- Add "Star this repo" CTA to README
- Every directory listing drives some stars
- Consider "star exchange" with other MCP projects (mutual promotion)

**Blog Posts (high impact):**
1. **Dev.to:** "I built an MCP server for Swiss open data — 68 tools, zero API keys"
2. **Hacker News (Show HN):** "Show HN: MCP-Swiss – Swiss open data for AI assistants (68 tools, zero API keys)"
3. **Reddit r/mcp:** Share as a new server announcement
4. **Reddit r/Switzerland:** "Made an AI tool that gives Claude/ChatGPT access to Swiss train schedules, weather, and more"
5. **Medium:** Technical deep-dive on building an MCP server
6. **LinkedIn:** Professional network post about open data + AI

**Timing:** Post Show HN when you have a polished README + landing page + good directory presence. First impressions matter.

### 4.5 Community Channels

| Community | URL | Action |
|-----------|-----|--------|
| MCP Discord | https://glama.ai/mcp/discord | Join, share mcp-swiss |
| Reddit r/mcp | https://www.reddit.com/r/mcp/ | Post announcement |
| PulseMCP Discord | https://discord.gg/dP2evEyTjS | Join, share |
| Anthropic Developer Discord | Anthropic's community | Share in #mcp channel |
| Swiss Tech communities | Various meetup groups | Present at events |
| opendata.swiss community | Swiss open data community | Announce the tool |

---

## 5. Competitive Analysis

### 5.1 Most Popular MCP Servers

Based on Glama's directory (sorted by usage/stars):

1. **Brave Search MCP** — 467K+ usage, 739 stars. Simple, single-purpose, widely useful.
2. **Context7 (DocFork)** — 161K+ usage. Documentation for 9000+ libraries.
3. **Notion MCP Server** — 197 stars, 3,927+ usage. Official Notion integration.
4. **Filesystem MCP** — Core utility, bundled in many tutorials.
5. **GitHub MCP** — Official, from modelcontextprotocol org.

**Common traits of top servers:**
- Solve a universal pain point (search, docs, files)
- Official backing or well-known maintainer
- Listed on ALL major directories
- Clean README with instant config snippets
- Featured in tutorials and "getting started" guides

### 5.2 How They Achieved Distribution

1. **Early mover advantage** — Listed on awesome-mcp-servers when the list was small
2. **Official backing** — Notion, GitHub, Brave all promoted their own servers
3. **Featured in tutorials** — Many "How to use MCP" tutorials use these as examples
4. **Newsletter features** — PulseMCP and other newsletters regularly feature servers
5. **Cross-platform configs** — Provided config snippets for Claude, Cursor, VS Code, etc.
6. **Blog posts** — Dev.to, Medium, HN posts drove initial traffic

### 5.3 Swiss-Specific & European Competitors

Based on research, there are several Swiss-specific MCP servers:

| Server | Scope | Status |
|--------|-------|--------|
| **mcp-swiss** (ours) | 68 tools, 20 modules, comprehensive | Active, v0.4.3 |
| Swiss Transport MCP | OJP journey planning, real-time departures | Narrower scope |
| SIMAP MCP Server | Swiss public procurement (tenders) | Niche |
| Swiss Parliament MCP | OpenParlData.ch API | Single-domain, by Liip |
| City of Zurich Open Data MCP | 900 datasets, Zurich-specific | City-level, by Liip |

**Our competitive advantage:**
- **Breadth:** 68 tools across 20 modules — no other Swiss MCP covers this range
- **Zero API keys:** Others may require auth
- **One package:** Single `npx mcp-swiss` covers everything
- **Active development:** Regular releases

**Risk:** Liip (Swiss digital agency) is building domain-specific MCP servers. They could potentially build something more comprehensive. But our single-package approach is simpler for users.

**Action:** Position mcp-swiss as the "Swiss Army Knife" MCP server — the one package for all Swiss data needs.

---

## 6. Recommendations & Action Plan

### 🟢 Quick Wins (This Week)

#### QW-1: Submit to awesome-mcp-servers
- **What:** Open PR to add mcp-swiss to punkpeye/awesome-mcp-servers
- **Why:** Highest-visibility community list, drives stars and directory presence
- **How:**
  1. Fork repo
  2. Add under relevant category: `- [mcp-swiss](https://github.com/vikramgorla/mcp-swiss) - 68 tools for Swiss open data: transport, weather, geodata, companies, parliament, avalanche, and more. Zero API keys.`
  3. Submit PR
- **Effort:** Low (30 min)

#### QW-2: Submit to mcp.so (Smithery)
- **What:** List mcp-swiss on Smithery
- **Why:** Largest MCP marketplace (18K+ servers), enables `smithery install` flow
- **How:** Click Submit on mcp.so → fill GitHub issue template
- **Effort:** Low (15 min)

#### QW-3: Submit to Glama.ai
- **What:** List mcp-swiss on Glama directory
- **Why:** High-quality curated directory, powers awesome-mcp-servers web view
- **How:** Submit via glama.ai/mcp/servers
- **Effort:** Low (15 min)

#### QW-4: Submit to mcpservers.org
- **What:** Free listing on mcpservers.org
- **Why:** Additional SEO backlink, wider discoverability
- **How:** Fill form at mcpservers.org/submit
- **Effort:** Low (10 min)

#### QW-5: Email PulseMCP
- **What:** Request listing + potential newsletter feature
- **Why:** Newsletter has good developer reach, co-founder is MCP Steering Committee
- **How:** Email hello@pulsemcp.com with pitch: "68 tools for Swiss open data, zero API keys, unique niche"
- **Effort:** Low (15 min)

#### QW-6: Add platform config snippets to README
- **What:** Add copy-paste config for Claude Desktop, VS Code, Cursor, Windsurf, Continue.dev, Amazon Q, Cline
- **Why:** Reduces friction massively — users need a config snippet, not documentation
- **How:** Add "Quick Start" section with tabbed/collapsible configs per platform
- **Effort:** Low (1 hour)

#### QW-7: Add npm badges to README
- **What:** Add shields.io badges for version, downloads, license, stars
- **Why:** Social proof + quick info at a glance
- **How:** Copy badge markdown from Section 4.2
- **Effort:** Low (10 min)

#### QW-8: Optimize package.json keywords
- **What:** Add comprehensive keywords for npm search discoverability
- **Why:** npm search uses keywords for ranking
- **How:** Update keywords array per Section 4.2
- **Effort:** Low (5 min)

---

### 🟡 Medium-Term (This Month)

#### MT-1: Submit to Cline MCP Marketplace
- **What:** List on Cline's marketplace for one-click install
- **Why:** Millions of Cline users, one-click install flow
- **How:**
  1. Create 400×400 PNG logo for mcp-swiss
  2. Add `llms-install.md` to repo root (Cline uses this for automated setup)
  3. Open issue at github.com/cline/mcp-marketplace with template
- **Effort:** Medium (2-3 hours including logo design)

#### MT-2: Create .mcpb Desktop Extension
- **What:** Package mcp-swiss as a Claude Desktop Extension
- **Why:** One-click install for Claude Desktop users — drag and drop
- **How:**
  1. Create `manifest.json` per Claude Desktop extension spec
  2. Bundle server code + manifest into zip → rename to `.mcpb`
  3. Host on GitHub Releases
  4. Add "Download for Claude Desktop" button to README
- **Effort:** Medium (3-4 hours)

#### MT-3: Write and publish blog post
- **What:** Dev.to article: "I built an MCP server for Swiss open data"
- **Why:** Content marketing, drives traffic to repo, establishes authority
- **How:**
  1. Write 1500-word article covering: motivation, what's possible, demo, how to install
  2. Include GIFs showing Claude using Swiss train schedules, weather, etc.
  3. Post to Dev.to, cross-post to Reddit r/mcp and r/Switzerland
- **Effort:** Medium (4-6 hours)

#### MT-4: Post on Reddit r/mcp
- **What:** Announcement post on r/mcp community
- **Why:** Direct target audience of MCP developers and users
- **How:** Write concise post with use cases, link to repo
- **Effort:** Low (30 min)

#### MT-5: Post Show HN
- **What:** "Show HN: MCP-Swiss – 68 tools for Swiss open data, zero API keys"
- **Why:** Potential for significant traffic and GitHub stars
- **How:** Post when README is polished, directory listings are live, blog post is published
- **Effort:** Low (post itself), but timing matters — do after other improvements

#### MT-6: Create llms.txt and llms-install.md
- **What:** Add LLM-friendly documentation files to repo
- **Why:** Helps AI agents discover and install the server automatically
- **How:**
  1. `llms.txt` — structured metadata about the server
  2. `llms-install.md` — step-by-step install instructions for AI agents
- **Effort:** Low (1 hour)

---

### 🔵 Longer-Term (Next Quarter)

#### LT-1: Add Streamable HTTP Transport
- **What:** Support SSE/HTTP transport alongside stdio
- **Why:** Unlocks Claude.ai (web), ChatGPT Developer Mode, and any remote MCP client
- **How:**
  1. Add HTTP transport using `@modelcontextprotocol/sdk` transport layer
  2. Deploy hosted instance (Railway, Fly.io, or Cloudflare Workers)
  3. Provide both local (`npx mcp-swiss`) and remote (`https://mcp-swiss.fly.dev/mcp`) endpoints
- **Effort:** High (1-2 weeks)

#### LT-2: Create Landing Page / Docs Site
- **What:** Standalone website for mcp-swiss (GitHub Pages or Mintlify)
- **Why:** Professional presence, SEO, platform-specific install flows
- **How:**
  1. Set up GitHub Pages or Mintlify
  2. Create pages: Home, Install, Tools Catalog, Docs, Blog
  3. Add platform-specific "Install" buttons
- **Effort:** Medium (1 week)

#### LT-3: VS Code Extension
- **What:** Publish mcp-swiss as a VS Code extension (beyond just MCP config)
- **Why:** Discoverable in VS Code marketplace (massive audience)
- **How:** Wrap MCP server as VS Code extension, publish to marketplace
- **Effort:** High (1-2 weeks)

#### LT-4: Docker Image
- **What:** Publish official Docker image
- **Why:** Enables hosted deployments, enterprise use, Kubernetes
- **How:**
  1. Create Dockerfile
  2. Publish to Docker Hub and GitHub Container Registry
  3. Document in README
- **Effort:** Medium (1-2 days)

#### LT-5: Speak at Swiss Tech Events
- **What:** Present mcp-swiss at Swiss tech meetups/conferences
- **Why:** Community building, direct user feedback, partnerships
- **How:** Apply to speak at: Swiss PY, SwissJS, opendata.swiss events, MCP community events
- **Effort:** Medium (ongoing)

#### LT-6: Partner with opendata.swiss
- **What:** Get featured or linked from Switzerland's official open data portal
- **Why:** Authority, trust, and traffic from the official Swiss open data ecosystem
- **How:** Contact opendata.swiss team, demonstrate the tool, propose collaboration
- **Effort:** Medium (outreach + follow-up)

---

## Priority Matrix

```
Impact ↑
       │  LT-1 (HTTP)         MT-5 (Show HN)
       │                       QW-1 (awesome-mcp)
       │  MT-2 (.mcpb)        QW-2 (Smithery)
       │  MT-1 (Cline)        QW-3 (Glama)
       │  LT-2 (Landing)      QW-6 (Config snippets)
       │  MT-3 (Blog)         QW-5 (PulseMCP)
       │  LT-3 (VS Code ext)  QW-4 (mcpservers)
       │  LT-6 (opendata.ch)  QW-7 (Badges)
       │  LT-5 (Events)       QW-8 (Keywords)
       │  LT-4 (Docker)
       └──────────────────────────────────→ Effort
           High                Low
```

---

## Appendix: Config Snippets for All Platforms

### Claude Desktop
```json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

### VS Code / GitHub Copilot
```json
// .vscode/mcp.json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

### Cursor
```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

### Windsurf
```json
// ~/.codeium/windsurf/mcp_config.json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

### Continue.dev
```yaml
# .continue/mcpServers/mcp-swiss.yaml
name: Swiss Open Data
version: 0.4.3
schema: v1
mcpServers:
  - name: mcp-swiss
    command: npx
    args:
      - "-y"
      - "mcp-swiss"
```

### Cline
```json
// cline_mcp_settings.json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

### Amazon Q Developer
```json
// ~/.aws/amazonq/mcp.json
{
  "mcpServers": {
    "mcp-swiss": {
      "command": "npx",
      "args": ["-y", "mcp-swiss"]
    }
  }
}
```

---

*Report generated 2026-03-08 by Heidi 🏔️*
