---
id: task-10
title: "[P1-Security] Add Rate Limiting Middleware"
status: To Do
assignee:
  - Backend Dev
created_date: "2025-10-31 18:36"
updated_date: "2025-10-31 18:36"
labels:
  - security
  - middleware
  - week-1
  - blocker
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Implement rate limiting to prevent abuse and DDoS attacks. Configure limits per endpoint based on criticality.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Rate limiter implemented using rate-limiter-flexible
- [ ] #2 100 requests per minute limit configured
- [ ] #3 Custom limits for auth endpoints
- [ ] #4 429 status code returned when limit exceeded
- [ ] #5 Rate limit headers included in responses
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

**Effort:** 3 hours
**Dependencies:** rate-limiter-flexible package (already in package.json)
**Blocker:** Yes - security requirement

## Implementation:

```typescript
// backend/src/middleware/rateLimiter.ts
import { Context, Next } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: 100, // requests
  duration: 60, // per minute
});

const authLimiter = new RateLimiterMemory({
  points: 5, // stricter for auth
  duration: 60,
});

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const ip = c.req.header("x-forwarded-for") || "global";

  try {
    const limiter = c.req.path.includes("/auth") ? authLimiter : rateLimiter;
    await limiter.consume(ip);

    // Add rate limit headers
    c.header("X-RateLimit-Limit", limiter.points.toString());
    c.header("X-RateLimit-Remaining", res.remainingPoints.toString());

    await next();
  } catch {
    return c.json({ error: "Too many requests" }, 429);
  }
};

// Apply in index.ts
app.use("*", rateLimitMiddleware);
```

## Testing:

```bash
# Test rate limiting
for i in {1..101}; do curl http://localhost:3000/api/test; done
# Should get 429 on 101st request
```

## Agent Assistance:

Use `security-expert` and `performance-engineer` agents for:

- Optimal rate limit configuration
- Redis-based rate limiting for production
- Per-user vs per-IP strategies
<!-- SECTION:NOTES:END -->
