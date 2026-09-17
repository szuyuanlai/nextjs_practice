-- Migration: alter_orders_add_merchandise_fields_and_artist_delivery.sql
-- Expands orders schema for merchandise flow and artist delivery updates.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merch_type text,
  ADD COLUMN IF NOT EXISTS requirements jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_file_url text;

-- Backfill user_id from older client_id-based records.
UPDATE public.orders
SET user_id = client_id
WHERE user_id IS NULL AND client_id IS NOT NULL;

ALTER TABLE public.orders
  ALTER COLUMN requirements SET DEFAULT '{}'::jsonb,
  ALTER COLUMN shipping_address SET DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_status_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_status_check
      CHECK (status IN ('draft', 'pending', 'in_progress', 'lineart', 'approved', 'rejected', 'completed', 'delivered'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_character_id_idx ON public.orders(character_id);
CREATE INDEX IF NOT EXISTS orders_artist_id_idx ON public.orders(artist_id);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_merch_type_idx ON public.orders(merch_type);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);

-- Refresh RLS policies so artists can update delivery/status on assigned orders.
DROP POLICY IF EXISTS "select_orders_access" ON public.orders;
DROP POLICY IF EXISTS "insert_orders_clients" ON public.orders;
DROP POLICY IF EXISTS "update_orders_access" ON public.orders;
DROP POLICY IF EXISTS "delete_orders_admin_only" ON public.orders;

CREATE POLICY "select_orders_access" ON public.orders
  FOR SELECT USING (
    (auth.uid() = user_id)
    OR (auth.uid() = client_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

CREATE POLICY "insert_orders_clients" ON public.orders
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id)
    OR (auth.uid() = client_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

CREATE POLICY "update_orders_access" ON public.orders
  FOR UPDATE USING (
    (auth.uid() = user_id)
    OR (auth.uid() = client_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  ) WITH CHECK (
    (auth.uid() = user_id)
    OR (auth.uid() = client_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'))
  );

CREATE POLICY "delete_orders_admin_only" ON public.orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin')
  );

-- Public bucket for artist merchandise deliveries.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'merch-deliveries') THEN
    PERFORM storage.create_bucket('merch-deliveries', true);
  END IF;
END
$$;

COMMIT;
