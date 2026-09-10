"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import FileUploadField from "@/src/components/FileUploadField";
import type { ArtistProfile, PortfolioItem } from "@/src/types/artist";

const BUCKET = "artist-assets";

export default function ArtistProfilePage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "closed">("idle");
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const profileData = prof as ArtistProfile | null;
      setProfile(profileData);
      setFullName(profileData?.full_name ?? "");
      setBio(profileData?.bio ?? "");
      setStatus(profileData?.status ?? "idle");

      const { data: items } = await supabase
        .from("portfolios")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      setPortfolios((items as PortfolioItem[]) ?? []);
      const role = profileData?.role ?? null;
      if (role === "customer") {
        console.warn("權限不足");
        router.push("/");
        return;
      }

      setLoading(false);
    };

    void load();
  }, [router]);

  const handleAvatarChange = (files: File[]) => {
    setAvatarFile(files[0] ?? null);
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !supabase || !profile) return;
    setUploading(true);
    const path = `${profile.id}/avatar-${Date.now()}-${avatarFile.name}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, avatarFile, { upsert: true });
    if (upErr) {
      console.error("上傳失敗: ", upErr.message);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicData.publicUrl;

    const { error: upd } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
    if (upd) {
      console.error("更新大頭貼失敗: ", upd.message);
      setUploading(false);
      return;
    }

    setProfile({ ...profile, avatar_url: publicUrl });
    setAvatarFile(null);
    setUploading(false);
  };

  const saveBioAndStatus = async () => {
    if (!profile || !supabase) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), bio, status })
      .eq("id", profile.id);
    if (error) {
      console.error("更新失敗: ", error.message);
      return;
    }
    setProfile({ ...profile, full_name: fullName.trim(), bio, status });
    console.log("已儲存");
  };

  const fetchPortfolios = async (artistId: string) => {
    if (!supabase) {
      return;
    }

    const { data: items } = await supabase
      .from("portfolios")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false });

    setPortfolios((items as PortfolioItem[]) ?? []);
  };

  const handlePortfolioFiles = async (files: File[]) => {
    setPortfolioFiles(files);
    if (!files.length || !profile || !supabase) return;

    setUploading(true);
    const added: PortfolioItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${profile.id}/portfolio-${Date.now()}-${i}-${file.name}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (upErr) {
        console.error("upload error", upErr.message);
        continue;
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = publicData.publicUrl;

      const title = file.name.replace(/\.[^/.]+$/, "");
      const { data: insData, error: dbError } = await supabase
        .from("portfolios")
        .insert([
          {
            artist_id: profile.id,
            image_url: publicUrl,
            title,
            storage_path: path,
            is_internal: false,
            is_pinned: false,
          },
        ])
        .select()
        .maybeSingle();

      if (dbError) {
        console.error("Database insert failed:", dbError);
        continue;
      }

      added.push(insData as PortfolioItem);
    }

    await fetchPortfolios(profile.id);
    setUploading(false);
    setPortfolioFiles([]);
  };

  const handleDeletePortfolio = async (item: PortfolioItem) => {
    if (!confirm("確定要刪除此作品？")) return;
    if (!supabase) return;

    // Remove DB record
    const { error: delErr } = await supabase.from("portfolios").delete().eq("id", item.id);
    if (delErr) {
      console.error("刪除失敗: ", delErr.message);
      return;
    }

    // Attempt to remove storage file if we have path
    if (item.storage_path) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
      if (rmErr) {
        console.warn("無法刪除 storage 檔案:", rmErr.message);
      }
    }

    setPortfolios((prev) => prev.filter((p) => p.id !== item.id));
  };

  if (loading) {
    return <div className="p-8">載入中…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">繪師設定</h1>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">大頭貼</h2>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-full border bg-slate-50">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400">暫無</div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <FileUploadField
              id="artist-profile-avatar-upload"
              accept="image/*"
              files={avatarFile ? [avatarFile] : []}
              onFilesChange={handleAvatarChange}
              buttonText="上傳圖片"
              emptyText="未選擇任何檔案"
            />
            <div className="flex gap-2">
              <button
                className="rounded bg-sky-600 px-3 py-1 text-white"
                onClick={uploadAvatar}
                disabled={!avatarFile || uploading}
              >
                上傳並更新
              </button>
              <button
                className="rounded border px-3 py-1"
                onClick={() => setAvatarFile(null)}
                disabled={uploading}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">顯示名稱</h2>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded border p-2 text-sm"
          placeholder="輸入你的名稱"
        />
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">自我介紹</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full rounded border p-2 text-sm"
          rows={6}
        />
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">接單狀態</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="status" checked={status === "idle"} onChange={() => setStatus("idle")} />
            <span>🟢 空閒中 / 可接委託</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" checked={status === "busy"} onChange={() => setStatus("busy")} />
            <span>🟡 爆滿中 / 需排單</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" checked={status === "closed"} onChange={() => setStatus("closed")} />
            <span>🔴 暫停接單</span>
          </label>
        </div>
      </section>

      <div className="mb-8">
        <button className="rounded bg-sky-600 px-4 py-2 text-white" onClick={saveBioAndStatus}>
          儲存設定
        </button>
      </div>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">作品集上傳</h2>
        <FileUploadField
          id="artist-profile-portfolio-upload"
          accept="image/*"
          multiple
          files={portfolioFiles}
          onFilesChange={(files) => {
            void handlePortfolioFiles(files);
          }}
          buttonText="上傳圖片"
          emptyText="未選擇任何檔案"
        />
        {uploading ? <div className="text-sm text-slate-500 mt-2">上傳中…</div> : null}
      </section>

      <section>
        <h2 className="font-semibold mb-4">作品集</h2>
        {portfolios.length === 0 ? (
          <div className="text-sm text-slate-500">尚無作品</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {portfolios.map((p) => (
              <div key={p.id} className="border rounded overflow-hidden">
                <div className="h-40 w-full bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={p.title ?? "portfolio"} className="h-full w-full object-cover" />
                </div>
                <div className="p-2 flex items-center justify-between">
                  <div className="text-sm">{p.title}</div>
                  <button className="text-sm text-red-600" onClick={() => handleDeletePortfolio(p)}>
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
