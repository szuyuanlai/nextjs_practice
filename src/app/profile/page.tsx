"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, UploadCloud, UserCircle2 } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";
import FileUploadField from "@/src/components/FileUploadField";

const STORAGE_BUCKETS = ["avatars", "artist-assets"] as const;

type ProfileRecord = {
  id?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/");
        return;
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("讀取 profiles 失敗:", profileError.message);
        setLoading(false);
        return;
      }

      if (!existingProfile) {
        const { data: createdProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email ?? null,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
            avatar_url: user.user_metadata?.avatar_url ?? null,
            role: "CLIENT",
            bio: "",
            status: "idle",
          })
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn("建立 profiles 失敗:", insertError.message);
          setLoading(false);
          return;
        }

        const nextProfile = createdProfile as ProfileRecord | null;
        setProfile(nextProfile);
        setFullName(nextProfile?.full_name ?? "");
        setBio(nextProfile?.bio ?? "");
      } else {
        const nextProfile = existingProfile as ArtistProfile | null;
        setProfile(nextProfile);
        setFullName(nextProfile?.full_name ?? "");
        setBio(nextProfile?.bio ?? "");
      }
      setLoading(false);
    };

    void loadProfile();
  }, [router]);

  const handleSaveProfile = async () => {
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
        })
        .eq("id", profile.id);

      if (error) {
        throw new Error(error.message);
      }

      setProfile((current) => ({ ...(current ?? profile), full_name: fullName.trim(), bio }));
      alert("儲存成功");
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

    setUploading(true);
    try {
      const path = `${profile.id}/avatar-${Date.now()}-${avatarFile.name}`;

      let publicUrl = "";
      let uploaded = false;

      for (const bucketName of STORAGE_BUCKETS) {
        const { error } = await supabase.storage.from(bucketName).upload(path, avatarFile, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
          publicUrl = data.publicUrl;
          uploaded = true;
          break;
        }
      }

      if (!uploaded || !publicUrl) {
        throw new Error("圖片上傳失敗");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setProfile((current) => ({ ...(current ?? profile), avatar_url: publicUrl }));
      setAvatarFile(null);
    } catch (error) {
      console.error("Upload avatar failed:", error);
      alert("大頭貼更新失敗，請稍後再試。");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          載入個人資料中...
        </div>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </button>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Profile</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">編輯個人資料</h1>
            </div>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              {profile.role?.toString().toUpperCase() ?? "CLIENT"}
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={fullName || "avatar"} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle2 className="h-12 w-12 text-sky-600" />
                )}
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">上傳大頭照</label>
                <FileUploadField
                  id="src-profile-avatar-upload"
                  accept="image/*"
                  files={avatarFile ? [avatarFile] : []}
                  onFilesChange={(files) => setAvatarFile(files[0] ?? null)}
                  buttonText="上傳圖片"
                  emptyText="未選擇任何檔案"
                />
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || uploading}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <UploadCloud className="h-4 w-4" />
                  {uploading ? "上傳中..." : "更新頭像"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">顯示名稱</label>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="輸入你的名稱"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">自我介紹</label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={6}
                  placeholder="寫下你的藝術風格、代表作與接案資訊"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                {(profile.role === "ARTIST" || profile.role === "ADMIN") && (
                  <Link
                    href="/artist/dashboard"
                    className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    🎨 繪師專屬後台
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "儲存中..." : "儲存變更"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
