"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, Upload } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import FileUploadField from "@/src/components/FileUploadField";

type Step = 1 | 2 | 3 | 4;

type StatusMessage = {
  type: "success" | "error";
  message: string;
};

const HAIR_STYLES = [
  { id: "short", label: "短髮", img: "/samples/hair_short.jpg" },
  { id: "long", label: "長髮", img: "/samples/hair_long.jpg" },
  { id: "ponytail", label: "馬尾", img: "/samples/hair_ponytail.jpg" },
];

const BODY_TYPES = [
  { id: "slim", label: "纖細", img: "/samples/body_slim.jpg" },
  { id: "average", label: "均衡", img: "/samples/body_average.jpg" },
  { id: "curvy", label: "豐滿", img: "/samples/body_curvy.jpg" },
];

const PERSONALITIES = [
  { id: "cute", label: "可愛" },
  { id: "cool", label: "冷豔" },
  { id: "cheerful", label: "活潑" },
];

function NewOrderPageContent() {
  const search = useSearchParams();
  const router = useRouter();
  const initialTier = search.get("tier") ?? "Tier 1 - 三視圖專案";
  const initialArtist = search.get("artist") ?? "";

  const [step, setStep] = useState<Step>(1);
  const [tier, setTier] = useState(initialTier);
  const [artistId, setArtistId] = useState(initialArtist);
  const [projectName, setProjectName] = useState("");
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0].id);
  const [bodyType, setBodyType] = useState(BODY_TYPES[1].id);
  const [personality, setPersonality] = useState(PERSONALITIES[0].id);
  const [hairColor, setHairColor] = useState("#ffcc99");
  const [eyeColor, setEyeColor] = useState("#3366ff");
  const [refs, setRefs] = useState<File[]>([]);
  const refPreviews = useMemo(() => refs.map((file) => URL.createObjectURL(file)), [refs]);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);

  useEffect(() => {
    return () => {
      refPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [refPreviews]);

  const next = () => setStep((current) => (current < 4 ? ((current + 1) as Step) : current));
  const prev = () => setStep((current) => (current > 1 ? ((current - 1) as Step) : current));

  const handleRefFiles = (files: File[]) => {
    if (!files.length) return;
    setRefs(files);
  };

  const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }
            resolve(new File([blob], file.name, { type: blob.type }));
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = URL.createObjectURL(file);
    });

  const handleSubmit = async () => {
    setStatus(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase 尚未設定，請先在 .env.local 添加 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。 ");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("請先登入後再提交需求單。使用 Google 登入即可開始定制。");
      }

      if (!projectName.trim() || !description.trim() || !clientName.trim() || !email.trim()) {
        throw new Error("專案名稱、需求概述、聯絡姓名與 Email 為必填欄位。");
      }

      const uploadedAssets: Array<{ image_url: string | null; storage_path: string | null; purpose: string }> = [];

      for (const file of refs) {
        if (!file.type.startsWith("image/")) {
          continue;
        }

        let uploadFile = file;
        try {
          const compressed = await compressImage(file);
          if (compressed.size < file.size) {
            uploadFile = compressed;
          }
        } catch {
          // fallback to original file
        }

        const res = await fetch("/api/order-assets/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: uploadFile.name,
            contentType: uploadFile.type || "image/jpeg",
            orderId: null,
            bucket: "order-assets",
          }),
        });

        const presign = (await res.json()) as { uploadUrl?: string; path?: string; error?: string };
        if (!presign.uploadUrl || !presign.path) {
          continue;
        }

        const uploadUrl = presign.uploadUrl;
        const storagePath = presign.path;

        const uploadSucceeded = await new Promise<boolean>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", uploadFile.type || "image/jpeg");
          xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
          xhr.onerror = () => resolve(false);
          xhr.send(uploadFile);
        });

        if (uploadSucceeded) {
          uploadedAssets.push({
            image_url: null,
            storage_path: storagePath,
            purpose: "reference",
          });
        }
      }

      const payload = {
        client_id: user.id,
        artist_id: artistId || null,
        tier: tier.trim() || "未指定",
        client_name: clientName.trim(),
        email: email.trim(),
        description: `${projectName.trim()}\n\n${description.trim()}\n\n髮型: ${hairStyle} / 體型: ${bodyType} / 個性: ${personality} / 髮色: ${hairColor} / 眼色: ${eyeColor}`,
        deadline: deadline.trim() || null,
        budget: budget.trim() || null,
        status: "draft",
        assets: uploadedAssets,
      };

      const { error } = await supabase.from("orders").insert([payload]);
      if (error) {
        throw new Error(error.message);
      }

      setStatus({ type: "success", message: "需求單已提交成功，平台已收到您的委託資訊。" });
      setTimeout(() => {
        router.push("/orders/thank-you");
      }, 600);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "送出失敗，請稍後再試。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isStepValid = step === 1 ? Boolean(tier.trim()) : step === 2 ? true : step === 3 ? true : true;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <div className="rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_24px_80px_rgba(14,116,144,0.08)] sm:p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                需求提交
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">開始你的專屬角色訂製</h1>
            </div>
          </div>

          <div className="mb-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
            {["選方案與繪師", "視覺設定", "參考圖與需求", "確認送出"].map((label, index) => (
              <div
                key={label}
                className={`rounded-2xl border px-3 py-2 text-center ${step === index + 1 ? "border-sky-200 bg-sky-50 font-semibold text-sky-700" : "border-slate-200 bg-slate-50"}`}
              >
                {index + 1}. {label}
              </div>
            ))}
          </div>

          {status ? (
            <div
              className={`mb-6 rounded-2xl border p-4 text-sm ${
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {status.type === "success" ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
              {status.message}
            </div>
          ) : null}

          {step === 1 && (
            <section className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>專案名稱</span>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                    placeholder="例如：夜色織夢角色設計"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>選擇方案</span>
                  <input
                    value={tier}
                    onChange={(event) => setTier(event.target.value)}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                    placeholder="如：Tier 2 - 人設卡"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>偏好繪師 ID（可選）</span>
                <input
                  value={artistId}
                  onChange={(event) => setArtistId(event.target.value)}
                  className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 focus:border-sky-400 focus:outline-none"
                  placeholder="如：artist UUID 或可留空"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={next}
                  disabled={!isStepValid}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  下一步 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div>
                <h3 className="mb-3 text-lg font-black text-slate-900">髮型</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {HAIR_STYLES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHairStyle(item.id)}
                      className={`rounded-2xl border p-2 text-left ${hairStyle === item.id ? "border-sky-300 ring-2 ring-sky-200" : "border-slate-200"}`}
                    >
                      <img src={item.img} alt={item.label} className="h-24 w-full rounded-xl object-cover" />
                      <div className="mt-2 text-center text-sm font-semibold text-slate-700">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-black text-slate-900">體型</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {BODY_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBodyType(item.id)}
                      className={`rounded-2xl border p-2 text-left ${bodyType === item.id ? "border-indigo-300 ring-2 ring-indigo-200" : "border-slate-200"}`}
                    >
                      <img src={item.img} alt={item.label} className="h-24 w-full rounded-xl object-cover" />
                      <div className="mt-2 text-center text-sm font-semibold text-slate-700">{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-black text-slate-900">個性特質</h3>
                <div className="flex flex-wrap gap-3">
                  {PERSONALITIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPersonality(item.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${personality === item.id ? "border-amber-300 bg-amber-100 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>髮色</span>
                  <input type="color" value={hairColor} onChange={(event) => setHairColor(event.target.value)} className="h-12 w-20 rounded-md border border-slate-200 bg-white p-1" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>眼色</span>
                  <input type="color" value={eyeColor} onChange={(event) => setEyeColor(event.target.value)} className="h-12 w-20 rounded-md border border-slate-200 bg-white p-1" />
                </label>
              </div>

              <div className="flex justify-between">
                <button type="button" onClick={prev} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                  上一步
                </button>
                <button type="button" onClick={next} className="rounded-full bg-sky-600 px-5 py-3 font-semibold text-white">
                  下一步
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4">
                <div className="flex items-center gap-3 text-sky-700">
                  <Upload className="h-5 w-5" />
                  <span className="font-semibold">參考圖上傳</span>
                </div>
                <FileUploadField
                  id="new-order-reference-upload"
                  accept="image/*"
                  multiple
                  files={refs}
                  onFilesChange={handleRefFiles}
                  buttonText="上傳圖片"
                  emptyText="未選擇任何檔案"
                  className="mt-4"
                />
              </div>

              {refPreviews.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {refPreviews.map((preview, index) => (
                    <img key={`${preview}-${index}`} src={preview} alt={`參考圖 ${index + 1}`} className="h-28 w-full rounded-2xl border border-slate-200 object-cover" />
                  ))}
                </div>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>需求概述</span>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                  placeholder="請描述希望的角色風格、情感氛圍、細節與使用場景。"
                />
              </label>

              <div className="flex justify-between">
                <button type="button" onClick={prev} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                  上一步
                </button>
                <button type="button" onClick={next} className="rounded-full bg-sky-600 px-5 py-3 font-semibold text-white">
                  下一步
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>聯絡姓名</span>
                  <input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 focus:border-sky-400 focus:outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 focus:border-sky-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>期望交期</span>
                  <input
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 focus:border-sky-400 focus:outline-none"
                    placeholder="如：2 週內"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>預算</span>
                  <input
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 focus:border-sky-400 focus:outline-none"
                    placeholder="如：NT$ 6,800"
                  />
                </label>
              </div>

              <div className="rounded-[24px] border border-sky-100 bg-sky-50/40 p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">需求摘要</p>
                <div className="grid gap-2 text-sm text-slate-700">
                  <div>方案：{tier}</div>
                  <div>專案名稱：{projectName || "未命名專案"}</div>
                  <div>繪師：{artistId || "未指定"}</div>
                  <div>風格：{hairStyle} / {bodyType} / {personality}</div>
                </div>
              </div>

              <div className="flex justify-between">
                <button type="button" onClick={prev} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                  上一步
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !clientName.trim() || !email.trim() || !description.trim()}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "送出中…" : "確認送出"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-600">載入預約表單中...</div>}>
      <NewOrderPageContent />
    </Suspense>
  );
}
