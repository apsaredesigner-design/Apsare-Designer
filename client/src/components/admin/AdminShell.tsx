"use client";
/**
 * AdminShell: the admin panel frame: a deep-ink sidebar (a drawer below `lg`),
 * a top bar with a scoped search and the admin menu, and the page content area.
 *
 *   <AdminSessionProvider><AdminShell>{children}</AdminShell></AdminSessionProvider>
 *
 * Mounted once by app/admin/(panel)/layout.tsx; pages render only their content
 * (start with <PageHeader>). Nav items live in ADMIN_NAV below. The top-bar search
 * sends the admin to /admin/<scope>?q=<term>.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AdminMenu } from "./AdminMenu";
import { Drawer } from "./Drawer";
import { IconButton } from "./IconButton";
import {
  BoxIcon,
  CloseIcon,
  DashboardIcon,
  FolderIcon,
  HistoryIcon,
  ImageIcon,
  MailIcon,
  MenuIcon,
  ReceiptIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  TicketIcon,
  UsersIcon,
} from "./icons";
import { cx, focusRing } from "./styles";

export const ADMIN_NAV = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/admin/dashboard", icon: DashboardIcon }] },
  {
    group: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", icon: BoxIcon },
      { label: "Categories", href: "/admin/categories", icon: FolderIcon },
      { label: "Reviews", href: "/admin/reviews", icon: StarIcon },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ReceiptIcon },
      { label: "Customers", href: "/admin/customers", icon: UsersIcon },
      { label: "Coupons", href: "/admin/coupons", icon: TicketIcon },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Banners", href: "/admin/banners", icon: ImageIcon },
      { label: "Messages", href: "/admin/messages", icon: MailIcon },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Audit log", href: "/admin/audit-log", icon: HistoryIcon },
      { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
] as const;

const SEARCH_SCOPES = [
  { value: "orders", label: "Orders" },
  { value: "products", label: "Products" },
  { value: "customers", label: "Customers" },
];

function Brand() {
  return (
    <Link href="/admin/dashboard" className={cx("block rounded px-1 py-1", focusRing)}>
      <span className="block font-display text-2xl leading-none font-semibold tracking-[0.18em] text-ivory">APSÁRE</span>
      <span className="mt-1 block text-[10px] tracking-[0.32em] text-gold-400 uppercase">Atelier admin</span>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-color:rgba(251,249,243,0.15)_transparent] [scrollbar-width:thin]">
      {ADMIN_NAV.map((section) => (
        <div key={section.group} className="mb-5">
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.24em] text-ivory/40 uppercase">{section.group}</p>
          <ul className="space-y-0.5">
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400",
                      active ? "bg-white/[0.08] text-ivory" : "text-ivory/65 hover:bg-white/[0.05] hover:text-ivory",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cx("absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold-400 transition-opacity", active ? "opacity-100" : "opacity-0")}
                    />
                    <Icon className={cx("size-[18px] shrink-0", active ? "text-gold-300" : "text-sage-300/70 group-hover:text-sage-200")} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-white/10 px-6 py-4 text-[11px] leading-relaxed text-ivory/40">
      Label Apsáre · crafted for her modern aesthetic
    </div>
  );
}

function TopSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const current = SEARCH_SCOPES.find((s) => pathname.startsWith(`/admin/${s.value}`))?.value ?? "orders";
  const [scope, setScope] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const activeScope = scope ?? current;

  return (
    <form
      role="search"
      className="flex min-w-0 flex-1 items-center rounded-full border border-ink/10 bg-ivory/70 transition-colors focus-within:border-sage-600 focus-within:bg-white md:max-w-lg"
      onSubmit={(e) => {
        e.preventDefault();
        const q = term.trim();
        router.push(`/admin/${activeScope}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
    >
      <label htmlFor={`${id}-scope`} className="sr-only">
        Search in
      </label>
      <select
        id={`${id}-scope`}
        value={activeScope}
        onChange={(e) => setScope(e.target.value)}
        className="hidden min-h-11 cursor-pointer appearance-none rounded-l-full bg-transparent pr-2 pl-4 text-xs font-semibold tracking-wide text-ink/70 focus:outline-none focus-visible:underline sm:block"
      >
        {SEARCH_SCOPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="hidden h-5 w-px bg-ink/15 sm:block" />
      <label htmlFor={`${id}-q`} className="sr-only">
        Search {activeScope}
      </label>
      <input
        id={`${id}-q`}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={`Search ${activeScope}…`}
        className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-ink/40 focus:outline-none sm:px-3"
      />
      <button type="submit" aria-label="Search" className={cx("grid size-11 shrink-0 place-items-center rounded-full text-ink/55 hover:text-ink", focusRing)}>
        <SearchIcon className="size-[18px]" />
      </button>
    </form>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-ivory text-ink">
      <a
        href="#admin-main"
        className="sr-only z-[70] rounded-md bg-ink px-4 py-3 text-sm text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink lg:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <Brand />
        </div>
        <SidebarNav />
        <SidebarFooter />
      </aside>

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} side="left" hideHeader ariaLabel="Admin navigation" width="w-[min(18rem,86vw)]" panelClassName="bg-ink">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 py-3 pr-2 pl-5">
            <Brand />
            <IconButton label="Close navigation" tone="light" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </div>
          <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          <SidebarFooter />
        </div>
      </Drawer>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-ink/10 bg-white/85 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:gap-4 sm:px-6">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen}>
            <MenuIcon />
          </IconButton>
          <TopSearch />
          <div className="ml-auto">
            <AdminMenu />
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
