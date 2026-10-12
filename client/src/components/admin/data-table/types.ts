import type { ReactNode } from "react";

/** One DataTable column (see DataTable for an example). */
export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** API sort values for this column. `first` = direction on first click (default "asc" if available). */
  sort?: { asc?: string; desc?: string; first?: "asc" | "desc" };
  align?: "left" | "right" | "center";
  /** Hide on small screens (the column still exists for screen readers on larger ones). */
  hideBelow?: "sm" | "md" | "lg";
  /** Render cells as <th scope="row"> (use for the row's name column). */
  rowHeader?: boolean;
  className?: string;
  headerClassName?: string;
}

export const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" };
export const ALIGN = { left: "text-left", right: "text-right", center: "text-center" };
