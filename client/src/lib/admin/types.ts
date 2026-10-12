/**
 * The ONE set of admin types: request bodies and response shapes of `/api/admin/*`
 * (source of truth: docs/API.md, "Admin" section). Shapes shared with the storefront
 * (Banner, AdminDashboardStats, StoreSettings…) are re-exported from `@/types`, so
 * admin code imports everything from here.
 */
import type {
  Address,
  Coupon,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductImage,
  ProductVariant,
  Role,
  User,
} from "@/types";

export type {
  AdminDashboardStats,
  Banner,
  CouponType,
  LowStockVariant,
  OrderStatus,
  Paginated,
  PaymentMethod,
  PaymentStatus,
  Role,
  ServiceablePincode,
  StoreSettings,
  User,
} from "@/types";

/** Query values accepted by the list helpers; empty values are dropped. */
export type QueryValue = string | number | boolean | null | undefined;
export type ListQuery = Record<string, QueryValue>;

export type StockState = "in" | "low" | "out";

/** GET /admin/products item. */
export interface AdminProductListItem {
  id: number;
  code: string;
  name: string;
  slug: string;
  brand: string;
  mrp: number;
  salePrice: number;
  discountPercent: number;
  isActive: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isDealOfDay: boolean;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string; slug: string };
  image: { id: number; url: string; alt: string | null } | null;
  variantCount: number;
  totalStock: number;
  stockState: StockState;
}

export interface AdminProductImage extends ProductImage {
  productId: number;
  publicId: string | null;
}

/** GET /admin/products/:id (also returned by create/update). */
export interface AdminProduct {
  id: number;
  code: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  fabric: string | null;
  occasion: string | null;
  pattern: string | null;
  careInstructions: string | null;
  specs: Record<string, string> | null;
  mrp: number;
  salePrice: number;
  discountPercent: number;
  categoryId: number;
  isActive: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isDealOfDay: boolean;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string; slug: string };
  images: AdminProductImage[];
  variants: (ProductVariant & { productId: number })[];
}

export interface AdminProductInput {
  code: string;
  name: string;
  description: string;
  categoryId: number;
  brand?: string;
  fabric?: string | null;
  occasion?: string | null;
  pattern?: string | null;
  careInstructions?: string | null;
  specs?: Record<string, string> | null;
  mrp: number;
  salePrice: number;
  isActive?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isDealOfDay?: boolean;
  images?: { url: string; publicId?: string | null; alt?: string | null; sortOrder?: number }[];
  variants?: { id?: number; sku: string; size: string; color: string; colorHex?: string | null; stock: number }[];
}

/** PATCH /admin/products/:id/status (also customers). */
export interface StatusResult {
  id: number;
  isActive: boolean;
}

export type BulkProductAction = "activate" | "deactivate" | "delete";
/** Why bulk `activate` left a product inactive. */
export type SkipReason = "NO_VARIANTS" | "NO_IMAGES";

/** POST /admin/products/bulk. */
export interface BulkProductResult {
  action: BulkProductAction;
  requested: number;
  affected: number;
  /** activate only: products left inactive because they are not sellable. */
  skipped?: { id: number; reason: SkipReason }[];
  /** delete only. */
  hardDeleted?: number[];
  softDeleted?: number[];
}

/** GET /admin/categories item. */
export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  parent: { id: number; name: string; slug: string } | null;
  _count: { products: number; children: number };
}

/** GET /admin/categories/tree node (roots first; children sorted by sortOrder, then name). */
export interface CategoryTreeNode extends AdminCategory {
  children: CategoryTreeNode[];
}

export interface AdminCategoryDetail extends AdminCategory {
  children: { id: number; name: string; slug: string; isActive: boolean }[];
}

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: number | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/** GET /admin/orders item. */
export interface AdminOrderListItem {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  finalAmount: number;
  shipName: string;
  shipCity: string;
  shipPincode: string;
  createdAt: string;
  updatedAt: string;
  user: Pick<User, "id" | "fullName" | "email" | "mobile">;
  _count: { items: number };
}

/** GET /admin/orders/:orderNumber (also returned by PATCH …/status). */
export type AdminOrder = Order & {
  user: Pick<User, "id" | "fullName" | "email" | "mobile">;
  /** Statuses the order can move to now; [] when final. */
  nextStatuses: OrderStatus[];
};

/** GET /admin/customers item. */
export interface AdminCustomer {
  id: number;
  fullName: string;
  email: string;
  mobile: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

/** Lifetime figures on the customer detail (non-cancelled orders unless named otherwise). */
export interface CustomerStats {
  orders: number;
  cancelledOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
}

export interface AdminCustomerDetail extends AdminCustomer {
  updatedAt: string;
  addresses: Address[];
  stats: CustomerStats;
  recentOrders: {
    id: number;
    orderNumber: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    finalAmount: number;
    createdAt: string;
    _count: { items: number };
  }[];
}

/** PATCH /admin/customers/:id/role. */
export interface RoleResult {
  id: number;
  role: Role;
  isActive: boolean;
}

/** GET /admin/coupons/:id (every column, including the per-customer rules). */
export type AdminCoupon = Coupon & { perUserLimit: number | null; firstOrderOnly: boolean };
/** GET /admin/coupons item. */
export type AdminCouponListItem = AdminCoupon & { _count: { orders: number } };

export interface AdminCouponInput {
  code: string;
  description?: string | null;
  type: "PERCENT" | "FLAT";
  value: number;
  maxDiscount?: number | null;
  minOrderAmount?: number;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export interface AdminBannerInput {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/** PUT /admin/settings body. */
export interface StoreSettingsInput {
  deliveryCharge: number;
  freeShippingThreshold: number;
  codFee: number;
}

/** POST /admin/settings/pincodes body (and each bulk entry). */
export interface PincodeInput {
  pincode: string;
  deliveryDays?: number;
  codAvailable?: boolean;
}
export type PincodePatch = Omit<PincodeInput, "pincode">;

/** POST /admin/settings/pincodes/bulk. */
export interface BulkPincodeResult {
  received: number;
  added: number;
  skipped: number;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/** GET /admin/reviews item (also GET /admin/reviews/:id). */
export interface AdminReview {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  product: { id: number; name: string; slug: string; code: string };
  user: { id: number; fullName: string; email: string };
}

export interface AuditLogEntry {
  id: number;
  adminId: number;
  method: string;
  path: string;
  status: number;
  targetId: string | null;
  ip: string | null;
  createdAt: string;
  admin: { id: number; fullName: string; email: string };
}

/** POST /uploads/image item. Dev-local uploads have `publicId: null` and no size. */
export interface UploadedImage {
  url: string;
  publicId: string | null;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}
