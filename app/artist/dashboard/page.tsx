"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/src/lib/supabase/client";

export default function ArtistDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      let client;
      try {
        client = getSupabaseClient();
      } catch (err: any) {
        alert('Supabase 尚未設定，請先在 .env.local 中加入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。');
        router.push('/');
        return;
      }

      const { data: { user } } = await client.auth.getUser();
      if (!user) {
        alert('請先登入');
        router.push('/');
        return;
      }

      const { data: prof } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const role = (prof as any)?.role ?? null;
      if (role !== 'artist' && role !== 'admin') {
        alert('權限不足');
        router.push('/');
        return;
      }

      setProfile(prof);
      setLoading(false);
    };

    void load();
  }, [router]);

  if (loading) return <div className="p-8">載入中…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">繪師後台</h1>
      <div className="mb-4">歡迎，{profile?.full_name ?? profile?.id}</div>
      <div className="grid gap-3">
        <a href="/artist/profile" className="rounded border px-3 py-2">編輯個人檔案</a>
        <a href="/artist/orders" className="rounded border px-3 py-2">我的委託</a>
        <a href="/artist/portfolios" className="rounded border px-3 py-2">作品管理</a>
      </div>
    </div>
  );
}
