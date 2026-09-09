"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Briefcase,
  ImagePlus,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCircle2,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";
import { uploadFileToBucket } from "@/src/lib/artist-data";
import type { ArtistProfile, PortfolioItem } from "@/src/types/artist";

type ProfileRow = {
  id?: string;
  role?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  status?: "idle" | "busy" | "closed" | null;
};

type TabKey = "profile" | "portfolio";

const STORAGE_FALLBACKS = ["avatars", "artist-assets"] as const;
const PORTFOLIO_BUCKETS = ["portfolios", "artist-assets"] as const;

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "closed">("idle");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    const syncUser = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsLoading(false);
        return;
      }

      setUser(data.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      const nextProfile = (profileData as ProfileRow | null) ?? {
        id: data.user.id,
        role: ((data.user.user_metadata?.role as string | undefined) ?? "CLIENT").toUpperCase(),
        full_name: (data.user.user_metadata?.full_name as string | undefined) ?? (data.user.user_metadata?.name as string | undefined) ?? "",
        avatar_url: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
        bio: "",
        status: "idle",
      };

      setProfile(nextProfile);
      setRole(String(nextProfile.role ?? "CLIENT").toUpperCase());
      setFullName(nextProfile.full_name ?? "");
      setBio(nextProfile.bio ?? "");
      setStatus((nextProfile.status as "idle" | "busy" | "closed" | null | undefined) ?? "idle");

      const { data: portfolioRows } = await supabase
        .from("portfolios")
        .select("*")
        .eq("artist_id", data.user.id)
        .order("created_at", { ascending: false });

      setPortfolios((portfolioRows as PortfolioItem[]) ?? []);
      setIsLoading(false);
    };

    void syncUser();
  }, []);

  const avatarUrl = (profile?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined)) ?? undefined;
  const displayName =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "使用者";

  const roleLabel = role === "ARTIST" ? "繪師" : role === "ADMIN" ? "管理者" : "會員";

  const handleSaveProfile = async () => {
    if (!supabase || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio,
          status,
        })
        .eq("id", profile.id ?? user?.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfile((current) => ({ ...(current ?? profile), full_name: fullName.trim(), bio, status }));
    } catch (error) {
      console.error("Save profile failed:", error);
      alert("儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!supabase || !profile || !avatarFile) return;

    setAvatarUploading(true);
    try {
      const path = `${profile.id ?? user?.id}/avatar-${Date.now()}-${avatarFile.name}`;
      const { publicUrl } = await uploadFileToBucket(supabase, STORAGE_FALLBACKS, avatarFile, path);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id ?? user?.id);

      if (error) throw new Error(error.message);

      setProfile((current) => ({ ...(current ?? profile), avatar_url: publicUrl }));
      setAvatarFile(null);
    } catch (error) {
      console.error("Upload avatar failed:", error);
      alert("大頭貼更新失敗，請稍後再試。");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePortfolioUpload = async () => {
    if (!supabase || !profile || !portfolioFiles.length) return;

    setPortfolioUploading(true);
    try {
      const uploaded: PortfolioItem[] = [];

      for (const file of portfolioFiles) {
        const path = `${profile.id ?? user?.id}/portfolio-${Date.now()}-${Math.random().toString(16).slice(2)}-${file.name}`;
        const { publicUrl } = await uploadFileToBucket(supabase, PORTFOLIO_BUCKETS, file, path);

        const { data: inserted, error: insertError } = await supabase
          .from("portfolios")
          .insert({
            artist_id: profile.id ?? user!.id,
            image_url: publicUrl,
            title: file.name.replace(/\.[^/.]+$/, "") || "未命名作品",
            storage_path: path,
            is_internal_work: false,
          })
          .select()
          .maybeSingle();

        if (insertError) {
          console.error("Portfolio insert failed:", insertError.message);
          continue;
        }

        if (inserted) {
          uploaded.push(inserted as PortfolioItem);
        }
      }

      setPortfolios((current) => [...uploaded, ...current]);
      setPortfolioFiles([]);
    } catch (error) {
      console.error("Upload portfolio failed:", error);
      alert("作品上傳失敗，請稍後再試。");
    } finally {
      setPortfolioUploading(false);
    }
  };

  const handleDeletePortfolio = async (item: PortfolioItem) => {
    const client = supabase;
    if (!client || !confirm("確定要刪除此作品？")) return;

    try {
      const { error } = await client.from("portfolios").delete().eq("id", item.id);
      if (error) throw new Error(error.message);

      if (item.storage_path) {
        await client.storage.from("portfolios").remove([item.storage_path]).catch(() => {
          void client.storage.from("artist-assets").remove([item.storage_path!]).catch(() => undefined);
        });
      }

      setPortfolios((current) => current.filter((portfolio) => portfolio.id !== item.id));
    } catch (error) {
      console.error("Delete portfolio failed:", error);
      alert("刪除失敗，請稍後再試。");
    }
  };

  const quickLinks = [
    { label: "查看訂單", href: "/orders" },
    { label: "繪師後台", href: "/artist/dashboard", show: role === "ARTIST" || role === "ADMIN" },
    { label: "管理後台", href: "/admin", show: role === "ADMIN" },
  ].filter((link) => link.show !== false);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
            <ArrowLeft className="h-4 w-4" />
            返回首頁
          </Link>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Platform Console
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
              載入帳號資訊中...
            </div>
          </div>
        ) : !user ? (
          <div className="rounded-[30px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <UserCircle2 className="mx-auto mb-4 h-12 w-12 text-sky-500" />
            <h1 className="text-2xl font-black text-slate-900">尚未登入</h1>
            <p className="mt-3 text-slate-600">請先使用 Google 登入，才可查看帳號與訂單資料。</p>
            <Link href="/" className="mt-6 inline-flex rounded-full bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">
              回首頁登入
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-10 w-10 text-sky-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{roleLabel}</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{displayName}</h1>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    Google 已驗證
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
                    {role === "ARTIST" ? "繪師帳號" : role === "ADMIN" ? "管理者帳號" : "會員帳號"}
                  </span>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">登入方式</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">Google</span>
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">權限角色</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">{roleLabel}</span>
                  <Briefcase className="h-5 w-5 text-sky-600" />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">作品數</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">{portfolios.length}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{role === "ARTIST" || role === "ADMIN" ? "Portfolio" : "Member"}</span>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">帳號狀態</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">Active</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">管理工具</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    Panel
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTab === "profile"
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>更改個人資料</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("portfolio")}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTab === "portfolio"
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span>上傳作品集</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px]">Upload</span>
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <Mail className="h-4 w-4 text-sky-600" />
                    <span>聯絡資訊</span>
                  </div>
                  <p className="mt-3 break-all text-sm text-slate-600">{user.email}</p>
                </div>
              </aside>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Overview</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900">帳號概覽</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  {activeTab === "profile" ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">個人資料編輯</h3>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Live Sync
                        </span>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                          ) : (
                            <UserCircle2 className="h-12 w-12 text-sky-500" />
                          )}
                        </div>

                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                            className="block w-full cursor-pointer text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                          />
                          <button
                            type="button"
                            onClick={handleAvatarUpload}
                            disabled={!avatarFile || avatarUploading}
                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <UploadCloud className="h-4 w-4" />
                            {avatarUploading ? "上傳中..." : "更新頭像"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">顯示名稱</label>
                        <input
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">自我介紹</label>
                        <textarea
                          value={bio}
                          onChange={(event) => setBio(event.target.value)}
                          rows={6}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">接單狀態</label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {[
                            { value: "idle", label: "空閒中" },
                            { value: "busy", label: "忙碌中" },
                            { value: "closed", label: "暫停接單" },
                          ].map((option) => (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                                status === option.value
                                  ? "border-sky-500 bg-sky-50 text-sky-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="status-editor"
                                value={option.value}
                                checked={status === option.value}
                                onChange={() => setStatus(option.value as "idle" | "busy" | "closed")}
                                className="sr-only"
                              />
                              {option.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                          <Save className="h-4 w-4" />
                          {saving ? "儲存中..." : "儲存個人資料"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">作品集上傳</h3>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          {portfolios.length} 件作品
                        </span>
                      </div>

                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                          <ImagePlus className="h-8 w-8 text-sky-600" />
                          <span className="text-sm font-medium">點擊上傳作品圖片</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(event) => setPortfolioFiles(Array.from(event.target.files ?? []))}
                            className="hidden"
                          />
                        </label>

                        {portfolioFiles.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {portfolioFiles.map((file, index) => (
                              <span key={`${file.name}-${index}`} className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                                {file.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={handlePortfolioUpload}
                          disabled={!portfolioFiles.length || portfolioUploading}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          <UploadCloud className="h-4 w-4" />
                          {portfolioUploading ? "上傳中..." : "上傳作品集"}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-base font-black text-slate-900">目前作品集</h4>
                        {portfolios.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                            目前還沒有上傳作品，先新增幾張作品吧。
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {portfolios.map((item) => (
                              <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="h-36 w-full overflow-hidden bg-slate-100">
                                  <img src={item.image_url} alt={item.title ?? "portfolio image"} className="h-full w-full object-cover" />
                                </div>
                                <div className="flex items-center justify-between gap-2 p-3">
                                  <span className="truncate text-sm font-medium text-slate-700">{item.title ?? "作品"}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePortfolio(item)}
                                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                                    aria-label="刪除此作品"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
