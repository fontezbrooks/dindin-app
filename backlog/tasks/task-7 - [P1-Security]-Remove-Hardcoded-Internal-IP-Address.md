---
id: task-7
title: "[P1-Security] Remove Hardcoded Internal IP Address"
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

CRITICAL SECURITY: Remove hardcoded internal IP (10.10.38.110) from backend/src/index.ts that exposes internal network topology. Replace with environment variable or dynamic detection.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Hardcoded IP removed from backend/src/index.ts:48
- [ ] #2 Environment variable HOST implemented
- [ ] #3 Verified in all environments (dev, staging, prod)
- [ ] #4 No internal network information exposed in logs
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

**Effort:** 1 hour
**Severity:** SEV-1 (Critical)
**Blocker:** Yes - Must complete before any deployments

## Code Changes Required:

```typescript
// FROM: backend/src/index.ts:48
console.log(`🚀 Server running on http://10.10.38.110:${PORT}`);

// TO:
const host = process.env.HOST || "localhost";
console.log(`🚀 Server running on http://${host}:${PORT}`);
```

## Environment Setup:

Add to `.env` files:

```env
HOST=localhost  # for development
HOST=0.0.0.0   # for production (or use actual hostname)
```

## Testing:

1. Verify server starts correctly with HOST env var
2. Check logs don't contain internal IPs
3. Test in Docker container to ensure proper binding

## Agent Assistance:

Use `security-expert` and `backend-architect` agents for:

- Security best practices for network configuration
- Environment variable management patterns
- Docker networking considerations
<!-- SECTION:NOTES:END -->
