/**
 * Thumb: a fixed-size image preview for arbitrary stored URLs (products, order
 * snapshots, banners, categories), with a neutral placeholder when there is no image.
 *
 *   <Thumb src={p.image?.url ?? null} alt="" className="h-14 w-11" />   // className sets the size (default size-14)
 */
import { ImageIcon } from "@/components/admin/icons";
import { cx } from "@/components/admin/styles";

export function Thumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  return (
    <span className={cx("grid shrink-0 place-items-center overflow-hidden rounded-md bg-ink/5 text-ink/30 [&_svg]:size-5", className ?? "size-14")}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- stored URLs may be any http(s) host or site path
        <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />
      ) : (
        <ImageIcon aria-hidden />
      )}
    </span>
  );
}
