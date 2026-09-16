"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import FileUploadField from "@/src/components/FileUploadField";
import type { ArtistProfile, PortfolioItem } from "@/src/types/artist";

const BUCKET = "artist-assets";

type AuthorizedCharacter = {
  id: string;
  name: string;
  artist_id: string | null;
  status: string | null;
  is_public_portfolio: boolean | null;
  image_urls: string[] | null;
  appearance_details: Record<string, unknown> | null;
  created_at: string | null;
};

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getCharacterPortfolioPreview(character: AuthorizedCharacter) {
  const deliveryUrls = parseStringArray(character.appearance_details?.delivery_asset_urls);
  if (deliveryUrls.length > 0) {
    return deliveryUrls[0];
  }

  const imageUrls = parseStringArray(character.image_urls);
  return imageUrls[0] ?? null;
}

export default function ArtistProfilePage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "closed">("idle");
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [authorizedCharacters, setAuthorizedCharacters] = useState<AuthorizedCharacter[]>([]);
  const [selectedAuthorizedIds, setSelectedAuthorizedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isImportingAuthorizedWorks, setIsImportingAuthorizedWorks] = useState(false);
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

      const { data: characterItems } = await supabase
        .from("characters")
        .select("id,name,artist_id,status,is_public_portfolio,image_urls,appearance_details,created_at")
        .eq("artist_id", user.id)
        .eq("status", "completed")
        .eq("is_public_portfolio", true)
        .order("created_at", { ascending: false });

      setAuthorizedCharacters((characterItems as AuthorizedCharacter[]) ?? []);
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

  const fetchAuthorizedCharacters = async (artistId: string) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("characters")
      .select("id,name,artist_id,status,is_public_portfolio,image_urls,appearance_details,created_at")
      .eq("artist_id", artistId)
      .eq("status", "completed")
      .eq("is_public_portfolio", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("讀取授權委託作品失敗:", error.message);
      return;
    }

    setAuthorizedCharacters((data as AuthorizedCharacter[]) ?? []);
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

  const handleToggleAuthorizedCharacter = (characterId: string) => {
    setSelectedAuthorizedIds((current) =>
      current.includes(characterId)
        ? current.filter((id) => id !== characterId)
        : [...current, characterId],
    );
  };

  const handleImportAuthorizedWorks = async () => {
    if (!profile || !supabase || selectedAuthorizedIds.length === 0) {
      return;
    }

    const existingImageUrls = new Set(portfolios.map((item) => item.image_url));
    const selectedCharacters = authorizedCharacters.filter((item) => selectedAuthorizedIds.includes(item.id));

    const rowsToInsert = selectedCharacters
      .map((character) => {
        const previewUrl = getCharacterPortfolioPreview(character);
        if (!previewUrl || existingImageUrls.has(previewUrl)) {
          return null;
        }

        return {
          artist_id: profile.id,
          title: `${character.name}｜平台授權委託作品`,
          image_url: previewUrl,
          storage_path: null,
          is_internal: false,
          is_pinned: false,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (rowsToInsert.length === 0) {
      setSelectedAuthorizedIds([]);
      return;
    }

    setIsImportingAuthorizedWorks(true);

    const { error } = await supabase.from("portfolios").insert(rowsToInsert);

    if (error) {
      console.error("加入授權作品到作品集失敗:", error.message);
      setIsImportingAuthorizedWorks(false);
      return;
    }

    await fetchPortfolios(profile.id);
    await fetchAuthorizedCharacters(profile.id);
    setSelectedAuthorizedIds([]);
    setIsImportingAuthorizedWorks(false);
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

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">平台授權委託作品</h2>
            <p className="mt-1 text-sm text-slate-500">可快速引用已完稿且客戶授權公開的角色作品，加入你的公開作品集。</p>
          </div>
          <button
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            onClick={() => {
              void handleImportAuthorizedWorks();
            }}
            disabled={isImportingAuthorizedWorks || selectedAuthorizedIds.length === 0}
          >
            {isImportingAuthorizedWorks ? "加入中..." : `加入作品集 (${selectedAuthorizedIds.length})`}
          </button>
        </div>

        {authorizedCharacters.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-sm text-slate-500">目前沒有可引用的授權委託作品。</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {authorizedCharacters.map((character) => {
              const previewUrl = getCharacterPortfolioPreview(character);
              const isSelected = selectedAuthorizedIds.includes(character.id);
              const isAlreadyInPortfolio = previewUrl ? portfolios.some((item) => item.image_url === previewUrl) : false;

              return (
                <label key={character.id} className="flex gap-3 rounded-xl border p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isAlreadyInPortfolio}
                    onChange={() => handleToggleAuthorizedCharacter(character.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{character.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {isAlreadyInPortfolio ? "已加入作品集" : "可加入公開作品集"}
                        </div>
                      </div>
                    </div>

                    {previewUrl ? (
                      <div className="mt-3 h-36 overflow-hidden rounded border bg-slate-50">
                        <img src={previewUrl} alt={character.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="mt-3 rounded border border-dashed p-4 text-sm text-slate-500">此角色目前沒有可用的預覽圖。</div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
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
