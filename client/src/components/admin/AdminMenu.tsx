"use client";
/**
 * AdminMenu: the signed-in admin's menu in the top bar (View store, Log out).
 * WAI-ARIA menu button: Enter/Space/↓ opens and focuses the first item, ↑/↓/Home/End
 * move, Esc closes and returns focus, clicking outside closes.
 */
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useAdminSession } from "./AdminSession";
import { ChevronDownIcon, ExternalIcon, LogoutIcon } from "./icons";
import { cx, focusRing } from "./styles";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function AdminMenu() {
  const { user, logout } = useAdminSession();
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      list[(n + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") setOpen(false);
  };

  const itemClass = cx("flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-ink/80 hover:bg-ink/5 hover:text-ink", focusRing);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cx("flex min-h-11 items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-ink/5", focusRing)}
      >
        <span aria-hidden className="grid size-9 place-items-center rounded-full bg-ink text-xs font-semibold tracking-wider text-gold-300">
          {initials(user.fullName) || "A"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-semibold text-ink">{user.fullName}</span>
          <span className="block text-xs leading-tight text-ink/55">Administrator</span>
        </span>
        <ChevronDownIcon className={cx("size-4 text-ink/50 transition-transform", open && "rotate-180")} />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-ink/10 bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(27,27,24,0.35)] motion-safe:animate-[admin-menu-in_140ms_ease-out]"
        >
          <div className="border-b border-ink/10 px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-ink/55">{user.email}</p>
          </div>
          <div className="pt-1.5">
            <Link href="/" role="menuitem" tabIndex={-1} className={itemClass} onClick={() => close(false)} target="_blank" rel="noopener">
              <ExternalIcon className="size-4" /> View store
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={itemClass}
              onClick={() => {
                close(false);
                void logout();
              }}
            >
              <LogoutIcon className="size-4" /> Log out
            </button>
          </div>
          <style>{`@keyframes admin-menu-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
        </div>
      )}
    </div>
  );
}
