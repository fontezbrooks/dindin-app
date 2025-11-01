# Branch Protection Configuration

This document provides the recommended branch protection settings for the dindin-app repository.

## Main Branch Protection

Configure the following settings for the `main` branch:

### Required Status Checks
- **Require status checks to pass before merging**: ✅ Enabled
- **Require branches to be up to date before merging**: ✅ Enabled

#### Required Check Contexts:
```
CI Pipeline / Lint & Format
CI Pipeline / Type Check (backend)
CI Pipeline / Type Check (frontend)
CI Pipeline / Test Backend
CI Pipeline / Test Frontend
CI Pipeline / Build Applications (backend)
CI Pipeline / Build Applications (frontend)
CI Pipeline / Security Audit
CI Pipeline / Quality Gate
```

### Branch Restrictions
- **Restrict pushes that create files**: ❌ Disabled
- **Require a pull request before merging**: ✅ Enabled
  - **Require approvals**: ✅ Enabled (minimum 1)
  - **Dismiss stale PR approvals when new commits are pushed**: ✅ Enabled
  - **Require review from code owners**: ✅ Enabled
  - **Restrict reviews to users with push access**: ✅ Enabled
  - **Allow specified actors to bypass required pull requests**: ❌ Disabled

### Additional Restrictions
- **Restrict who can push to matching branches**: ✅ Enabled
  - **Include administrators**: ❌ Disabled (allows admin override for emergencies)
- **Allow force pushes**: ❌ Disabled
- **Allow deletions**: ❌ Disabled

## Develop Branch Protection

Configure the following settings for the `develop` branch:

### Required Status Checks
- **Require status checks to pass before merging**: ✅ Enabled
- **Require branches to be up to date before merging**: ✅ Enabled

#### Required Check Contexts:
```
CI Pipeline / Lint & Format
CI Pipeline / Type Check (backend)
CI Pipeline / Type Check (frontend)
CI Pipeline / Quality Gate
```

### Branch Restrictions
- **Require a pull request before merging**: ✅ Enabled
  - **Require approvals**: ✅ Enabled (minimum 1)
  - **Dismiss stale PR approvals when new commits are pushed**: ❌ Disabled
  - **Require review from code owners**: ❌ Disabled
  - **Allow specified actors to bypass required pull requests**: ❌ Disabled

## Feature Branch Strategy

### Naming Convention
```
feature/task-[number]-[short-description]
bugfix/[issue-number]-[short-description]
hotfix/[issue-number]-[short-description]
release/v[version]
```

### Workflow
1. **Create feature branch** from `develop`
2. **Implement changes** with regular commits
3. **Open PR** to `develop` branch
4. **Code review** and approval required
5. **Merge** to `develop` after CI passes
6. **Deploy** to staging environment automatically

### Release Workflow
1. **Create release branch** from `develop`
2. **Final testing** and bug fixes
3. **Open PR** to `main` branch
4. **Deploy** to production after merge
5. **Create release tag** automatically

## Quality Gates

### Pre-merge Requirements
- ✅ All CI checks must pass
- ✅ At least 1 approval required
- ✅ No merge conflicts
- ✅ Branch must be up to date
- ✅ Security audit must pass

### Post-merge Actions
- 🚀 Automatic deployment to staging (develop)
- 🚀 Automatic deployment to production (main)
- 📊 Coverage reports generated
- 🔔 Team notifications sent

## Emergency Procedures

### Production Hotfixes
1. **Create hotfix branch** from `main`
2. **Implement minimal fix**
3. **Emergency deployment** with admin override
4. **Create PR** to both `main` and `develop`
5. **Post-incident review** required

### Admin Override Conditions
- 🚨 Critical security vulnerability
- 🚨 Production outage
- 🚨 Data integrity issue

## Code Owners

Create a `.github/CODEOWNERS` file with the following structure:

```
# Global owners
* @team-leads

# Backend specific
apps/backend/ @backend-team
packages/*backend* @backend-team

# Frontend specific
apps/frontend/ @frontend-team
packages/*frontend* @frontend-team

# Infrastructure
.github/ @devops-team
scripts/ @devops-team
docker/ @devops-team

# Security sensitive
.github/workflows/security.yml @security-team
.github/workflows/deploy.yml @devops-team @security-team

# Configuration
package.json @team-leads
turbo.json @team-leads
biome.jsonc @team-leads
```

## Implementation Commands

Run these commands in your repository settings or via GitHub CLI:

```bash
# Enable branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["CI Pipeline / Quality Gate"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null

# Enable branch protection for develop
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["CI Pipeline / Quality Gate"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":false}' \
  --field restrictions=null
```

## Monitoring and Alerts

### Failed Check Notifications
- 📧 Email notifications for failed checks
- 💬 Slack alerts for main branch failures
- 🚨 PagerDuty for critical production issues

### Metrics Tracking
- 📊 PR merge time
- 📊 CI success rates
- 📊 Code review turnaround
- 📊 Deployment frequency

## Troubleshooting

### Common Issues

#### CI Checks Failing
1. Check the specific failed check in Actions
2. Review error messages and logs
3. Fix issues in feature branch
4. Push new commits to update PR

#### Branch Protection Bypass
1. Admin can temporarily disable protection
2. Make emergency changes
3. Re-enable protection immediately
4. Create follow-up PR for proper review

#### Merge Conflicts
1. Update feature branch from target branch
2. Resolve conflicts locally
3. Test thoroughly
4. Push resolved changes

## Best Practices

### Pull Request Guidelines
- 📝 Clear, descriptive titles
- 📝 Detailed descriptions
- 📝 Link to related issues
- 📝 Include testing instructions
- 📝 Add screenshots for UI changes

### Code Review Standards
- 🔍 Review for functionality
- 🔍 Review for security
- 🔍 Review for performance
- 🔍 Review for maintainability
- 🔍 Review for test coverage

### Commit Messages
```
type(scope): description

Examples:
feat(auth): add JWT token refresh
fix(api): resolve user data validation
docs(readme): update installation guide
test(auth): add login flow tests
```