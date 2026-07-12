# Qualex — Drive Finance CRM (Frontend)

A frontend-only Automotive Finance Lead Management CRM, built with Next.js 14 +
TypeScript + Tailwind CSS. This repository contains **no backend and no
database** — see [DATABASE.md](./DATABASE.md) for the schema the backend team
should implement, and the "Backend Handoff" section below for how it plugs in.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Toasts**: Sonner
- **CSV**: PapaParse / xlsx (client-side import/export)
- **Dates**: date-fns + date-fns-tz

There is **no database, no auth provider, and no server** in this repo. All
data currently lives in the browser's `localStorage`, seeded from
`lib/crm/mock-data.ts`, purely so the UI is fully interactive to click through
and demo.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects into the
CRM at `/crm/login`.

### Demo login

The login screen lists demo accounts (any password works) covering every
role: admin, telesales supervisor/agent, direct sales supervisor/agent. See
`lib/crm/mock-data.ts` (`SEED_USERS`) for the full list.

## Project structure

```
app/crm/                  Next.js routes (one per screen)
components/crm/           All CRM UI components
components/crm/ui/        Shared primitives (Skeleton, EmptyState, Pill, etc.)
lib/crm/types.ts          Every data shape the frontend expects
lib/crm/mock-data.ts      Seed/demo data only — safe to delete once wired to a real API
lib/crm/service.ts        *** THE BACKEND INTEGRATION SEAM (see below) ***
lib/crm/session.ts        Mock auth (email-only login) — replace with real auth
lib/crm/constants.ts      Shared enums/labels (channels, programs, etc.)
```

## Backend Handoff

**`lib/crm/service.ts` is the single integration point.** Every screen in the
app calls the ~40 exported async functions in that file (`listLeads`,
`createLead`, `assignTelesales`, `logCallAttempt`, `recordCreditDecision`, …).
Today each function reads/writes an in-browser `localStorage` object seeded
from `mock-data.ts`. To connect a real backend:

1. Stand up the database described in [DATABASE.md](./DATABASE.md) (Postgres
   schema, enums, and indexes are spelled out — plus notes for adapting to
   another engine).
2. Build API endpoints (REST, or Server Actions if moving this into a
   full-stack Next.js app) that match each function's inputs/outputs.
3. Replace each function body in `lib/crm/service.ts` with a `fetch(...)`
   call (or direct DB call) to the new endpoint. **No other file needs to
   change** — every component only imports from this module.
4. Replace `lib/crm/session.ts` with real authentication (the mock login
   currently just matches an email against the seed user list).
5. Implement the background jobs listed at the end of DATABASE.md (SLA
   breach checks, scheduled lead distribution, reminder firing, WhatsApp
   Business API integration).

Once the seam is real, `lib/crm/mock-data.ts` and the localStorage
persistence in `service.ts` can be deleted entirely.

## User Roles

| Role | Portal |
|------|--------|
| `telesales_agent` | My Queue — work assigned leads |
| `telesales_supervisor` | Telesales queue, analytics, attendance, duplicates |
| `direct_sales_agent` | My Queue — work assigned leads |
| `direct_sales_supervisor` | Direct Sales queue, analytics, attendance, credit |
| `admin` | Full system access — users, projects, teams, statuses, lead management |
