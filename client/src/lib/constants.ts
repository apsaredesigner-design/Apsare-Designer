export const BRAND = {
  name: "Label Apsáre",
  tagline: "Crafted for her modern aesthetic",
  logo: "/brand/logo-dark.png",
  logoDark: "/brand/logo-dark.png",
  logoLight: "/brand/logo-light.png",
  logoOriginal: "/brand/logo.png",
};

/** Storefront categories. Real list will come from GET /api/categories. */
export const NAV_CATEGORIES = [
  { label: "Sarees", href: "/category/sarees" },
  { label: "Blouses", href: "/category/blouses" },
  { label: "Lehengas", href: "/category/lehengas" },
  { label: "Kurtas & Sets", href: "/category/kurta-sets" },
  { label: "Dupattas", href: "/category/dupattas" },
];

export const NAV_LINKS = [
  ...NAV_CATEGORIES,
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Offers", href: "/offers" },
];

export const ORDER_STATUS_LABEL = {
  PLACED: "Order Placed",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
} as const;
