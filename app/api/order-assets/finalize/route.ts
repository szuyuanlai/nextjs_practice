import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { orderId, path, previewUrl, purpose, status } = body;
    if (!orderId || !path) return NextResponse.json({ error: "Missing orderId or path" }, { status: 400 });

    const KNOWN_BUCKETS = ["order-assets", "order-uploads", "artist-assets"];
    if (typeof path !== "string") return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    path = path.replace(/^\/+/, "");
    for (const b of KNOWN_BUCKETS) {
      if (path.startsWith(b + "/")) {
        path = path.slice((b + "/").length);
        break;
      }
    }

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

    const { data: order } = await supabase
      .from("orders")
      .select("user_id,artist_id,delivery_file_url,status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = String((prof as { role?: string | null } | null)?.role ?? "").toLowerCase();
    const isClient = user.id === (order as { user_id?: string | null }).user_id;
    const isArtist = user.id === (order as { artist_id?: string | null }).artist_id;
    const isAdmin = role === "admin";

    if (!isClient && !isArtist && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (purpose === "delivery" || isArtist) {
      const nextStatus = typeof status === "string" && status.trim() ? status.trim().toLowerCase() : "completed";
      const { data: updated, error: upErr } = await supabase
        .from("orders")
        .update({
          delivery_file_url: previewUrl ?? path,
          status: nextStatus,
        })
        .eq("id", orderId)
        .select("id,status,delivery_file_url");

      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      if (!updated || updated.length === 0) {
        return NextResponse.json({ error: "Order update affected 0 rows (check RLS UPDATE policy)" }, { status: 403 });
      }
      return NextResponse.json({ ok: true, order: updated[0] });
    }

    const asset = { image_url: previewUrl ?? null, storage_path: path, purpose: purpose ?? "reference" };
    const { data: existing } = await supabase.from("orders").select("assets").eq("id", orderId).maybeSingle();
    const assets = (existing as { assets?: unknown[] } | null)?.assets ?? [];
    assets.push(asset);
    const { error: upErr } = await supabase.from("orders").update({ assets }).eq("id", orderId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
