# Branch Protection Settings (apply via GitHub UI or gh CLI)

## main branch
- Require PR before merging: YES
- Required status checks: lint-build, test, security
- Require branches to be up to date: YES
- Require 1 approving review: YES
- Dismiss stale reviews on push: YES
- Restrict who can push: maintainers only
- Do not allow force pushes: YES
- Do not allow deletions: YES

## develop branch  
- Require PR before merging: YES (for external contributors)
- Required status checks: lint-build, test
- Allow maintainer direct push: YES (for trivial fixes)
- Do not allow force pushes: YES

## Apply with gh CLI:
# gh api repos/vikramgorla/mcp-swiss/branches/main/protection \
#   --method PUT \
#   --field required_status_checks='{"strict":true,"contexts":["lint-build","test","security"]}' \
#   --field enforce_admins=false \
#   --field required_pull_request_reviews='{"required_approving_review_count":1}' \
#   --field restrictions=null
