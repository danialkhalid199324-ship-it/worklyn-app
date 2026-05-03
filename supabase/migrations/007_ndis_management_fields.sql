-- Add NDIS management type and associated contact fields to clients table
-- Run in Supabase SQL Editor after 006_client_funding_type.sql

alter table public.clients
  add column if not exists ndis_management_type      text
    check (ndis_management_type in ('NDIA-managed', 'Self-managed', 'Plan-managed')),

  -- Self-managed contact
  add column if not exists self_manager_name         text,
  add column if not exists self_manager_relation     text,
  add column if not exists self_manager_email        text,
  add column if not exists self_manager_phone        text,

  -- Plan-managed contact
  add column if not exists plan_manager_name         text,
  add column if not exists plan_manager_email        text,
  add column if not exists plan_manager_phone        text;
