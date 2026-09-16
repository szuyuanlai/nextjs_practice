-- Migration: alter_characters_add_status.sql
-- Adds workflow status to characters and normalizes existing records.

BEGIN;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Backfill null or empty status values.
UPDATE public.characters
SET status = 'in_progress'
WHERE status IS NULL OR btrim(status) = '';

-- Normalize unexpected values to in_progress.
UPDATE public.characters
SET status = 'in_progress'
WHERE status NOT IN ('draft', 'in_progress', 'completed');

ALTER TABLE public.characters
  ALTER COLUMN status SET DEFAULT 'in_progress',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'characters_status_check'
      AND conrelid = 'public.characters'::regclass
  ) THEN
    ALTER TABLE public.characters
      ADD CONSTRAINT characters_status_check
      CHECK (status IN ('draft', 'in_progress', 'completed'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS characters_status_idx ON public.characters(status);

COMMIT;
