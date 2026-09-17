export type ArtistProfileRecord = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
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
    .select("id, full_name, display_name, avatar_url, cover_url, bio, status, role")
    .eq("role", "ARTIST")
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
  const buildSafeObjectPath = () => {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const trimmed = path.replace(/^\/+/, "").replace(/\/+$/, "");
    const segments = trimmed.split("/").filter((segment) => segment.length > 0);
    const dir = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
    return dir ? `${dir}/${fileName}` : fileName;
  };

  const objectPath = buildSafeObjectPath();
  const uploadErrors: Array<{ bucketName: string; message: string }> = [];

  for (const bucketName of bucketNames) {
    console.log("[uploadFileToBucket] upload start", {
      bucketName,
      originalPath: path,
      objectPath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    const { data, error } = await supabase.storage.from(bucketName).upload(objectPath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

    if (!error) {
      const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
      console.log("[uploadFileToBucket] upload success", {
        bucketName,
        objectPath,
        uploadData: data,
        publicUrl: publicData.publicUrl,
      });
      return { bucketName, publicUrl: publicData.publicUrl, objectPath, uploadData: data };
    }

    console.error("Storage upload failed", {
      bucketName,
      path,
      objectPath,
      error,
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
      code: (error as { code?: string }).code,
    });
    uploadErrors.push({ bucketName, message: error.message });
  }

  throw new Error(
    `Storage bucket unavailable: ${uploadErrors.map((item) => `${item.bucketName}(${item.message})`).join(", ")}`,
  );
}
