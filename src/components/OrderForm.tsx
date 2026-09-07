"use client";

import { useState } from "react";
import { CheckCircle2, FileImage, Loader2, Sparkles, Upload, X } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

export type BodySize = "XL" | "L" | "M" | "S" | "XS";

export interface OrderFormValues {
  characterName: string;
  bodySize: BodySize;
  personality: string;
  appearanceDescription: string;
  hairColor: string;
  eyeColor: string;
  notes: string;
}

const initialForm: OrderFormValues = {
  characterName: "",
  bodySize: "M",
  personality: "",
  appearanceDescription: "",
  hairColor: "#7dd3fc",
  eyeColor: "#1d4ed8",
  notes: "",
};

export function OrderForm() {
  const [form, setForm] = useState<OrderFormValues>(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleFieldChange = <K extends keyof OrderFormValues>(field: K, value: OrderFormValues[K]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!supabase) {
      setStatus({
        type: "error",
        message: "Supabase 尚未設定，請先在 .env.local 中加入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
      });
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setStatus({
        type: "error",
        message: "請先登入後再提交客製化需求單，使用 Google 帳號即可開始定制。",
      });
      return;
    }

    const requiredFields = [
      form.characterName.trim(),
      form.personality.trim(),
      form.appearanceDescription.trim(),
    ];

    if (requiredFields.some((value) => value.length === 0)) {
      setStatus({
        type: "error",
        message: "角色名稱、個性與外觀描述為必填欄位。",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrl: string | null = null;

      if (selectedFile) {
        const safeFileName = encodeURIComponent(
          `${Date.now()}-${selectedFile.name.replace(/\s+/g, "-")}`,
        );
        const filePath = `order-uploads/${userData.user.id}/${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("order-uploads")
          .upload(filePath, selectedFile, {
            upsert: true,
            contentType: selectedFile.type || "application/octet-stream",
          });

        if (uploadError) {
          throw new Error(
            `檔案上傳失敗：${uploadError.message}。請先在 Supabase 建立 storage bucket「order-uploads」。`,
          );
        }

        const { data: publicUrlData } = supabase.storage.from("order-uploads").getPublicUrl(filePath);
        attachmentUrl = publicUrlData.publicUrl || null;
      }

      const { error } = await supabase.from("orders").insert([
        {
          user_id: userData.user.id,
          character_name: form.characterName.trim(),
          body_size: form.bodySize,
          personality: form.personality.trim(),
          appearance_description: form.appearanceDescription.trim(),
          hair_color: form.hairColor,
          eye_color: form.eyeColor,
          notes: form.notes.trim() || null,
          attachment_url: attachmentUrl,
          attachment_name: selectedFile?.name ?? null,
          status: "pending",
        },
      ]);

      if (error) {
        throw error;
      }

      setStatus({
        type: "success",
        message: "提交成功！我們已收到您的需求單。",
      });
      setShowSuccessModal(true);
      setForm(initialForm);
      setSelectedFile(null);
    } catch (error) {
      console.error("Order submit error:", error);
      const message = error instanceof Error ? error.message : "訂單提交失敗，請稍後再試。";
      setStatus({
        type: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const bodySizeOptions: BodySize[] = ["XL", "L", "M", "S", "XS"];

  return (
    <>
      {showSuccessModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-emerald-200 bg-white p-6 shadow-2xl shadow-emerald-100">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                aria-label="關閉成功提示"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-2xl font-black text-slate-900">提交成功</h3>
            <p className="mt-3 text-slate-600">提交成功！我們已收到您的需求單。</p>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600"
            >
              確認
            </button>
          </div>
        </div>
      ) : null}

      <section className="rounded-[32px] border border-sky-100 bg-white p-6 shadow-[0_20px_60px_rgba(14,116,144,0.08)] sm:p-8 lg:p-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
              <Sparkles className="h-3.5 w-3.5" />
              需求提交
            </p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">開始你的專屬角色訂製</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>角色名稱</span>
              <input
                value={form.characterName}
                onChange={(event) => handleFieldChange("characterName", event.target.value)}
                placeholder="例如：夜色織夢"
                className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>體型大小</span>
              <select
                value={form.bodySize}
                onChange={(event) => handleFieldChange("bodySize", event.target.value as BodySize)}
                className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 focus:border-sky-400 focus:outline-none"
              >
                {bodySizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>個性</span>
            <input
              value={form.personality}
              onChange={(event) => handleFieldChange("personality", event.target.value)}
              placeholder="例：溫柔、活潑、傲嬌、偏向保護型"
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>外觀描述</span>
            <textarea
              value={form.appearanceDescription}
              onChange={(event) => handleFieldChange("appearanceDescription", event.target.value)}
              placeholder="詳細描述服裝風格、配件、身體線條、造型細節以及喜愛的視覺設計方向"
              rows={5}
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>參考圖片（選填）</span>
            <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 p-4">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-200"
              />

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                {selectedFile ? (
                  <>
                    <FileImage className="h-4 w-4 text-sky-700" />
                    <span>{selectedFile.name}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-slate-400" />
                    <span>支援 JPG / PNG / WebP，最多可上傳一張參考圖</span>
                  </>
                )}
              </div>
            </div>
          </label>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>頭髮顏色</span>
              <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2">
                <input
                  type="color"
                  value={form.hairColor}
                  onChange={(event) => handleFieldChange("hairColor", event.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-sky-200 bg-transparent p-0"
                />
                <span className="font-mono text-slate-600">{form.hairColor}</span>
              </div>
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              <span>眼睛顏色</span>
              <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2">
                <input
                  type="color"
                  value={form.eyeColor}
                  onChange={(event) => handleFieldChange("eyeColor", event.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-sky-200 bg-transparent p-0"
                />
                <span className="font-mono text-slate-600">{form.eyeColor}</span>
              </div>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            <span>其他備註（選填）</span>
            <textarea
              value={form.notes}
              onChange={(event) => handleFieldChange("notes", event.target.value)}
              rows={3}
              placeholder="例如：希望有微笑表情、可愛可愛的日常服裝風格，偏向黑髮、粉色小裙子..."
              className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
            />
          </label>

          {status ? (
            <div
              className={[
                "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm",
                status.type === "success"
                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-700"
                  : "border-red-500/40 bg-red-50 text-red-700",
              ].join(" ")}
            >
              {status.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : null}
              <span>{status.message}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                提交客製化需求單
              </>
            )}
          </button>
        </form>
      </section>
    </>
  );
}
