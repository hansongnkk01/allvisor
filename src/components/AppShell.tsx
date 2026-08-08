"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Package,
  FileText,
  Calculator,
  Stamp,
  ShoppingCart,
  LogOut,
  Shield,
  Receipt,
  Wallet,
  Tags,
  Truck,
  Printer,
  Percent,
  FlaskConical,
  Eye,
  Microscope,
  GraduationCap,
  Wrench,
  Car,
  BadgeCheck,
  PawPrint,
  Shirt,
  Cpu,
  Layers,
  Droplets,
  Boxes,
  ClipboardList,
  Utensils,
  BedDouble,
  Building2,
  PackageSearch,
  HardHat,
  Factory,
  Scale,
  PartyPopper,
  Sprout,
  BookOpen,
  ClipboardCheck,
  ScanBarcode,
  UsersRound,
  TrendingUp,
  PiggyBank,
  Megaphone,
  BellRing,
  Menu,
  X,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  getNavSectionsForNiche,
  vocabLabels,
} from "@/lib/niches";
import { navHrefFor } from "@/lib/niche-capabilities";
import type { Audience, Niche } from "@/lib/types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavigationProgress } from "./NavigationProgress";
import { ExitAdminZoneButton } from "./ExitAdminZoneButton";
import { AiChatWidget } from "@/components/AiChatWidget";
import { BrandLogo } from "@/components/BrandLogo";
import { ClinicLogoMark, type LogoShape } from "@/components/ClinicLogoMark";
import { signOutAction } from "@/app/actions";
import { cn, nicheThemeAttr } from "@/lib/utils";

const icons: Record<string, ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  customers: <Users size={18} />,
  appointments: <CalendarDays size={18} />,
  inventory: <Package size={18} />,
  invoices: <FileText size={18} />,
  accounting: <Calculator size={18} />,
  lhdn: <Stamp size={18} />,
  admin: <Shield size={18} />,
  pos: <ShoppingCart size={18} />,
  receipts: <Receipt size={18} />,
  cash: <Wallet size={18} />,
  categories: <Tags size={18} />,
  logistics: <Truck size={18} />,
  printers: <Printer size={18} />,
  commissions: <Percent size={18} />,
  batches: <FlaskConical size={18} />,
  eyeRx: <Eye size={18} />,
  labOrders: <Microscope size={18} />,
  classes: <GraduationCap size={18} />,
  subjects: <BookOpen size={18} />,
  attendance: <ClipboardList size={18} />,
  assessments: <ClipboardCheck size={18} />,
  jobs: <Wrench size={18} />,
  vehicles: <Car size={18} />,
  memberships: <BadgeCheck size={18} />,
  checkins: <BadgeCheck size={18} />,
  pets: <PawPrint size={18} />,
  variants: <Shirt size={18} />,
  serials: <Cpu size={18} />,
  priceTiers: <Layers size={18} />,
  laundry: <Droplets size={18} />,
  packages: <Boxes size={18} />,
  labResults: <FlaskConical size={18} />,
  tables: <Utensils size={18} />,
  rooms: <BedDouble size={18} />,
  listings: <Building2 size={18} />,
  shipments: <PackageSearch size={18} />,
  projects: <HardHat size={18} />,
  workOrders: <Factory size={18} />,
  matters: <Scale size={18} />,
  events: <PartyPopper size={18} />,
  plots: <Sprout size={18} />,
  team: <UsersRound size={18} />,
  performance: <TrendingUp size={18} />,
  cashflow: <PiggyBank size={18} />,
  money: <PiggyBank size={18} />,
  marketing: <Megaphone size={18} />,
  alerts: <BellRing size={18} />,
};

function NavItem({
  href,
  active,
  label,
  icon,
  onNavigate,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: ReactNode;
  onNavigate?: () => void;
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
        onNavigate?.();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={cn("row nav-item", pending && "nav-link-pending")}
      data-active={active ? "true" : "false"}
    >
      {icon || <ScanBarcode size={18} />}
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
  audience = "staff",
  adminZoneUnlocked = false,
  opsBrainEnabled = false,
  children,
}: {
  niche: Niche;
  orgName: string;
  orgLogoUrl?: string | null;
  orgLogoShape?: LogoShape | null;
  audience?: Audience;
  adminZoneUnlocked?: boolean;
  /** Owner chat widget mounts only for the admin audience with Ops Brain on. */
  opsBrainEnabled?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const sections = getNavSectionsForNiche(niche, audience);
  const V = vocabLabels(niche, locale);

  function labelFor(key: string) {
    if (key === "customers") return V.entityTitle;
    if (key === "appointments") return V.schedule;
    try {
      return t(key as "dashboard");
    } catch {
      return key;
    }
  }

  useEffect(() => {
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `allvisor_niche=${niche}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `allvisor_org=${encodeURIComponent(orgName)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.documentElement.dataset.niche = nicheThemeAttr(niche);
  }, [niche, orgName]);

  return (
    <div data-niche={nicheThemeAttr(niche)} className="min-h-screen">
      <NavigationProgress />

      {/* Narrow screens get a compact bar instead of a full-height sidebar eating the page. */}
      <header className="app-topbar">
        <button
          type="button"
          className="app-topbar__menu"
          onClick={() => setMenuOpen(true)}
          aria-label={t("openMenu")}
          aria-expanded={menuOpen}
        >
          <Menu size={20} />
        </button>
        <div className="app-topbar__brand">
          <ClinicLogoMark url={orgLogoUrl} shape={orgLogoShape} size={28} alt={orgName} />
          <span className="app-topbar__org" title={orgName}>
            {orgName}
          </span>
        </div>
      </header>

      <div className="app-grid" data-menu-open={menuOpen ? "true" : "false"}>
        {menuOpen ? (
          <button
            type="button"
            className="app-drawer-backdrop"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
        <aside
          className="surface app-aside"
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
          <button
            type="button"
            className="app-aside__close"
            aria-label={t("closeMenu")}
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>

          <div className="brand-lockup">
            <ClinicLogoMark
              url={orgLogoUrl}
              shape={orgLogoShape}
              size={42}
              alt={orgName}
            />
            <div className="brand-lockup__text">
              <div className="brand-lockup__product">
                <BrandLogo size="lockup" />
              </div>
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
            {sections.map((section, index) => {
              // The Manager Zone stays visible to every role: the pages behind it
              // are locked by the manager password, so the link itself is harmless
              // and a supervisor can unlock it from any staff account.
              const keys = section.keys;
              if (!keys.length) return null;
              return (
                <div key={section.id} className="stack" style={{ gap: "0.35rem" }}>
                  <SectionLabel first={index === 0}>{t(section.labelKey)}</SectionLabel>
                  {keys.map((key) => {
                    const href = navHrefFor(key, audience);
                    if (!href) return null;
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <NavItem
                        key={key}
                        href={href}
                        active={active}
                        label={labelFor(key)}
                        icon={icons[key]}
                        onNavigate={() => setMenuOpen(false)}
                      />
                    );
                  })}
                  {section.id === "admin" && adminZoneUnlocked ? (
                    <div style={{ marginTop: "0.35rem" }}>
                      <ExitAdminZoneButton
                        label={audience === "admin" ? t("exitAdminZone") : t("exitManagerZone")}
                      />
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

      {audience === "admin" && opsBrainEnabled ? <AiChatWidget /> : null}
    </div>
  );
}
