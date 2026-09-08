"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('請先登入');
        router.push('/');
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      const role = (prof as any)?.role ?? null;
      if (role !== 'admin') {
        alert('管理員權限不足');
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
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">管理後台</h1>
      <div className="mb-4">管理員：{profile?.full_name ?? profile?.id}</div>
      <div className="grid gap-3">
        <a href="/admin/users" className="rounded border px-3 py-2">使用者管理</a>
        <a href="/admin/orders" className="rounded border px-3 py-2">訂單管理</a>
        <a href="/admin/live2d" className="rounded border px-3 py-2">Live2D 管理</a>
      </div>
    </div>
  );
}
