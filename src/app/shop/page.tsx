import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

export default function ShopPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <ShoppingBag className="h-3.5 w-3.5" />
            周邊購買
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">角色周邊商店</h1>
          <p className="mt-3 max-w-3xl text-slate-600">這裡將展示角色周邊商品、限定聯名與預購資訊。</p>
        </section>
      </div>
    </main>
  );
}
