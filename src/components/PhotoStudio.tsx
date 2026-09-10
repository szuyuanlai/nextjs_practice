"use client";

import React, { useEffect, useRef, useState } from "react";
import FileUploadField from "@/src/components/FileUploadField";

type Overlay = {
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export default function PhotoStudio({ initialOverlay }: { initialOverlay?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(initialOverlay ? { src: initialOverlay, x: 100, y: 50, scale: 1, rotation: 0 } : null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (useCamera) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      });
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [useCamera]);

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (useCamera && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      } else if (bgImage) {
        const img = new Image();
        img.src = bgImage;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          if (overlay) drawOverlay(ctx, overlay);
        };
        return;
      }

      if (overlay) drawOverlay(ctx, overlay);
    };

    const drawOverlay = (ctx: CanvasRenderingContext2D, ov: Overlay) => {
      const img = new Image();
      img.src = ov.src;
      img.onload = () => {
        ctx.save();
        ctx.translate(ov.x, ov.y);
        ctx.rotate((ov.rotation * Math.PI) / 180);
        ctx.scale(ov.scale, ov.scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      };
    };

    const id = setInterval(render, 1000 / 30);
    return () => clearInterval(id);
  }, [useCamera, bgImage, overlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 800;
    canvas.height = 600;
  }, []);

  const handleBgUpload = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setBgFile(f);
    const url = URL.createObjectURL(f);
    setBgImage(url);
  };

  const startDrag = (e: React.PointerEvent) => {
    setIsDragging(true);
    if (!overlay) return;
    dragOffset.current = { x: e.clientX - overlay.x, y: e.clientY - overlay.y };
  };

  const endDrag = () => setIsDragging(false);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !overlay) return;
    setOverlay({ ...overlay, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const downloadComposite = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "myphoto.png";
    a.click();
  };

  return (
    <div>
      <div className="mb-3 flex gap-3">
        <button className="px-3 py-2 rounded border" onClick={() => setUseCamera((s) => !s)}>{useCamera ? "關閉鏡頭" : "開啟鏡頭"}</button>
        <div className="min-w-[280px]">
          <FileUploadField
            id="photo-studio-bg-upload"
            accept="image/*"
            files={bgFile ? [bgFile] : []}
            onFilesChange={handleBgUpload}
            buttonText="上傳圖片"
            emptyText="未選擇任何檔案"
          />
        </div>
        <button className="px-3 py-2 rounded border" onClick={() => setOverlay(initialOverlay ? { src: initialOverlay, x: 400, y: 300, scale: 1, rotation: 0 } : null)}>載入角色貼圖</button>
        <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={downloadComposite}>下載合成圖</button>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} className="border" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag} />

        {overlay ? (
          <img
            src={overlay.src}
            alt="overlay-thumb"
            style={{ left: overlay.x - 30, top: overlay.y - 30, transform: `scale(${overlay.scale}) rotate(${overlay.rotation}deg)` }}
            className="absolute w-16 h-16 pointer-events-auto cursor-move"
            onPointerDown={startDrag}
          />
        ) : null}
      </div>
    </div>
  );
}
