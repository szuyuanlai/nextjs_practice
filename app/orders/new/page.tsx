"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/src/lib/supabase/client";
import type { OrderAsset } from "@/src/types/order";

type Step = 1 | 2 | 3 | 4;

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

export default function NewOrderPage() {
  const search = useSearchParams();
  const router = useRouter();
  const initialTier = search.get("tier") ?? "";
  const initialArtist = search.get("artist") ?? "";

  const [step, setStep] = useState<Step>(1);
  const [tier, setTier] = useState(initialTier);
  const [artistId, setArtistId] = useState(initialArtist);

  // visual selections
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0].id);
  const [bodyType, setBodyType] = useState(BODY_TYPES[1].id);
  const [personality, setPersonality] = useState(PERSONALITIES[0].id);
  const [hairColor, setHairColor] = useState("#ffcc99");
  const [eyeColor, setEyeColor] = useState("#3366ff");

  // references
  const [refs, setRefs] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);

  // contact and details
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // generate previews
    const urls = refs.map((f) => URL.createObjectURL(f));
    setRefPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [refs]);

  const next = () => setStep((s) => (s < 4 ? ((s + 1) as Step) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const handleRefFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setRefs((prev) => [...prev, ...Array.from(files)]);
  };

  // compress image using canvas
  const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            const newFile = new File([blob], file.name, { type: blob.type });
            resolve(newFile);
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = (e) => reject(e);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase not configured");

      // upload refs using presigned PUT URLs (true progress + retry)
      const uploaded: OrderAsset[] = [];
      const uploadProgresses: number[] = [];

      for (let i = 0; i < refs.length; i++) {
        let f = refs[i];

        // validation
        if (!f.type.startsWith("image/")) {
          alert(`${f.name} 不是圖片，已跳過`);
          continue;
        }

        // compress if large
        try {
          const compressed = await compressImage(f);
          if (compressed.size < f.size) f = compressed;
        } catch (e) {
          console.warn("Compression failed, using original file", e);
        }

        // request presigned upload URL from server
        const presignRes = await fetch('/api/order-assets/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: f.name, contentType: f.type, orderId: null, bucket: 'order-assets' }),
        });
        const presign = await presignRes.json();
        if (!presign || !presign.uploadUrl) {
          console.error('Presign failed', presign);
          alert('無法取得上傳 URL，請稍後重試');
          continue;
        }

        const uploadUrl: string = presign.uploadUrl;
        const storagePath: string = presign.path;

        // upload via XHR to support progress and retry
        const maxRetries = 3;
        let attempt = 0;
        let success = false;
        let lastErr: any = null;

        while (attempt < maxRetries && !success) {
          attempt += 1;
          try {
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('PUT', uploadUrl);
              xhr.setRequestHeader('Content-Type', f.type);
              xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable) {
                  uploadProgresses[i] = Math.round((ev.loaded / ev.total) * 100);
                }
              };
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`Upload failed status ${xhr.status}`));
              };
              xhr.onerror = (e) => reject(e);
              xhr.send(f);
            });
            success = true;
          } catch (err) {
            lastErr = err;
            console.warn('upload attempt failed', attempt, err);
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }

        if (!success) {
          console.error('Failed to upload after retries', lastErr);
          alert(`上傳 ${f.name} 失敗，請稍後重試。`);
          continue;
        }

        // We don't have a public URL for private bucket; store storage_path and a temp preview
        const previewUrl = URL.createObjectURL(f);
        uploaded.push({ image_url: previewUrl, storage_path: storagePath, purpose: 'reference' });
      }

      // prepare order payload
      const payload = {
        client_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        artist_id: artistId || null,
        tier,
        client_name: clientName,
        email,
        description,
        deadline,
        budget,
        status: "draft",
        assets: uploaded,
      } as any;

      const { error } = await supabase.from("orders").insert(payload).select().maybeSingle();
      if (error) {
        console.error("insert order error", error.message);
        alert("無法建立訂單：" + error.message);
        setSubmitting(false);
        return;
      }

      alert("訂單建立成功！");
      router.push("/orders/thank-you");
    } catch (err) {
      console.error(err);
      alert("送出失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">下單 - 視覺化需求單</h1>

      <div className="mb-6">
        <div className="flex gap-3 text-sm text-slate-600">
          <div className={step >= 1 ? "font-semibold" : ""}>1. 選方案與繪師</div>
          <div>→</div>
          <div className={step >= 2 ? "font-semibold" : ""}>2. 視覺設定</div>
          <div>→</div>
          <div className={step >= 3 ? "font-semibold" : ""}>3. 參考圖</div>
          <div>→</div>
          <div className={step >= 4 ? "font-semibold" : ""}>4. 確認送出</div>
        </div>
      </div>

      {step === 1 && (
        <section>
          <label className="block text-sm mb-1">選擇 Tier</label>
          <input className="w-full mb-3 p-2 border rounded" value={tier} onChange={(e) => setTier(e.target.value)} placeholder="例如：Tier 2 - 人設卡" />

          <label className="block text-sm mb-1">偏好繪師 ID（可選）</label>
          <input className="w-full mb-3 p-2 border rounded" value={artistId} onChange={(e) => setArtistId(e.target.value)} />

          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={next}>
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h3 className="font-semibold mb-2">髮型</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {HAIR_STYLES.map((h) => (
              <button key={h.id} onClick={() => setHairStyle(h.id)} className={`p-2 rounded border ${hairStyle === h.id ? "ring-2 ring-pink-400" : ""}`}>
                <img src={h.img} alt={h.label} className="h-24 w-full object-cover rounded" />
                <div className="text-center mt-1 text-sm">{h.label}</div>
              </button>
            ))}
          </div>

          <h3 className="font-semibold mb-2">體型</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {BODY_TYPES.map((b) => (
              <button key={b.id} onClick={() => setBodyType(b.id)} className={`p-2 rounded border ${bodyType === b.id ? "ring-2 ring-indigo-400" : ""}`}>
                <img src={b.img} alt={b.label} className="h-24 w-full object-cover rounded" />
                <div className="text-center mt-1 text-sm">{b.label}</div>
              </button>
            ))}
          </div>

          <h3 className="font-semibold mb-2">個性特質</h3>
          <div className="flex gap-3 mb-4">
            {PERSONALITIES.map((p) => (
              <button key={p.id} onClick={() => setPersonality(p.id)} className={`px-3 py-2 rounded border ${personality === p.id ? "bg-amber-200/30" : ""}`}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">髮色</label>
              <input type="color" value={hairColor} onChange={(e) => setHairColor(e.target.value)} className="w-16 h-10 p-0 border rounded" />
            </div>
            <div>
              <label className="block text-sm mb-1">眼色</label>
              <input type="color" value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} className="w-16 h-10 p-0 border rounded" />
            </div>
          </div>

          <div className="flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={prev}>
              上一步
            </button>
            <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={next}>
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <label className="block text-sm mb-2">上傳參考圖（可多選）</label>
          <input type="file" multiple accept="image/*" onChange={handleRefFiles} className="mb-3" />

          <div className="grid grid-cols-3 gap-3 mb-4">
            {refPreviews.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={p} alt={`ref-${i}`} className="h-28 w-full object-cover rounded border" />
            ))}
          </div>

          <label className="block text-sm mb-1">補充說明</label>
          <textarea className="w-full mb-3 p-2 border rounded" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={prev}>
              上一步
            </button>
            <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={next}>
              下一步
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section>
          <h3 className="text-lg font-semibold mb-2">確認與提交</h3>
          <div className="mb-2">方案：{tier}</div>
          <div className="mb-2">繪師 ID：{artistId || '未指定'}</div>
          <div className="mb-2">髮型：{hairStyle}，髮色：{hairColor}</div>
          <div className="mb-2">體型：{bodyType}，個性：{personality}</div>

          <hr className="my-3" />

          <label className="block text-sm mb-1">聯絡姓名</label>
          <input className="w-full mb-2 p-2 border rounded" value={clientName} onChange={(e) => setClientName(e.target.value)} />

          <label className="block text-sm mb-1">聯絡 Email</label>
          <input className="w-full mb-2 p-2 border rounded" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="block text-sm mb-1">期望交期</label>
          <input className="w-full mb-2 p-2 border rounded" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

          <label className="block text-sm mb-1">預算</label>
          <input className="w-full mb-2 p-2 border rounded" value={budget} onChange={(e) => setBudget(e.target.value)} />

          <div className="mt-4 flex justify-between">
            <button className="px-4 py-2 rounded border" onClick={prev}>
              上一步
            </button>
            <button className="px-4 py-2 rounded bg-gradient-to-r from-pink-500 to-amber-400 text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "送出中…" : "確認送出"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
