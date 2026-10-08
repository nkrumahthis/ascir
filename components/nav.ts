import type * as React from "react";
import {
  CalendarDays,
  FileText,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  Newspaper,
  Settings,
  Users,
} from "lucide-react";

import { can, type Action, type CanUser } from "@/auth/can";

export type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  // Hidden unless can(user, requiredAction). Leave unset for links
  // every signed-in user may follow.
  requiredAction?: Action;
  children?: Omit<NavItem, "icon" | "children">[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

// Sections other than Dashboard are placeholders until their pages exist.
const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }],
  },
  {
    title: "Content",
    items: [
      {
        label: "Articles",
        icon: Newspaper,
        href: "#",
        requiredAction: "post:create",
        children: [
          { label: "Published", href: "#" },
          { label: "Drafts", href: "#" },
        ],
      },
      {
        label: "Research",
        icon: FileText,
        href: "#",
        requiredAction: "post:create",
      },
      {
        label: "Events",
        icon: CalendarDays,
        href: "#",
        requiredAction: "event:update",
      },
    ],
  },
  {
    title: "Centre",
    items: [
      {
        label: "Team",
        icon: Users,
        href: "#",
        requiredAction: "person:update",
      },
      { label: "View website", icon: Globe2, href: "/" },
    ],
  },
];

const footerItems: NavItem[] = [
  { label: "Help", icon: HelpCircle, href: "#" },
  {
    label: "Settings",
    icon: Settings,
    href: "#",
    requiredAction: "settings:update",
  },
];

function allowed<T extends { requiredAction?: Action }>(
  user: CanUser,
  items: T[],
) {
  return items.filter(
    (item) => !item.requiredAction || can(user, item.requiredAction),
  );
}

// Drops links the user's role cannot use, and groups left empty.
export function visibleNav(user: CanUser) {
  return {
    groups: navGroups
      .map((group) => ({
        ...group,
        items: allowed(user, group.items).map((item) => ({
          ...item,
          children: item.children && allowed(user, item.children),
        })),
      }))
      .filter((group) => group.items.length > 0),
    footer: allowed(user, footerItems),
  };
}
