"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { useAuth } from "@/app/auth-context";

/* ─── Nav Data Types ─── */
interface NavChild {
  label: string;
  href: string;
  match?: RegExp;
  permission?: string;
  /** If set, only users whose role equals this value see the entry. */
  requireRole?: "ADMIN" | "MANAGER";
}

interface NavGroup {
  kind: "group";
  label: string;
  icon: LucideIcon;
  match: RegExp;
  permission?: string;
  /** If set, only users whose role equals this value see the entry. */
  requireRole?: "ADMIN" | "MANAGER";
  children: NavChild[];
}

interface NavDirect {
  kind: "direct";
  label: string;
  icon: LucideIcon;
  href: string;
  match: RegExp;
  permission?: string;
  /** If set, only users whose role equals this value see the entry. */
  requireRole?: "ADMIN" | "MANAGER";
}

type NavEntry = NavGroup | NavDirect;

/* ─── Nav Structure ─── */
const NAV_TOP: NavEntry[] = [
  {
    kind: "direct",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    match: /^\/dashboard/,
  },
  {
    kind: "group",
    label: "Sales",
    icon: ShoppingCart,
    match: /^\/sales/,
    children: [
      { label: "Receipts", href: "/sales/receipts", match: /^\/sales\/receipts/ },
    ],
  },
  {
    kind: "group",
    label: "Items",
    icon: Package,
    match: /^\/inventory/,
    children: [
      { label: "Item List", href: "/inventory", match: /^\/inventory$/ },
      { label: "Categories", href: "/inventory/categories", match: /^\/inventory\/categories/ },
      { label: "Brands", href: "/inventory/brands", match: /^\/inventory\/brands/ },
      { label: "Discounts", href: "/inventory/discounts", match: /^\/inventory\/discounts/ },
      { label: "Barcode Printing", href: "/inventory/barcode-printing", match: /^\/inventory\/barcode-printing/ },
      { label: "Tags", href: "/inventory/tags", match: /^\/inventory\/tags/ },
    ],
  },
  {
    kind: "group",
    label: "Inventory",
    icon: Warehouse,
    match: /^\/procurement/,
    children: [
      { label: "Stock Levels", href: "/procurement/stock-levels", match: /^\/procurement\/stock-levels/ },
      { label: "Purchase Orders", href: "/procurement/purchase-orders", match: /^\/procurement\/purchase-orders/ },
      { label: "Transfer Orders", href: "/procurement/transfer-orders", match: /^\/procurement\/transfer-orders/ },
      { label: "Stock Adjustments", href: "/procurement/stock-adjustments", match: /^\/procurement\/stock-adjustments/ },
      { label: "Inventory Counts", href: "/procurement/inventory-counts", match: /^\/procurement\/inventory-counts/ },
      { label: "Inventory History", href: "/procurement/inventory-history", match: /^\/procurement\/inventory-history/ },
    ],
  },
  {
    kind: "group",
    label: "Customers",
    icon: Users,
    match: /^\/customers/,
    children: [
      { label: "Customer List", href: "/customers", match: /^\/customers$/ },
      { label: "Customer Invoices", href: "/customers/invoices", match: /^\/customers\/invoices/ },
    ],
  },
  {
    kind: "group",
    label: "Suppliers",
    icon: Truck,
    match: /^\/suppliers|^\/ap/,
    children: [
      { label: "Supplier List", href: "/ap/suppliers", match: /^\/ap\/suppliers|^\/suppliers/ },
      { label: "Supplier Invoices", href: "/ap/invoices", match: /^\/ap\/invoices/ },
      { label: "Disbursement Vouchers", href: "/ap/disbursement-vouchers", match: /^\/ap\/disbursement-vouchers/ },
    ],
  },
  {
    kind: "group",
    label: "Reports",
    icon: BarChart3,
    match: /^\/reports/,
    children: [
      { label: "Sales by Item", href: "/reports/sales-by-item", match: /^\/reports\/sales-by-item/ },
      { label: "Sales by Category", href: "/reports/sales-by-category", match: /^\/reports\/sales-by-category/ },
      { label: "Sales by Payment", href: "/reports/sales-by-payment", match: /^\/reports\/sales-by-payment/ },
      { label: "Discount Analysis", href: "/reports/discount-analysis", match: /^\/reports\/discount-analysis/ },
      { label: "Inventory Valuation", href: "/reports/inventory-valuation", match: /^\/reports\/inventory-valuation/ },
    ],
  },
];

const NAV_BOTTOM: NavEntry[] = [
  {
    kind: "group",
    label: "Settings",
    icon: Settings,
    match: /^\/settings/,
    children: [
      { label: "General", href: "/settings", match: /^\/settings$/ },
      { label: "Locations", href: "/settings/locations", match: /^\/settings\/locations/ },
      { label: "Company Profile", href: "/settings/company", match: /^\/settings\/company/ },
      { label: "POS Devices", href: "/settings/devices", match: /^\/settings\/devices/ },
      { label: "Roles & Permissions", href: "/settings/roles", match: /^\/settings\/roles/ },
    ],
  },
];

/* ─── Helpers ─── */
function findExpandedGroups(pathname: string, entries: NavEntry[]): string[] {
  return entries
    .filter((e): e is NavGroup => e.kind === "group" && e.match.test(pathname))
    .map((g) => g.label);
}

function isChildActive(child: NavChild, pathname: string): boolean {
  return child.match
    ? child.match.test(pathname)
    : pathname === child.href || pathname.startsWith(child.href + "/");
}

/* ─── Sidebar Root ─── */
export function Sidebar() {
  const pathname = usePathname() ?? "";
  const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebar();
  const { user } = useAuth();
  // If no permissions data (legacy session), show everything — don't filter
  const userPermissions: string[] | null = user?.permissions && user.permissions.length > 0 ? user.permissions : null;
  const userRole = user?.role;

  // Shared helper: returns true if the current user should see this entry.
  // Both permission and requireRole must pass when set.
  const isEntryVisible = useCallback(
    (entry: NavEntry) => {
      if (entry.requireRole && userRole !== entry.requireRole) return false;
      if (userPermissions && entry.permission && !userPermissions.includes(entry.permission)) {
        return false;
      }
      return true;
    },
    [userPermissions, userRole],
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = [
      ...findExpandedGroups(pathname, NAV_TOP),
      ...findExpandedGroups(pathname, NAV_BOTTOM),
    ];
    // Accordion: only one group open at a time
    return initial.length > 0 ? new Set([initial[0]]) : new Set();
  });

  // Auto-expand group when navigating to a new route (accordion: only one open)
  useEffect(() => {
    const groups = [
      ...findExpandedGroups(pathname, NAV_TOP),
      ...findExpandedGroups(pathname, NAV_BOTTOM),
    ];
    if (groups.length > 0) {
      // Only keep the first matching group open (accordion)
      setExpanded(new Set([groups[0]]));
    }
  }, [pathname]);

  const toggleGroup = useCallback((label: string) => {
    setExpanded((prev) => {
      if (prev.has(label)) {
        // Clicking already-open group → close it
        return new Set<string>();
      } else {
        // Open this group, close everything else (accordion)
        return new Set<string>([label]);
      }
    });
  }, []);

  // Close mobile sidebar when navigating
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-out",
          // Desktop: always visible
          "md:translate-x-0",
          isCollapsed ? "md:w-16" : "md:w-[252px]",
          // Mobile: slide in/out
          isMobileOpen
            ? "translate-x-0 w-[252px]"
            : "-translate-x-full md:translate-x-0",
        )}
      >
      {/* Brand */}
      <div className={cn("flex h-14 items-center", isCollapsed ? "justify-center px-0" : "gap-2.5 px-5")}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-bold tracking-tight text-white shadow-sm">
          J
        </div>
        {!isCollapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-[13px] font-semibold leading-none tracking-tight text-sidebar-foreground-active">
              Jeff &amp; Julie
            </span>
            <span className="mt-0.5 text-[10px] leading-none text-sidebar-muted">
              Multi-Trade
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex flex-1 flex-col pt-2 pb-3", isCollapsed ? "px-1.5 overflow-visible" : "px-3 overflow-y-auto")}>
        {/* Top nav */}
        <div className="flex flex-col gap-px">
          {NAV_TOP.filter(isEntryVisible).map((entry) =>
            entry.kind === "group" ? (
              <NavGroupItem
                key={entry.label}
                entry={entry}
                pathname={pathname}
                isExpanded={expanded.has(entry.label)}
                onToggle={toggleGroup}
                isCollapsed={isCollapsed}
                userPermissions={userPermissions}
              />
            ) : (
              <NavDirectItem
                key={entry.label}
                entry={entry}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            ),
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom nav */}
        <div className="flex flex-col gap-px border-t border-sidebar-border pt-2 mt-2">
          {NAV_BOTTOM.filter(isEntryVisible).map((entry) =>
            entry.kind === "group" ? (
              <NavGroupItem
                key={entry.label}
                entry={entry}
                pathname={pathname}
                isExpanded={expanded.has(entry.label)}
                onToggle={toggleGroup}
                isCollapsed={isCollapsed}
                userPermissions={userPermissions}
              />
            ) : (
              <NavDirectItem
                key={entry.label}
                entry={entry}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            ),
          )}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className={cn("border-t border-sidebar-border p-2", isCollapsed && "flex justify-center")}>
        <button
          onClick={toggle}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13px] font-medium text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
            isCollapsed && "w-full justify-center px-0",
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} strokeWidth={1.75} className="shrink-0 text-sidebar-muted" />
          ) : (
            <>
              <PanelLeftClose size={16} strokeWidth={1.75} className="shrink-0 text-sidebar-muted" />
              <span className="truncate">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}

/* ─── Collapsible Group ─── */
function NavGroupItem({
  entry,
  pathname,
  isExpanded,
  onToggle,
  isCollapsed,
  userPermissions = [],
}: {
  entry: NavGroup;
  pathname: string;
  isExpanded: boolean;
  onToggle: (label: string) => void;
  isCollapsed: boolean;
  userPermissions?: string[] | null;
}) {
  // Filter children by permission (null = show all)
  const visibleChildren = !userPermissions
    ? entry.children
    : entry.children.filter(
        (child) => !child.permission || userPermissions.includes(child.permission),
      );
  if (visibleChildren.length === 0 && entry.children.length > 0) return null;
  const isGroupActive = entry.match.test(pathname);
  const Icon = entry.icon;

  /* ─── Collapsed: icon with flyout popover ─── */
  if (isCollapsed) {
    return (
      <div className="group relative mt-1 first:mt-0">
        {/* Icon button */}
        <div
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-lg transition-all duration-150",
            isGroupActive
              ? "bg-sidebar-accent text-sidebar-foreground-active shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
          )}
        >
          <Icon
            size={16}
            strokeWidth={isGroupActive ? 2 : 1.75}
            className={cn(
              "shrink-0",
              isGroupActive
                ? "text-sidebar-foreground-active"
                : "text-sidebar-muted group-hover:text-sidebar-foreground",
            )}
          />
        </div>

        {/* Flyout popover (CSS hover) */}
        <div className="invisible absolute left-full top-0 z-50 pl-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <div className="min-w-[200px] rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-xl">
            {/* Group label */}
            <div className="mb-1 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {entry.label}
            </div>
            {/* Children */}
            {visibleChildren.map((child) => {
              const active = isChildActive(child, pathname);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center rounded-md px-2.5 py-[6px] text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground-active"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
                  )}
                >
                  {active && (
                    <div className="mr-2 h-1 w-1 shrink-0 rounded-full bg-sidebar-foreground-active" />
                  )}
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Expanded: collapsible group ─── */
  return (
    <div className="mt-1 first:mt-0">
      {/* Group header (toggle) */}
      <button
        onClick={() => onToggle(entry.label)}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150",
          isGroupActive
            ? "text-sidebar-foreground-active"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
        )}
      >
        <Icon
          size={16}
          strokeWidth={isGroupActive ? 2 : 1.75}
          className={cn(
            "shrink-0 transition-colors",
            isGroupActive
              ? "text-sidebar-foreground-active"
              : "text-sidebar-muted group-hover:text-sidebar-foreground",
          )}
        />
        <span className="flex-1 truncate text-left">{entry.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn(
            "shrink-0 text-sidebar-muted transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {/* Collapsible children — CSS Grid animation */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-px pt-0.5 pb-1">
            {visibleChildren.map((child) => (
              <NavChildLink key={child.href} child={child} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Direct Link (no children) ─── */
function NavDirectItem({
  entry,
  pathname,
  isCollapsed,
}: {
  entry: NavDirect;
  pathname: string;
  isCollapsed: boolean;
}) {
  const active = entry.match.test(pathname);
  const Icon = entry.icon;

  if (isCollapsed) {
    return (
      <div className="group relative mt-1 first:mt-0">
        <Link
          href={entry.href}
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-lg transition-all duration-150",
            active
              ? "bg-sidebar-accent text-sidebar-foreground-active shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]"
              : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
          )}
        >
          <Icon
            size={16}
            strokeWidth={active ? 2 : 1.75}
            className={cn(
              "shrink-0",
              active
                ? "text-sidebar-foreground-active"
                : "text-sidebar-muted group-hover:text-sidebar-foreground",
            )}
          />
        </Link>

        {/* Tooltip */}
        <div className="invisible absolute left-full top-1/2 z-50 pl-2 -translate-y-1/2 whitespace-nowrap opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
          <div className="rounded-md border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-[12px] font-medium text-sidebar-foreground-active shadow-xl">
            {entry.label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={entry.href}
      className={cn(
        "group relative mt-1 first:mt-0 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-sidebar-accent text-sidebar-foreground-active shadow-[inset_0_0.5px_0_rgba(255,255,255,0.06)]"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-white/70" />
      )}
      <Icon
        size={16}
        strokeWidth={active ? 2 : 1.75}
        className={cn(
          "shrink-0 transition-colors",
          active
            ? "text-sidebar-foreground-active"
            : "text-sidebar-muted group-hover:text-sidebar-foreground",
        )}
      />
      <span className="truncate">{entry.label}</span>
    </Link>
  );
}

/* ─── Child Link (active state) ─── */
function NavChildLink({
  child,
  pathname,
}: {
  child: NavChild;
  pathname: string;
}) {
  const active = isChildActive(child, pathname);

  return (
    <Link
      href={child.href}
      className={cn(
        "relative flex items-center rounded-md pl-9 pr-2.5 py-[6px] text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-sidebar-accent text-sidebar-foreground-active"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground-active",
      )}
    >
      {active && (
        <div className="absolute left-[18px] top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-sidebar-foreground-active" />
      )}
      <span className="truncate">{child.label}</span>
    </Link>
  );
}
