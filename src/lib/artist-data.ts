export type ArtistProfileRecord = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  role?: string | null;
  status?: "idle" | "busy" | "closed" | null;
};

export type ArtistPortfolioPreview = {
  artist_id: string;
  image_url: string | null;
  created_at?: string | null;
};

export async function fetchArtistSpotlights(supabase: any) {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, bio, status, role")
    .in("role", ["ARTIST", "ADMIN"])
    .order("full_name", { ascending: true });

  console.log("Artists fetched:", profiles, error);

  if (error) {
    throw error;
  }

  const profilesList = (profiles ?? []) as ArtistProfileRecord[];
  const ids = profilesList.map((artist) => artist.id);

  if (!ids.length) {
    return profilesList;
  }

  const { data: portfolioRows } = await supabase
    .from("portfolios")
    .select("artist_id, image_url, created_at")
    .in("artist_id", ids)
    .order("created_at", { ascending: false });

  const latestByArtist = new Map<string, string | null>();
  for (const row of (portfolioRows ?? []) as ArtistPortfolioPreview[]) {
    if (!row.artist_id || latestByArtist.has(row.artist_id)) continue;
    latestByArtist.set(row.artist_id, row.image_url ?? null);
  }

  return profilesList.map((artist) => ({
    ...artist,
    portfolio_preview_url: latestByArtist.get(artist.id) ?? null,
  }));
}

export async function saveArtistProfile(supabase: any, id: string, patch: Partial<ArtistProfileRecord>) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id, ...patch }, { onConflict: "id" })
    .select("id, full_name, avatar_url, bio, status, role")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ArtistProfileRecord | null;
}

export async function fetchArtistPortfolios(supabase: any, artistId: string) {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("artist_id", artistId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<Record<string, any>>;
}

export async function uploadFileToBucket(supabase: any, bucketNames: readonly string[], file: File, path: string) {
  for (const bucketName of bucketNames) {
    const { error } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
    if (!error) {
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(path);
      return { bucketName, publicUrl: publicData.publicUrl };
    }
  }

  throw new Error("Storage bucket unavailable");
}
