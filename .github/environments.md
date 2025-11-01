# Environment Configuration Guide

This document describes the environment setup required for the CI/CD pipeline.

## GitHub Environments

Create the following environments in your GitHub repository settings:

### 1. Staging Environment

**Settings:**
- **Environment name**: `staging`
- **Required reviewers**: None (auto-deploy)
- **Deployment branches**: `develop`

**Environment Variables:**
```bash
# API Configuration
STAGING_API_URL=https://api-staging.dindinapp.com
STAGING_FRONTEND_URL=https://staging.dindinapp.com

# Database
MONGODB_URI=mongodb://staging-db-cluster/dindin_staging
REDIS_URL=redis://staging-redis:6379

# Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Monitoring
STAGING_SENTRY_DSN=https://...@sentry.io/...
```

**Environment Secrets:**
```bash
# AWS Credentials (for deployment)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Database Credentials
MONGODB_USERNAME=staging_user
MONGODB_PASSWORD=...
REDIS_PASSWORD=...

# External Services
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
```

### 2. Production Environment

**Settings:**
- **Environment name**: `production`
- **Required reviewers**: 1 (manual approval required)
- **Deployment branches**: `main`

**Environment Variables:**
```bash
# API Configuration
PRODUCTION_API_URL=https://api.dindinapp.com
PRODUCTION_FRONTEND_URL=https://dindinapp.com

# Database
MONGODB_URI=mongodb://production-cluster/dindin_production
REDIS_URL=redis://production-redis:6379

# Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Monitoring
PRODUCTION_SENTRY_DSN=https://...@sentry.io/...
```

**Environment Secrets:**
```bash
# AWS Credentials (for deployment)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Database Credentials
MONGODB_USERNAME=production_user
MONGODB_PASSWORD=...
REDIS_PASSWORD=...

# External Services
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...
```

## Repository Secrets

Add these secrets at the repository level (not environment-specific):

### CI/CD Infrastructure
```bash
# GitHub Actions
GITHUB_TOKEN=ghp_...  # Auto-generated, usually available

# Docker/Container Registry
DOCKER_REGISTRY_TOKEN=...
DOCKER_REGISTRY_USERNAME=...

# Code Quality
CODECOV_TOKEN=...
SONAR_TOKEN=...
```

### Deployment Services
```bash
# Expo/EAS (for React Native)
EXPO_TOKEN=...

# Vercel (for web deployment)
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...

# AWS (if using different credentials per environment)
AWS_ACCESS_KEY_ID_STAGING=...
AWS_SECRET_ACCESS_KEY_STAGING=...
AWS_ACCESS_KEY_ID_PRODUCTION=...
AWS_SECRET_ACCESS_KEY_PRODUCTION=...
```

### Notification Services
```bash
# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Email Notifications
MAIL_USERNAME=notifications@dindinapp.com
MAIL_PASSWORD=...
SECURITY_EMAIL=security@dindinapp.com
```

## Repository Variables

Add these variables at the repository level:

### AWS Infrastructure
```bash
# ECS Configuration
ECS_CLUSTER_STAGING=dindin-staging
ECS_CLUSTER_PRODUCTION=dindin-production
ECS_SERVICE_BACKEND_STAGING=dindin-backend-staging
ECS_SERVICE_BACKEND_PRODUCTION=dindin-backend-production

# S3 Deployment
DEPLOYMENT_BUCKET=dindin-deployments

# Load Balancer URLs
BACKEND_URL_STAGING=https://api-staging.dindinapp.com
BACKEND_URL_PRODUCTION=https://api.dindinapp.com
```

### Application Configuration
```bash
# Default regions
AWS_REGION=us-east-1

# Mobile app configuration
IOS_BUNDLE_ID=com.dindinapp.ios
ANDROID_PACKAGE_NAME=com.dindinapp.android
```

## Environment Setup Commands

### Using GitHub CLI

```bash
# Create staging environment
gh api repos/:owner/:repo/environments/staging \
  --method PUT \
  --field wait_timer=0 \
  --field reviewers='[]' \
  --field deployment_branch_policy='{"protected_branches":false,"custom_branch_policies":true}' \
  --field deployment_branch_policy.custom_branch_policies='[{"name":"develop"}]'

# Create production environment
gh api repos/:owner/:repo/environments/production \
  --method PUT \
  --field wait_timer=0 \
  --field reviewers='[{"type":"User","id":YOUR_USER_ID}]' \
  --field deployment_branch_policy='{"protected_branches":false,"custom_branch_policies":true}' \
  --field deployment_branch_policy.custom_branch_policies='[{"name":"main"}]'
```

### Add Secrets via CLI

```bash
# Repository secrets
gh secret set CODECOV_TOKEN --body "your-token"
gh secret set SLACK_WEBHOOK_URL --body "your-webhook-url"

# Environment secrets
gh secret set AWS_ACCESS_KEY_ID --env staging --body "your-key"
gh secret set AWS_SECRET_ACCESS_KEY --env staging --body "your-secret"
```

### Add Variables via CLI

```bash
# Repository variables
gh variable set AWS_REGION --body "us-east-1"
gh variable set ECS_CLUSTER_STAGING --body "dindin-staging"

# Environment variables
gh variable set STAGING_API_URL --env staging --body "https://api-staging.dindinapp.com"
```

## Security Best Practices

### Secret Management
- 🔐 Use separate credentials for staging and production
- 🔐 Regularly rotate all secrets (quarterly)
- 🔐 Use least-privilege IAM policies for AWS
- 🔐 Never commit secrets to version control
- 🔐 Use environment-specific service accounts

### Access Control
- 👥 Limit who can access production environment
- 👥 Require manual approval for production deployments
- 👥 Use CODEOWNERS for sensitive file changes
- 👥 Enable audit logging for all environments

### Monitoring
- 📊 Monitor all deployment activities
- 📊 Set up alerts for failed deployments
- 📊 Track secret usage and access patterns
- 📊 Regular security audits of environment access

## Validation Checklist

Before deploying, ensure:

- [ ] All required secrets are set
- [ ] All required variables are configured
- [ ] Environment protection rules are enabled
- [ ] Deployment branches are correctly configured
- [ ] Required reviewers are assigned (production)
- [ ] Notification channels are working
- [ ] Health check endpoints are accessible
- [ ] Monitoring dashboards are set up

## Troubleshooting

### Common Issues

#### Missing Secrets/Variables
```bash
# List all secrets for repository
gh secret list

# List all variables for repository
gh variable list

# Check environment-specific secrets
gh secret list --env staging
gh secret list --env production
```

#### Deployment Failures
1. Check environment protection rules
2. Verify required reviewers have approved
3. Ensure deployment branches are configured
4. Check AWS credentials and permissions
5. Verify health check endpoints

#### Access Denied
1. Check user permissions in repository settings
2. Verify environment protection rules
3. Ensure user is added as required reviewer
4. Check team membership for organization repos

## Environment Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Local testing │    │ • Auto-deploy   │    │ • Manual review │
│ • Feature work  │───▶│ • Integration   │───▶│ • Blue-green    │
│ • Unit tests    │    │ • E2E testing   │    │ • Health checks │
│                 │    │ • QA validation │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Local Database  │    │ Staging Stack   │    │ Production Stack│
│ • MongoDB       │    │ • AWS ECS       │    │ • AWS ECS       │
│ • Redis         │    │ • RDS/DocumentDB│    │ • RDS/DocumentDB│
│ • File storage  │    │ • ElastiCache   │    │ • ElastiCache   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```