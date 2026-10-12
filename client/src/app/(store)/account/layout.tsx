"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  MapPin,
  Package,
  Heart,
  LogOut,
  ChevronRight,
} from "lucide-react";

const ACCOUNT_NAV = [
  { label: "My Profile", href: "/account", icon: User },
  { label: "Orders & Timeline", href: "/account/orders", icon: Package },
  { label: "Saved Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-ink/60">
          Loading account…
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold-600 font-semibold">
          Personal Patron Space
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-wide text-ink sm:text-4xl">
          Account & Orders
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Account Sidebar Navigation */}
        <aside className="md:col-span-4 lg:col-span-3">
          <div className="rounded-xl border border-sage-200 bg-white p-5 shadow-xs">
            {/* User identity card */}
            <div className="flex items-center gap-3 border-b border-sage-200 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-400 font-display text-lg font-bold text-ink">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm text-ink truncate">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-ink/60 truncate">{user.email}</p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="mt-4 space-y-1 text-xs">
              {ACCOUNT_NAV.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/account"
                    ? pathname === "/account"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 font-medium transition ${
                      isActive
                        ? "bg-ink text-gold-300 font-semibold"
                        : "text-ink/80 hover:bg-sage-100 hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight
                      className={`h-3 w-3 ${
                        isActive ? "text-gold-300" : "text-ink/30"
                      }`}
                    />
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 font-medium text-sale hover:bg-sage-100 transition cursor-pointer mt-3 border-t border-sage-200 pt-3"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </aside>

        {/* Account Page Content */}
        <main className="md:col-span-8 lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}
