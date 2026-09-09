import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

export const metadata = {
  title: "Artist",
};

const normalizeRole = (value: unknown) => {
  if (typeof value !== "string") return null;
  return value.trim().toUpperCase();
};

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component where setting cookies via cookieStore may not be allowed.
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[ArtistLayout] access denied: no authenticated user");
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const rawRole = (profile as any)?.role ?? null;
  const role = normalizeRole(rawRole);

  console.log("[ArtistLayout] access check", {
    userId: user.id,
    rawRole,
    normalizedRole: role,
    profileError: profileError ? profileError.message : null,
  });

  if (profileError) {
    console.log("[ArtistLayout] profile fetch failed", profileError);
    redirect("/");
  }

  if (!role || !["ARTIST", "ADMIN"].includes(role)) {
    console.log("[ArtistLayout] access denied for non-artist/admin role", {
      userId: user.id,
      rawRole,
      normalizedRole: role,
    });
    redirect("/");
  }

  return <>{children}</>;
}
