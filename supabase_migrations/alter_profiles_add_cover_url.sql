-- Migration: alter_profiles_add_cover_url.sql
-- Adds cover_url field for artist cover image.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url text;

COMMIT;
