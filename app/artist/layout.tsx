import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const metadata = {
  title: "Artist",
};

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  const role = (profile as any)?.role;
  if (!role || (role !== "artist" && role !== "admin")) {
    redirect("/");
  }

  return <>{children}</>;
}
