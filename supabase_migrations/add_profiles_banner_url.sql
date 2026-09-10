-- Migration: add_profiles_banner_url.sql
-- Ensure the profiles table can store manual banner images for artist account pages.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text;
