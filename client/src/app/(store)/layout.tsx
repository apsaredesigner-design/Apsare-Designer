import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getCategoryTree } from "@/server/queries";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let navCategories: { label: string; href: string }[] = [];
  try {
    const roots = await getCategoryTree();
    navCategories = roots.map((c) => ({
      label: c.name,
      href:
        c.slug === "new-arrivals"
          ? "/new-arrivals"
          : c.slug === "offers"
            ? "/offers"
            : `/category/${c.slug}`,
    }));
  } catch (err) {
    console.error("Failed to load navigation categories:", err);
  }

  return (
    <>
      <Header navCategories={navCategories} />
      <main className="flex-1">{children}</main>
      <Footer navCategories={navCategories} />
    </>
  );
}

