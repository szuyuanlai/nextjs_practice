-- Migration: normalize_character_and_order_schema.sql
-- Canonical merch + character schema for the current app flow.
-- Safe to run repeatedly on an existing Supabase project.

BEGIN;

-- -----------------------------------------------------------------------------
-- Characters table: normalize older fields into the current app schema.
-- -----------------------------------------------------------------------------
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS character_name text,
  ADD COLUMN IF NOT EXISTS character_gender text,
  ADD COLUMN IF NOT EXISTS personality_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS hairstyle text,
  ADD COLUMN IF NOT EXISTS hair_color text,
  ADD COLUMN IF NOT EXISTS eye_style text,
  ADD COLUMN IF NOT EXISTS eye_color text,
  ADD COLUMN IF NOT EXISTS height_body_type text,
  ADD COLUMN IF NOT EXISTS bust_size text,
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS outfit_accessories text,
  ADD COLUMN IF NOT EXISTS additional_notes text,
  ADD COLUMN IF NOT EXISTS selected_artist_name text,
  ADD COLUMN IF NOT EXISTS reference_image_urls text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

UPDATE public.characters
SET character_name = COALESCE(character_name, name, '未命名角色')
WHERE character_name IS NULL;

UPDATE public.characters
SET character_gender = COALESCE(character_gender, gender)
WHERE character_gender IS NULL;

UPDATE public.characters
SET personality_tags = COALESCE(personality_tags, '{}'::text[])
WHERE personality_tags IS NULL;

UPDATE public.characters
SET hairstyle = COALESCE(hairstyle, (appearance_details->>'hairstyle'))
WHERE hairstyle IS NULL;

UPDATE public.characters
SET hair_color = COALESCE(hair_color, (appearance_details->>'hair_color'))
WHERE hair_color IS NULL;

UPDATE public.characters
SET eye_style = COALESCE(eye_style, (appearance_details->>'eye_style'))
WHERE eye_style IS NULL;

UPDATE public.characters
SET eye_color = COALESCE(eye_color, (appearance_details->>'eye_color'))
WHERE eye_color IS NULL;

UPDATE public.characters
SET height_body_type = COALESCE(height_body_type, (appearance_details->>'height_body_type'))
WHERE height_body_type IS NULL;

UPDATE public.characters
SET bust_size = COALESCE(bust_size, (appearance_details->>'bust_size'))
WHERE bust_size IS NULL;

UPDATE public.characters
SET theme_color = COALESCE(theme_color, (appearance_details->>'theme_color'))
WHERE theme_color IS NULL;

UPDATE public.characters
SET outfit_accessories = COALESCE(outfit_accessories, (appearance_details->>'outfit_accessories'))
WHERE outfit_accessories IS NULL;

UPDATE public.characters
SET additional_notes = COALESCE(additional_notes, (appearance_details->>'additional_notes'))
WHERE additional_notes IS NULL;

UPDATE public.characters
SET selected_artist_name = COALESCE(selected_artist_name, (appearance_details->>'selected_artist_name'))
WHERE selected_artist_name IS NULL;

UPDATE public.characters
SET reference_image_urls = COALESCE(reference_image_urls, image_urls, '{}'::text[])
WHERE reference_image_urls IS NULL OR array_length(reference_image_urls, 1) IS NULL;

UPDATE public.characters
SET status = 'draft'
WHERE status IS NULL OR btrim(status) = '';

UPDATE public.characters
SET status = 'in_progress'
WHERE status NOT IN ('draft', 'in_progress', 'completed');

ALTER TABLE public.characters
  ALTER COLUMN character_name SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'in_progress',
  ALTER COLUMN status SET NOT NULL;

-- Keep the canonical column names and remove legacy ones if present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'name') THEN
    ALTER TABLE public.characters DROP COLUMN IF EXISTS name;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'gender') THEN
    ALTER TABLE public.characters DROP COLUMN IF EXISTS gender;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'image_urls') THEN
    ALTER TABLE public.characters DROP COLUMN IF EXISTS image_urls;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'characters' AND column_name = 'appearance_details') THEN
    ALTER TABLE public.characters DROP COLUMN IF EXISTS appearance_details;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS characters_character_name_idx ON public.characters(character_name);
CREATE INDEX IF NOT EXISTS characters_status_idx ON public.characters(status);
CREATE INDEX IF NOT EXISTS characters_user_id_idx ON public.characters(user_id);

-- -----------------------------------------------------------------------------
-- Orders table: normalize legacy columns to merch order flow.
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merch_type text,
  ADD COLUMN IF NOT EXISTS requirements jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS delivery_file_url text;

UPDATE public.orders
SET user_id = COALESCE(user_id, client_id)
WHERE user_id IS NULL AND client_id IS NOT NULL;

UPDATE public.orders
SET merch_type = COALESCE(merch_type, tier)
WHERE merch_type IS NULL;

UPDATE public.orders
SET requirements = COALESCE(requirements, jsonb_build_object('summary', COALESCE(description, '未填寫需求')))
WHERE requirements IS NULL OR requirements = '{}'::jsonb;

UPDATE public.orders
SET shipping_address = COALESCE(shipping_address, jsonb_build_object('address', COALESCE(address, '未填寫地址')))
WHERE shipping_address IS NULL OR shipping_address = '{}'::jsonb;

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_character_id_fkey'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_character_id_fkey
      FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'client_id') THEN
    ALTER TABLE public.orders DROP COLUMN IF EXISTS client_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'artist_id') THEN
    ALTER TABLE public.orders DROP COLUMN IF EXISTS artist_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'description') THEN
    ALTER TABLE public.orders DROP COLUMN IF EXISTS description;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'budget') THEN
    ALTER TABLE public.orders DROP COLUMN IF EXISTS budget;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'assets') THEN
    ALTER TABLE public.orders DROP COLUMN IF EXISTS assets;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tier') THEN
    ALTER TABLE public.orders DROP COLUMN IF EXISTS tier;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_character_id_idx ON public.orders(character_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_merch_type_idx ON public.orders(merch_type);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);

COMMIT;
