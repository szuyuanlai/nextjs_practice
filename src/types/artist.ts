export type ArtistProfile = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  role?: string | null;
  status?: "idle" | "busy" | "closed" | null;
};

export type PortfolioItem = {
  id: string;
  artist_id: string;
  title?: string | null;
  image_url: string;
  storage_path?: string | null;
  is_internal?: boolean | null;
  is_internal_work?: boolean | null;
  created_at?: string | null;
};
