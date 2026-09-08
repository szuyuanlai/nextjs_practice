import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, contentType, orderId, bucket = 'order-assets' } = body;
    if (!filename || !contentType) return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });

    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // If orderId provided, confirm user has right to upload refs for that order (client or artist or admin)
    if (orderId) {
      const { data: order } = await supabase.from('orders').select('client_id,artist_id').eq('id', orderId).maybeSingle();
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      const role = (prof as any)?.role;
      const isClient = user.id === (order as any).client_id;
      const isArtist = user.id === (order as any).artist_id;
      const isAdmin = role === 'admin';
      if (!isClient && !isArtist && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

    const path = `${orderId ?? 'misc'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;

    // create a presigned PUT URL for direct upload
    // Note: supabase-js may expose createSignedUploadUrl on storage; use it if available.
    // Fallback: use createSignedUrl but that is GET-only. We assume createSignedUploadUrl exists on admin.storage
    // Example: admin.storage.from(bucket).createSignedUploadUrl(path, expiresInSeconds)
    // If not available in your runtime, implement an alternative server proxy upload endpoint.

    // @ts-ignore
    if (typeof admin.storage.from(bucket).createSignedUploadUrl === 'function') {
      // default 10 minutes
      // @ts-ignore
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path, 600);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ uploadUrl: data.signedUploadUrl, path });
    }

    // If createSignedUploadUrl not available, attempt to mimic by creating a signed URL via REST (not implemented here)
    return NextResponse.json({ error: 'Presigned upload not supported by server SDK in this environment' }, { status: 501 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
