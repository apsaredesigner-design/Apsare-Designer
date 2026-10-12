"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { NAV_LINKS, BRAND } from "@/lib/constants";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CartDrawer } from "@/components/store/CartDrawer";
import { luxuryEase } from "@/lib/motion";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { itemCount, openCartDrawer } = useCart();
  const { total: wishlistTotal } = useWishlist();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsMobileSearchOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push("/");
  };

  return (
    <>
      {/* Luxury gold scroll progress indicator */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-gold-400 via-gold-500 to-gold-300 origin-left z-50 pointer-events-none"
      />

      <header className="sticky top-0 z-40 border-b border-sage-200/80 bg-ivory/95 backdrop-blur-md">
        {/* Top Announcement Bar */}
        <div className="bg-sage-400 py-1.5 px-4 text-center text-[11px] uppercase tracking-[0.25em] text-ink font-medium">
          Free shipping on orders above ₹1,999 • Handcrafted with love
        </div>

        {/* Main Navbar */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="p-1.5 text-ink hover:text-gold-600 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              aria-label="Toggle search"
              className="p-1.5 text-ink hover:text-gold-600 cursor-pointer"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center justify-center py-1 transition-transform duration-300 hover:scale-[1.02]"
            aria-label={`${BRAND.name} — Home`}
          >
            <BrandLogo variant="dark" size="md" priority />
            <span className="sr-only">{BRAND.name}</span>
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden flex-1 max-w-md mx-8 md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sarees, silks, motifs, colors…"
                className="w-full rounded-full border border-sage-300 bg-white/80 py-2 pl-4 pr-10 text-xs text-ink placeholder:text-ink/40 outline-none transition focus:border-gold-500 focus:bg-white focus:ring-1 focus:ring-gold-500/20"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Actions: Account, Wishlist, Bag */}
          <div className="flex items-center gap-3 sm:gap-4 text-ink">
            {/* Account / Login dropdown */}
            <div className="relative">
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 text-xs hover:text-gold-600 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                      {user.fullName.split(" ")[0]}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: luxuryEase }}
                        className="absolute right-0 mt-2 w-48 rounded-lg border border-sage-200 bg-ivory p-1.5 shadow-xl z-50 text-xs"
                        onMouseLeave={() => setIsUserMenuOpen(false)}
                      >
                        <div className="px-3 py-2 border-b border-sage-200">
                          <p className="font-semibold text-ink truncate">{user.fullName}</p>
                          <p className="text-[11px] text-ink/60 truncate">{user.email}</p>
                        </div>
                        <Link
                          href="/account"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block rounded px-3 py-2 text-ink hover:bg-sage-100"
                        >
                          My Account
                        </Link>
                        <Link
                          href="/account/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block rounded px-3 py-2 text-ink hover:bg-sage-100"
                        >
                          Orders & History
                        </Link>
                        <Link
                          href="/account/addresses"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block rounded px-3 py-2 text-ink hover:bg-sage-100"
                        >
                          Saved Addresses
                        </Link>
                        {user.role === "ADMIN" && (
                          <Link
                            href="/admin/dashboard"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="block rounded px-3 py-2 font-medium text-gold-600 hover:bg-sage-100"
                          >
                            Admin Panel
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sale hover:bg-sage-100 text-left cursor-pointer border-t border-sage-200 mt-1"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 p-1.5 text-xs font-medium uppercase tracking-wider hover:text-gold-600"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}
            </div>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative p-1.5 hover:text-gold-600 transition"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              <AnimatePresence>
                {wishlistTotal > 0 && (
                  <motion.span
                    key={`w-${wishlistTotal}`}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-ink shadow-xs"
                  >
                    {wishlistTotal > 9 ? "9+" : wishlistTotal}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Cart / Bag Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative p-1.5 hover:text-gold-600 transition cursor-pointer"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="h-5 w-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={`c-${itemCount}`}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-gold-300 shadow-xs"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: luxuryEase }}
              className="overflow-hidden border-t border-sage-200 bg-ivory px-4 py-3 md:hidden"
            >
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sarees, silks, motifs…"
                  autoFocus
                  className="w-full rounded-full border border-sage-300 bg-white py-2 pl-4 pr-10 text-xs text-ink placeholder:text-ink/40 outline-none"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Category Navigation */}
        <nav className="mx-auto hidden md:flex max-w-7xl justify-center gap-8 px-4 pb-3 pt-1 text-xs uppercase tracking-[0.18em] font-medium whitespace-nowrap">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:transition-all ${
                  isActive
                    ? "text-gold-600 font-semibold after:w-full after:bg-gold-500"
                    : "text-ink/80 hover:text-gold-600 after:w-0 after:bg-gold-500 hover:after:w-full"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-ink/60 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.35, ease: luxuryEase }}
              className="relative flex w-4/5 max-w-xs flex-col bg-ivory p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-sage-200 pb-4">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={`${BRAND.name} — Home`}
                >
                  <BrandLogo variant="dark" size="sm" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-ink/60 hover:text-ink cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 flex flex-col gap-4 text-xs uppercase tracking-[0.2em] font-medium">
                {NAV_LINKS.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`py-1.5 transition-colors ${
                        isActive
                          ? "text-gold-600 font-semibold"
                          : "text-ink/80 hover:text-gold-600"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto border-t border-sage-200 pt-6 text-xs text-ink/80">
                {user ? (
                  <div className="space-y-3">
                    <p className="font-medium text-ink">{user.fullName}</p>
                    <Link
                      href="/account"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-ink/70 hover:text-gold-600"
                    >
                      My Profile & Orders
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-sale font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-center rounded-full bg-ink py-2 text-xs uppercase tracking-widest text-gold-300"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-center rounded-full border border-sage-300 py-2 text-xs uppercase tracking-widest text-ink"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Drawer instance */}
      <CartDrawer />
    </>
  );
}
