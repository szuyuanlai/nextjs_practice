"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit3,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCircle2,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";
import { uploadFileToBucket } from "@/src/lib/artist-data";
import type { ArtistProfile, PortfolioItem } from "@/src/types/artist";

type StatusOption = "idle" | "busy" | "closed";

const STORAGE_FALLBACKS = ["avatars", "artist-assets"] as const;
const PORTFOLIO_BUCKETS = ["portfolios", "artist-assets"] as const;

const normalizeRole = (value: unknown) => {
  if (typeof value !== "string") return null;
  return value.trim().toUpperCase();
};

export default function ArtistDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<StatusOption>("idle");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [isInternalWork, setIsInternalWork] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        console.log("[ArtistDashboard] no supabase client");
        router.push("/");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("[ArtistDashboard] no authenticated user");
        router.push("/");
        return;
      }

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const profileData = prof as ArtistProfile | null;
      const rawRole = profileData?.role ?? user.user_metadata?.role ?? null;
      const role = normalizeRole(rawRole);

      console.log("[ArtistDashboard] access check", {
        userId: user.id,
        rawRole,
        normalizedRole: role,
        profileError: profileError ? profileError.message : null,
      });

      if (profileError) {
        console.log("[ArtistDashboard] profile fetch failed", profileError);
        alert("載入使用者資料失敗，請稍後再試。");
        router.push("/");
        return;
      }

      if (!role || !["ARTIST", "ADMIN"].includes(role)) {
        console.log("[ArtistDashboard] access denied", {
          userId: user.id,
          rawRole,
          normalizedRole: role,
        });
        alert("您沒有權限訪問繪師後台");
        router.push("/");
        return;
      }

      setProfile(profileData);
      setFullName(profileData?.full_name ?? user.user_metadata?.full_name ?? "");
      setBio(profileData?.bio ?? "");
      setStatus((profileData?.status as StatusOption | undefined) ?? "idle");

      const { data: items } = await supabase
        .from("portfolios")
        .select("*")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      setPortfolios((items as PortfolioItem[]) ?? []);
      setLoading(false);
    };

    void load();
  }, [router]);

  const handleAvatarUpload = async () => {
    if (!avatarFile || !profile || !supabase) {
      return;
    }

    setSaving(true);
    try {
      const path = `${profile.id}/avatar-${Date.now()}-${avatarFile.name}`;
      const { publicUrl } = await uploadFileToBucket(supabase, STORAGE_FALLBACKS, avatarFile, path);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfile((current) => ({ ...(current ?? profile), avatar_url: publicUrl }));
      setAvatarFile(null);
      window.dispatchEvent(new CustomEvent("artist-profile-updated"));
    } catch (error) {
      console.error("Upload avatar failed:", error);
      alert("大頭貼更新失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !supabase) {
      return;
    }

    const nextDisplayName = fullName.trim();

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: nextDisplayName || null,
          bio,
          status,
        })
        .eq("id", profile.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfile({
        ...profile,
        full_name: nextDisplayName || null,
        display_name: nextDisplayName || null,
        bio,
        status,
      });

      window.dispatchEvent(new CustomEvent("artist-profile-updated"));
      alert("儲存成功！個人資料已同步更新。");
      router.refresh();
    } catch (error) {
      console.error("Save profile failed:", error);
      alert("儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
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

  const handlePortfolioUpload = async () => {
    if (!portfolioFiles.length || !profile || !supabase) {
      return;
    }

    setSaving(true);
    try {
      const uploaded: PortfolioItem[] = [];

      for (const file of portfolioFiles) {
        const path = `${profile.id}/portfolio-${Date.now()}-${Math.random().toString(16).slice(2)}-${file.name}`;
        const { publicUrl } = await uploadFileToBucket(supabase, PORTFOLIO_BUCKETS, file, path);

        const { data: inserted, error: dbError } = await supabase
          .from("portfolios")
          .insert([
            {
              artist_id: profile.id,
              image_url: publicUrl,
              title: file.name.replace(/\.[^/.]+$/, "") || "未命名作品",
              storage_path: path,
              is_internal: isInternalWork,
              is_internal_work: isInternalWork,
            },
          ])
          .select()
          .maybeSingle();

        if (dbError) {
          console.error("Database insert failed:", dbError);
          continue;
        }

        if (inserted) {
          uploaded.push(inserted as PortfolioItem);
        }
      }

      if (uploaded.length > 0 || portfolioFiles.length > 0) {
        await fetchPortfolios(profile.id);
        setToast({ message: "作品上傳成功！已同步至作品集。", kind: "success" });
      }

      setPortfolioFiles([]);
      setIsInternalWork(false);
    } catch (error) {
      console.error("Upload portfolio failed:", error);
      alert("作品上傳失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  };

  const refreshPortfolioList = async () => {
    if (!profile || !supabase) {
      return;
    }

    const { data: items } = await supabase
      .from("portfolios")
      .select("*")
      .eq("artist_id", profile.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    setPortfolios((items as PortfolioItem[]) ?? []);
  };

  const handleTogglePin = async (item: PortfolioItem) => {
    if (!supabase || !profile) {
      return;
    }

    const pinnedCount = portfolios.filter((portfolio) => portfolio.is_pinned).length;
    if (!item.is_pinned && pinnedCount >= 3) {
      alert("最多只能置頂 3 張作品，請先取消其他置頂");
      setMenuOpenId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("portfolios")
        .update({ is_pinned: !item.is_pinned })
        .eq("id", item.id);

      if (error) {
        throw new Error(error.message);
      }

      await refreshPortfolioList();
      setMenuOpenId(null);
      setToast({ message: item.is_pinned ? "已取消置頂。" : "作品已置頂。", kind: "success" });
    } catch (error) {
      console.error("Toggle pin failed:", error);
      alert("更新置頂狀態失敗，請稍後再試。");
    }
  };

  const handleEditPortfolioTitle = async (item: PortfolioItem) => {
    if (!supabase) {
      return;
    }

    const nextTitle = window.prompt("請輸入作品名稱", item.title ?? "");
    if (nextTitle === null) {
      setMenuOpenId(null);
      return;
    }

    const trimmedTitle = nextTitle.trim();

    try {
      const { error } = await supabase
        .from("portfolios")
        .update({ title: trimmedTitle || "未命名作品" })
        .eq("id", item.id);

      if (error) {
        throw new Error(error.message);
      }

      await refreshPortfolioList();
      setMenuOpenId(null);
      setToast({ message: "作品名稱已更新。", kind: "success" });
    } catch (error) {
      console.error("Edit portfolio title failed:", error);
      alert("修改作品名稱失敗，請稍後再試。");
    }
  };

  const handleDeletePortfolio = async (item: PortfolioItem) => {
    const client = supabase;
    if (!client || !confirm("確定要刪除此作品？")) {
      return;
    }

    try {
      const { error } = await client.from("portfolios").delete().eq("id", item.id);
      if (error) {
        throw new Error(error.message);
      }

      if (item.storage_path) {
        await client.storage.from("portfolios").remove([item.storage_path]).catch(() => {
          void client.storage.from("artist-assets").remove([item.storage_path!]).catch(() => undefined);
        });
      }

      await refreshPortfolioList();
      setMenuOpenId(null);
      setToast({ message: "作品已刪除。", kind: "success" });
    } catch (error) {
      console.error("Delete portfolio failed:", error);
      alert("刪除失敗，請稍後再試。");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入畫師後台中...
        </div>
      </main>
    );
  }

  const avatarPreview = profile?.avatar_url ?? undefined;
  const sortedPortfolios = [...portfolios].sort((a, b) => {
    const pinnedDiff = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
    if (pinnedDiff !== 0) return pinnedDiff;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {toast ? (
          <div className="pointer-events-none fixed right-5 top-5 z-50">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm ${
                toast.kind === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {toast.message}
            </div>
          </div>
        ) : null}

        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <div className="mb-8 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                繪師後台
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">個人檔案與作品管理</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              {profile?.role === "admin" ? "管理者權限" : "繪師權限"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black text-slate-900">個人頭像</h2>

            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-sky-50">
                {avatarPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarPreview} alt="personal avatar" className="h-full w-full object-cover" />
                  </>
                ) : (
                  <UserCircle2 className="h-10 w-10 text-sky-600" />
                )}
              </div>

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || saving}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <UploadCloud className="h-4 w-4" />
                  更新頭像
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black text-slate-900">公開資訊</h2>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">顯示名稱</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-2xl border border-sky-200 bg-sky-50/40 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400"
                  placeholder="例如：Aiko、雲朵設計工作室"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">自我介紹</label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-sky-200 bg-sky-50/40 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400"
                  placeholder="簡單介紹你的創作風格、合作範圍與代表作品。"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">接單狀態</label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { value: "idle", label: "🟢 可接委託" },
                    { value: "busy", label: "🟡 爆滿中" },
                    { value: "closed", label: "🔴 暫停接單" },
                  ].map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 px-3 py-2 text-sm font-medium">
                      <input
                        type="radio"
                        name="status"
                        checked={status === option.value}
                        onChange={() => setStatus(option.value as StatusOption)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Save className="h-4 w-4" />
                {saving ? "儲存中..." : "儲存設定"}
              </button>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-900">作品集管理</h2>
            <div className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <ImagePlus className="h-3.5 w-3.5" />
              {portfolios.length} 件作品
            </div>
          </div>

          <div className="mb-6 rounded-[24px] border border-dashed border-sky-200 bg-sky-50/50 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-semibold text-slate-700">上傳新作品</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => setPortfolioFiles(Array.from(event.target.files ?? []))}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
              </div>

              <label className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isInternalWork}
                  onChange={(event) => setIsInternalWork(event.target.checked)}
                />
                內部樣稿 / 非對外展示
              </label>

              <button
                type="button"
                onClick={handlePortfolioUpload}
                disabled={!portfolioFiles.length || saving}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <UploadCloud className="h-4 w-4" />
                上傳作品
              </button>
            </div>
          </div>

          {sortedPortfolios.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-sky-200 bg-sky-50 p-8 text-center text-slate-600">
              目前尚未上傳作品，先新增幾張代表作吧。
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedPortfolios.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-[26px] border border-sky-100 bg-white shadow-[0_18px_50px_rgba(14,116,144,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_65px_rgba(14,116,144,0.12)]"
                >
                  <div className="relative h-64 overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.title ?? "portfolio image"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/15 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

                    {item.is_pinned ? (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-950 shadow-sm">
                        <Pin className="h-3 w-3" />
                        置頂
                      </span>
                    ) : null}

                    {item.is_internal ?? item.is_internal_work ? (
                      <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                        Internal
                      </span>
                    ) : null}

                    <div className="absolute right-3 top-3 flex items-center justify-end">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((current) => (current === item.id ? null : item.id))}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
                          aria-label="作品選單"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpenId === item.id ? (
                          <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
                            <button
                              type="button"
                              onClick={() => handleEditPortfolioTitle(item)}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50"
                            >
                              <Edit3 className="h-4 w-4" />
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePin(item)}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-sky-50"
                            >
                              {item.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                              {item.is_pinned ? "取消置頂" : "置頂"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePortfolio(item)}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              刪除作品
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                      <div className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                        {item.is_internal ?? item.is_internal_work ? "內部樣稿" : "公開作品"}
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(item.image_url, "_blank", "noopener,noreferrer")}
                        className="rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition hover:bg-white/25"
                      >
                        Preivew
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-900">{item.title ?? "未命名作品"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.is_internal ?? item.is_internal_work ? "內部樣稿" : "公開作品"}
                        </p>
                      </div>
                    </div>
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
