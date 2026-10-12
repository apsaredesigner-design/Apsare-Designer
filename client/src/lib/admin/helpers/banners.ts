/**
 * Banner list constants (pure): path, filter keys and the sorts the server accepts.
 */

export const BANNERS_PATH = "/admin/banners";
export const BANNER_FILTERS = ["isActive"] as const;
/** The display order; drag reorder is only offered under it (see BannersView). */
export const BANNER_ORDER_SORT = "sortOrder_asc";
export const BANNER_SORTS = [
  { value: BANNER_ORDER_SORT, label: "Display order" },
  { value: "createdAt_desc", label: "Newest first" },
  { value: "title_asc", label: "Title A–Z" },
];
