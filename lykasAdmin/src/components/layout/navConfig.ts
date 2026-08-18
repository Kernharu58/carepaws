import type { UserRole } from "@/types/auth";

export interface NavItem {
  label: string;
  path: string;
  roles?: UserRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Mirrors §7.2's page groupings. Only entries for pages that exist in
 * this slice are listed — every other §7.2 page (Analytics, Inventory,
 * Interviews, Fosters, Events, Chat, StaffManagement, ...) lands here as
 * its own slice, same practice as server.js's route mounting on the
 * backend. A nav item pointing at a page that doesn't exist would be a
 * dead link, which is worse than not showing it yet.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", path: "/" }],
  },
  {
    label: "Pet Operations",
    items: [
      { label: "Manage Pets", path: "/pets" },
      { label: "Pet Management", path: "/pets/management" },
    ],
  },
  {
    label: "Adoption Pipeline",
    items: [
      { label: "Adoption Applications", path: "/applications" },
      { label: "New Application", path: "/applications/new" },
    ],
  },
  {
    label: "People & Access",
    items: [{ label: "Manage Accounts", path: "/accounts", roles: ["admin", "super_admin"] }],
  },
];
