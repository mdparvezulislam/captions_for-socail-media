import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconToday = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9Z" />
    <path d="M19 4.5v3M17.5 6h3" />
  </Base>
);

export const IconLibrary = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
    <path d="M9 4h5.5A1.5 1.5 0 0 1 16 5.5v13a1.5 1.5 0 0 1-1.5 1.5H9Z" />
    <path d="m17.6 5.4 2.2.6a1.5 1.5 0 0 1 1.05 1.84l-3.2 11.6" />
  </Base>
);

export const IconBox = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 8.5 12 4 4 8.5v7L12 20l8-4.5Z" />
    <path d="M4 8.5 12 13l8-4.5M12 13v7" />
  </Base>
);

export const IconLayers = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Base>
);

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 15.3c2 .6 3.2 2.3 3.5 4.7" />
  </Base>
);

export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="2.8" />
    <path d="M19.4 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Base>
);

export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.4" />
    <path d="M15 6.2V5.4A1.4 1.4 0 0 0 13.6 4H5.4A1.4 1.4 0 0 0 4 5.4v8.2A1.4 1.4 0 0 0 5.4 15h.8" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Base>
);

export const IconRefresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 1 0-.6 4.2" />
    <path d="M20 4.5V11h-6.3" />
  </Base>
);

export const IconPen = (p: IconProps) => (
  <Base {...p}>
    <path d="m4 20 1-4.6L16.4 4a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L8.6 19Z" />
    <path d="m14.5 6 3.5 3.5" />
  </Base>
);

export const IconImage = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17 4.8-4.4a2 2 0 0 1 2.7 0L20 20" />
  </Base>
);

export const IconVideo = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="12.5" height="12" rx="2.4" />
    <path d="m15.5 11 5-3v8l-5-3Z" />
  </Base>
);

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5M12 16.2h.01" />
  </Base>
);

export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v10.5M8 11l4 4 4-4" />
    <path d="M4.5 17.5v1a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1" />
  </Base>
);

export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Base>
);

export const IconArrowUpRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Base>
);

export const IconPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 4.5h6l-.7 5.2 2.7 2.4V15h-4.5v5l-.5.5-.5-.5v-5H7v-2.9l2.7-2.4Z" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Base>
);

export const IconSpark = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3 1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8Z" />
    <path d="M18.5 15.5 19 17l1.5.5-1.5.5-.5 1.5-.5-1.5L16.5 18l1.5-.5Z" />
  </Base>
);

export const IconPoster = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
    <path d="M8 8h8M8 12h5M8 16h3" />
  </Base>
);

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Base>
);

export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7" />
    <path d="M6.5 7l.8 12.1c0 .7.6 1.4 1.4 1.4h6.6c.8 0 1.4-.7 1.4-1.4L17.5 7" />
  </Base>
);

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </Base>
);

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);

export const IconGrid = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
  </Base>
);
