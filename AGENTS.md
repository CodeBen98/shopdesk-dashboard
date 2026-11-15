<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# How we work

ShopDesk is a live product. `main` deploys to production (Vercel → app.shopdesk.site) on every merge, so nothing reaches `main` without going through this flow.

## Branch → PR → CI → merge

1. Branch off an up-to-date `main`: `git switch main && git pull && git switch -c <type>/<short-name>`
   (types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`).
2. Make one logical change. Unrelated changes go on separate branches.
3. Before every push, run all four and fix anything that fails:
   `npm run lint && npm run typecheck && npm test && npm run build`
4. Push and open a PR with `gh pr create`. The body says what changed, why, how it was tested, and anything that needs a manual step (env var, migration, Vapi re-provision).
5. Vercel posts a preview URL on the PR. Check the change there when it touches the UI.
6. Merge only after CI (`check`) is green: `gh pr merge --squash --delete-branch`.
7. After merge, confirm the production deploy reached READY and the change works live.

`main` is protected: direct pushes are rejected and the `check` job must pass.

## Commits

- One logical change per commit. If a commit message needs "and", it is probably two commits.
- Conventional style: `fix: …`, `feat: …`, `docs: …`. Subject under ~72 characters, imperative mood.
- The body explains *why* (the bug, the user impact, the decision), not a list of files.
- Write multi-line messages to a file and use `git commit -F <file>`; never inline quotes in `-m`.
- Never commit secrets. `.env*` is gitignored; production values live in Vercel.

## Tests

- Every bug fix comes with a test that fails without the fix, where the code is testable.
- New logic in `src/lib/` gets unit tests in `src/lib/__tests__/`.

## Database (Supabase)

- Every schema change is a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`. Never edit a migration that has been applied.
- Apply migrations with the Supabase CLI so the migration history stays accurate:
  `supabase db push --linked` (project ref `urkurmhmyeylpeuvzxym`). Do not paste SQL into the dashboard or run it through the API.
- Before applying to production, test risky migrations inside a transaction that rolls back.
- Order matters: if code reads a new column, apply the migration **before** merging the code. If a migration removes something code still uses, merge the code first.
- Row-level security is the only thing protecting tenant data from the browser. Any new table gets RLS and a policy in the same migration; any owner-editable column that controls billing, provisioning or status is protected by the `shops_protect_admin_fields` trigger.

## Changes outside this repo

- Vapi assistants are built from `src/lib/shopPrompt.ts`. A prompt or voice change only reaches an existing shop when it is re-provisioned (saving Business Info in settings does this).
- The booking service lives in `shopdesk-booking` and deploys to Render from its own `main`. Changes that span both repos are separate PRs, merged in the order that keeps production working.
- Production config (Vercel env vars, Render env vars, Supabase settings) changes are called out in the PR and confirmed with the owner before they are made.
