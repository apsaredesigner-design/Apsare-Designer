/**
 * Inline SVG icons for the admin panel (24×24, 1.5px stroke, currentColor).
 *
 *   <BoxIcon className="size-5" />
 *
 * Icons are decorative (aria-hidden). Give the surrounding control an accessible
 * name (e.g. IconButton's `label`).
 */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

function make(paths: React.ReactNode, displayName: string) {
  function Icon({ className = "size-5", ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const DashboardIcon = make(
  <>
    <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
  </>,
  "DashboardIcon",
);
export const BoxIcon = make(
  <>
    <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
    <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
  </>,
  "BoxIcon",
);
export const FolderIcon = make(<path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />, "FolderIcon");
export const ReceiptIcon = make(
  <>
    <path d="M6 3.5h12v17l-3-1.8-3 1.8-3-1.8-3 1.8z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </>,
  "ReceiptIcon",
);
export const UsersIcon = make(
  <>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
    <path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2.2.7 3.6 2.6 4 5.2" />
  </>,
  "UsersIcon",
);
export const StarIcon = make(
  <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  "StarIcon",
);
export const TicketIcon = make(
  <>
    <path d="M3.5 7.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1V10a2 2 0 0 0 0 4v2.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V14a2 2 0 0 0 0-4z" />
    <path d="M14.5 6.5v11" strokeDasharray="1.5 2" />
  </>,
  "TicketIcon",
);
export const ImageIcon = make(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m20.5 15.5-4.5-4.5-9 8.5" />
  </>,
  "ImageIcon",
);
export const MailIcon = make(
  <>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </>,
  "MailIcon",
);
export const HistoryIcon = make(
  <>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5M12 8v4.5l3 1.8" />
  </>,
  "HistoryIcon",
);
export const SettingsIcon = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>,
  "SettingsIcon",
);
export const MenuIcon = make(<path d="M4 7h16M4 12h16M4 17h16" />, "MenuIcon");
export const CloseIcon = make(<path d="M6 6l12 12M18 6 6 18" />, "CloseIcon");
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </>,
  "SearchIcon",
);
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />, "ChevronDownIcon");
export const ChevronUpIcon = make(<path d="m6 15 6-6 6 6" />, "ChevronUpIcon");
export const ChevronLeftIcon = make(<path d="m15 6-6 6 6 6" />, "ChevronLeftIcon");
export const ChevronRightIcon = make(<path d="m9 6 6 6-6 6" />, "ChevronRightIcon");
export const SortIcon = make(<path d="m8 9 4-4 4 4M8 15l4 4 4-4" />, "SortIcon");
export const ArrowUpIcon = make(<path d="M12 19V5M6 11l6-6 6 6" />, "ArrowUpIcon");
export const ArrowDownIcon = make(<path d="M12 5v14M6 13l6 6 6-6" />, "ArrowDownIcon");
export const CheckIcon = make(<path d="m5 12.5 4.5 4.5L19 7.5" />, "CheckIcon");
export const MinusIcon = make(<path d="M6 12h12" />, "MinusIcon");
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />, "PlusIcon");
export const InfoIcon = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </>,
  "InfoIcon",
);
export const WarningIcon = make(
  <>
    <path d="M10.3 4.3 2.9 17.5A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
    <path d="M12 9.5v4M12 17h.01" />
  </>,
  "WarningIcon",
);
export const UploadIcon = make(
  <>
    <path d="M12 15.5V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </>,
  "UploadIcon",
);
export const DownloadIcon = make(
  <>
    <path d="M12 4v11.5M7.5 11 12 15.5l4.5-4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </>,
  "DownloadIcon",
);
export const PencilIcon = make(
  <>
    <path d="M16.9 3.6a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.5 19 4 20l1-4.5L16.9 3.6Z" />
    <path d="m15 5.5 3.5 3.5" />
  </>,
  "PencilIcon",
);
export const TrashIcon = make(
  <>
    <path d="M4.5 7h15M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7M9 7V4.5h6V7" />
  </>,
  "TrashIcon",
);
export const LogoutIcon = make(
  <>
    <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
    <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
  </>,
  "LogoutIcon",
);
export const ExternalIcon = make(
  <>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </>,
  "ExternalIcon",
);
export const GripIcon = make(
  <>
    <circle cx="9" cy="6" r=".8" fill="currentColor" />
    <circle cx="15" cy="6" r=".8" fill="currentColor" />
    <circle cx="9" cy="12" r=".8" fill="currentColor" />
    <circle cx="15" cy="12" r=".8" fill="currentColor" />
    <circle cx="9" cy="18" r=".8" fill="currentColor" />
    <circle cx="15" cy="18" r=".8" fill="currentColor" />
  </>,
  "GripIcon",
);
export const RupeeIcon = make(<path d="M7 5h10M7 9h10M10 5c5.3 0 5.3 8 0 8H7l7 7" />, "RupeeIcon");
export const ClockIcon = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
  "ClockIcon",
);
export const CartIcon = make(
  <>
    <path d="M3.5 4.5h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.1l1.5-6.3H6.4" />
    <circle cx="9.5" cy="19.5" r="1" />
    <circle cx="17" cy="19.5" r="1" />
  </>,
  "CartIcon",
);
export const EyeIcon = make(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
  "EyeIcon",
);
export const EyeOffIcon = make(
  <>
    <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </>,
  "EyeOffIcon",
);

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`motion-safe:animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
