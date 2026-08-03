"use client";

import type { ReactNode } from "react";
import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Package,
  FileText,
  Calculator,
  Stamp,
  UserCog,
  Settings,
  ShoppingCart,
  LogOut,
  Shield,
  Receipt,
  Wallet,
  Tags,
  Truck,
  Printer,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  ADMIN_ZONE_NAV_KEYS,
  nicheNavKeys,
  retailNavSections,
} from "@/lib/niches";
import type { Niche } from "@/lib/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavigationProgress } from "./NavigationProgress";
import { ExitAdminZoneButton } from "./ExitAdminZoneButton";
import { ClinicLogoMark, type LogoShape } from "@/components/ClinicLogoMark";
import { signOutAction } from "@/app/actions";
import { cn } from "@/lib/utils";

const icons: Record<string, ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  customers: <Users size={18} />,
  appointments: <CalendarDays size={18} />,
  inventory: <Package size={18} />,
  invoices: <FileText size={18} />,
  accounting: <Calculator size={18} />,
  lhdn: <Stamp size={18} />,
  staff: <UserCog size={18} />,
  settings: <Settings size={18} />,
  admin: <Shield size={18} />,
  pos: <ShoppingCart size={18} />,
  receipts: <Receipt size={18} />,
  cash: <Wallet size={18} />,
  categories: <Tags size={18} />,
  logistics: <Truck size={18} />,
  printers: <Printer size={18} />,
};

const hrefMap: Record<string, string> = {
  dashboard: "/dashboard",
  customers: "/customers",
  appointments: "/appointments",
  inventory: "/inventory",
  invoices: "/invoices",
  accounting: "/accounting",
  lhdn: "/lhdn",
  staff: "/staff",
  settings: "/settings",
  admin: "/admin",
  pos: "/pos",
  receipts: "/receipts",
  cash: "/cash",
  categories: "/categories",
  logistics: "/logistics",
  printers: "/printers",
};

function NavItem({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      prefetch
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={cn("row", pending && "nav-link-pending")}
      style={{
        padding: "0.7rem 0.85rem",
        borderRadius: 12,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--ink)",
        fontWeight: active ? 600 : 500,
        transition: "background 120ms ease, opacity 120ms ease",
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        marginTop: first ? "0.15rem" : "1.15rem",
        marginBottom: "0.25rem",
        borderTop: first ? "none" : "1px solid var(--line)",
        paddingTop: first ? 0 : "0.75rem",
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: "0.7rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          padding: "0 0.85rem 0.35rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function AppShell({
  niche,
  orgName,
  orgLogoUrl,
  orgLogoShape,
  role,
  adminZoneUnlocked = false,
  children,
}: {
  niche: Niche;
  orgName: string;
  orgLogoUrl?: string | null;
  orgLogoShape?: LogoShape | null;
  role?: string;
  adminZoneUnlocked?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const tBrand = useTranslations("Brand");
  const pathname = usePathname();
  const canSeeAdminZone =
    role === "owner" ||
    role === "admin" ||
    role === "supervisor" ||
    role === "manager";

  function labelFor(key: string) {
    return key === "customers" && niche === "clinic"
      ? t("patients")
      : t(key as "dashboard");
  }

  function renderNavItem(key: string) {
    const href = hrefMap[key];
    if (!href) return null;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <NavItem
        key={key}
        href={href}
        active={active}
        label={labelFor(key)}
        icon={icons[key]}
      />
    );
  }

  useEffect(() => {
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `allvisor_niche=${niche}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `allvisor_org=${encodeURIComponent(orgName)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.documentElement.dataset.niche = niche;
  }, [niche, orgName]);

  return (
    <div data-niche={niche} className="min-h-screen">
      <NavigationProgress />
      <div className="app-grid">
        <aside
          className="surface"
          style={{
            margin: "1rem",
            padding: "1.25rem 1rem",
            position: "sticky",
            top: "1rem",
            height: "calc(100vh - 2rem)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            overflow: "hidden",
          }}
        >
          <div className="brand-lockup">
            <ClinicLogoMark
              url={orgLogoUrl}
              shape={orgLogoShape}
              size={42}
              alt={orgName}
            />
            <div className="brand-lockup__text">
              <div className="brand-lockup__product">{tBrand("name")}</div>
              <div className="brand-lockup__org" title={orgName}>
                {orgName}
              </div>
            </div>
          </div>

          <nav
            className="stack"
            style={{
              gap: "0.35rem",
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
              paddingRight: 2,
            }}
          >
            {niche === "retail"
              ? retailNavSections.map((section, index) => {
                  const keys = section.keys.filter((key) => {
                    if (!ADMIN_ZONE_NAV_KEYS.has(key)) return true;
                    return canSeeAdminZone;
                  });
                  if (!keys.length) return null;
                  return (
                    <div key={section.id} className="stack" style={{ gap: "0.35rem" }}>
                      <SectionLabel first={index === 0}>
                        {t(section.labelKey)}
                      </SectionLabel>
                      {keys.map((key) => renderNavItem(key))}
                      {section.id === "admin" && adminZoneUnlocked ? (
                        <div style={{ marginTop: "0.35rem" }}>
                          <ExitAdminZoneButton label={t("exitAdminZone")} />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              : nicheNavKeys.clinic
                  .filter((key) => {
                    if (!ADMIN_ZONE_NAV_KEYS.has(key)) return true;
                    return canSeeAdminZone;
                  })
                  .map((key) => {
                    const startAdminZone = key === "admin";
                    return (
                      <div key={key} className="stack" style={{ gap: "0.35rem" }}>
                        {startAdminZone ? (
                          <SectionLabel>{t("adminZone")}</SectionLabel>
                        ) : null}
                        {renderNavItem(key)}
                        {key === "lhdn" && canSeeAdminZone && adminZoneUnlocked ? (
                          <div style={{ marginTop: "0.35rem" }}>
                            <ExitAdminZoneButton label={t("exitAdminZone")} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
          </nav>

          <div className="stack" style={{ gap: "0.75rem" }}>
            <LanguageSwitcher />
            <form action={signOutAction}>
              <button type="submit" className="btn btn-ghost" style={{ width: "100%" }}>
                <LogOut size={16} />
                {t("logout")}
              </button>
            </form>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
