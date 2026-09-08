-- Migration: create_pod_requests_table.sql
-- Stores print-on-demand requests from clients
CREATE TABLE IF NOT EXISTS public.pod_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  artist_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_type text,
  quantity int DEFAULT 1,
  specs jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pod_requests TO authenticated;
