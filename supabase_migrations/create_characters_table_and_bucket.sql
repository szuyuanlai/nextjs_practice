-- Migration: create_characters_table_and_bucket.sql
-- Creates `characters` table and a public `character-references` bucket.

-- Create characters table
CREATE TABLE IF NOT EXISTS public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  gender text,
  personality_tags text[] DEFAULT '{}'::text[],
  bio text,
  appearance_details jsonb DEFAULT '{}'::jsonb,
  image_urls text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own characters, admins can manage all
CREATE POLICY "select_characters_owner_or_admin" ON public.characters
  FOR SELECT USING (
    (auth.uid() = user_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

CREATE POLICY "insert_characters_owner_or_admin" ON public.characters
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

CREATE POLICY "update_characters_owner_or_admin" ON public.characters
  FOR UPDATE USING (
    (auth.uid() = user_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  ) WITH CHECK (
    (auth.uid() = user_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

CREATE POLICY "delete_characters_owner_or_admin" ON public.characters
  FOR DELETE USING (
    (auth.uid() = user_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO authenticated;

-- Create bucket for reference images (public)
SELECT storage.create_bucket('character-references', true);
