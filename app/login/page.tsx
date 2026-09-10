"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/src/lib/supabase/client";

type OAuthProvider = "google" | "x";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const rawRedirectTo = searchParams.get("redirectTo") ?? "/";
  const safeRedirectTo = rawRedirectTo.startsWith("/") ? rawRedirectTo : "/";

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("Supabase 尚未設定，請先填入 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      return;
    }

    setErrorMessage(null);
    setLoadingProvider(provider);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirectTo)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error("OAuth login failed:", error.message);
      setErrorMessage(error.message);
      setLoadingProvider(null);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(160deg,#f0f9ff_0%,#e0f2fe_55%,#f8fafc_100%)] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.16),transparent_42%),radial-gradient(circle_at_84%_80%,rgba(56,189,248,0.14),transparent_45%)]" />

      <section className="relative w-full max-w-md rounded-2xl border border-sky-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">登入您的帳戶</h1>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleOAuthLogin("google")}
            disabled={loadingProvider !== null}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingProvider === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4A9.6 9.6 0 0 0 2.4 12 9.6 9.6 0 0 0 12 21.6c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.5H12z"/>
              <path fill="#34A853" d="M2.4 7.7l3.2 2.3C6.5 7.6 9 5.9 12 5.9c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4c-3.7 0-6.9 2.1-8.6 5.3z"/>
              <path fill="#4A90E2" d="M12 21.6c2.5 0 4.7-.8 6.3-2.3l-3-2.4c-.8.6-1.9 1-3.3 1-3.8 0-5.2-2.6-5.4-3.8l-3.1 2.4c1.7 3.3 5 5.1 8.5 5.1z"/>
              <path fill="#FBBC05" d="M2.4 16.3l3.1-2.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L2.4 7.7C1.7 9 1.3 10.5 1.3 12s.4 3 1.1 4.3z"/>
            </svg>
            使用 Google 登入
          </button>

          <button
            type="button"
            onClick={() => void handleOAuthLogin("x")}
            disabled={loadingProvider !== null}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingProvider === "x" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.9 2h3.7l-8.1 9.3L24 22h-7.5l-5.9-7.1L4.5 22H.8l8.7-10L0 2h7.7l5.3 6.4L18.9 2zM17.6 19.8h2.1L6.5 4.1H4.3l13.3 15.7z"/>
            </svg>
            使用 X 登入
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorMessage}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-700">
            <ArrowLeft className="h-4 w-4" />
            返回首頁
          </Link>
        </div>
      </section>
    </main>
  );
}
