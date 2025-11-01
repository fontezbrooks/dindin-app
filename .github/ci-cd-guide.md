# CI/CD Pipeline Guide

This document provides a complete guide to the CI/CD pipeline implemented for the dindin-app.

## 🏗️ Architecture Overview

The CI/CD pipeline is built with GitHub Actions and consists of four main workflows:

1. **CI Pipeline** (`ci.yml`) - Quality gates and testing
2. **Deployment** (`deploy.yml`) - Automated deployments
3. **Security** (`security.yml`) - Security scanning and dependency management
4. **Release** (`release.yml`) - Release automation and app store submissions

## 🔄 Workflow Triggers

### CI Pipeline
- **Push** to `main` or `develop` branches
- **Pull requests** to `main` or `develop`
- Runs on every code change

### Deployment
- **Push** to `main` (auto-deploy to production)
- **Manual trigger** with environment selection
- Requires CI pipeline success

### Security
- **Daily schedule** (6 AM UTC)
- **Dependency changes** (package.json, bun.lock)
- **Manual trigger**

### Release
- **Git tags** (v1.2.3 format)
- **Manual trigger** with version input
- Creates GitHub releases and app store submissions

## 🚀 Pipeline Stages

### 1. Change Detection
```yaml
changes:
  - backend: apps/backend/**
  - frontend: apps/frontend/**
  - packages: packages/**
  - workflows: .github/workflows/**
```

### 2. Dependency Setup
- **Bun installation** (v1.2.0)
- **Dependency caching** (node_modules, ~/.bun/install/cache)
- **Turbo caching** (.turbo directory)

### 3. Quality Gates

#### Linting & Formatting
```bash
bun run check        # Biome check with ultracite
bun run turbo lint   # Workspace-specific linting
```

#### Type Checking
```bash
bun run turbo check-types --filter=backend
bun run turbo check-types --filter=frontend
```

#### Testing
```bash
bun run turbo test --filter=backend   # With MongoDB/Redis services
bun run turbo test --filter=frontend  # Jest with React Native Testing Library
```

#### Security Scanning
```bash
bun audit                    # Dependency vulnerabilities
trivy fs .                   # Filesystem security scan
```

### 4. Build Process
```bash
bun run turbo build --filter=backend
bun run turbo build --filter=frontend
```

### 5. Deployment Strategy

#### Staging (Auto-deploy)
- **Trigger**: Push to `develop`
- **Environment**: staging
- **Strategy**: Rolling deployment
- **Health checks**: Basic endpoint validation

#### Production (Manual approval)
- **Trigger**: Push to `main` or manual
- **Environment**: production
- **Strategy**: Blue-green deployment
- **Health checks**: Comprehensive validation + smoke tests

## 📊 Quality Metrics

### Coverage Requirements
- **Backend**: Minimum 80% test coverage
- **Frontend**: Minimum 70% test coverage
- **Reports**: Uploaded to Codecov

### Performance Benchmarks
- **Build time**: < 5 minutes
- **Test execution**: < 3 minutes
- **Deployment time**: < 10 minutes

### Security Standards
- **No high/critical vulnerabilities** in dependencies
- **OWASP ZAP baseline** for web application scanning
- **Container security** with Trivy scanning

## 🔧 Local Development Setup

### Prerequisites
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Setup environment
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### Running Quality Checks Locally
```bash
# Lint and format
bun run check

# Type checking
bun run check-types

# Run tests
bun run turbo test

# Build applications
bun run build
```

### Pre-commit Hooks
The project uses Husky and lint-staged:

```bash
# Automatically runs on git commit:
bun x ultracite fix  # Biome formatting and linting
```

## 🛡️ Security Pipeline

### Daily Security Scans
- **Dependency audit**: Check for known vulnerabilities
- **License compliance**: Ensure compatible licenses
- **Container scanning**: Security vulnerabilities in Docker images
- **Code quality**: SonarCloud and CodeQL analysis

### Automated Dependency Updates
- **Schedule**: Weekly (Sundays)
- **Process**: Creates PR with dependency updates
- **Validation**: Full CI pipeline must pass before merge

### Security Incident Response
1. **Vulnerability detected** → Issue created automatically
2. **High/Critical severity** → Slack/email notifications
3. **Emergency patches** → Hotfix workflow with admin override

## 📱 Mobile App Pipeline

### Development Builds
```bash
cd apps/frontend
eas build --platform ios --profile development
eas build --platform android --profile development
```

### Production Releases
```bash
# Triggered by release workflow
eas build --platform ios --profile production
eas build --platform android --profile production

# Automatic submission to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

### Over-the-Air Updates
```bash
# Automatic OTA updates for production
eas update --branch production --message "Deploy v1.2.3"
```

## 🚨 Troubleshooting

### Common CI Failures

#### 1. Lint/Format Failures
```bash
# Fix locally
bun run check

# Common issues:
- Missing semicolons
- Unused imports
- Incorrect indentation
- Type errors
```

#### 2. Test Failures
```bash
# Run tests locally
bun run turbo test

# Debug specific workspace
bun run turbo test --filter=backend -- --verbose
```

#### 3. Build Failures
```bash
# Check build locally
bun run turbo build

# Common issues:
- TypeScript errors
- Missing dependencies
- Environment variable issues
```

#### 4. Deployment Failures
```bash
# Check deployment logs in GitHub Actions
# Common issues:
- Missing environment variables
- AWS credential issues
- Health check failures
- Database connection problems
```

### Emergency Procedures

#### Hotfix Deployment
```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-security-fix

# 2. Make minimal changes
# 3. Push and create PR with emergency label

# 4. Admin can override branch protection
# 5. Deploy immediately to production
```

#### Rollback Production
```bash
# 1. Navigate to GitHub Actions
# 2. Find previous successful deployment
# 3. Re-run deployment workflow
# 4. Or manually trigger rollback job
```

### Debug Commands

#### Check Workflow Status
```bash
# List recent workflow runs
gh run list

# Get details of specific run
gh run view [run-id]

# Download logs
gh run download [run-id]
```

#### Environment Debugging
```bash
# Check secrets and variables
gh secret list
gh variable list

# Verify environment configuration
gh api repos/:owner/:repo/environments
```

## 📈 Monitoring and Alerts

### GitHub Actions Monitoring
- **Workflow success rates**: Target 95%+ success rate
- **Execution time**: Monitor for performance degradation
- **Resource usage**: Track action minutes consumption

### Application Monitoring
- **Health checks**: Every deployment includes health validation
- **Error tracking**: Sentry integration for both backend and frontend
- **Performance monitoring**: Monitor API response times and app performance

### Notification Channels

#### Slack Integration
```yaml
# Configured channels:
#releases        # Release notifications
#security-alerts # Security scan results
#ci-cd          # Build status and deployment updates
```

#### Email Notifications
- **Security issues**: Sent to security team
- **Failed deployments**: Sent to on-call engineer
- **Weekly reports**: Summary of pipeline health

## 🎯 Best Practices

### Commit Guidelines
```bash
# Conventional commits format
feat(auth): add JWT token refresh
fix(api): resolve user validation bug
docs(readme): update deployment guide
test(auth): add integration tests
```

### Pull Request Workflow
1. **Create feature branch** from `develop`
2. **Implement changes** with tests
3. **Run quality checks** locally
4. **Create PR** with detailed description
5. **Code review** and approval
6. **Merge** after CI passes

### Release Process
1. **Feature freeze** on develop branch
2. **Create release branch** (`release/v1.2.3`)
3. **Final testing** and bug fixes
4. **Merge to main** and create tag
5. **Deploy to production** automatically
6. **Submit to app stores** for mobile

### Environment Promotion
```
develop → staging → production
   ↓         ↓         ↓
feature   integration final
testing   testing    validation
```

## 📚 Additional Resources

### Configuration Files
- [`ci.yml`](.github/workflows/ci.yml) - Main CI pipeline
- [`deploy.yml`](.github/workflows/deploy.yml) - Deployment automation
- [`security.yml`](.github/workflows/security.yml) - Security scanning
- [`release.yml`](.github/workflows/release.yml) - Release management

### Documentation
- [Branch Protection Guide](branch-protection.md)
- [Environment Setup](environments.md)
- [Security Guidelines](security-guidelines.md)

### External Tools
- [Bun Documentation](https://bun.sh/docs)
- [Turbo Documentation](https://turbo.build/repo/docs)
- [Biome Documentation](https://biomejs.dev/)
- [EAS Documentation](https://docs.expo.dev/eas/)

## 🤝 Contributing

### Adding New Checks
1. **Add step** to appropriate workflow
2. **Update quality gate** job dependencies
3. **Test** in feature branch
4. **Document** changes in this guide

### Modifying Deployment
1. **Test** in staging environment first
2. **Update** deployment documentation
3. **Coordinate** with team for production changes
4. **Monitor** deployment metrics post-change

### Security Updates
1. **Review** security implications
2. **Test** in isolated environment
3. **Get approval** from security team
4. **Deploy** with monitoring