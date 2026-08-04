"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DashboardAiPanel } from "@/components/DashboardAiPanel";
import { DailyClosePanel } from "@/components/DailyClosePanel";
import {
  DashboardRecentInvoices,
  DashboardUpcomingAppointments,
  DashboardTodaySales,
  DashboardTopSellers,
} from "@/components/DashboardLists";
import { DayHourTimetable } from "@/components/DayHourTimetable";
import { ClinicLogoMark } from "@/components/ClinicLogoMark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getNavSectionsForNiche, hasCapability, vocabLabels } from "@/lib/niches";
import { NAV_HREF } from "@/lib/niche-capabilities";
import { formatCurrency, nicheThemeAttr } from "@/lib/utils";
import type { Niche } from "@/lib/types";

export type PreviewNiche = Extract<Niche, "clinic" | "retail" | "gym">;

const PRESETS: PreviewNiche[] = ["clinic", "retail", "gym"];

/** Real desktop canvas width — scaled down to fit the hero frame. */
const STAGE_W = 1280;

const ORG: Record<PreviewNiche, string> = {
  clinic: "Klinik Harmoni",
  retail: "ProSupply Mart",
  gym: "Palio Fitness",
};

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
};

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

function hrefToView(href: string): string {
  const clean = href.replace(/\/$/, "") || "/dashboard";
  if (clean === "/dashboard" || clean.endsWith("/dashboard")) return "dashboard";
  const parts = clean.split("/").filter(Boolean);
  return parts[parts.length - 1] || "dashboard";
}

const DEMO_INVOICES = [
  {
    id: "1",
    title: "Consult + meds",
    invoice_number: "INV-1042",
    status: "paid",
    total: 85,
    created_at: "2026-08-04T09:12:00+08:00",
  },
  {
    id: "2",
    title: "Walk-in treatment",
    invoice_number: "INV-1041",
    status: "unpaid",
    total: 120,
    created_at: "2026-08-04T08:40:00+08:00",
  },
  {
    id: "3",
    title: "Follow-up",
    invoice_number: "INV-1040",
    status: "partial",
    total: 60,
    created_at: "2026-08-03T16:20:00+08:00",
  },
  {
    id: "4",
    title: "Lab panel",
    invoice_number: "INV-1039",
    status: "paid",
    total: 95,
    created_at: "2026-08-03T11:05:00+08:00",
  },
  {
    id: "5",
    title: "Procedure",
    invoice_number: "INV-1038",
    status: "paid",
    total: 45,
    created_at: "2026-08-02T15:30:00+08:00",
  },
];

const DEMO_APPTS_SLOTS = [
  { id: "a1", title: "Consult", h: 9, m: 0, dur: 30, name: "Nurul Aisyah", risk: "low" as const, allergies: null as string | null },
  { id: "a2", title: "Follow-up", h: 10, m: 30, dur: 30, name: "Rajesh K.", risk: "medium" as const, allergies: "Penicillin" },
  { id: "a3", title: "Walk-in", h: 14, m: 0, dur: 20, name: "Lim Wei", risk: "low" as const, allergies: null },
  { id: "a4", title: "Consult", h: 16, m: 30, dur: 30, name: "Aina Rahman", risk: "high" as const, allergies: "Nuts" },
];

function demoAppointments(day: Date) {
  return DEMO_APPTS_SLOTS.map((slot) => {
    const start = new Date(day);
    start.setHours(slot.h, slot.m, 0, 0);
    const end = new Date(start.getTime() + slot.dur * 60000);
    return {
      id: slot.id,
      title: slot.title,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
      customers: {
        name: slot.name,
        risk_level: slot.risk,
        allergies: slot.allergies,
      },
    };
  });
}

const DEMO_SALES = [
  {
    id: "s1",
    label: "Counter sale",
    customer: "Walk-in",
    amount: 86,
    paid_at: "2026-08-04T10:12:00+08:00",
  },
  {
    id: "s2",
    label: "Counter sale",
    customer: "Cash",
    amount: 42.5,
    paid_at: "2026-08-04T11:05:00+08:00",
  },
  {
    id: "s3",
    label: "QR payment",
    customer: "Mei Ling",
    amount: 125,
    paid_at: "2026-08-04T12:40:00+08:00",
  },
  {
    id: "s4",
    label: "Counter sale",
    customer: "Walk-in",
    amount: 18.9,
    paid_at: "2026-08-04T14:18:00+08:00",
  },
];

const DEMO_TOP = [
  { name: "Cable 2m", units: 38 },
  { name: "Adapter USB-C", units: 22 },
  { name: "Tape pack", units: 19 },
  { name: "Power bank", units: 14 },
];

const LIST_ROWS: Record<string, Array<[string, string, string]>> = {
  customers: [
    ["PT-081", "Aina Rahman", "Active"],
    ["PT-080", "Lim Wei", "Active"],
    ["PT-079", "Siti Aminah", "New"],
    ["PT-078", "Tan Mei Ling", "Active"],
    ["PT-077", "Hafiz Omar", "Inactive"],
  ],
  appointments: [
    ["09:00", "Nurul Aisyah · R1", "Confirmed"],
    ["10:30", "Rajesh K. · R2", "Confirmed"],
    ["11:15", "Walk-in", "Waiting"],
    ["14:00", "Lim Wei · R1", "Booked"],
    ["16:30", "Aina Rahman · R3", "Booked"],
  ],
  invoices: [
    ["INV-1042", "Aina Rahman", "RM 85 · Paid"],
    ["INV-1041", "Dr walk-in", "RM 120 · Unpaid"],
    ["INV-1040", "Lim Wei", "RM 60 · Partial"],
    ["INV-1039", "Siti Aminah", "RM 95 · Paid"],
    ["INV-1038", "Tan Mei Ling", "RM 45 · Paid"],
  ],
  inventory: [
    ["SKU-12", "Cable 2m", "5 left"],
    ["SKU-07", "Adapter USB-C", "3 left"],
    ["SKU-21", "Tape pack", "8 left"],
    ["SKU-44", "Power bank", "2 left"],
    ["SKU-09", "Mouse pad", "6 left"],
  ],
  pos: [
    ["POS-8821", "Counter 1 · Cash", "RM 86.00"],
    ["POS-8820", "Counter 2 · QR", "RM 42.50"],
    ["POS-8819", "Counter 1 · Card", "RM 125.00"],
    ["POS-8818", "Counter 2 · Cash", "RM 18.90"],
  ],
  cash: [
    ["Open", "08:00", "RM 200.00"],
    ["Sale", "POS-8821", "+ RM 86.00"],
    ["Sale", "POS-8820", "+ RM 42.50"],
    ["Float", "Top-up", "+ RM 50.00"],
    ["Expected", "Close", "RM 378.50"],
  ],
  memberships: [
    ["MEM-220", "Hafiz Omar", "Active"],
    ["MEM-219", "Mei Ling", "Active"],
    ["MEM-218", "Amir Razak", "Due soon"],
    ["MEM-217", "Siti Noor", "Frozen"],
  ],
  classes: [
    ["06:30", "HIIT · Studio A", "14/16"],
    ["09:00", "Yoga · Studio B", "11/12"],
    ["12:00", "Spin · Bike room", "8/10"],
    ["19:00", "HIIT · Studio A", "12/16"],
  ],
  checkins: [
    ["18:02", "Hafiz Omar", "Gate A"],
    ["18:05", "Mei Ling", "Gate A"],
    ["18:11", "Amir Razak", "Gate B"],
    ["18:20", "Siti Noor", "Gate A"],
  ],
  receipts: [
    ["RCP-441", "Counter 1", "RM 86.00"],
    ["RCP-440", "Counter 2", "RM 42.50"],
    ["RCP-439", "Counter 1", "RM 125.00"],
  ],
  categories: [
    ["CAT-01", "Cables", "12 SKUs"],
    ["CAT-02", "Adapters", "8 SKUs"],
    ["CAT-03", "Accessories", "21 SKUs"],
  ],
  logistics: [
    ["SHP-12", "Supplier A", "In transit"],
    ["SHP-11", "Supplier B", "Received"],
    ["SHP-10", "Returns", "Pending"],
  ],
  printers: [
    ["PTR-1", "Front counter", "Online"],
    ["PTR-2", "Back office", "Offline"],
  ],
  accounting: [
    ["Income", "August", "RM 12,480"],
    ["Expense", "August", "RM 4,210"],
    ["Net", "August", "RM 8,270"],
  ],
  lhdn: [
    ["INV-1042", "Submitted", "Accepted"],
    ["INV-1040", "Pending", "Awaiting"],
    ["INV-1038", "Submitted", "Accepted"],
  ],
  admin: [
    ["Staff", "Dr. Amin", "Owner"],
    ["Staff", "Nurse Farah", "Staff"],
    ["Org", "TIN", "Set"],
  ],
};

/** Full-size interactive replica of the real Allvisor app shell + dashboard. */
export function HomeDashboardPreview({
  niche,
  onNicheChange,
}: {
  niche: PreviewNiche;
  onNicheChange: (niche: PreviewNiche) => void;
}) {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");
  const tDash = useTranslations("Dashboard");
  const tBrand = useTranslations("Brand");
  const locale = useLocale();
  const [view, setView] = useState("dashboard");
  const index = PRESETS.indexOf(niche);
  const orgName = ORG[niche];
  const canAppointments = hasCapability(niche, "appointments");
  const canPos = hasCapability(niche, "pos");
  const V = vocabLabels(niche, locale);
  const sections = useMemo(() => getNavSectionsForNiche(niche), [niche]);
  const now = useMemo(() => new Date(), []);
  const demoAppts = useMemo(() => demoAppointments(now), [now]);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [stageH, setStageH] = useState(900);
  const [asideH, setAsideH] = useState(720);

  useEffect(() => {
    setView("dashboard");
  }, [niche]);

  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;

    const update = () => {
      const next = Math.min(1, frame.clientWidth / STAGE_W);
      setScale(next > 0 ? next : 1);
      setStageH(stage.scrollHeight || 900);
      setAsideH(Math.max(640, frame.clientHeight / Math.max(next, 0.01) - 32));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(frame);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [niche, view]);

  function go(delta: number) {
    onNicheChange(PRESETS[(index + delta + PRESETS.length) % PRESETS.length]);
  }

  function labelFor(key: string) {
    if (key === "customers") return V.entityTitle;
    if (key === "appointments") return V.schedule;
    try {
      return tNav(key as "dashboard");
    } catch {
      return key;
    }
  }

  function openFromHref(href: string) {
    setView(hrefToView(href));
  }

  function onDemoClick(e: React.MouseEvent) {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    e.stopPropagation();
    // strip locale prefix if present
    const path = href.replace(/^\/(en|ms)(?=\/|$)/, "") || "/dashboard";
    openFromHref(path.startsWith("/") ? path : `/${path}`);
  }

  const listRows = LIST_ROWS[view] || LIST_ROWS.customers;

  return (
    <div className="home-demo" data-niche={nicheThemeAttr(niche)}>
      <div className="home-demo__carousel" aria-label={t("demoTabsLabel")}>
        <button type="button" className="home-demo__arrow" aria-label={t("demoPrev")} onClick={() => go(-1)}>
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <div className="home-demo__tabs" role="tablist">
          {PRESETS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={niche === id}
              className="home-demo__tab"
              data-active={niche === id ? "true" : "false"}
              onClick={() => onNicheChange(id)}
            >
              {t(`demoTab.${id}` as "demoTab.clinic")}
            </button>
          ))}
        </div>
        <button type="button" className="home-demo__arrow" aria-label={t("demoNext")} onClick={() => go(1)}>
          <ChevronRight size={20} strokeWidth={2.75} />
        </button>
      </div>

      <div
        ref={frameRef}
        className="home-demo__viewport"
        style={{ ["--home-demo-scale" as string]: scale }}
        onClick={onDemoClick}
      >
        <div className="home-demo__badge">{t("demoLive")}</div>
        <div className="home-demo__sizer" style={{ height: stageH * scale }}>
          <div
            ref={stageRef}
            className="home-demo__stage"
            style={{
              width: STAGE_W,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="app-grid home-demo__grid">
          <aside
            className="surface"
            style={{
              margin: "1rem",
              padding: "1.25rem 1rem",
              position: "sticky",
              top: "1rem",
              height: asideH,
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              overflow: "hidden",
            }}
          >
            <div className="brand-lockup">
              <ClinicLogoMark url={null} shape="round" size={42} alt={orgName} />
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
              {sections.map((section, sectionIndex) => {
                if (!section.keys.length) return null;
                return (
                  <div key={section.id} className="stack" style={{ gap: "0.35rem" }}>
                    <SectionLabel first={sectionIndex === 0}>{tNav(section.labelKey)}</SectionLabel>
                    {section.keys.map((key) => {
                      const href = NAV_HREF[key] || `/dashboard`;
                      const active = view === hrefToView(href) || (view === "dashboard" && key === "dashboard");
                      return (
                        <button
                          key={key}
                          type="button"
                          className="row nav-item"
                          data-active={active ? "true" : "false"}
                          onClick={() => setView(hrefToView(href))}
                          style={{ width: "100%", border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}
                        >
                          {icons[key] || <ScanBarcode size={18} />}
                          <span>{labelFor(key)}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            <div className="stack" style={{ gap: "0.75rem" }}>
              <LanguageSwitcher />
              <button type="button" className="btn btn-ghost" style={{ width: "100%" }} disabled>
                <LogOut size={16} />
                {tNav("logout")}
              </button>
            </div>
          </aside>

          <main className="app-main">
            <div className="app-content">
              {view === "dashboard" ? (
                <div className="stack" style={{ gap: "1.25rem" }}>
                  <PageHeader title={`${tDash("welcome")}, ${orgName}`} subtitle={orgName} />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.85rem",
                      alignItems: "stretch",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.65rem",
                        flex: "1 1 280px",
                        minWidth: 0,
                      }}
                    >
                      {canAppointments && !canPos ? (
                        <div className="surface kpi" style={{ margin: 0 }}>
                          <div className="kpi-label">{tDash("appointmentsToday")}</div>
                          <div className="kpi-value">12</div>
                        </div>
                      ) : (
                        <div className="surface kpi" style={{ margin: 0 }}>
                          <div className="kpi-label">{tDash("salesToday")}</div>
                          <div className="kpi-value">{formatCurrency(canPos ? 2450 : 1280)}</div>
                        </div>
                      )}
                      <div className="surface kpi" style={{ margin: 0 }}>
                        <div className="kpi-label">{tDash("unpaidInvoices")}</div>
                        <div className="kpi-value">3</div>
                      </div>
                      <div className="surface kpi" style={{ margin: 0 }}>
                        <div className="kpi-label">{V.entityTitle}</div>
                        <div className="kpi-value">{niche === "gym" ? 186 : niche === "retail" ? 420 : 248}</div>
                      </div>
                      <div className="surface kpi" style={{ margin: 0 }}>
                        <div className="kpi-label">{tDash("lowStock")}</div>
                        <div className="kpi-value">{canPos ? 5 : niche === "clinic" ? 2 : 0}</div>
                      </div>
                    </div>

                    <DashboardAiPanel
                      title={tDash("aiTitle")}
                      data={{
                        niche,
                        patients: niche === "gym" ? 186 : niche === "retail" ? 420 : 248,
                        unpaidInvoices: 3,
                        lowStock: canPos ? 5 : niche === "clinic" ? 2 : 0,
                        lowStockNames: canPos
                          ? ["Cable 2m", "Adapter USB-C", "Power bank"]
                          : niche === "clinic"
                            ? ["Gloves M", "Saline"]
                            : [],
                        income: 12480,
                        expense: 4210,
                        appointmentsToday: canAppointments ? 12 : 0,
                        lhdnPending: 1,
                        orgHasTin: true,
                      }}
                    />
                  </div>

                  <DailyClosePanel
                    title={tDash("dailyClose")}
                    subtitle={tDash("dailyCloseHint")}
                    incomeToday={canPos ? 2450 : 1280}
                    unpaidCount={3}
                    unpaidTotal={265}
                    noShowToday={canAppointments ? 1 : -1}
                    txnToday={canPos ? 47 : -1}
                    lowStockNames={
                      canPos
                        ? ["Cable 2m", "Adapter USB-C", "Power bank", "Tape pack", "Mouse pad"]
                        : niche === "clinic"
                          ? ["Gloves M", "Saline"]
                          : []
                    }
                    lhdnPendingCount={1}
                    lhdnRejectedCount={0}
                    labels={{
                      income: tDash("closeIncome"),
                      unpaid: tDash("closeUnpaid"),
                      noShow: tDash("closeNoShow"),
                      txnToday: tDash("closeTxnToday"),
                      lowStock: tDash("closeLowStock"),
                      lhdnPending: tDash("closeLhdnPending"),
                      lhdnRejected: tDash("closeLhdnRejected"),
                      none: tDash("closeNone"),
                      openInvoices: tDash("closeOpenInvoices"),
                      openInventory: tDash("closeOpenInventory"),
                      openLhdn: tDash("closeOpenLhdn"),
                      openPos: canPos ? tDash("closeOpenPos") : undefined,
                    }}
                  />

                  <div className="row">
                    <span className="muted">{tDash("quickActions")}:</span>
                    <button type="button" className="btn btn-soft" onClick={() => setView("customers")}>
                      {V.entityTitle}
                    </button>
                    <button type="button" className="btn btn-soft" onClick={() => setView("invoices")}>
                      Invoices
                    </button>
                    {canAppointments ? (
                      <button type="button" className="btn btn-soft" onClick={() => setView("appointments")}>
                        {V.schedule}
                      </button>
                    ) : null}
                    {canPos ? (
                      <button type="button" className="btn btn-soft" onClick={() => setView("pos")}>
                        POS
                      </button>
                    ) : null}
                  </div>

                  {canAppointments ? (
                    <DayHourTimetable
                      date={now}
                      appointments={demoAppts}
                      orientation="horizontal"
                      hoursConfig={{
                        openHour: 8,
                        closeHour: 18,
                        closedWeekdays: [],
                        locale,
                      }}
                      labels={{
                        timetable: tDash("miniTimetable"),
                        occupied: tDash("occupied"),
                        free: tDash("free"),
                        closed: tDash("clinicClosed"),
                        publicHoliday: tDash("publicHoliday"),
                      }}
                    />
                  ) : null}

                  <div className="fluid-grid">
                    <DashboardRecentInvoices title={tDash("recentInvoices")} invoices={DEMO_INVOICES} />
                    {canAppointments && !canPos ? (
                      <DashboardUpcomingAppointments
                        title={tDash("upcomingAppointments")}
                        items={demoAppts}
                      />
                    ) : canPos ? (
                      <DashboardTodaySales
                        title={tDash("todaySales")}
                        empty={tDash("todaySalesEmpty")}
                        rows={DEMO_SALES}
                      />
                    ) : (
                      <DashboardUpcomingAppointments
                        title={tDash("upcomingAppointments")}
                        items={demoAppts.slice(0, 2)}
                      />
                    )}
                  </div>

                  {canPos ? (
                    <DashboardTopSellers
                      title={tDash("topSellers")}
                      empty={tDash("topSellersEmpty")}
                      rows={DEMO_TOP}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="stack" style={{ gap: "1.25rem" }}>
                  <PageHeader
                    title={labelFor(view === "customers" ? "customers" : view)}
                    subtitle={orgName}
                  />
                  <div className="surface" style={{ padding: "1.25rem" }}>
                    <div className="table-wrap">
                      <table className="data">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Detail</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listRows.map((row) => (
                            <tr key={`${row[0]}-${row[1]}`}>
                              <td>{row[0]}</td>
                              <td>{row[1]}</td>
                              <td>
                                <span className="badge">{row[2]}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
