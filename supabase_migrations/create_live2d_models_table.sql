-- Migration: create_live2d_models_table.sql
-- Stores uploaded Live2D models metadata
CREATE TABLE IF NOT EXISTS public.live2d_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  bucket text,
  model_path text,
  assets jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live2d_models TO authenticated;
