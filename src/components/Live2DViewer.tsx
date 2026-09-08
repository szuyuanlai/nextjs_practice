"use client";

import { useEffect, useRef, useState } from "react";

export default function Live2DViewer({ modelUrl, fallbackImage }: { modelUrl: string; fallbackImage?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadScript = async () => {
      if (!mounted) return;
      setError(null);
      const existing = document.getElementById("live2d-script");
      if (!existing) {
        const s = document.createElement("script");
        s.id = "live2d-script";
        s.src = "https://unpkg.com/live2d-widget@3.1.4/lib/L2Dwidget.min.js";
        s.async = true;
        document.body.appendChild(s);

        s.onload = () => {
          try {
            // @ts-ignore
            if (window.L2Dwidget) {
              // @ts-ignore
              window.L2Dwidget.init({ model: { jsonPath: modelUrl }, display: { position: "right", width: 300, height: 400 } });
            }
          } catch (e: any) {
            console.warn(e);
            setError(e?.message ?? 'Live2D init error');
          }
        };

        s.onerror = (e) => {
          console.warn('Live2D script load failed', e);
          setError('Live2D script load failed');
        };
      } else {
        try {
          // @ts-ignore
          if ((window as any).L2Dwidget) {
            // @ts-ignore
            (window as any).L2Dwidget.init({ model: { jsonPath: modelUrl }, display: { position: "right", width: 300, height: 400 } });
          }
        } catch (e: any) {
          console.warn(e);
          setError(e?.message ?? 'Live2D init error');
        }
      }
    };

    void loadScript();
    return () => {
      mounted = false;
    };
  }, [modelUrl]);

  if (error) {
    return fallbackImage ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fallbackImage} alt="live2d-fallback" className="w-full h-full object-contain" />
    ) : (
      <div className="flex items-center justify-center h-full text-slate-500">Live2D 載入失敗</div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
