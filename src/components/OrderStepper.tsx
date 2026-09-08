"use client";

import React from "react";

const STEPS = [
  { key: "draft", label: "草稿" },
  { key: "in_progress", label: "線稿" },
  { key: "completed", label: "完稿" },
  { key: "delivered", label: "交付" },
];

export default function OrderStepper({ status }: { status: string }) {
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <div className="flex items-center gap-4">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-col items-center text-center">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold ${i <= idx ? "bg-gradient-to-br from-pink-500 to-amber-400 shadow-lg" : "bg-slate-200 text-slate-600"}`}>
            {i + 1}
          </div>
          <div className={`text-xs mt-2 ${i <= idx ? "text-slate-800" : "text-slate-400"}`}>{s.label}</div>
          {i !== STEPS.length - 1 ? (
            <div className={`h-1 w-16 mt-2 rounded ${i < idx ? "bg-gradient-to-r from-pink-500 to-amber-400" : "bg-slate-200"}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
