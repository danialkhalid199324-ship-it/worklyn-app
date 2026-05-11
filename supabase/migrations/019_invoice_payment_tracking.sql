-- Migration 019: Invoice payment tracking fields
-- Adds nullable columns to invoices for operational payment workflow.
-- Safe to apply on live data — all columns are nullable with no defaults.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_sent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_reference  TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes      TEXT,
  ADD COLUMN IF NOT EXISTS remittance_received_at TIMESTAMPTZ;
