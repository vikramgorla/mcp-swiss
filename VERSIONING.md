# Versioning & Branching Strategy

## Semantic Versioning (SemVer)

`mcp-swiss` follows [Semantic Versioning 2.0.0](https://semver.org): `MAJOR.MINOR.PATCH`

| Change type | Version bump | Example |
|-------------|-------------|---------|
| Breaking change to existing tool schema | **MAJOR** | 1.0.0 → 2.0.0 |
| New tool or module added | **MINOR** | 0.1.0 → 0.2.0 |
| Bug fix, non-breaking enhancement | **PATCH** | 0.1.0 → 0.1.1 |

### What counts as a breaking change?
- Renaming a tool
- Removing a tool
- Changing required input parameters (adding or removing)
- Changing the structure of tool output in a non-backward-compatible way

### Pre-1.0 policy (current)
During `0.x`, MINOR bumps may include breaking changes. Once we hit `1.0.0`, SemVer is strictly enforced.

---

## Branching Strategy (GitHub Flow + release branches)

```
main          ← stable, always deployable, protected
develop       ← integration branch, next release
feature/*     ← new tools / modules
fix/*         ← bug fixes
docs/*        ← documentation only
chore/*       ← deps, CI, config
release/*     ← release preparation (from develop)
hotfix/*      ← urgent production fixes (from main)
```

### Branch rules

**`main`**
- Always reflects the latest published npm release
- Direct pushes forbidden — only merge from `release/*` or `hotfix/*`
- Requires passing CI + 1 review

**`develop`**
- Target for all `feature/*`, `fix/*`, `docs/*`, `chore/*` PRs
- CI must pass
- Direct commits allowed for trivial fixes

**`feature/tool-name`**
- Branch from: `develop`
- Merge to: `develop` via PR
- Naming: `feature/add-train-occupancy`, `feature/postal-codes-module`

**`fix/description`**
- Branch from: `develop` (or `main` for hotfixes)
- Naming: `fix/zefix-uid-lookup`, `fix/weather-timeout`

**`release/x.y.z`**
- Branch from: `develop`
- Only: version bump, changelog, final fixes
- Merge to: `main` (tag) + back-merge to `develop`
- Naming: `release/0.2.0`

**`hotfix/description`**
- Branch from: `main`
- Merge to: `main` (tag as PATCH) + back-merge to `develop`
- Reserved for critical production bugs

---

## Release Process

### Standard release

```bash
# 1. Create release branch from develop
git checkout develop && git pull
git checkout -b release/0.2.0

# 2. Bump version
npm version minor --no-git-tag-version   # or patch/major

# 3. Update CHANGELOG.md
# Add section for 0.2.0 with all changes since last release

# 4. Commit
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): prepare v0.2.0"

# 5. Open PR → main
# After merge:

# 6. Tag on main
git checkout main && git pull
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0

# 7. GitHub Actions publishes release automatically
# 8. Back-merge to develop
git checkout develop
git merge main
git push
```

### Hotfix release

```bash
git checkout main && git pull
git checkout -b hotfix/fix-description
# ... make fix, bump PATCH version ...
git checkout main && git merge hotfix/fix-description
git tag -a v0.1.2 -m "Hotfix v0.1.2: description"
git push origin v0.1.2
git checkout develop && git merge main && git push
```

---

## Commit Message Format (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE: ...]
```

### Types
| Type | Use for |
|------|---------|
| `feat` | New tool or module |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding/updating tests |
| `refactor` | Code change without feature/fix |
| `perf` | Performance improvement |
| `chore` | Deps, build, CI, config |
| `ci` | GitHub Actions changes |

### Scopes
`transport`, `weather`, `geodata`, `companies`, `core`, `ci`, `docs`, `deps`

### Examples
```
feat(transport): add get_journey_detail tool
fix(companies): handle ZEFIX 404 on empty search results
docs(readme): add Cursor IDE configuration example
test(weather): add unit tests for get_weather_history
chore(deps): bump @modelcontextprotocol/sdk to 1.1.0
ci: add Node 22 to test matrix
```

---

## CHANGELOG

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
