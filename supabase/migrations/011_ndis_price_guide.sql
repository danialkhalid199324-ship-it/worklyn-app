-- Migration 011: NDIS Price Guide table + link from services
--
-- ndis_price_guide is a shared reference table (no practitioner_id).
-- Rows are uniquely keyed on (support_item_number, source_version).
-- services.support_item_number is a soft reference (no FK) so services
-- are never blocked by price guide availability.

CREATE TABLE IF NOT EXISTS ndis_price_guide (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  support_item_number   text NOT NULL,
  support_item_name     text NOT NULL,
  support_category      text NOT NULL,
  unit                  text NOT NULL,
  weekday_rate          numeric(10, 2),
  saturday_rate         numeric(10, 2),
  sunday_rate           numeric(10, 2),
  public_holiday_rate   numeric(10, 2),
  effective_from        date NOT NULL,
  effective_to          date,
  source_version        text NOT NULL,
  UNIQUE (support_item_number, source_version)
);

-- Index for fast lookups by support_item_number
CREATE INDEX IF NOT EXISTS ndis_price_guide_item_number_idx
  ON ndis_price_guide (support_item_number);

-- Link services to the NDIS price guide (soft reference — no FK)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS support_item_number text;
