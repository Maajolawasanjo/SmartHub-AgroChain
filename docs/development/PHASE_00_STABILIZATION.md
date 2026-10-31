# Phase 00 — Repository foundation stabilization

## Implemented on this branch
- Node 22 runtime pinned via .nvmrc.
- Prisma's imported `dotenv` package declared directly, with an exact version.
- Dependency-free foundation preflight verifies required files, script wiring, environment template, Prisma version alignment and tracked-secret paths.
- TypeScript source syntax checker added.
- GitHub Actions CI runs structural tests, Prisma generation/schema validation, TypeScript checks and Next.js build. CI creates a **temporary candidate lockfile artifact** only to enable testing; it intentionally fails the final strict gate until a reviewed lockfile is **committed**.

## What is still blocked
- Local npm registry DNS is unavailable. A true `npm ci`, `prisma generate`, `tsc --noEmit` and Next.js build could not be run locally.
- Before merging, obtain CI-generated candidate `package-lock.json`, review it and commit it. Rerun CI using `npm ci` only.
- Fix real CI failures rather than assuming that syntax tests prove type safety.
- Resolve the stacked PR order (#1 foundation, #2 auth UI, #3 auth backend, #4 farmer and Operations). All are draft; this branch builds on #4.
- No Supabase project is required for code-only checks. No migrations were executed and no production business data was created.

## Developer commands
```sh
npm test
npm run verify:foundation
npm install --package-lock-only --ignore-scripts
# Commit the reviewed package-lock.json before release.
npm ci
npm run db:generate
npx prisma validate
npm run typecheck
npm run verify:syntax
npm run build
npm run verify:foundation -- --require-lock
```

**Status: Phase 00 in progress, not production-ready until reproducible full build and CI pass.**
