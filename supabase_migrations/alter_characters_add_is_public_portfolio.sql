-- Migration: alter_characters_add_is_public_portfolio.sql
-- Adds portfolio authorization flag for client-created characters.

BEGIN;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS is_public_portfolio boolean DEFAULT true;

UPDATE public.characters
SET is_public_portfolio = true
WHERE is_public_portfolio IS NULL;

ALTER TABLE public.characters
  ALTER COLUMN is_public_portfolio SET DEFAULT true,
  ALTER COLUMN is_public_portfolio SET NOT NULL;

COMMIT;
