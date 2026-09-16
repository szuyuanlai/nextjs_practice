-- Migration: alter_characters_add_bust_size_and_default_authorization.sql
-- Adds bust size field and aligns public portfolio authorization default.

BEGIN;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS bust_size text;

ALTER TABLE public.characters
  ALTER COLUMN is_public_portfolio SET DEFAULT false;

UPDATE public.characters
SET is_public_portfolio = false
WHERE is_public_portfolio IS NULL;

COMMIT;
