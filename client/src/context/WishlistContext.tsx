"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import type { Paginated, WishlistProduct, WishlistAddResponse, WishlistRemoveResponse, WishlistMoveToCartResponse } from "@/types";

interface WishlistContextType {
  wishlistIds: Set<number>;
  items: WishlistProduct[];
  total: number;
  isLoading: boolean;
  inWishlist: (productId: number) => boolean;
  toggleWishlist: (productId: number) => Promise<boolean>;
  moveToCart: (productId: number, variantId: number) => Promise<{ notice: string | null }>;
  refreshWishlist: () => Promise<void>;
}

const EMPTY_SET = new Set<number>();
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshCart, openCartDrawer } = useCart();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api<Paginated<WishlistProduct>>("/wishlist?limit=100");
      setItems(res.items);
      setTotal(res.meta.total);
      setWishlistIds(new Set(res.items.map((i) => i.id)));
    } catch {
      // Ignored if error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) return;

    api<Paginated<WishlistProduct>>("/wishlist?limit=100")
      .then((res) => {
        if (active) {
          setItems(res.items);
          setTotal(res.meta.total);
          setWishlistIds(new Set(res.items.map((i) => i.id)));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user]);

  const effectiveItems = user ? items : [];
  const effectiveTotal = user ? total : 0;
  const effectiveIds = useMemo(() => (user ? wishlistIds : EMPTY_SET), [user, wishlistIds]);

  const inWishlist = useCallback(
    (productId: number) => effectiveIds.has(productId),
    [effectiveIds]
  );

  const toggleWishlist = async (productId: number): Promise<boolean> => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return false;
    }

    const currentlyInWishlist = effectiveIds.has(productId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (currentlyInWishlist) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    try {
      if (currentlyInWishlist) {
        await api<WishlistRemoveResponse>(`/wishlist/${productId}`, {
          method: "DELETE",
        });
      } else {
        await api<WishlistAddResponse>("/wishlist", {
          method: "POST",
          body: JSON.stringify({ productId }),
        });
      }
      await refreshWishlist();
      return !currentlyInWishlist;
    } catch (err) {
      // Revert optimistic update
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (currentlyInWishlist) next.add(productId);
        else next.delete(productId);
        return next;
      });
      throw err;
    }
  };

  const moveToCart = async (productId: number, variantId: number) => {
    const res = await api<WishlistMoveToCartResponse>(
      `/wishlist/${productId}/move-to-cart`,
      {
        method: "POST",
        body: JSON.stringify({ variantId }),
      }
    );
    await refreshWishlist();
    await refreshCart();
    openCartDrawer();
    return { notice: res.notice };
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds: effectiveIds,
        items: effectiveItems,
        total: effectiveTotal,
        isLoading,
        inWishlist,
        toggleWishlist,
        moveToCart,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
