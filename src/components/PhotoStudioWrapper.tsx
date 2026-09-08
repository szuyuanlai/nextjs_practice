"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

const PhotoStudio = dynamic(() => import("./PhotoStudio"), { ssr: false });

export default function PhotoStudioWrapper({ initialOverlay }: { initialOverlay?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="px-3 py-2 rounded bg-rose-500 text-white" onClick={() => setOpen(true)}>線上合照</button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white rounded p-4 w-[900px] h-[680px] overflow-auto">
            <div className="flex justify-end mb-2">
              <button className="px-2 py-1 border rounded" onClick={() => setOpen(false)}>關閉</button>
            </div>
            <PhotoStudio initialOverlay={initialOverlay ?? undefined} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
