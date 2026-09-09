import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { orderId, path, previewUrl } = body;
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

    const { data: order } = await supabase.from("orders").select("client_id").eq("id", orderId).maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (user.id !== (order as any).client_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const asset = { image_url: previewUrl ?? null, storage_path: path, purpose: "reference" };
    const { data: existing } = await supabase.from("orders").select("assets").eq("id", orderId).maybeSingle();
    const assets = (existing as any)?.assets ?? [];
    assets.push(asset);
    const { error: upErr } = await supabase.from("orders").update({ assets }).eq("id", orderId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
