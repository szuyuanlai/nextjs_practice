-- Migration: alter_characters_add_delivery_image_urls.sql
-- Adds dedicated delivery image fields for completed character assets.

BEGIN;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS character_sheet_url text,
  ADD COLUMN IF NOT EXISTS character_icon_url text;

COMMIT;