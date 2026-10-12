"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import type {
  Cart,
  AddToCartResponse,
  UpdateCartItemResponse,
  MergeCartResponse,
} from "@/types";

interface GuestCartItem {
  variantId: number;
  quantity: number;
}

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addToCart: (variantId: number, quantity?: number, openDrawer?: boolean) => Promise<{ notice: string | null }>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  moveToWishlist: (itemId: number) => Promise<void>;
  refreshCart: (couponCode?: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const GUEST_CART_KEY = "apsare_guest_cart";

function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  // Starts true: nothing is "resolved" (guest vs. logged-in, cart loaded or not) until the
  // effect below runs, and both consumers key their loading/empty rendering off this flag.
  const [isLoading, setIsLoading] = useState(true);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [guestItems, setGuestItemsState] = useState<GuestCartItem[]>(() => getGuestCart());
  const prevUserRef = useRef<number | null>(null);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const saveGuestCart = (items: GuestCartItem[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
      } catch {}
    }
    setGuestItemsState(items);
  };

  const refreshCart = useCallback(
    async (couponCode?: string) => {
      if (!user) {
        setCart(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const query = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";
        const data = await api<Cart>(`/cart${query}`);
        setCart(data);
      } catch (err) {
        console.error("Failed to load cart:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  // Merge guest cart on login. Waits for AuthContext's own `/auth/me` check to resolve first —
  // otherwise `user` reads as null (indistinguishable from "genuinely a guest") during that
  // window, and a returning logged-in visitor's cart would flash as guest/empty.
  useEffect(() => {
    if (isAuthLoading) return;

    const handleLoginCart = async () => {
      if (user && prevUserRef.current !== user.id) {
        prevUserRef.current = user.id;
        const items = getGuestCart();
        if (items.length > 0) {
          setIsLoading(true);
          try {
            const merged = await api<MergeCartResponse>("/cart/merge", {
              method: "POST",
              body: JSON.stringify({ items }),
            });
            setCart(merged);
            localStorage.removeItem(GUEST_CART_KEY);
            setGuestItemsState([]);
          } catch {
            await refreshCart();
          } finally {
            setIsLoading(false);
          }
        } else {
          await refreshCart();
        }
      } else if (!user) {
        prevUserRef.current = null;
        setCart(null);
        setIsLoading(false);
      }
    };

    handleLoginCart();
  }, [user, isAuthLoading, refreshCart]);

  const addToCart = async (
    variantId: number,
    quantity = 1,
    openDrawer = true
  ): Promise<{ notice: string | null }> => {
    if (!user) {
      // Store in guest cart. Read fresh from localStorage (not the `guestItems` state closure)
      // so two rapid calls before a re-render can't each compute `next` from the same stale
      // array and have the second overwrite the first's update.
      const current = getGuestCart();
      const existing = current.find((i) => i.variantId === variantId);
      const next = existing
        ? current.map((i) =>
            i.variantId === variantId ? { ...i, quantity: Math.min(10, i.quantity + quantity) } : i
          )
        : [...current, { variantId, quantity: Math.min(10, quantity) }];
      saveGuestCart(next);
      if (openDrawer) openCartDrawer();
      return { notice: null };
    }

    setIsLoading(true);
    try {
      const res = await api<AddToCartResponse>("/cart", {
        method: "POST",
        body: JSON.stringify({ variantId, quantity }),
      });
      setCart(res);
      if (openDrawer) openCartDrawer();
      return { notice: res.notice };
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api<UpdateCartItemResponse>(`/cart/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setCart(res);
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api<Cart>(`/cart/${itemId}`, {
        method: "DELETE",
      });
      setCart(res);
    } finally {
      setIsLoading(false);
    }
  };

  const moveToWishlist = async (itemId: number) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api<Cart>(`/cart/${itemId}/move-to-wishlist`, {
        method: "POST",
      });
      setCart(res);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCoupon = async (code: string) => {
    await refreshCart(code);
  };

  const removeCoupon = async () => {
    await refreshCart();
  };

  const clearCart = async () => {
    if (!user) {
      saveGuestCart([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api<Cart>("/cart", { method: "DELETE" });
      setCart(res);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute item count for header badge (guestItems is React state, not re-parsed from
  // localStorage on every render).
  const guestItemCount = user ? 0 : guestItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemCount = user ? cart?.itemCount ?? 0 : guestItemCount;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isLoading,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        addToCart,
        updateQuantity,
        removeItem,
        applyCoupon,
        removeCoupon,
        moveToWishlist,
        refreshCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
