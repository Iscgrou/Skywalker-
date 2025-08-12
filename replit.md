# Replit Project Migration Summary

This repository has been standardized for Replit AI assistant recognition.

## Structure

```
.
├── .replit                 # Replit runtime & workflow config
├── replit.md               # This file - migration & structure notes
├── package.json            # Unified workspace scripts & deps
├── client/                 # React (Vite) frontend (root set in vite.config.ts)
│   ├── index.html
│   └── src/                # App source, aliased as "@"
├── server/                 # Express backend (single entry: server/index.ts)
│   ├── index.ts
│   ├── routes.ts
│   ├── routes/             # Modular API route groups
│   └── services/           # Backend services (audited)
├── shared/                 # Shared schemas & types (alias: @shared)
├── dist/                   # Build output (client -> dist/public, server bundle -> dist)
├── drizzle.config.ts       # Drizzle ORM config
├── migrations/             # Drizzle migration files
├── vite.config.ts          # Vite + Replit plugins, path aliases
├── tailwind.config.ts      # Tailwind
├── tsconfig.json           # TypeScript config (paths aligned with Vite)
└── .env.example            # Environment variable template
```

## Runtime Model
- `npm run dev`: Starts Express via `tsx server/index.ts` (Vite injected in middleware mode in development)
- `npm run build`: Builds client (Vite) then bundles server with esbuild to `dist/index.js`
- `npm run start`: Production start (serves pre-built client from `dist/public` + API)

## Replit Configuration Highlights
- Modules: `nodejs-20`, `web`, `postgresql-16`
- Deployment target: `autoscale` (aligned with Replit generated pattern)
- Outer workflow `Project` invoking `Start application`
- Single exposed port: `5000`
- Workflow waits for port 5000 (health endpoint `/health` available after boot)

## Path Aliases
- `@/*` -> `client/src/*`
- `@shared/*` -> `shared/*`

## Cleanup Actions Completed
- Removed legacy backup `*.tsx.backup` pages
- Moved architectural spec files to `docs/specs/` (`CONTRACTS.ts`, `CONTRACTS_V2.ts`) and hid specs via `.replit` hidden
- Removed unused services: `advanced-currency-intelligence.ts`, `report-generator.ts`
- Pruned stale commented import in `server/routes.ts`

## Remaining Candidates (Optional Future Work)
- Modularize `server/routes.ts` further (very large)
- Code splitting to reduce large bundle warning (>500kB)
- Add tests for critical services (auth, invoices, workspace)

## Suggested Next Steps (Optional)
1. Introduce Jest/Vitest tests for core route handlers
2. Implement manualChunks in `vite.config.ts` for dashboard heavy pages
3. Gradually remove verbose version banner comments after tagging a release

## Health & Stability
- Robust error handling & graceful shutdown in `server/index.ts`
- Database health preflight (non-blocking)

## Migration Guarantees
- Deterministic dev/start commands
- Distinct separation of API vs SPA routing
- ES Modules end-to-end (`"type": "module"`)

---
If the Replit AI assistant needs to introspect project type it can rely on: `.replit`, `package.json` scripts, `vite.config.ts`, and `server/index.ts`.
