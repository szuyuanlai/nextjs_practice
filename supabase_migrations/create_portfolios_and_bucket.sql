-- Migration: create_portfolios_and_bucket.sql
-- Run this in Supabase SQL editor (SQL) to create the `portfolios` table,
-- enable RLS and add policies, ensure `profiles` has expected columns,
-- and create the `artist-assets` storage bucket (public).

-- 1) Ensure profiles has columns used by the app
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text;

-- 2) Create storage bucket for artist assets (public)
-- If you prefer private, set the second arg to false and adjust storage policies accordingly.
SELECT storage.create_bucket('artist-assets', true);

-- 3) Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  image_url text NOT NULL,
  storage_path text,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;

-- 4) Enable Row Level Security
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- 5) Policies
-- Helper: allow if requester is the artist (owner) OR is admin as recorded in profiles.role

-- SELECT: owners and admins can select
CREATE POLICY "select_portfolios_owner_or_admin" ON public.portfolios
  FOR SELECT USING (
    (auth.uid() = artist_id)
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- INSERT: allow artists to insert their own rows (artist_id must equal auth.uid()) and admins
CREATE POLICY "insert_portfolios_owner_or_admin" ON public.portfolios
  FOR INSERT WITH CHECK (
    (auth.uid() = artist_id)
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- UPDATE: allow owners or admins to update; ensure on UPDATE the artist_id cannot be changed by non-admin
CREATE POLICY "update_portfolios_owner_or_admin" ON public.portfolios
  FOR UPDATE USING (
    (auth.uid() = artist_id)
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  ) WITH CHECK (
    -- if requester is admin, allow any artist_id; otherwise ensure artist_id === auth.uid()
    (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    ) OR (artist_id = auth.uid())
  );

-- DELETE: allow owners and admins
CREATE POLICY "delete_portfolios_owner_or_admin" ON public.portfolios
  FOR DELETE USING (
    (auth.uid() = artist_id)
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- 6) Optional: grant explicit usage to authenticated role (if needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;

-- Notes:
-- - These policies use auth.uid() and the `profiles` table to determine admin rights.
-- - If you want the storage objects to be private, create the bucket with 'false' and add storage policies
--   such that only users can upload to paths prefixed with their user id. Example storage policy snippet:
--
-- CREATE POLICY "upload_own_objects" ON storage.objects
--   FOR INSERT USING ( auth.role() = 'authenticated' ) WITH CHECK (
--     (strpos(name, auth.uid() || '/') = 1)
--   );
--
-- Adjust the SQL above to match your project's desired privacy model.
