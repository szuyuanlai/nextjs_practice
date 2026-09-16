"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Sparkles, UploadCloud } from "lucide-react";
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

type AuthLikeUser = {
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
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

function readOAuthCoverUrl(user: AuthLikeUser | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const candidates = [
    metadata.banner_url,
    metadata.cover_url,
    metadata.profile_banner_url,
    metadata.banner,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export default function ArtistProfilePage() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
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
      const provider = String(user.app_metadata?.provider ?? "").toLowerCase();
      const oauthCoverUrl = provider === "x" ? readOAuthCoverUrl(user as AuthLikeUser) : null;
      const existingCoverUrl = profileData?.cover_url?.trim() || null;
      const resolvedCoverUrl = existingCoverUrl || oauthCoverUrl;

      if (resolvedCoverUrl && resolvedCoverUrl !== existingCoverUrl) {
        await supabase.from("profiles").update({ cover_url: resolvedCoverUrl }).eq("id", user.id);
      }

      const mergedProfile = profileData
        ? {
            ...profileData,
            cover_url: resolvedCoverUrl,
          }
        : profileData;

      setProfile(mergedProfile);
      setFullName(mergedProfile?.full_name ?? "");
      setBio(mergedProfile?.bio ?? "");
      setStatus(mergedProfile?.status ?? "idle");

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
      const role = mergedProfile?.role ?? null;
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

  const handleCoverChange = (files: File[]) => {
    setCoverFile(files[0] ?? null);
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

  const uploadCover = async () => {
    if (!coverFile || !supabase || !profile) return;
    setUploading(true);
    const path = `${profile.id}/cover-${Date.now()}-${coverFile.name}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, coverFile, { upsert: true });
    if (upErr) {
      console.error("封面上傳失敗: ", upErr.message);
      setUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicData.publicUrl;

    const { error: upd } = await supabase.from("profiles").update({ cover_url: publicUrl }).eq("id", profile.id);
    if (upd) {
      console.error("更新封面失敗: ", upd.message);
      setUploading(false);
      return;
    }

    setProfile({ ...profile, cover_url: publicUrl });
    setCoverFile(null);
    setUploading(false);
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

  const statusOptions: Array<{
    value: "idle" | "busy" | "closed";
    label: string;
    chipClassName: string;
  }> = [
    {
      value: "idle",
      label: "可接委託",
      chipClassName: "bg-emerald-500 text-white",
    },
    {
      value: "busy",
      label: "需排單",
      chipClassName: "bg-amber-500 text-white",
    },
    {
      value: "closed",
      label: "暫停接單",
      chipClassName: "bg-rose-500 text-white",
    },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入繪師設定中...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="order-2 mb-6 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            Artist Profile Settings
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">繪師設定</h1>
          <p className="mt-2 text-sm text-slate-600">更新你的大頭貼、接單狀態與作品集，維持一致的品牌視覺質感。</p>
        </section>

        <section className="mb-6 grid gap-5 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm lg:grid-cols-[0.95fr_1.05fr] sm:p-8">
          <article className="space-y-8 rounded-2xl border border-sky-100 bg-sky-50/40 p-5">
            <div>
              <h2 className="mb-4 text-lg font-black text-slate-900">封面背景圖</h2>
            <div className="overflow-hidden rounded-2xl border border-sky-100 bg-[linear-gradient(120deg,#dbeafe_0%,#e0f2fe_45%,#f0f9ff_100%)]">
              {profile?.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.cover_url} alt="cover" className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full" />
              )}
            </div>

            <div className="mt-3">
              <FileUploadField
                id="artist-profile-cover-upload"
                accept="image/*"
                files={coverFile ? [coverFile] : []}
                onFilesChange={handleCoverChange}
                buttonText="上傳封面圖片"
                emptyText="未選擇任何檔案"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={uploadCover}
                  disabled={!coverFile || uploading}
                >
                  <UploadCloud className="h-4 w-4" />
                  {uploading ? "上傳中..." : "更新封面"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setCoverFile(null)}
                  disabled={uploading}
                >
                  取消
                </button>
              </div>
            </div>
            </div>

            <hr className="my-6 border-slate-200" />

            <div>
              <h2 className="mb-4 text-lg font-black text-slate-900">大頭貼更新</h2>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-sky-200 bg-white shadow-sm">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">暫無</div>
                )}
              </div>

              <div className="flex-1">
                <FileUploadField
                  id="artist-profile-avatar-upload"
                  accept="image/*"
                  files={avatarFile ? [avatarFile] : []}
                  onFilesChange={handleAvatarChange}
                  buttonText="上傳圖片"
                  emptyText="未選擇任何檔案"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={uploadAvatar}
                    disabled={!avatarFile || uploading}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {uploading ? "上傳中..." : "上傳並更新"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setAvatarFile(null)}
                    disabled={uploading}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
            </div>
          </article>

          <article className="space-y-5 rounded-2xl border border-sky-100 bg-white p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">顯示名稱</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                placeholder="輸入你的名稱"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">自我介紹</label>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                rows={6}
              />
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">接單狀態</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {statusOptions.map((option) => {
                  const selected = status === option.value;

                  return (
                    <label
                      key={option.value}
                      className={[
                        "cursor-pointer rounded-2xl border p-3 transition",
                        selected
                          ? "border-sky-300 bg-sky-50 shadow-sm"
                          : "border-sky-100 bg-white hover:border-sky-200",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="status"
                        checked={selected}
                        onChange={() => setStatus(option.value)}
                        className="sr-only"
                      />
                      <span className={["inline-flex rounded-md px-2.5 py-1 text-xs font-bold", option.chipClassName].join(" ")}>
                        {option.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                onClick={saveBioAndStatus}
              >
                <Save className="h-4 w-4" />
                儲存設定
              </button>
            </div>
          </article>
        </section>

        <section className="order-1 mb-6 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">作品集上傳</h2>
              <p className="mt-1 text-sm text-slate-600">上傳新作品到公開作品集，讓客戶更快理解你的風格。</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4">
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
          </div>

          {uploading ? <p className="mt-3 text-sm font-medium text-slate-600">上傳中...</p> : null}
        </section>

        <section className="mb-6 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">平台授權委託作品</h2>
              <p className="mt-1 text-sm text-slate-600">可快速引用已完稿且客戶授權公開的角色作品，加入你的公開作品集。</p>
            </div>
            <button
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              onClick={() => {
                void handleImportAuthorizedWorks();
              }}
              disabled={isImportingAuthorizedWorks || selectedAuthorizedIds.length === 0}
            >
              {isImportingAuthorizedWorks ? "加入中..." : `加入作品集 (${selectedAuthorizedIds.length})`}
            </button>
          </div>

          {authorizedCharacters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">目前沒有可引用的授權委託作品。</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {authorizedCharacters.map((character) => {
                const previewUrl = getCharacterPortfolioPreview(character);
                const isSelected = selectedAuthorizedIds.includes(character.id);
                const isAlreadyInPortfolio = previewUrl ? portfolios.some((item) => item.image_url === previewUrl) : false;

                return (
                  <label
                    key={character.id}
                    className="flex cursor-pointer gap-3 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isAlreadyInPortfolio}
                      onChange={() => handleToggleAuthorizedCharacter(character.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-900">{character.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{isAlreadyInPortfolio ? "已加入作品集" : "可加入公開作品集"}</div>

                      {previewUrl ? (
                        <div className="mt-3 h-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <img src={previewUrl} alt={character.name} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">此角色目前沒有可用的預覽圖。</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className="order-3 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 text-xl font-black text-slate-900">作品集</h2>
          {portfolios.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">尚無作品</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {portfolios.map((portfolioItem) => (
                <div key={portfolioItem.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="h-40 w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={portfolioItem.image_url} alt={portfolioItem.title ?? "portfolio"} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="truncate text-sm font-medium text-slate-700">{portfolioItem.title}</div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                      onClick={() => handleDeletePortfolio(portfolioItem)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
