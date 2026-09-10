import type { SupabaseClient, User } from "@supabase/supabase-js";

export function normalizeXAvatarUrl(url?: string | null): string | null {
  if (!url) return null;

  // Twitter avatars commonly use the _normal suffix. Replace it with _400x400 for better quality.
  return url.replace(/_normal(?=\.[a-zA-Z0-9]+($|\?))/i, "_400x400");
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function syncProfileFromAuthUser(client: SupabaseClient, user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const provider = String(user.app_metadata?.provider ?? "").toLowerCase();

  const preferredUsername =
    toNullableString(metadata.preferred_username) ??
    toNullableString(metadata.user_name) ??
    toNullableString(metadata.nickname);

  const fullName =
    toNullableString(metadata.full_name) ??
    toNullableString(metadata.name) ??
    preferredUsername ??
    user.email?.split("@")[0] ??
    null;

  const rawAvatarUrl =
    toNullableString(metadata.avatar_url) ??
    toNullableString(metadata.picture);

  const avatarUrl = provider === "x" ? normalizeXAvatarUrl(rawAvatarUrl) : rawAvatarUrl;

  const { data: existingProfile, error: selectError } = await client
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (selectError) {
    console.warn("Failed to read existing profile during auth sync:", selectError.message);
    return;
  }

  if (existingProfile) {
    return;
  }

  const insertPayload: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? null,
    role: "CLIENT",
  };

  if (fullName) insertPayload.full_name = fullName;
  if (preferredUsername) insertPayload.display_name = preferredUsername;
  if (avatarUrl) insertPayload.avatar_url = avatarUrl;

  const { error: insertError } = await client.from("profiles").insert(insertPayload);

  if (insertError) {
    console.warn("Failed to create initial profile during auth sync:", insertError.message);
  }
}
