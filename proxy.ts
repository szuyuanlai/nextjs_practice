import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Never intercept the OAuth callback route itself
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // If Supabase falls back to the Site URL (e.g. `/?code=...`) due to Redirect URL
  // allowlist configuration, forward the OAuth parameters to `/auth/callback` so
  // the server-side PKCE exchange still succeeds on the first login attempt.
  if (searchParams.has("code")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    if (pathname !== "/" && !callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(callbackUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        cookie.name.includes("-auth-token") &&
        !cookie.name.includes("-code-verifier"),
    );

  if (!hasSessionCookie) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Do not expose PKCE `-code-verifier` cookies to proxy session refresh so
        // cleaning up an expired session in a concurrent request can never delete
        // an active OAuth PKCE verifier cookie.
        return request.cookies
          .getAll()
          .filter((cookie) => !cookie.name.includes("-code-verifier"));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(
            name,
            value,
            options as Parameters<typeof supabaseResponse.cookies.set>[2],
          ),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
