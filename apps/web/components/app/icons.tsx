import * as React from "react";

/* Minimal 20px stroke icons for app chrome. No emoji, no icon circles. */

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

export function IconDashboard(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z" />
    </svg>
  );
}
export function IconSignal(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}
export function IconPositions(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 19V9M9 19V5M14 19v-7M19 19V8" />
    </svg>
  );
}
export function IconHistory(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
export function IconAcademy(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5z" />
      <path d="M6 10.8V16c0 1.4 2.7 2.8 6 2.8s6-1.4 6-2.8v-5.2" />
      <path d="M21.5 8.5V14" />
    </svg>
  );
}
export function IconConnect(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 7 7 9a4.24 4.24 0 0 0 6 6l2-2M15 17l2-2a4.24 4.24 0 0 0-6-6L9 11" />
    </svg>
  );
}
export function IconChat(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20 12a8 8 0 1 0-3.1 6.3L20 19.5l-.9-3A8 8 0 0 0 20 12Z" />
    </svg>
  );
}
export function IconPackage(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4ZM4 7l8 4 8-4M12 11v10" />
    </svg>
  );
}
export function IconShield(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
export function IconSettings(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.35.95A7 7 0 0 0 14 5.1L13.7 2.6h-3.4L10 5.1a7 7 0 0 0-2.5 1.44l-2.36-.95-2 3.46 2 1.55a7 7 0 0 0 0 2.8l-2 1.55 2 3.46 2.35-.95A7 7 0 0 0 10 18.9l.3 2.5h3.4l.3-2.5a7 7 0 0 0 2.5-1.44l2.36.95 2-3.46-2-1.55c.09-.46.14-.92.14-1.4Z" />
    </svg>
  );
}
export function IconMore(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconClose(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
export function IconPlus(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function IconLogout(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" />
    </svg>
  );
}
export function IconDownload(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

/* Decorative empty/error-state watermark: the LevelUpMark chevron glyph,
 * oversized and clipped by .ap-empty (see app.css .ap-empty-mark). */
export function EmptyMark() {
  return (
    <span className="ap-empty-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M8 19.5 16 12l8 7.5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 25 16 17.5 24 25" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
      </svg>
    </span>
  );
}
