-- Migration: fix_artist_orders_delivery_rls.sql
-- Ensures assigned artists (and admins) have SELECT and UPDATE permissions on public.orders and public.characters
-- without referencing dropped legacy columns like client_id.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_file_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_orders_access" ON public.orders;
DROP POLICY IF EXISTS "insert_orders_clients" ON public.orders;
DROP POLICY IF EXISTS "update_orders_access" ON public.orders;
DROP POLICY IF EXISTS "delete_orders_admin_only" ON public.orders;

CREATE POLICY "select_orders_access" ON public.orders
  FOR SELECT USING (
    (auth.uid() = user_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = orders.character_id AND c.artist_id = auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

CREATE POLICY "insert_orders_clients" ON public.orders
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

CREATE POLICY "update_orders_access" ON public.orders
  FOR UPDATE USING (
    (auth.uid() = user_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = orders.character_id AND c.artist_id = auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  ) WITH CHECK (
    (auth.uid() = user_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.characters c WHERE c.id = orders.character_id AND c.artist_id = auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

CREATE POLICY "delete_orders_admin_only" ON public.orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin')
  );

-- Also ensure characters table allows assigned artists and case-insensitive admins to update delivery status
DROP POLICY IF EXISTS "update_characters_assigned_artist" ON public.characters;
CREATE POLICY "update_characters_assigned_artist" ON public.characters
  FOR UPDATE USING (
    (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  ) WITH CHECK (
    (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

COMMIT;
