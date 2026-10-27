import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const AUTH_REDIRECT_COOKIE = "auth_redirect_to";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : null;

export function getSupabaseClient() {
  if (!supabase) {
    console.warn(
      "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return null;
  }

  return supabase;
}

function clearBrowserSupabaseAuthCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const rawCookies = document.cookie ? document.cookie.split(";") : [];
  for (const entry of rawCookies) {
    const eqIndex = entry.indexOf("=");
    const name = (eqIndex >= 0 ? entry.slice(0, eqIndex) : entry).trim();
    if (name.startsWith("sb-") && name.includes("-auth-token")) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  }
}

export async function startOAuthSignIn(
  provider: "google" | "x",
  redirectToPath = "/",
) {
  const client = getSupabaseClient();
  if (!client) {
    return {
      data: { provider, url: null },
      error: new Error(
        "Supabase 尚未設定，請先填入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
      ),
    };
  }

  const safeRedirectTo =
    redirectToPath.startsWith("/") && !redirectToPath.startsWith("//")
      ? redirectToPath
      : "/";

  try {
    // Wait for initial session recovery/refresh to settle so a failing stale-token
    // refresh cannot call _removeSession() -> removeAllPKCEVerifiers() after
    // signInWithOAuth writes the new PKCE code_verifier cookie.
    await client.auth.initialize();
    await client.auth.stopAutoRefresh();
    await client.auth.signOut({ scope: "local" });
  } catch {
    // Ignore errors from cleaning up stale local sessions before starting OAuth.
  }

  clearBrowserSupabaseAuthCookies();

  if (typeof document !== "undefined") {
    const secureFlag =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${AUTH_REDIRECT_COOKIE}=${encodeURIComponent(safeRedirectTo)}; Path=/; Max-Age=600; SameSite=Lax${secureFlag}`;
  }

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  const result = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (result.error) {
    try {
      await client.auth.startAutoRefresh();
    } catch {
      // Ignore error restarting auto-refresh
    }
  }

  return result;
}
