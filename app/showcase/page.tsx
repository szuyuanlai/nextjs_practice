"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

const Live2DViewer = dynamic(() => import("@/src/components/Live2DViewer"), { ssr: false });

export default function ShowcasePage() {
  // sample showcase images stored under public/showcase/
  const threeViews = ["/showcase/front.png", "/showcase/side.png", "/showcase/back.png"];
  const cg = "/showcase/cg.png";
  const unbox = ["/showcase/unbox1.jpg", "/showcase/unbox2.jpg"];

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">品牌看板娘展示</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">三視圖</h2>
        <div className="flex gap-4">
          {threeViews.map((src) => (
            <div key={src} className="w-1/3 rounded overflow-hidden border">
              <img src={src} alt="three-view" className="w-full h-auto object-contain" />
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Live2D 示範</h2>
        <div className="h-80 border rounded overflow-hidden">
          <Live2DViewer modelUrl="/showcase/live2d/model.json" />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">CG 插圖</h2>
        <div className="border rounded overflow-hidden">
          <img src={cg} alt="cg" className="w-full h-auto object-contain" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">周邊開箱</h2>
        <div className="grid grid-cols-2 gap-4">
          {unbox.map((u) => (
            <img key={u} src={u} alt="unbox" className="w-full h-48 object-cover rounded border" />
          ))}
        </div>
      </section>
    </main>
  );
}
