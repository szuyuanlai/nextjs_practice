export type OrderAsset = {
  image_url: string;
  storage_path?: string | null;
  purpose?: string | null;
};

export type Character = {
  id: string;
  user_id: string;
  character_name: string;
  character_gender?: string | null;
  personality_tags?: string[] | null;
  bio?: string | null;
  hairstyle?: string | null;
  hair_color?: string | null;
  eye_style?: string | null;
  eye_color?: string | null;
  height_body_type?: string | null;
  bust_size?: string | null;
  theme_color?: string | null;
  outfit_accessories?: string | null;
  additional_notes?: string | null;
  selected_artist_name?: string | null;
  reference_image_urls?: string[] | null;
  is_anonymous?: boolean | null;
  status?: string | null;
  created_at?: string | null;
};

export type Order = {
  id: string;
  user_id: string;
  character_id?: string | null;
  merch_type?: string | null;
  requirements?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
  delivery_file_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  assets?: OrderAsset[];
};
