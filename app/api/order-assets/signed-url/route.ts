import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { orderId, path, bucket } = body;
    if (!orderId || !path) return NextResponse.json({ error: "Missing orderId or path" }, { status: 400 });

    // sanitize path: allow full URLs or values that include the bucket prefix
    // strip any leading slash and bucket name if present
    const KNOWN_BUCKETS = ["order-assets", "order-uploads", "artist-assets"];

    // If a full URL was provided, attempt to extract the storage path and bucket
    try {
      if (typeof path === 'string' && path.startsWith('http')) {
        const u = new URL(path);
        // example public URL: https://xyz.supabase.co/storage/v1/object/public/<bucket>/<path>
        const parts = u.pathname.split('/').filter(Boolean);
        const idx = parts.indexOf('object');
        if (idx >= 0 && parts.length > idx + 2) {
          // parts[idx+2] might be 'public' or bucket name
          const maybeBucket = parts[idx + 3] ? parts[idx + 3] : parts[idx + 2];
          // find bucket in known buckets
          const found = KNOWN_BUCKETS.find((b) => maybeBucket === b);
          if (found) {
            bucket = found;
            // path is everything after the bucket
            const afterBucket = parts.slice(idx + 4).join('/');
            path = afterBucket || parts.slice(idx + 3).join('/');
          } else {
            // fallback: drop any leading segments up to bucket-like segment
            path = parts.slice(idx + 2).join('/');
          }
        }
      }
    } catch (e) {
      // ignore URL parsing errors and continue
    }

    // ensure path is a string and trim leading slashes
    if (typeof path !== 'string') return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    path = path.replace(/^\/+/, '');

    // if path includes a known bucket prefix, strip it and set bucket accordingly
    for (const b of KNOWN_BUCKETS) {
      if (path.startsWith(b + '/')) {
        bucket = b;
        path = path.slice((b + '/').length);
        break;
      }
    }

    // default bucket for order assets
    bucket = bucket || 'order-assets';

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

    try {
      const { data } = await admin.storage.from(bucket).createSignedUrl(path, 60);
      const signed = (data as any)?.signedURL || (data as any)?.signedUrl || null;
      if (!signed) return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 });
      return NextResponse.json({ url: signed });
    } catch (e: any) {
      console.error('createSignedUrl error', e?.message ?? e);
      return NextResponse.json({ error: e?.message ?? 'Failed to create signed URL' }, { status: 500 });
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
