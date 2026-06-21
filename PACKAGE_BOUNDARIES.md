## Package Boundary Rules
##
## Enforced via code review, CI, and (future) ESLint import rules.
## Violations are blocking — no exceptions without architectural discussion.
##
## Format: CONSUMER → ALLOWED_DEPENDENCIES
##
## ─── Rule Set ────────────────────────────────────────────────────────────────
##
## apps/api
##   ✅ @normy/shared
##   ✅ @normy/validation-core
##   ❌ @normy/react          (browser SDK — never import in server)
##   ❌ @normy/js             (browser SDK — never import in server)
##   ❌ @normy/ui             (React UI — never import in server)
##   ❌ apps/dashboard        (apps never cross-import each other)
##
## apps/dashboard
##   ✅ @normy/shared
##   ✅ @normy/ui
##   ❌ @normy/validation-core (business logic lives server-side only)
##   ❌ @normy/react          (React SDK is for customers, not the dashboard)
##   ❌ apps/api              (apps never cross-import each other)
##
## packages/validation-core
##   ✅ @normy/shared
##   ❌ everything else       (no circular dependencies; pure business logic)
##
## packages/sdk-react
##   ✅ @normy/shared
##   ✅ @normy/validation-core (for type imports only; logic runs via API calls)
##   ❌ apps/*
##
## packages/sdk-js
##   ✅ @normy/shared
##   ✅ @normy/validation-core (for type imports only; logic runs via API calls)
##   ❌ apps/*
##
## packages/shared
##   ❌ everything else       (truly shared; zero internal dependencies)
##
## packages/ui
##   ✅ @normy/shared          (for design tokens / types only)
##   ❌ @normy/validation-core
##   ❌ apps/*
##
## ─── Enforcement ─────────────────────────────────────────────────────────────
## Phase 1: Document (this file)
## Phase 2: ESLint import/no-restricted-imports per package
## Phase 3: Turborepo boundary enforcement via tasks
