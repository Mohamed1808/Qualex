# Qualex — Drive Finance Lead Management System

A production-grade Automotive Finance Lead Management System built with Next.js 14, Supabase, and Tailwind CSS.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **State**: TanStack Query v5 + Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Dates**: date-fns + date-fns-tz (Cairo/Africa timezone)
- **Toasts**: Sonner

## Setup Guide

### 1. Clone the repository

```bash
git clone <repo-url>
cd qualex
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to provision
3. Note your **Project URL** and **Anon Key** from Settings → API

### 3. Run migrations in order

Go to the Supabase SQL Editor and run each migration file in sequence:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_triggers.sql
supabase/migrations/004_seed.sql
```

### 4. Set environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INTAKE_WEBHOOK_SECRET=generate-a-random-secret
CRON_SECRET=generate-another-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: `SUPABASE_SERVICE_ROLE_KEY` is server-only and should NEVER be exposed to the client.

### 5. Create Supabase Storage bucket

In Supabase Dashboard → Storage, create a bucket named `id-documents` with public access.

### 6. Create the first admin user

In Supabase Dashboard → Authentication → Users, create a user. Then in SQL Editor:

```sql
INSERT INTO profiles (id, full_name, role)
VALUES ('your-user-uuid', 'Admin User', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## Deployment to Vercel

### 1. Connect to Vercel

```bash
npm i -g vercel
vercel
```

### 2. Set environment variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add all variables from `.env.local`.

### 3. Cron job configuration

The `vercel.json` file configures a cron job that runs the SLA checker every 5 minutes:

```json
{
  "crons": [
    {
      "path": "/api/sla/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

The cron job hits `/api/sla/cron` with an `Authorization: Bearer <CRON_SECRET>` header. Vercel cron jobs on Pro plans automatically pass the `CRON_SECRET` environment variable.

---

## User Roles

| Role | Portal | Access |
|------|--------|--------|
| `telesales_agent` | `/telesales/agent` | Own assigned leads |
| `telesales_supervisor` | `/telesales/supervisor` | All telesales leads + attendance |
| `direct_sales_agent` | `/direct-sales/agent` | Own DS leads |
| `direct_sales_supervisor` | `/direct-sales/supervisor` | All DS leads + analytics |
| `admin` | `/admin` | Full system access |

## Webhook Integration

Send leads from external sources via the intake webhook:

```bash
POST /api/webhooks/intake
Headers:
  x-webhook-secret: your-webhook-secret
  Content-Type: application/json

Body:
{
  "name": "Ahmed Mohamed",
  "phone": "01012345678",
  "channel": "whatsapp",
  "requested_car_brand": "Toyota",
  "requested_car_year": 2024,
  "source_campaign": "Summer2025"
}
```

Response `201` for new leads, `200` for duplicates.
