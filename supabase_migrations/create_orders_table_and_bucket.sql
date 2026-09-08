-- Migration: create_orders_table_and_bucket.sql
-- Creates `orders` table and an `order-assets` storage bucket for reference files

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tier text,
  client_name text,
  email text,
  description text,
  deadline text,
  budget text,
  status text DEFAULT 'draft', -- draft, in_progress, lineart, completed, delivered
  assets jsonb DEFAULT '[]'::jsonb, -- array of {image_url, storage_path, purpose}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable row level security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies: clients can access their orders; artists can access orders assigned to them; admins can access all
CREATE POLICY "select_orders_access" ON public.orders
  FOR SELECT USING (
    (auth.uid() = client_id)
    OR (auth.uid() = artist_id)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

CREATE POLICY "insert_orders_clients" ON public.orders
  FOR INSERT WITH CHECK (
    (auth.uid() = client_id) OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

CREATE POLICY "update_orders_access" ON public.orders
  FOR UPDATE USING (
    (auth.uid() = client_id) OR (auth.uid() = artist_id) OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  ) WITH CHECK (
    (auth.uid() = client_id) OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  );

CREATE POLICY "delete_orders_admin_only" ON public.orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

-- Create a private bucket for order assets to ensure files are not public.
SELECT storage.create_bucket('order-assets', false);
