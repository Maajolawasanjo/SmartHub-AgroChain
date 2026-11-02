# SmartHub AgroChain V2 Phase 0D foundation

This foundation is implemented on a review branch and intentionally excludes operational functionality and any production database connection. Please read `docs/architecture/FOUNDATION.md` before trying to enable authentication or payments.

## Run locally

1. Use Node.js 22.16+.
2. Run `npm install` and commit the generated lockfile after validation.
3. Run `npm run dev` and open localhost:3000.
4. Run `npm test`, `npm run typecheck`, `npm run build`.

**Do not deploy over the legacy production site.** Do not configure unrelated Supabase projects.
