# Database Schema

All types are defined in `types/database.ts`. All tables use RLS; access is always scoped to the authenticated practitioner via `practitioner_id = public.my_practitioner_id()`.

## Core Tables

### `practitioners`
One row per registered practitioner. `id` is the FK on all other tables.
Key fields: `user_id` (FK to Supabase auth.users), `timezone`, `booking_page_slug`.

### `clients`
Clients belonging to a practitioner.
Key fields: `funding_type` (NDIS | Medicare | Private / Other), `ndis_management_type` (NDIA-managed | Self-managed | Plan-managed), `plan_manager_*`, `self_manager_*`.

### `services`
Service catalogue per practitioner. Linked to sessions to set rate/duration.
Key fields: `name`, `default_rate`, `unit_type` (hourly | session | fixed), `ndis_line_item`, `duration_minutes`, `gst_applicable`.

### `sessions`
One session per client visit.
Key fields: `status` (scheduled | completed | cancelled), `service_date`, `start_time`, `end_time`, `duration_minutes`, `rate`, `notes` (JSON), `invoice_id` (FK to invoices — set when auto-invoice is created).

### `invoices`
One invoice per session (auto-created on completion). Can also be created manually.
Key fields: `invoice_number` (unique per practitioner — format `INV-YYYY-NNNN`), `status` (draft | sent | paid | overdue | cancelled), `subtotal_cents`, `total_cents`, `recipient_type`, `recipient_name`, `recipient_email`.

**Unique constraint:** `invoices_practitioner_id_invoice_number_key` — enforces no duplicate invoice numbers per practitioner.

### `invoice_items`
Line items for an invoice. Typically one item per session (description, quantity, unit_price_cents).

### `invoice_audit_log`
Immutable audit trail for every invoice mutation. Written by `autoCreateDraftInvoice` and `updateInvoice`. Fields: `previous_values`, `updated_values`, `reason`.

## Supporting Tables

| Table | Purpose |
|---|---|
| `appointments` | Scheduling/booking data; loosely linked to sessions |
| `reports` | Generated reports (revenue, appointments, etc.) |
| `org_settings` | Per-practitioner org branding (logo, ABN, bank details) |
| `ndis_price_guide` | NDIS support item price reference |
| `session_notifications` | Tracks reminder/confirmation emails sent per session |

## Migrations
Numbered files in `supabase/migrations/`. Must be applied in order.
- `001–011`: incremental column/table additions
- `012_invoice_audit_log.sql`: adds `invoice_audit_log` table — **run in Supabase SQL Editor if not applied**
- `013_sessions_and_missing_columns.sql`: adds `sessions` table and missing columns — **run manually if sessions table is missing**
