# Linting and Code Quality Workflow

## Overview
This project uses a comprehensive linting and formatting pipeline to ensure code quality and prevent common issues. The system automatically catches and fixes issues before they're committed.

## Tools Used

### 1. **Biome** (Primary Linter)
- **Purpose**: Comprehensive linting, formatting, and code quality checks
- **Config**: `biome.json` at project root
- **Catches**:
  - Type safety issues (`any` types)
  - Magic numbers
  - Unused variables
  - Code complexity
  - Style inconsistencies
  - Security issues

### 2. **Ultracite** (Formatter)
- **Purpose**: Advanced code formatting and auto-fixing
- **Config**: `package.json` lint-staged configuration
- **Features**:
  - Automatic import sorting
  - Consistent formatting
  - Pre-commit integration

### 3. **Husky** (Git Hooks)
- **Purpose**: Runs checks before commits
- **Location**: `.husky/pre-commit`
- **Prevents**: Committing code with linting errors

## Workflow

### Pre-Commit Process
1. **Biome Check**: Runs comprehensive linting with auto-fix
2. **Ultracite Format**: Applies formatting rules
3. **Staging**: Re-stages fixed files
4. **Validation**: Ensures no errors remain

### Manual Commands

```bash
# Run linting with auto-fix
bun check

# Run Biome directly
bun x biome check --write .

# Check specific file
bun x biome lint apps/backend/src/services/cache.ts

# Run Ultracite formatting
bun x ultracite fix

# Run type checking
turbo check-types
```

## Common Issues and Solutions

### 1. **Magic Numbers**
**Issue**: Hard-coded numbers in code
```typescript
// ❌ Bad
const maxSize = 5 * 1024 * 1024;

// ✅ Good
const CACHE_CONSTANTS = {
  MAX_VALUE_SIZE_MB: 5,
  KILOBYTE: 1024,
};
const maxSize = CACHE_CONSTANTS.MAX_VALUE_SIZE_MB * CACHE_CONSTANTS.KILOBYTE * CACHE_CONSTANTS.KILOBYTE;
```

### 2. **Any Types**
**Issue**: Using `any` disables type checking
```typescript
// ❌ Bad
async get<T = any>(key: string): Promise<T | null>

// ✅ Good
async get<T = unknown>(key: string): Promise<T | null>
```

### 3. **Nested Ternaries**
**Issue**: Complex ternary expressions
```typescript
// ❌ Bad
const ttl = status === "ACTIVE" ? active : status === "WAITING" ? waiting : default;

// ✅ Good
let ttl: number;
if (status === "ACTIVE") {
  ttl = active;
} else if (status === "WAITING") {
  ttl = waiting;
} else {
  ttl = default;
}
```

### 4. **Console Statements**
**Issue**: Direct console usage instead of structured logging
```typescript
// ❌ Bad
console.log(`Session created: ${sessionCode}`);

// ✅ Good
import { LogLayer } from "loglayer";
const log = new LogLayer({ /* config */ });
log.info("Session created");
```

## Best Practices

### 1. **Always Run Checks Before Committing**
```bash
# This happens automatically with pre-commit hooks
# But you can run manually:
bun check
```

### 2. **Fix Issues Immediately**
- Don't ignore linting errors
- Use auto-fix when available: `bun x biome check --write`
- Understand why the error occurred

### 3. **Configure Your Editor**
Install Biome extension for VSCode:
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### 4. **Type Safety First**
- Never use `any` - use `unknown` or proper types
- Enable strict TypeScript checks
- Use generics for flexible type-safe code

### 5. **Constants Management**
```typescript
// Create a constants file or object
export const API_CONSTANTS = {
  TIMEOUT_MS: 5000,
  MAX_RETRIES: 3,
  DEFAULT_PAGE_SIZE: 20,
} as const;
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Lint and Test
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun check
      - run: turbo check-types
```

## Troubleshooting

### Issue: Pre-commit hook fails
```bash
# Check what's failing
bun x biome check --write .

# If still issues, check specific files
bun x biome lint --write apps/backend/src/services/*.ts
```

### Issue: Too many errors to fix manually
```bash
# Run aggressive auto-fix
bun x biome check --write --unsafe .
```

### Issue: Editor not showing errors
1. Install Biome extension
2. Restart editor
3. Check output panel for Biome errors

## Emergency Bypass (Use Sparingly!)
```bash
# Skip hooks (NOT RECOMMENDED)
git commit --no-verify -m "message"

# Better approach: fix in separate commit
git stash
bun check
git stash pop
git add -p  # Add fixes selectively
```

## Monitoring Code Quality

### Regular Audits
```bash
# Check overall project quality
bun x biome check . --reporter=summary

# Generate detailed report
bun x biome check . --reporter=json > quality-report.json
```

### Metrics to Track
- Number of linting errors over time
- Most common error types
- Files with most issues
- Time to fix errors

## Team Guidelines

1. **Never disable rules without team discussion**
2. **Document any exceptions in code comments**
3. **Review linting errors in PRs**
4. **Keep dependencies updated**
5. **Run `bun check` before pushing**

## Resources

- [Biome Documentation](https://biomejs.dev/)
- [Ultracite GitHub](https://github.com/ultracite/ultracite)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [LogLayer Documentation](https://github.com/theochemel/loglayer)

## Contact

For questions about linting configuration or to propose changes, create an issue or contact the team lead.

---

*Last Updated: November 2025*
*Version: 1.0.0*