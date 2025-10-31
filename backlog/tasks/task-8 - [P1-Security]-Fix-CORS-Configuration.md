---
id: task-8
title: "[P1-Security] Fix CORS Configuration"
status: To Do
assignee:
  - Backend Dev
created_date: "2025-10-31 18:35"
updated_date: "2025-10-31 18:35"
labels:
  - security
  - critical
  - week-1
  - blocker
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

CRITICAL SECURITY: Configure CORS properly to prevent CSRF attacks. Currently allows all origins (\*) which is a major security vulnerability.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 CORS configured with specific allowed origins
- [ ] #2 Environment variable ALLOWED_ORIGINS implemented
- [ ] #3 Credentials and methods properly configured
- [ ] #4 Tested with frontend origins
- [ ] #5 No wildcard (\*) origins in production
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

**Effort:** 2 hours
**Severity:** SEV-2 (High)
**Dependencies:** None

## Code Changes Required:

```typescript
// FROM: backend/src/index.ts:20
app.use("*", cors());

// TO:
import { cors } from "hono/cors";

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:8081"],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
};

app.use("*", cors(corsOptions));
```

## Environment Setup:

```env
# Development
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3000

# Production
ALLOWED_ORIGINS=https://app.dindin.com,https://www.dindin.com
```

## Testing Checklist:

1. Test from allowed origins - should work
2. Test from unauthorized origin - should be blocked
3. Verify preflight requests work correctly
4. Check credentials are properly handled

## Agent Assistance:

Use `security-expert` agent for:

- CORS best practices
- CSRF prevention strategies
- Production security configuration
<!-- SECTION:NOTES:END -->
