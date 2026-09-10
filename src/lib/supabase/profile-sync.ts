import type { SupabaseClient, User } from "@supabase/supabase-js";

function normalizeRole(value?: string | null) {
  if (!value) return "CLIENT";
  const normalized = value.toUpperCase();
  if (normalized === "ARTIST" || normalized === "ADMIN" || normalized === "CLIENT") {
    return normalized;
  }
  return "CLIENT";
}

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

  const payload: Record<string, unknown> = {
    id: user.id,
    role: normalizeRole(toNullableString(metadata.role)),
  };

  if (fullName) {
    payload.full_name = fullName;
  }

  if (preferredUsername) {
    payload.display_name = preferredUsername;
  }

  if (avatarUrl) {
    payload.avatar_url = avatarUrl;
  }

  const upsertProfile = async (nextPayload: Record<string, unknown>) => {
    return client
      .from("profiles")
      .upsert(nextPayload, { onConflict: "id" });
  };

  const { error } = await upsertProfile(payload);

  if (!error) {
    return;
  }

  const message = `${error.message} ${error.details ?? ""}`;
  if (/display_name|column|does not exist/i.test(message)) {
    const fallbackPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== "display_name"),
    );
    await upsertProfile(fallbackPayload);
  }
}
