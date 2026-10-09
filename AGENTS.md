# AGENTS.md: ascir (ASCIR site migration)

You are the coding agent on the ASCIR migration, from ascir.org (WordPress) to a Next.js site on Vercel. Nkrumah reviews every PR and sets up anything high risk. Work from the ticket you are given (T01 to T28 on the migration board). Stack: Next.js 16 (App Router, `proxy.ts`), TypeScript, Tailwind v4 with shadcn/ui, Postgres with Drizzle (postgres-js driver), Better Auth with the Drizzle adapter, Zod, TipTap JSON for article bodies, Hetzner Object Storage over the S3 API for files (`lib/s3.ts`).

## Where things live
- `app/`: routes. `app/api/ingest/` is the temporary ascir.org ingest API.
- `auth/can.ts`: roles and the single `can()` check. `auth/find-unguarded.test.ts` fails the suite if a server action or route handler skips `can()` (or a guard wrapper such as `withIngest`).
- `lib/auth.ts`, `lib/auth-client.ts`: Better Auth. `lib/db/`: Drizzle client and schema. `drizzle/`: committed migrations.
- `lib/ingest/`: ingest wrapper and request parsing. `etl/` (when it exists): the ETL and its fixtures.
- `components/ui/`: shadcn CLI output only. `legacy/`: the WordPress backup. Read it, never edit it.

## How to work
- One ticket per PR. Branch name `feat/tNN-short-name` (e.g. `feat/t07-ingest-auth-runs`). PR title "TNN: ticket name". The board links PRs by the TNN in the title or branch.
- Do only what the ticket's "Done when" asks. No drive-by refactors, renames or formatting sweeps in files the ticket does not need.
- Keep PRs small enough to review in one sitting. If a change goes past about 400 lines (not counting generated files and migration SQL), stop and split it into smaller PRs under the same ticket, and say so.
- Never merge your own PR and never push to main. Nkrumah reviews and merges every PR. Do not mark a ticket done; he does that after merging.
- To catch up with main, merge main into the branch. Do not rebase or force-push a branch that has a PR open.
- If the ticket is unclear, or the plan and the code disagree, stop and ask. Do not guess.
- If the ticket lists screenshots, the PR description must include every one, taken from a real run (localhost or a preview deployment), each with a one-line caption. Attach them to the PR; do not commit them to the repo. A UI PR without them is not ready for review.
- If you notice a bug or risk outside the ticket, list it in the PR description. Do not fix it in the same PR.

## Commits
- Subject in the imperative, under about 60 characters, no trailing full stop ("Add roles and a single can() permission check"). The ticket's main commit may use the PR title ("T07: Ingest auth and runs").
- Body in plain prose: what changed and why, wrapped at about 72 characters. Mention anything a reviewer would not guess from the diff.
- One logical change per commit. Do not mix a migration, a refactor and a feature in one commit.

## Pull request description
Use this order. Keep it short and plain.
1. What changed and why, in two or three sentences.
2. Setup needed from Nkrumah, if any (exact env var names, which service). Otherwise "None".
3. How to check it: the exact commands to run, and what he should see.
4. The ticket's "Done when" items, each ticked, with the evidence (test name, command output, route).
5. Risks and open questions, most important first.
6. Anything you were unsure about, or chose between.

## Hands off (Nkrumah does these himself)
- Create, change or rotate secrets, tokens, env vars, DNS, domains, or settings in the database host, Vercel, object storage, the sign-in provider or CI. Add every new variable to `.env.example` with a comment, and name it under "Setup needed" in the PR. Never commit a real value, and never read or print `.env.local`.
- Run anything against production: no production database, no `--target=production`, no production ingest calls. Local and preview only.
- Anything that deletes data, drops or renames a column or table, or rewrites existing rows. Stop and ask first. Do not run `npm run db:push` against a shared database; use generated migrations.
- Turn `INGEST_ENABLED` on, or touch the ingest token.
- Add a dependency without a one-line reason in the PR. Prefer what is already installed and the standard library.
- Create or promote user accounts, or change Better Auth providers, secrets, session settings or trusted origins.
- Change auth, roles or `can()` rules beyond what the ticket describes.

## TypeScript style
- strict mode on. No `any`, no `@ts-ignore`, no non-null assertion (`!`). Use `unknown` and narrow it. If a type error cannot be fixed cleanly, ask.
- Validate every boundary with Zod: request bodies, WordPress JSON, CSV rows, env vars. Get types from `z.infer`. One schema per record type, reused for the API, the ETL and the schema export.
- Read environment variables only through one validated env module.
- Parse functions return a result, not throw: `{ ok: true, value } | { ok: false, error }`. Error messages name the field that failed, never echo the input (it may hold a token or personal data).
- Write small functions that do one thing. Aim for under 40 lines per function and under 300 per file. Split by responsibility, not by layer.
- Make transform steps pure: data in, data out, no network or file access inside. Do the I/O at the edges so transforms can be tested on fixture JSON.
- Prefer early returns over nesting. No nested ternaries. No clever one-liners.
- Names say what a thing is: `tidyTitle`, not `process`. Comments explain why, not what. Keep them short, and put a one-line comment at the top of a module saying what it is for.
- Named exports. Default exports only where Next.js requires them.
- Use the `@/` path alias for imports. Mark server-only modules with `import "server-only"`.
- Never swallow errors. No empty catch. Expected failures (a bad record in an ingest batch) return a typed result per item. Bugs throw. Never log tokens, emails or other personal data.
- Compare secrets in constant time. Never compare a token with `===`.
- Server actions and route handlers do three things in order: check `can()` (or sit inside a guard wrapper), validate input, then do the work.
- Database access goes through Drizzle. No raw SQL without a comment saying why. Multi-row writes run in a transaction. Upserts are keyed on `ref`, so running twice changes nothing.
- Migrations: change the schema in `lib/db/`, generate with `npm run db:generate`, commit the SQL in `drizzle/`, never edit one that has been applied.
- React: server components by default. Add `"use client"` only when needed. Do not fetch data in `useEffect`. Use real labels, alt text and visible focus states.
- UI: use shadcn/ui. Add components with the shadcn CLI (`npx shadcn@latest add ...`), never copy them by hand, and do not edit files in `components/ui` except through the CLI. Build ASCIR-specific components by composing the existing ones. Prefer an existing shadcn block over building a layout from scratch.
- Style with Tailwind and the theme tokens (CSS variables in `app/globals.css`). No hard-coded colours, no inline styles. Check every screen in light and dark.
- Forms use the shadcn form components and reuse the Zod schema for the same record. Do not add another UI or component library.
- Auth: use Better Auth. Never write your own password hashing, tokens or sessions. All session reads and permission checks go through one auth module and the `can()` helper, never ad hoc inside components.
- Naming: camelCase for values and functions, PascalCase for components and types, kebab-case for files, snake_case for database columns.

## Before opening a PR
Run these and paste the result summary in the PR:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

No lint-disable comments without a reason beside them. All four must pass; if one fails for a reason outside the ticket, say so in the PR rather than fixing it.

## Known gaps (do not fix unless the ticket asks)
The rules above describe where the code is going. Some of it is not there yet:
- Zod is not installed. `lib/ingest/runs.ts` parses by hand. The first ticket that needs Zod adds it (with the reason in the PR) and moves those parsers onto it.
- There is no validated env module yet. `lib/s3.ts`, `lib/db/index.ts` and `drizzle.config.ts` read `process.env` directly, with `!` in places. Do not copy that pattern into new code; list it as a risk if your ticket touches those files.
- No formatter (Prettier) is set up. Match the surrounding code (2 spaces, double quotes, semicolons) and do not add one unasked.

## Python style (only for a one-off script, and only if the ticket allows it)
- Type hints on every function. Run ruff and its formatter before the PR.
- Use pathlib and the csv or json modules. No bare except. Put the entry point under `if __name__ == "__main__"`.
- The ETL itself stays in TypeScript.

## Tests
- Use Vitest. Put a test beside the file it tests (`runs.ts` → `runs.test.ts`). Transform and ingest logic must have tests.
- Test with fixtures saved from real posts (3741, 2967, 3261, 2731) in `etl/fixtures`. Tests never call ascir.org or any network.
- Every ingest and ETL ticket includes an idempotency test: run the same input twice, and the second run creates 0 and updates 0.
- Every bug fix gets a regression test that fails without the fix.
- Test the unhappy paths too: bad bodies, missing auth, and that error output does not contain the secret or the input.

## Content rules for the ETL
- Never edit the authors' words. Typos in the original stay. Only fix the packaging (HTML entities, tags, bylines).
- When the ETL is not sure (a source link to the wrong article, an image with no alt text), it flags the item for a person. It does not guess.
- Every record carries a ref such as `wp:post:3741`. Never invent or change a ref.
- The ETL never connects to the database. It writes dumps locally, then pushes through the ingest API. Always run the dry run before a push.

## Writing (PRs, comments, commit messages, UI copy)
- Plain, short sentences. Say what happened and what to do, not how hard it was.
- No marketing words, no emoji, no filler ("robust", "seamless", "leverage").
