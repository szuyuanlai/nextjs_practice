-- Migration: alter_characters_add_artist_id.sql
-- Adds artist binding support to `characters` table.

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS characters_artist_id_idx ON public.characters(artist_id);
