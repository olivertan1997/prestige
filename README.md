# Prestige Interior Design

A full-stack **TypeScript** website for the interior design company *Prestige Interior Design*.
It runs on the **free Cloudflare Workers plan**, and its data lives in **Supabase** (PostgreSQL, Singapore).

```
Browser ──► Cloudflare Worker (Hono, server-rendered pages) ──► Cloudflare Hyperdrive ──► Supabase PostgreSQL
                    └─ CSS / images served from Cloudflare's edge (Workers Static Assets)
```

| Layer | Technology |
| --- | --- |
| Web / UI | [Hono](https://hono.dev) on Cloudflare Workers, server-rendered HTML, custom CSS |
| Security | Database-backed sessions (HttpOnly, SameSite cookies), role-based access, same-origin form checks, **salted SHA-256** passwords |
| Data | PostgreSQL on Supabase via Cloudflare Hyperdrive (connection pooling, caching off) and postgres.js |
| CI/CD | GitHub Actions: type check and tests, then database setup, then Hyperdrive, then `wrangler deploy` |
| Tests | Vitest with an in-memory PostgreSQL (PGlite) that runs the same SQL as production |

Free-plan limits: 100,000 requests a day, 100,000 database queries a day, and 10 ms of CPU per request. Waiting on the database doesn't count towards the CPU limit.

## User types

| Role | What they can do |
| --- | --- |
| **Customer** | Search, view, rate and save projects; view designer availability calendars; report issues |
| **Interior Designer (ID)** | Manage company information, a portfolio of current and past projects and availability; see views and shortlist counts; search the user directory |
| **User Admin** | Create, view, update, search and disable accounts; manage the four user profiles; handle reported issues |
| **Platform Management** | Manage project categories; daily, weekly and monthly reports with CSV export; ban users; moderate ratings; handle reported issues |

## Where each requirement is implemented

| Requirement | Code | Test file |
| --- | --- | --- |
| Spec 1 - user accounts and profiles | `src/services/users.ts`, `src/routes/admin.ts`, `src/routes/account.ts` | `test/spec1-user-accounts.test.ts` |
| Spec 2 - ID company information | `src/services/catalog.ts` (companies) | `test/spec2-company.test.ts` |
| Spec 3 - ID portfolio (current and past) | `src/services/projects.ts`, `src/routes/designer.ts` | `test/spec3-portfolio.test.ts` |
| Spec 4 - customer search, view, save | `src/routes/public.ts`, `src/services/projects.ts` | `test/spec4-search-view-save.test.ts` |
| Spec 5 - views and shortlist tracking | `recordView`, `statsForDesigner` in `projects.ts` | `test/spec5-interest-tracking.test.ts` |
| Story 1 - keyword search | `searchProjects` | `test/feature01-keyword-search.test.ts` |
| Story 2 - availability calendar | `src/services/availability.ts` | `test/feature02-availability-calendar.test.ts` |
| Story 3 - report issues (Pending, Reviewed, Rectified) | `src/services/issues.ts` | `test/feature03-report-issues.test.ts` |
| Story 4 - favourites | `addFavourite` / `removeFavourite` | `test/feature04-favourites.test.ts` |
| Story 7 - shortlist counts | designer dashboard | `test/feature07-shortlist-count.test.ts` |
| Story 8 - search users by name | `searchUsers`, `/designer/users`, `/admin/users` | `test/feature08-search-users-by-name.test.ts` |
| Story 9 - filter users by role | same as above | `test/feature09-filter-users-by-role.test.ts` |
| Story 10 - disable a user (data kept) | `disableUser` | `test/feature10-disable-user.test.ts` |
| Story 11 - view flagged reports | `/issues/manage` | `test/feature11-view-reported-issues.test.ts` |
| Story 12 - mark reports Rectified | `updateIssueStatus` | `test/feature12-rectify-issues.test.ts` |
| Passwords hashed with SHA-256 | `src/lib/password.ts` | `test/password-hashing.test.ts` |

**Password storage.** Each password gets a random 16-byte salt. The database stores
`sha256$<salt-hex>$<SHA-256(salt + password) hex>` and never the plain password.

## Running the tests (one script)

The tests need Node.js 22 or newer.

```powershell
npm install        # first time only
npm test           # or: powershell -ExecutionPolicy Bypass -File .\run-tests.ps1   /   bash run-tests.sh
```

It prints one line per feature and saves the result to `test-results/summary.txt`:

```
  Spec 1:                  Good  Manage user accounts and user profiles ... (6/6 test cases passed)
  ...
  Feature 5:               Good  Rating system as an alternative measure of products and services (5/5 test cases passed)
  ...
  OVERALL: 20/20 features Good | 92/92 test cases passed
```

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`:

1. **test**: type check, then `npm test`. If anything fails, nothing is deployed.
2. **deploy**:
   - `scripts/migrate.ts` creates or upgrades the tables in Supabase. On the first run it also adds the demo data.
   - `scripts/hyperdrive.mjs` creates or updates the Hyperdrive connection to Supabase, with caching disabled.
   - `wrangler deploy` publishes the Worker.

Required GitHub repository secrets (*Settings → Secrets and variables → Actions*):

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token from the *Edit Cloudflare Workers* template, plus **Account → Hyperdrive → Edit** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `DB_HOST` | Supabase **session pooler** host, e.g. `aws-0-ap-southeast-1.pooler.supabase.com` |
| `DB_USER` | Supabase pooler user, e.g. `postgres.abcdefghijklmnop` |
| `DB_PASSWORD` | Supabase database password |
| `APP_SEED_PASSWORD` | Password for the demo accounts (at least 8 characters, optional) |

### Demo accounts

These are created on the first deploy when `APP_SEED_PASSWORD` is set. They all use that password.

| Username | Role |
| --- | --- |
| `admin` | User Admin |
| `platform` | Platform Management |
| `sophia`, `marcus` | Interior Designers (with companies, projects and availability) |
| `emily`, `daniel` | Customers (with favourites, ratings and issue reports) |

## Project layout

```
src/
  index.ts        Worker entry (connects through Hyperdrive)
  app.ts          middleware: same-origin check, database, sessions, role guards, error pages
  routes/         public, account (profile/issues/customer), designer, admin, platform
  services/       business rules: users, catalog, projects, availability, issues, reports, directory, demo data
  views/          HTML pages (hono/html templates, auto-escaped)
  lib/            password hashing, sessions, dates (Singapore time), HTTP helpers
  schema.ts       PostgreSQL schema
public/           CSS and images (served by Cloudflare's edge)
scripts/          run-tests.mjs (summary), migrate.ts (database setup), hyperdrive.mjs (Hyperdrive setup)
test/             one test file per spec / user story, plus the password and smoke tests
```
