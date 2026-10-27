import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AUTH_REDIRECT_COOKIE } from "@/src/lib/supabase/client";
import { syncProfileFromAuthUser } from "@/src/lib/supabase/profile-sync";

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

function isAuthSessionCookie(name: string): boolean {
  return (
    name.startsWith("sb-") &&
    name.includes("-auth-token") &&
    !name.includes("-code-verifier")
  );
}

function resolveSafeNextPath(
  nextParam: string | null,
  redirectCookieValue: string | undefined,
): string {
  let candidate = nextParam;

  if (!candidate && redirectCookieValue) {
    try {
      candidate = decodeURIComponent(redirectCookieValue);
    } catch {
      candidate = redirectCookieValue;
    }
  }

  if (!candidate) {
    return "/";
  }

  return candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/";
}

function buildRedirectResponse(
  targetUrl: URL,
  pendingCookies: Map<string, CookieToSet>,
) {
  const response = NextResponse.redirect(targetUrl);
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );

  response.cookies.set(AUTH_REDIRECT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  for (const { name, value, options } of pendingCookies.values()) {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2],
    );
  }

  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id") ?? undefined;
  const oauthError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const safeNextPath = resolveSafeNextPath(
    requestUrl.searchParams.get("next"),
    cookieStore.get(AUTH_REDIRECT_COOKIE)?.value,
  );
  const pendingCookies = new Map<string, CookieToSet>();

  if (oauthError) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("redirectTo", safeNextPath);
    loginUrl.searchParams.set("error", oauthError);
    return buildRedirectResponse(loginUrl, pendingCookies);
  }

  if (code) {
    const allRequestCookies = cookieStore.getAll();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Hide any stale pre-existing session cookies during the OAuth callback
            // while keeping PKCE `-code-verifier` cookies intact. This prevents
            // GoTrueClient's background `_emitInitialSession()` from attempting to
            // refresh an expired session cookie and calling `_removeSession()` ->
            // `removeAllPKCEVerifiers()` concurrently with `exchangeCodeForSession()`.
            return cookieStore
              .getAll()
              .filter((cookie) => !isAuthSessionCookie(cookie.name));
          },
          setAll(cookiesToSet: CookieToSet[]) {
            const writtenNames = new Set<string>();

            cookiesToSet.forEach(({ name, value, options }) => {
              writtenNames.add(name);
              pendingCookies.set(name, { name, value, options });
              cookieStore.set(
                name,
                value,
                options as Parameters<typeof cookieStore.set>[2],
              );
            });

            const wroteNewSession = cookiesToSet.some(
              (c) => isAuthSessionCookie(c.name) && c.value !== "",
            );

            if (wroteNewSession) {
              // Clean up any leftover chunk cookies from a previous larger session
              for (const existing of allRequestCookies) {
                if (
                  isAuthSessionCookie(existing.name) &&
                  !writtenNames.has(existing.name)
                ) {
                  const removeOptions = {
                    path: "/",
                    maxAge: 0,
                    sameSite: "lax" as const,
                  };
                  pendingCookies.set(existing.name, {
                    name: existing.name,
                    value: "",
                    options: removeOptions,
                  });
                  cookieStore.set(existing.name, "", removeOptions);
                }
              }
            }
          },
        },
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (error) {
      console.error("Failed to exchange OAuth code for session:", error.message);
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("redirectTo", safeNextPath);
      loginUrl.searchParams.set("error", error.message);
      return buildRedirectResponse(loginUrl, pendingCookies);
    }

    if (data?.user) {
      try {
        await syncProfileFromAuthUser(supabase, data.user);
      } catch (profileSyncError) {
        console.warn("Failed to sync profile after OAuth callback:", profileSyncError);
      }
    }
  }

  return buildRedirectResponse(
    new URL(safeNextPath, requestUrl.origin),
    pendingCookies,
  );
}
