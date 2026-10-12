import { Suspense } from "react";
import { ToastProvider } from "@/components/admin/Toast";
import { FadeImage } from "@/components/store/FadeImage";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

/** Admin sign-in: an editorial split layout (image left, form right; form only on mobile). */
export default function AdminLoginPage() {
  return (
    <ToastProvider>
      <div className="grid min-h-dvh bg-ivory lg:grid-cols-[1.1fr_1fr]">
        <aside aria-hidden className="relative hidden overflow-hidden bg-ink lg:block">
          <FadeImage
            src="/images/banners/banner-saree.jpg"
            alt=""
            loading="eager"
            className="object-[55%_center] opacity-90"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/10" />
          <div className="absolute inset-x-0 top-0 p-10">
            <p className="font-display text-3xl font-semibold tracking-[0.22em] text-ivory">APSÁRE</p>
            <p className="mt-1 text-[10px] tracking-[0.36em] text-gold-300 uppercase">Atelier admin</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
            <div aria-hidden className="mb-5 h-px w-14 bg-gold-400" />
            <p className="max-w-md font-display text-4xl leading-tight text-ivory xl:text-5xl">
              Crafted for her modern aesthetic.
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/70">
              Curate the collection, fulfil every order with care, and keep the atelier running beautifully.
            </p>
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-12 sm:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-10 lg:hidden">
              <p className="font-display text-3xl font-semibold tracking-[0.22em] text-ink">APSÁRE</p>
              <p className="mt-1 text-[10px] tracking-[0.36em] text-gold-700 uppercase">Atelier admin</p>
            </div>
            <h1 className="font-display text-4xl font-semibold text-ink">Welcome back</h1>
            <div aria-hidden className="mt-3 h-px w-12 bg-gold-500" />
            <p className="mt-4 text-sm text-ink/60">Sign in with your admin email or mobile number.</p>
            <Suspense fallback={<div className="mt-8 h-80" />}>
              <LoginForm />
            </Suspense>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
