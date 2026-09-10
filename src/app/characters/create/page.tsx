import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { OrderForm } from "@/src/components/OrderForm";

export default function CreateCharacterPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f1fbff_0%,#edf7ff_18%,#ffffff_100%)] px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-800">
          <ArrowLeft className="h-4 w-4" />
          返回首頁
        </Link>

        <section className="mb-8 rounded-[30px] border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            創建角色
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">創建角色 / 三視圖下單</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            填寫角色設定、外觀需求與參考素材後，即可送出你的專屬創作需求單。
          </p>
        </section>

        <OrderForm />
      </div>
    </main>
  );
}
