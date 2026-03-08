# Releasing mcp-swiss 🏔️

This document describes the complete release process for maintainers.

---

## Table of Contents

1. [Release Process](#1-release-process)
2. [Pre-Release Checklist](#2-pre-release-checklist)
3. [Version Strategy](#3-version-strategy)
4. [Post-Release Verification](#4-post-release-verification)
5. [Troubleshooting](#5-troubleshooting)
6. [CI/CD Workflows Reference](#6-cicd-workflows-reference)

---

## 1. Release Process

Follow these steps in order. Do not skip steps.

### Step 1 — Verify develop is clean and ready

```bash
cd ~/mcp-swiss
git checkout develop
git pull origin develop

# Confirm CI is green on develop
gh run list --branch develop --limit 3

# Run full local validation
npm run lint && npm run build && npm run test:unit
```

### Step 2 — Create the release branch

```bash
git checkout -b release/vX.Y.Z develop
```

### Step 3 — Bump the version (ONE commit)

Update all three files in a **single commit**:

1. `package.json` — set `"version": "X.Y.Z"`
2. `package-lock.json` — set `"version": "X.Y.Z"` in the root and the `packages[""]` object
3. `server.json` — set `"version": "X.Y.Z"` and update `packages[0].version`

```bash
# Edit all three files, then:
git add package.json package-lock.json server.json
git commit -m "chore: bump version to X.Y.Z"
```

⚠️ Do NOT make other changes in this commit. One commit, three files, version only.

### Step 4 — Push and create PR to develop

```bash
git push origin release/vX.Y.Z
git ls-remote origin release/vX.Y.Z   # verify push succeeded

gh pr create --base develop --head release/vX.Y.Z \
  --title "chore: release vX.Y.Z" \
  --body "## Release vX.Y.Z

Version bump: X.Y.Z

### Changes since last release
<!-- paste or link to CHANGELOG entries -->

### Checklist
- [x] package.json, package-lock.json, server.json all bumped
- [x] lint + build + test:unit pass
- [x] Pre-release checklist complete"
```

### Step 5 — Merge release PR to develop

```bash
PR_NUM=$(gh pr list --base develop --head release/vX.Y.Z --json number -q '.[0].number')
gh pr checks $PR_NUM --watch
gh pr merge $PR_NUM --merge --delete-branch
```

### Step 6 — Create PR from develop to main

```bash
git checkout develop
git pull origin develop

gh pr create --base main --head develop \
  --title "release: vX.Y.Z" \
  --body "## Release vX.Y.Z

<!-- Copy release notes from CHANGELOG.md -->

### What's New
- Feature 1
- Feature 2
- Bug fix 1

### Stats
- X tools across Y modules
- Zero API keys required

### Checklist
- [x] Pre-release checklist complete
- [x] All CI checks green on develop
- [x] version bumped in package.json, package-lock.json, server.json"
```

### Step 7 — Merge develop → main

```bash
RELEASE_PR=$(gh pr list --base main --head develop --json number -q '.[0].number')
gh pr checks $RELEASE_PR --watch
gh pr merge $RELEASE_PR --merge
```

### Step 8 — Monitor release automation

The push to `main` automatically triggers four workflows:

1. **`release.yml`** — publishes to npm, creates GitHub Release, opens dev-bump PR
2. **`mcp-registry.yml`** — publishes to MCP Registry (waits 90s for npm propagation)
3. **`ci.yml`** — runs full CI suite on main

Monitor:
```bash
gh run list --branch main --limit 5
gh run watch   # watch the latest run
```

### Step 9 — Merge the dev-bump PR

After `release.yml` completes, it opens a PR to bump `develop` to the next `-dev` version (e.g. `0.4.3-dev`).

```bash
DEV_BUMP_PR=$(gh pr list --base develop --head "chore/dev-version-bump*" --json number -q '.[0].number' 2>/dev/null || \
              gh pr list --base develop --json number,title -q '[.[] | select(.title | contains("dev"))][0].number')
gh pr checks $DEV_BUMP_PR --watch
gh pr merge $DEV_BUMP_PR --merge --delete-branch
```

### Step 10 — Verify (see [Post-Release Verification](#4-post-release-verification))

---

## 2. Pre-Release Checklist

Complete **before** creating the develop → main PR.

### Documentation
- [ ] README tool count matches actual tool count in `src/index.ts`
- [ ] README has a section for every module
- [ ] `server.json` description is ≤100 characters (count carefully)
- [ ] `server.json` version matches `package.json`
- [ ] `docs/tool-specs.md` documents all new tools
- [ ] `docs/tools.schema.json` has schemas for all new tools
- [ ] `CHANGELOG.md` has an entry for this version

### Tests & CI
- [ ] `npm run lint` passes clean (zero warnings treated as errors)
- [ ] `npm run build` compiles without errors
- [ ] `npm run test:unit` all pass
- [ ] `npm run test:integration` passes (or known API flakes are documented)
- [ ] CI is green on develop branch

### No pending work
- [ ] No open fix PRs that should be included in this release
- [ ] No half-merged feature branches
- [ ] All integration branches have been merged to develop

---

## 3. Version Strategy

### Scheme: `MAJOR.MINOR.PATCH`

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| New module (4+ tools) | Minor (`0.X.0`) | `0.3.0` → `0.4.0` |
| New tools in existing module | Minor (`0.X.0`) | `0.3.0` → `0.4.0` |
| Bug fixes | Patch (`0.X.Y`) | `0.4.0` → `0.4.1` |
| Chores, CI, docs | Patch (`0.X.Y`) | `0.4.1` → `0.4.2` |
| Breaking changes to existing tools | Minor + changelog note | document carefully |

### The `-dev` suffix

`develop` always carries a `-dev` suffix:
- After releasing `0.4.0`, develop becomes `0.4.1-dev`
- After releasing `0.4.1`, develop becomes `0.4.2-dev`
- This ensures beta builds (from `beta.yml`) publish as `0.4.1-dev` and don't conflict with production versions

**Never release a `-dev` version to production.**

---

## 4. Post-Release Verification

After merging to main and waiting ~5 minutes for CI/workflows:

### npm

```bash
npm view mcp-swiss version
# Should show X.Y.Z (not X.Y.Z-dev)

npm view mcp-swiss dist-tags
# Should show: latest: X.Y.Z
```

### GitHub Release

```bash
gh release list --limit 5
# Should show vX.Y.Z at the top

gh release view vX.Y.Z
# Verify release notes are correct
```

### MCP Registry

Visit [https://registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io) and search for `mcp-swiss`. The version should match.

⚠️ MCP Registry has CDN caching — it may show the old version for up to 30 minutes after publish.

### develop branch health

```bash
git checkout develop
git pull origin develop

# Verify develop is NOT behind main
git log --oneline main ^develop | head -5
# Should be empty — develop must contain everything in main

# Verify develop has the new -dev version
cat package.json | grep version
# Should show X.Y.(Z+1)-dev
```

### Quick functional smoke test

```bash
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js | head -1 | python3 -m json.tool | grep '"name"' | wc -l
# Should show the expected tool count
```

---

## 5. Troubleshooting

### npm "version already published"

**Symptom:** `release.yml` fails with `npm ERR! 403 You cannot publish over the previously published versions of mcp-swiss`

**Cause:** The workflow re-triggered (push to main happened twice), or the version was already published.

**Fix:** This is expected and has a guard in the workflow. Check if npm already has the version:
```bash
npm view mcp-swiss version
```
If it matches, npm publish succeeded on the first run. The GitHub Release may still need to be created manually:
```bash
gh release create vX.Y.Z --notes "See CHANGELOG.md"
```

### Dev-bump PR fails CI

**Symptom:** The auto-created dev-bump PR shows CI failures.

**Cause:** Usually a lint or test issue introduced by the version bump (rare).

**Fix:** Review the failure, push a fix commit to the dev-bump branch, then merge.

If the PR can't be merged automatically:
```bash
git checkout develop
git pull origin develop
# Manually edit package.json, package-lock.json, server.json to X.Y.(Z+1)-dev
git add -A
git commit -m "chore: bump develop to X.Y.(Z+1)-dev"
git push origin develop  # ⚠️ Only if PR workflow is genuinely broken
```

### MCP Registry shows old version

**Symptom:** Registry still shows the previous version.

**Cause:** CDN caching.

**Fix:** Wait up to 30 minutes. If still stale after 1 hour, check the `mcp-registry.yml` workflow run:
```bash
gh run list --workflow mcp-registry.yml --limit 5
gh run view <run-id> --log
```

### develop is behind main

**Symptom:** `git log --oneline main ^develop` shows commits.

**Cause:** Something was pushed directly to main, or a hotfix bypassed the PR workflow.

**Fix:** This should never happen if the workflow rules are followed. If it does:
```bash
# Create a sync branch from main, PR it to develop
git checkout main
git pull origin main
git checkout -b chore/sync-develop-from-main
git push origin chore/sync-develop-from-main
gh pr create --base develop --head chore/sync-develop-from-main \
  --title "chore: sync develop from main" \
  --body "Sync develop with main after out-of-band changes."
```

### CI fails on main after merge

**Symptom:** CI runs on main after the release merge fail.

**Fix:** Create a `fix/<issue>` branch from develop, fix the issue, PR to develop, then create a patch release.

---

## 6. CI/CD Workflows Reference

All workflows are in `.github/workflows/`.

### `ci.yml` — Continuous Integration

**Triggers:** Push to any branch, all PRs

**Steps:**
1. Install Node.js + dependencies
2. `npm run lint` — ESLint TypeScript checks
3. `npm run build` — TypeScript compilation
4. `npm run test:unit` — unit tests (mocked HTTP, fast)
5. `npm run test:integration` — live API tests (network required)
6. Security audit (`npm audit`)

**Expected duration:** ~2-3 minutes

This is the gate for all PRs. A PR cannot be merged until `ci.yml` passes.

---

### `release.yml` — Production Release

**Triggers:** Push to `main`

**Steps:**
1. Checks if the version in `package.json` is already published to npm (skips if so)
2. `npm publish --access public` → publishes to npm registry
3. Creates a GitHub Release with auto-generated release notes
4. Opens a PR to bump `develop` to the next `-dev` patch version

**Expected duration:** ~3-5 minutes

**Important:** This workflow runs on every push to main, not just version bumps. The guard in step 1 prevents double-publishing.

---

### `beta.yml` — Beta Publish

**Triggers:** Push to `develop` (skips commits containing "bump" or "dev-version")

**Steps:**
1. Publishes the current develop version to npm with the `beta` dist-tag
2. Example: `0.4.1-dev` publishes as `mcp-swiss@0.4.1-dev` under the `beta` tag

**Usage:**
```bash
npx mcp-swiss@beta   # use the latest beta
npm view mcp-swiss dist-tags  # see all tags
```

This allows testing the latest develop version without affecting the `latest` tag.

---

### `mcp-registry.yml` — MCP Registry Publication

**Triggers:** Push to `main`

**Steps:**
1. Waits 90 seconds for npm to propagate the new version
2. Submits the updated `server.json` to the MCP Registry API
3. The registry indexes the new version and makes it discoverable

**Expected duration:** ~2 minutes (including the 90s delay)

If this fails due to npm not yet propagating, re-run the workflow manually:
```bash
gh workflow run mcp-registry.yml --ref main
```

---

## Notes for AI Sub-Agents

If you are an AI agent executing this release workflow:

1. **Always follow the PR workflow** — even for release branches. No direct pushes.
2. **Verify every `git push`** with `git ls-remote origin <branch>` before creating a PR.
3. **Watch CI with `gh pr checks <num> --watch`** — don't assume it passes.
4. **Use `--merge` only** when calling `gh pr merge`.
5. **Wait for `release.yml` to complete** before declaring the release done.
6. **Notify the main session** at each stage: version bump commit, PRs created, CI status, npm published.
7. **Check `npm view mcp-swiss version`** as final confirmation.
