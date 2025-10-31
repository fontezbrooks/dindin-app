---
id: task-9
title: "[P1-Security] Fix TypeScript Type Safety Bypasses"
status: To Do
assignee:
  - Backend Dev
created_date: "2025-10-31 18:36"
updated_date: "2025-10-31 18:36"
labels:
  - security
  - typescript
  - week-1
  - blocker
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Fix all TypeScript 'any' type bypasses in WebSocket implementation that circumvent type safety and could lead to runtime errors.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 All (ws as any) type assertions removed
- [ ] #2 Proper TypeScript interfaces created for WebSocket
- [ ] #3 No 'any' types in WebSocket code
- [ ] #4 TypeScript compilation passes with strict mode
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

**Effort:** 4 hours
**Severity:** SEV-3 (Medium-High)
**Dependencies:** None

## Code Changes Required:

```typescript
// Create proper WebSocket types
// backend/src/types/websocket.ts
interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  lastActivity?: number;
}

interface WebSocketMessage {
  type: "join" | "leave" | "swipe" | "match" | "error";
  payload: any; // Replace with specific types
  timestamp: number;
}

// FROM: websocket/server.ts:354
(ws as any).userId = data.userId;

// TO:
const authenticatedWs = ws as AuthenticatedWebSocket;
authenticatedWs.userId = data.userId;
```

## TypeScript Configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Testing:

1. Run `bun run typecheck`
2. Verify no type errors
3. Test WebSocket functionality

## Agent Assistance:

Use `typescript-pro` agent for:

- Advanced TypeScript patterns
- Type safety best practices
- Generic constraint design
<!-- SECTION:NOTES:END -->
