# Project Overview — Worklyn

## What It Is
Worklyn is a practice management web application for NDIS/therapy providers. It handles client management, session scheduling, structured clinical note-taking, and invoice generation including NDIS billing workflows.

## Tech Stack
- **Framework:** Next.js 14.2.5 (App Router, React 18)
- **Auth/DB:** Supabase (PostgreSQL + Row Level Security)
- **Styling:** Tailwind CSS
- **PDF generation:** `@react-pdf/renderer`
- **Email:** Resend
- **Types:** TypeScript strict mode

## Directory Structure
```
app/
  actions/         # Server Actions (Next.js 'use server')
  dashboard/       # Route segments: sessions, invoices, clients, services, etc.
  api/             # Route handlers (webhooks, file uploads)
  auth/            # Login / signup pages
components/
  layout/          # DashboardSidebar, DashboardHeader
  ui/              # Shared UI primitives (Button, Card, Badge, etc.)
  dashboard/       # Feature-specific modals and page clients
lib/
  db.ts            # getPractitionerByUserId, getClientById
  invoice-routing.ts   # resolveInvoiceRecipient (pure function)
  supabase-server.ts   # createServerSupabaseClient
  email.ts         # sendEmail wrapper (Resend)
  invoice-pdf.tsx  # React PDF invoice renderer
types/
  database.ts      # Full TypeScript types for all Supabase tables
supabase/
  migrations/      # Numbered SQL migration files (001–013)
```

## Auth Model
- Users authenticate via Supabase Auth
- Every DB query is scoped by `practitioner_id = public.my_practitioner_id()` via RLS policies
- Server Actions call `requireAuth()` then `getPractitionerByUserId()` to resolve the practitioner row

## Deployment
- See [DEPLOYMENT.md](./DEPLOYMENT.md)
