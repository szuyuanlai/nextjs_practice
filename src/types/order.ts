export type OrderAsset = {
  image_url: string;
  storage_path?: string | null;
  purpose?: string | null;
};

export type Order = {
  id: string;
  client_id?: string | null;
  artist_id?: string | null;
  tier?: string | null;
  client_name?: string | null;
  email?: string | null;
  description?: string | null;
  deadline?: string | null;
  budget?: string | null;
  status?: string | null;
  assets?: OrderAsset[];
  created_at?: string | null;
};
