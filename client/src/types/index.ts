// Shapes returned by the /api Route Handlers. Source of truth: docs/API.md.
// Money is a JSON number in INR; dates are ISO 8601 strings.

/** Every list endpoint returns this shape. */
export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

// ─── Users & addresses ─────────────────────────────────────────

export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: number;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Address {
  id: number;
  fullName: string;
  mobile: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Categories ────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** GET /api/categories: roots with nested children, sorted by sortOrder then name. */
export interface CategoryNode extends Category {
  /** Active products in this category and all its descendants. */
  productCount: number;
  children: CategoryNode[];
}

export interface Crumb {
  id: number;
  name: string;
  slug: string;
}

/** GET /api/categories/:slug */
export interface CategoryDetail {
  category: Omit<CategoryNode, "children">;
  /** Root-first, ends with the category itself. */
  breadcrumb: Crumb[];
  children: CategoryNode[];
}

// ─── Products ──────────────────────────────────────────────────

export interface ProductImage {
  id: number;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
}

/** Listing card. Only the first 2 images are sent. */
export interface ProductSummary {
  id: number;
  code: string;
  name: string;
  slug: string;
  brand: string;
  category: { name: string; slug: string };
  mrp: number;
  salePrice: number;
  discountPercent: number;
  images: ProductImage[];
  /** Distinct, in variant order. */
  sizes: string[];
  /** Distinct by name. */
  colors: { name: string; hex: string | null }[];
  ratingAvg: number;
  ratingCount: number;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isDealOfDay: boolean;
  /** Any variant has stock > 0. */
  inStock: boolean;
  /** Only when logged in. */
  inWishlist?: boolean;
}

/** GET /api/products/:slug. `images` holds all of them. */
export interface Product extends Omit<ProductSummary, "category"> {
  category: { id: number; name: string; slug: string };
  description: string;
  fabric: string | null;
  occasion: string | null;
  pattern: string | null;
  careInstructions: string | null;
  specs: Record<string, string> | null;
  variants: ProductVariant[];
  /** Root-first, ends at the product's category. */
  breadcrumb: Crumb[];
  reviewSummary: {
    ratingAvg: number;
    ratingCount: number;
    distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  };
}

export interface ProductFacets {
  /** Counts roll up to parents. */
  categories: { slug: string; name: string; parentSlug: string | null; count: number }[];
  fabrics: { value: string; count: number }[];
  occasions: { value: string; count: number }[];
  sizes: { value: string; count: number }[];
  colors: { value: string; hex: string | null; count: number }[];
  /** salePrice range. */
  price: { min: number | null; max: number | null };
}

/** GET /api/products */
export type ProductListResponse = Paginated<ProductSummary> & { facets: ProductFacets };

export type ProductSort = "recommended" | "newest" | "price_asc" | "price_desc" | "discount" | "popularity" | "rating";

/** GET /api/products/home. Rails hold up to 8 and may be empty. */
export interface HomeResponse {
  banners: Banner[];
  newArrivals: ProductSummary[];
  trending: ProductSummary[];
  bestSellers: ProductSummary[];
  deals: ProductSummary[];
  topRated: ProductSummary[];
  underPrice: ProductSummary[];
  /** salePrice cap for `underPrice` (1999). */
  underPriceLimit: number;
}

export interface Review {
  id: number;
  productId: number;
  rating: number; // 1-5
  comment: string | null;
  createdAt: string;
  /** First name + last initial, e.g. "Ananya R." */
  author: string;
}

// ─── Wishlist ──────────────────────────────────────────────────

/** GET /api/wishlist items. Only purchasable products are listed. */
export interface WishlistProduct extends Omit<ProductSummary, "inWishlist"> {
  addedAt: string;
}

/** POST /api/wishlist */
export interface WishlistAddResponse {
  productId: number;
  inWishlist: true;
  added: boolean;
}

/** DELETE /api/wishlist/:productId */
export interface WishlistRemoveResponse {
  productId: number;
  inWishlist: false;
  removed: boolean;
}

/** POST /api/wishlist/:productId/move-to-cart */
export interface WishlistMoveToCartResponse {
  productId: number;
  inWishlist: false;
  cartItem: AddToCartResult;
  notice: string | null;
}

// ─── Cart & coupons ────────────────────────────────────────────

export type CartLineIssue = "INACTIVE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK";

export interface CartItem {
  /** Cart item id (use for PATCH/DELETE). */
  id: number;
  quantity: number;
  /** issue === null */
  available: boolean;
  /** INACTIVE = product inactive or its category hidden. */
  issue: CartLineIssue | null;
  /** min(stock, 10), for the qty picker. */
  maxQuantity: number;
  lineMrp: number;
  lineTotal: number;
  variant: ProductVariant & {
    product: {
      id: number;
      code: string;
      name: string;
      slug: string;
      brand: string;
      mrp: number;
      salePrice: number;
      discountPercent: number;
      /** First image only. */
      images: { id: number; url: string; alt: string | null }[];
    };
  };
}

/** Server-computed money summary over available lines. All amounts in INR. */
export interface CartSummary {
  totalMrp: number;
  /** totalMrp − subtotal */
  discountOnMrp: number;
  /** Σ salePrice × qty; coupons and free shipping are judged on this. */
  subtotal: number;
  couponDiscount: number;
  /** 0 when subtotal ≥ free-shipping threshold (or the cart is empty). */
  deliveryCharge: number;
  /** Only when priced for COD at checkout. */
  codFee?: number;
  /** subtotal − couponDiscount + deliveryCharge (+ codFee) */
  total: number;
  /** How much more subtotal unlocks free delivery; 0 when free. */
  freeShippingRemaining: number;
}

export type CouponType = "PERCENT" | "FLAT";

/** Client-safe coupon view (cart, /coupons/available, /coupons/apply). */
export interface CouponPublic {
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  expiresAt: string | null;
}

/** GET /api/cart (and every cart mutation). */
export interface Cart {
  /** Newest first. */
  items: CartItem[];
  /** Σ quantity over all lines. */
  itemCount: number;
  /** Block checkout while true. */
  hasUnavailableItems: boolean;
  summary: CartSummary;
  coupon: CouponPublic | null;
  /** Why `?coupon=` was rejected; the request itself still succeeds. */
  couponError: string | null;
}

export interface AddToCartResult {
  variantId: number;
  /** Final line quantity. */
  quantity: number;
  capped: boolean;
  requested: number;
}

/** POST /api/cart */
export type AddToCartResponse = Cart & { added: AddToCartResult; notice: string | null };
/** PATCH /api/cart/:itemId */
export type UpdateCartItemResponse = Cart & { notice: string | null };
/** POST /api/cart/merge */
export type MergeCartResponse = Cart & {
  merged: { variantId: number; quantity: number; capped: boolean }[];
  skipped: { variantId: number; reason: "OUT_OF_STOCK" | "NOT_FOUND" }[];
};

/** GET /api/coupons/available item. The extra fields are present only when signed in. */
export interface AvailableCoupon extends CouponPublic {
  eligible?: boolean;
  amountNeeded?: number;
  discount?: number;
}

export interface AvailableCouponsResponse {
  items: AvailableCoupon[];
  /** My cart subtotal when signed in, else null. */
  subtotal: number | null;
}

/** POST /api/coupons/apply */
export interface ApplyCouponResponse {
  coupon: CouponPublic;
  discount: number;
  summary: CartSummary;
}

// ─── Orders & payments ─────────────────────────────────────────

export type OrderStatus = "PLACED" | "CONFIRMED" | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type PaymentMethod = "COD" | "UPI" | "CARD" | "NET_BANKING";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderItem {
  id: number;
  orderId: number;
  variantId: number;
  productName: string;
  productCode: string;
  imageUrl: string | null;
  size: string;
  color: string;
  mrp: number;
  salePrice: number;
  quantity: number;
}

export interface OrderStatusEvent {
  id: number;
  orderId: number;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  provider: string;
  providerRef: string | null;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

/** GET /api/orders item. */
export interface OrderListItem {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  finalAmount: number;
  createdAt: string;
  updatedAt: string;
  /** Total quantity. */
  itemCount: number;
  items: Pick<OrderItem, "id" | "productName" | "imageUrl" | "size" | "color" | "quantity">[];
}

/** OrderDetail: POST /api/orders, GET /api/orders/:orderNumber, POST …/cancel. */
export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalMrp: number;
  totalDiscount: number;
  couponId: number | null;
  couponDiscount: number;
  /** Includes the COD fee for COD orders. */
  deliveryCharge: number;
  finalAmount: number;
  shipName: string;
  shipMobile: string;
  shipLine1: string;
  shipLine2: string | null;
  shipLandmark: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  /** Oldest first (the timeline). */
  statusHistory: OrderStatusEvent[];
  payments: Payment[];
  coupon: { code: string } | null;
}

/** POST /api/orders. `replayed` is present when an Idempotency-Key was sent. */
export type PlaceOrderResponse = Order & { replayed?: boolean };

/** GET /api/payments/pincode/:pincode */
export type PincodeCheck =
  | { pincode: string; serviceable: true; codAvailable: boolean; deliveryDays: number; estimatedDelivery: string }
  | { pincode: string; serviceable: false; codAvailable: false; deliveryDays: null; estimatedDelivery: null };

/** GET /api/payments/methods */
export interface PaymentMethodsResponse {
  provider: string;
  methods: PaymentMethod[];
}

// ─── Storefront content & admin ────────────────────────────────

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Admin-side coupon row (GET /api/admin/coupons/:id). List items add `_count`. */
export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  /** PERCENT only. */
  maxDiscount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export type AdminCoupon = Coupon & { _count: { orders: number } };

/** Admin order detail: every Order field plus the customer. */
export type AdminOrder = Order & { user: Pick<User, "id" | "fullName" | "email" | "mobile"> };

export interface ServiceablePincode {
  pincode: string;
  deliveryDays: number;
  codAvailable: boolean;
}

export interface StoreSettings {
  deliveryCharge: number;
  freeShippingThreshold: number;
  codFee: number;
  updatedAt: string;
}

export interface LowStockVariant {
  variantId: number;
  sku: string;
  size: string;
  color: string;
  stock: number;
  product: { id: number; name: string; slug: string };
}

export interface AdminDashboardStats {
  totals: { products: number; orders: number; customers: number; sales: number };
  todayOrders: number;
  pendingOrders: number;
  lowStock: LowStockVariant[];
  outOfStock: LowStockVariant[];
  salesOverTime: { date: string; sales: number; orders: number }[]; // date = YYYY-MM-DD (IST)
  ordersByStatus: { status: OrderStatus; count: number }[];
  recentOrders: Pick<Order, "id" | "orderNumber" | "status" | "finalAmount" | "createdAt">[];
}
