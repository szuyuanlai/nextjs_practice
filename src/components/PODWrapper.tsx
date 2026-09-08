"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";

const PODModal = dynamic(() => import("./PODModal"), { ssr: false });

export default function PODWrapper({ orderId }: { orderId?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="ml-2 inline-block rounded bg-rose-500 px-3 py-1 text-white text-sm" onClick={() => setOpen(true)}>
        印製周邊
      </button>
      {open ? <PODModal orderId={orderId} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}
