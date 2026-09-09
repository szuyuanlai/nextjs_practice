import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, contentType, orderId, bucket = "order-assets" } = body;
    if (!filename || !contentType) return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (orderId) {
      const { data: order } = await supabase.from("orders").select("client_id,artist_id").eq("id", orderId).maybeSingle();
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const role = (prof as any)?.role;
      const isClient = user.id === (order as any).client_id;
      const isArtist = user.id === (order as any).artist_id;
      const isAdmin = role === "admin";
      if (!isClient && !isArtist && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    const path = `${orderId ?? "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;

    // @ts-ignore
    if (typeof admin.storage.from(bucket).createSignedUploadUrl === "function") {
      // @ts-ignore
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path, { upsert: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const signedUploadUrl = (data as { signedUrl?: string } | null)?.signedUrl ?? "";
      if (!signedUploadUrl) return NextResponse.json({ error: "Generated signed URL missing" }, { status: 500 });
      return NextResponse.json({ uploadUrl: signedUploadUrl, path });
    }

    return NextResponse.json({ error: "Presigned upload not supported by server SDK in this environment" }, { status: 501 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
