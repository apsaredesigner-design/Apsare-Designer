/**
 * ExportCsvLink: downloads GET /admin/orders/export.csv with the current filters.
 * A plain link: the browser sends the session cookie and saves the attachment.
 */
import { buttonClasses } from "@/components/admin/Button";
import { DownloadIcon } from "@/components/admin/icons";
import { ordersExportUrl } from "@/lib/admin/helpers/orders";
import type { ListQuery } from "@/lib/admin/types";

export function ExportCsvLink({ query }: { query: ListQuery }) {
  return (
    <a href={ordersExportUrl(query)} download className={buttonClasses("secondary")}>
      <DownloadIcon />
      Export CSV
    </a>
  );
}
