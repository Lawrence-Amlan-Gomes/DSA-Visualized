"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    title: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="7" height="9" rx="1.2" />
        <rect x="14" y="3" width="7" height="5" rx="1.2" />
        <rect x="14" y="12" width="7" height="9" rx="1.2" />
        <rect x="3" y="16" width="7" height="5" rx="1.2" />
      </svg>
    ),
  },
  {
    href: "/bookmarks",
    title: "Bookmarks",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
  {
    href: "/livecoding",
    title: "Live Coding",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    href: "/roadmap",
    title: "Roadmap",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <line x1="4" y1="21" x2="4" y2="3" />
        <path d="M4 4h13l-3 4 3 4H4" />
      </svg>
    ),
  },
];

export default function ActivityBar() {
  const pathname = usePathname();

  return (
    <div id="activity-bar">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={"nav-btn" + (pathname.startsWith(item.href) ? " active" : "")}
          title={item.title}
        >
          {item.icon}
        </Link>
      ))}
    </div>
  );
}
