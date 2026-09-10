"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, UploadCloud, UserCircle2 } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";
import { uploadFileToBucket } from "@/src/lib/artist-data";
import FileUploadField from "@/src/components/FileUploadField";
import type { ArtistProfile } from "@/src/types/artist";

const STORAGE_FALLBACKS = ["avatars", "artist-assets"] as const;
type StatusOption = "idle" | "busy" | "closed";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<StatusOption>("idle");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      console.log("Checking profile for user:", user.id);

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      console.log("Existing profile result:", existingProfile, "Error:", profileError);

      if (profileError) {
        if (profileError.code !== "PGRST116") {
          console.warn("讀取 profiles 失敗:", profileError.message);
          setLoading(false);
          return;
        }
      }

      if (!existingProfile) {
        const { data: createdProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email ?? null,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
            bio: "",
            avatar_url: user.user_metadata?.avatar_url ?? null,
            status: "idle",
          })
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn("建立 profiles 失敗:", insertError.message);
          setLoading(false);
          return;
        }

        const nextProfile = createdProfile as ArtistProfile | null;
        setProfile(nextProfile);
        setFullName((nextProfile?.full_name ?? "").toString());
        setBio((nextProfile?.bio ?? "").toString());
        setStatus((nextProfile?.status as StatusOption | undefined) ?? "idle");
      } else {
        const nextProfile = existingProfile as ArtistProfile | null;
        setProfile(nextProfile);
        setFullName((nextProfile?.full_name ?? "").toString());
        setBio((nextProfile?.bio ?? "").toString());
        setStatus((nextProfile?.status as StatusOption | undefined) ?? "idle");
      }

      setLoading(false);
    };

    void load();
  }, []);

  const saveProfile = async () => {
    if (!supabase || !profile) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio,
          status,
        })
        .eq("id", profile.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfile({
        ...profile,
        full_name: fullName.trim(),
        bio,
        status,
      });
    } catch (error) {
      console.error("Save profile failed:", error);
      alert("儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!supabase || !profile || !avatarFile) {
      return;
    }

    setAvatarUploading(true);
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
    } catch (error) {
      console.error("Upload avatar failed:", error);
      alert("大頭貼更新失敗，請稍後再試。");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4">
        <div className="flex items-center gap-3 rounded-[24px] border border-sky-100 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入個人資料中...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800">
        <div className="mx-auto max-w-xl rounded-[30px] border border-sky-100 bg-white p-8 text-center shadow-sm">
          <UserCircle2 className="mx-auto mb-4 h-14 w-14 text-sky-500" />
          <h1 className="text-2xl font-black text-slate-900">請先登入</h1>
          <p className="mt-3 text-slate-600">登入後即可編輯個人資料與頭像。</p>
          <Link href="/" className="mt-6 inline-flex rounded-full bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-700">
            回首頁
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <div className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">個人資料</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">編輯我的檔案</h1>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
              {profile.role?.toString().toUpperCase() ?? "CLIENT"}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[24px] border border-sky-100 bg-sky-50/40 p-5">
              <h2 className="mb-4 text-lg font-black text-slate-900">頭像</h2>

              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-white">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={fullName || "avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 className="h-10 w-10 text-sky-500" />
                  )}
                </div>

                <div className="flex-1">
                  <FileUploadField
                    id="profile-avatar-upload"
                    accept="image/*"
                    files={avatarFile ? [avatarFile] : []}
                    onFilesChange={(files) => setAvatarFile(files[0] ?? null)}
                    buttonText="上傳圖片"
                    emptyText="未選擇任何檔案"
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

              <div className="mt-6 rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">帳號資訊</p>
                <p className="mt-2">電子郵件：{userEmail ?? "未提供"}</p>
                <p className="mt-1">角色：{profile.role?.toString().toUpperCase() ?? "CLIENT"}</p>
              </div>
            </section>

            <section className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">顯示名稱</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="輸入你的名稱"
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">自我介紹</label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={6}
                  placeholder="介紹你自己、作品風格與接案資訊"
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
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
                          : "border-sky-100 bg-sky-50/30 text-slate-600 hover:border-sky-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="profile-status"
                        value={option.value}
                        checked={status === option.value}
                        onChange={() => setStatus(option.value as StatusOption)}
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
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "儲存中..." : "儲存設定"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
