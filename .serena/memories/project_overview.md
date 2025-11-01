# DinDin App Project Context

## Project Structure
- **Monorepo**: Using Turborepo with Bun workspaces
- **Apps**:
  - Frontend: React Native/Expo (v54) with React 19.1
  - Backend: Bun + Hono server
- **Packages**: Currently empty

## Tech Stack
### Frontend
- React Native 0.81.5 with React 19.1
- Expo 54 with Expo Router
- Clerk for authentication
- Zustand for state management
- React Native Reanimated, Gesture Handler, Skia
- TypeScript 5.9.2

### Backend
- Bun runtime with Hono framework
- MongoDB database
- Redis (ioredis) for caching
- Clerk for authentication
- Rate limiting, cron jobs support
- Winston for logging

## Development Tools
- Biome for linting/formatting (v2.3.0)
- Ultracite for code fixes
- Husky + lint-staged for pre-commit hooks
- Turborepo for monorepo management
- TypeScript 5.x

## Current Branch
- **bugfix/fix-all-linting-errors** - Working on fixing linting issues

## Scripts
- `bun check`: Run Biome checks with auto-fix
- `turbo dev`: Run all dev servers
- `turbo build`: Build all apps
- `turbo check-types`: Type checking