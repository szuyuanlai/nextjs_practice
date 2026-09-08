import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, path } = body;
    if (!orderId || !path) return NextResponse.json({ error: "Missing orderId or path" }, { status: 400 });

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // fetch order to verify asset belongs to order
    const { data: order, error: orderErr } = await supabase.from("orders").select("client_id, artist_id, assets").eq("id", orderId).maybeSingle();
    if (orderErr || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const assets = order.assets ?? [];
    const match = assets.find((a: any) => a.storage_path === path || a.image_url?.includes(path));
    if (!match) return NextResponse.json({ error: "Asset not part of order" }, { status: 403 });

    // check permission: client, artist, or admin
    const isClient = user.id === order.client_id;
    const isArtist = user.id === order.artist_id;

    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = (prof as any)?.role === "admin";

    if (!isClient && !isArtist && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // create signed url using service role
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    const { data } = await admin.storage.from("order-assets").createSignedUrl(path, 60);
    if (!data || !data.signedURL) return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });

    return NextResponse.json({ url: data.signedURL });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
