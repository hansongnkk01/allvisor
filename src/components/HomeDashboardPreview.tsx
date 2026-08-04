"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { HomeDemoPage } from "@/components/HomeDemoPages";
import { NICHES } from "@/lib/niches";
import { DEMO_ORG, LANDING_TITLE_KEY } from "@/lib/demo-orgs";
import type { Niche } from "@/lib/types";

export type PreviewNiche = Niche;

const AUTO_NEXT_MS = 3000;
const CAROUSEL_TRANSITION_MS = 420;

/** Real desktop canvas width — scaled down to fit the hero frame. */
const STAGE_W = 1280;

function wrapNicheIndex(i: number) {
  const n = NICHES.length;
  return ((i % n) + n) % n;
}

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

const HREF_SEGMENT_TO_VIEW: Record<string, string> = Object.fromEntries(
  Object.entries(NAV_HREF).map(([key, href]) => {
    const seg = href.replace(/^\//, "").split("/").filter(Boolean).pop() || key;
    return [seg, key];
  })
);

function hrefToView(href: string): string {
  const clean = href.replace(/\/$/, "") || "/dashboard";
  if (clean === "/dashboard" || clean.endsWith("/dashboard")) return "dashboard";
  const parts = clean.split("/").filter(Boolean);
  const seg = parts[parts.length - 1] || "dashboard";
  return HREF_SEGMENT_TO_VIEW[seg] || seg;
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
  { name: "Paracetamol 500mg", units: 38 },
  { name: "Saline 500ml", units: 22 },
  { name: "Gloves M", units: 19 },
  { name: "Alcohol swab", units: 14 },
];

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
  const tLanding = useTranslations("Landing");
  const locale = useLocale();
  const [view, setView] = useState("dashboard");
  const orgName = DEMO_ORG[niche];
  const canAppointments = hasCapability(niche, "appointments");
  const canPos = hasCapability(niche, "pos");
  const V = vocabLabels(niche, locale);
  const sections = useMemo(() => getNavSectionsForNiche(niche), [niche]);
  const now = useMemo(() => new Date(), []);
  const demoAppts = useMemo(() => demoAppointments(now), [now]);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [stageH, setStageH] = useState(800);
  const [asideH, setAsideH] = useState(720);
  const [centerIdx, setCenterIdx] = useState(() => Math.max(0, NICHES.indexOf(niche)));
  const [phase, setPhase] = useState<"idle" | "next" | "prev">("idle");
  const [hoverPaused, setHoverPaused] = useState(false);
  const [slotW, setSlotW] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const centerIdxRef = useRef(centerIdx);
  const onNicheChangeRef = useRef(onNicheChange);
  phaseRef.current = phase;
  centerIdxRef.current = centerIdx;
  onNicheChangeRef.current = onNicheChange;

  /** Fixed 5-slot strip; viewport shows the middle 3. Idle offset = -1 slot. */
  const carouselItems = useMemo(
    () => [-2, -1, 0, 1, 2].map((o) => NICHES[wrapNicheIndex(centerIdx + o)]),
    [centerIdx]
  );

  function idleOffset(px: number) {
    return -px;
  }

  useEffect(() => {
    setView("dashboard");
  }, [niche]);

  useEffect(() => {
    if (phase !== "idle") return;
    const idx = NICHES.indexOf(niche);
    if (idx >= 0 && idx !== centerIdx) setCenterIdx(idx);
  }, [niche, phase, centerIdx]);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0 });
  }, [view, niche]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const update = () => {
      const next = Math.min(1, frame.clientWidth / STAGE_W);
      const safe = next > 0 ? next : 1;
      setScale(safe);
      const layoutH = frame.clientHeight / safe;
      setStageH(layoutH);
      setAsideH(Math.max(560, layoutH - 32));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(frame);
    return () => ro.disconnect();
  }, [niche, view]);

  useEffect(() => {
    const tabs = tabsRef.current;
    const track = trackRef.current;
    if (!tabs) return;

    const measure = () => {
      const next = tabs.clientWidth / 3;
      setSlotW(next);
      if (track && phaseRef.current === "idle") {
        track.style.transition = "none";
        track.style.transform = `translate3d(${idleOffset(next)}px,0,0)`;
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(tabs);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || !slotW) return;
    if (phase !== "idle") return;
    track.style.transition = "none";
    track.style.transform = `translate3d(${idleOffset(slotW)}px,0,0)`;
  }, [centerIdx, slotW, phase]);

  useEffect(() => {
    if (phase === "idle") return;
    const track = trackRef.current;
    if (!track || !slotW) {
      const fromIdx = centerIdxRef.current;
      const nextIdx = wrapNicheIndex(fromIdx + (phase === "next" ? 1 : -1));
      setCenterIdx(nextIdx);
      onNicheChangeRef.current(NICHES[nextIdx]);
      setPhase("idle");
      return;
    }

    const fromIdx = centerIdxRef.current;
    const dir = phase;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const start = idleOffset(slotW);
    const end = dir === "next" ? -2 * slotW : 0;

    const finish = () => {
      const nextIdx = wrapNicheIndex(fromIdx + (dir === "next" ? 1 : -1));
      setCenterIdx(nextIdx);
      onNicheChangeRef.current(NICHES[nextIdx]);
      setPhase("idle");
    };

    if (reduceMotion) {
      finish();
      return;
    }

    track.style.transition = "none";
    track.style.transform = `translate3d(${start}px,0,0)`;

    let cancelled = false;
    let timeoutId = 0;
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        track.style.transition = `transform ${CAROUSEL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        track.style.transform = `translate3d(${end}px,0,0)`;
      });
    });

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== track || e.propertyName !== "transform") return;
      track.removeEventListener("transitionend", onEnd);
      window.clearTimeout(timeoutId);
      if (!cancelled) finish();
    };
    track.addEventListener("transitionend", onEnd);
    timeoutId = window.setTimeout(() => {
      track.removeEventListener("transitionend", onEnd);
      if (!cancelled) finish();
    }, CAROUSEL_TRANSITION_MS + 80);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      window.clearTimeout(timeoutId);
      track.removeEventListener("transitionend", onEnd);
    };
  }, [phase, slotW]);

  useEffect(() => {
    if (hoverPaused || phase !== "idle") return;
    const id = window.setInterval(() => {
      if (phaseRef.current !== "idle") return;
      setPhase("next");
    }, AUTO_NEXT_MS);
    return () => window.clearInterval(id);
  }, [hoverPaused, phase, centerIdx]);

  function shiftCarousel(delta: 1 | -1) {
    if (phase !== "idle") return;
    setPhase(delta > 0 ? "next" : "prev");
  }

  function nicheLabel(id: Niche) {
    return tLanding(LANDING_TITLE_KEY[id] as "clinicTitle");
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

  return (
    <div
      className="home-demo"
      data-niche={nicheThemeAttr(niche)}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="home-demo__carousel" aria-label={t("demoTabsLabel")}>
        <button type="button" className="home-demo__arrow" aria-label={t("demoPrev")} onClick={() => shiftCarousel(-1)}>
          <ChevronLeft size={20} strokeWidth={2.75} />
        </button>
        <div ref={tabsRef} className="home-demo__tabs" role="tablist">
          <div className="home-demo__center-pill" aria-hidden="true" />
          <div ref={trackRef} className="home-demo__track">
            {carouselItems.map((id, slot) => {
              // Viewport shows slots 1–3; center of capsule is always slot 2.
              const isCenter = slot === 2;
              const isSideClick = slot === 1 || slot === 3;
              return (
                <button
                  key={`${id}-${slot}`}
                  type="button"
                  role="tab"
                  aria-selected={isCenter}
                  className="home-demo__tab"
                  data-slot={isCenter ? "center" : "side"}
                  style={slotW ? { flex: `0 0 ${slotW}px`, width: slotW } : undefined}
                  tabIndex={isSideClick || isCenter ? 0 : -1}
                  onClick={() => {
                    if (phase !== "idle") return;
                    if (slot === 1) shiftCarousel(-1);
                    else if (slot === 3) shiftCarousel(1);
                  }}
                >
                  <span className="home-demo__tab-label">{nicheLabel(id)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" className="home-demo__arrow" aria-label={t("demoNext")} onClick={() => shiftCarousel(1)}>
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
        <div className="home-demo__sizer" style={{ height: "100%" }}>
          <div
            ref={stageRef}
            className="home-demo__stage"
            style={{
              width: STAGE_W,
              height: stageH,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="app-grid home-demo__grid" style={{ height: stageH, minHeight: 0 }}>
          <aside
            className="surface home-demo__aside"
            style={{
              margin: "1rem",
              padding: "1.25rem 1rem",
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
                    {section.id === "admin" ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          width: "100%",
                          marginTop: "0.35rem",
                          borderColor: "rgba(220,38,38,0.35)",
                          color: "#b42318",
                        }}
                        onClick={() => setView("dashboard")}
                      >
                        {tNav("exitAdminZone")}
                      </button>
                    ) : null}
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

          <main ref={mainScrollRef} className="app-main home-demo__main-scroll">
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
                <HomeDemoPage
                  view={view}
                  niche={niche}
                  orgName={orgName}
                  entityTitle={labelFor("customers")}
                  scheduleLabel={labelFor("appointments")}
                />
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
