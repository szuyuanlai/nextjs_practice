-- Migration: alter_characters_add_artist_delivery_access.sql
-- Allows assigned artists to read and complete their bound character orders.

BEGIN;

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS characters_artist_id_idx ON public.characters(artist_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('completed-assets', 'completed-assets', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'characters'
      AND policyname = 'select_characters_assigned_artist'
  ) THEN
    CREATE POLICY "select_characters_assigned_artist" ON public.characters
      FOR SELECT USING (auth.uid() = artist_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'characters'
      AND policyname = 'update_characters_assigned_artist'
  ) THEN
    CREATE POLICY "update_characters_assigned_artist" ON public.characters
      FOR UPDATE USING (auth.uid() = artist_id)
      WITH CHECK (auth.uid() = artist_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'select_completed_assets_public'
  ) THEN
    CREATE POLICY "select_completed_assets_public" ON storage.objects
      FOR SELECT USING (bucket_id = 'completed-assets');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'insert_completed_assets_assigned_artist'
  ) THEN
    CREATE POLICY "insert_completed_assets_assigned_artist" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'completed-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'update_completed_assets_assigned_artist'
  ) THEN
    CREATE POLICY "update_completed_assets_assigned_artist" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'completed-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'completed-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'delete_completed_assets_assigned_artist'
  ) THEN
    CREATE POLICY "delete_completed_assets_assigned_artist" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'completed-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END
$$;

COMMIT;
