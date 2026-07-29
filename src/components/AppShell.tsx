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
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { nicheNavKeys } from "@/lib/niches";
import type { Niche } from "@/lib/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavigationProgress } from "./NavigationProgress";
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

export function AppShell({
  niche,
  orgName,
  role,
  children,
}: {
  niche: Niche;
  orgName: string;
  role?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const tBrand = useTranslations("Brand");
  const pathname = usePathname();
  const keys = nicheNavKeys[niche].filter((key) => {
    if (key !== "admin" && key !== "accounting" && key !== "lhdn") return true;
    return (
      role === "owner" ||
      role === "admin" ||
      role === "supervisor" ||
      role === "manager"
    );
  });

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
          }}
        >
          <div>
            <div className="display" style={{ fontSize: "1.55rem" }}>
              {tBrand("name")}
            </div>
            <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {orgName}
            </div>
          </div>

          <nav className="stack" style={{ gap: "0.35rem", flex: 1 }}>
            {keys.map((key) => {
              const href = hrefMap[key];
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const label =
                key === "customers" && niche === "clinic"
                  ? t("patients")
                  : t(key as "dashboard");
              return (
                <NavItem
                  key={key}
                  href={href}
                  active={active}
                  label={label}
                  icon={icons[key]}
                />
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
