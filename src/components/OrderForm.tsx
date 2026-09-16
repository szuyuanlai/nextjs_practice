"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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

export function OrderForm() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/characters/create");
  }, [router]);

  return (
    <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
      <p className="text-sm font-semibold">舊版客製化需求單已停用，正在導向新版角色建立流程。</p>
      <Link href="/characters/create" className="mt-3 inline-flex rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">
        前往新版角色建立流程
      </Link>
    </section>
  );
}
