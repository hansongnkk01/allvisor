"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  ScanBarcode,
  Package,
  Dumbbell,
  Wallet,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { nicheThemeAttr } from "@/lib/utils";
import type { Niche } from "@/lib/types";

export type PreviewNiche = Extract<Niche, "clinic" | "retail" | "gym">;

const PRESETS: PreviewNiche[] = ["clinic", "retail", "gym"];

type ViewId = string;

type NavItem = { id: ViewId; icon: LucideIcon; labelKey: string };

type Row = { a: string; b: string; c: string };

type ViewContent = {
  titleKey: string;
  subtitleKey: string;
  kpis?: Array<{ label: string; value: string }>;
  panelTitle: string;
  rows: Row[];
  secondaryTitle?: string;
  secondaryRows?: Row[];
  showActions?: boolean;
};

const NAV: Record<PreviewNiche, NavItem[]> = {
  clinic: [
    { id: "dashboard", icon: LayoutDashboard, labelKey: "nav1" },
    { id: "patients", icon: Users, labelKey: "nav2" },
    { id: "appointments", icon: CalendarDays, labelKey: "nav3" },
    { id: "invoices", icon: FileText, labelKey: "nav4" },
  ],
  retail: [
    { id: "dashboard", icon: LayoutDashboard, labelKey: "nav1" },
    { id: "pos", icon: ScanBarcode, labelKey: "nav2" },
    { id: "inventory", icon: Package, labelKey: "nav3" },
    { id: "cash", icon: Wallet, labelKey: "nav5" },
    { id: "invoices", icon: FileText, labelKey: "nav4" },
  ],
  gym: [
    { id: "dashboard", icon: LayoutDashboard, labelKey: "nav1" },
    { id: "members", icon: Users, labelKey: "nav2" },
    { id: "classes", icon: Dumbbell, labelKey: "nav3" },
    { id: "checkins", icon: BadgeCheck, labelKey: "nav5" },
    { id: "invoices", icon: FileText, labelKey: "nav4" },
  ],
};

const ACTIONS: Record<PreviewNiche, Array<{ id: ViewId; labelKey: "act1" | "act2" | "act3" }>> = {
  clinic: [
    { id: "patients", labelKey: "act1" },
    { id: "appointments", labelKey: "act2" },
    { id: "invoices", labelKey: "act3" },
  ],
  retail: [
    { id: "pos", labelKey: "act1" },
    { id: "inventory", labelKey: "act2" },
    { id: "cash", labelKey: "act3" },
  ],
  gym: [
    { id: "members", labelKey: "act1" },
    { id: "classes", labelKey: "act2" },
    { id: "checkins", labelKey: "act3" },
  ],
};

function viewsFor(niche: PreviewNiche, t: (key: string) => string): Record<ViewId, ViewContent> {
  if (niche === "clinic") {
    return {
      dashboard: {
        titleKey: "demoWelcome",
        subtitleKey: "demoSubtitle.clinic",
        showActions: true,
        kpis: [
          { label: t("demoKpi.clinic.kpi1"), value: "12" },
          { label: t("demoKpi.clinic.kpi2"), value: "RM 1,280" },
          { label: t("demoKpi.clinic.kpi3"), value: "3" },
          { label: t("demoKpi.clinic.kpi4"), value: "248" },
        ],
        panelTitle: t("demoTable.clinic"),
        rows: [
          { a: "INV-1042", b: "Aina Rahman", c: "Paid" },
          { a: "INV-1041", b: "Dr walk-in", c: "Unpaid" },
          { a: "INV-1040", b: "Lim Wei", c: "Partial" },
        ],
        secondaryTitle: t("demoPanel.clinic.upcoming"),
        secondaryRows: [
          { a: "09:00", b: "Nurul Aisyah", c: "Consult" },
          { a: "10:30", b: "Rajesh K.", c: "Follow-up" },
          { a: "14:00", b: "Walk-in", c: "Open" },
        ],
      },
      patients: {
        titleKey: "demoView.clinic.patientsTitle",
        subtitleKey: "demoView.clinic.patientsSub",
        panelTitle: t("demoView.clinic.patientsPanel"),
        rows: [
          { a: "PT-081", b: "Aina Rahman", c: "Active" },
          { a: "PT-080", b: "Lim Wei", c: "Active" },
          { a: "PT-079", b: "Siti Aminah", c: "New" },
          { a: "PT-078", b: "Tan Mei Ling", c: "Active" },
          { a: "PT-077", b: "Hafiz Omar", c: "Inactive" },
        ],
      },
      appointments: {
        titleKey: "demoView.clinic.apptsTitle",
        subtitleKey: "demoView.clinic.apptsSub",
        panelTitle: t("demoView.clinic.apptsPanel"),
        rows: [
          { a: "09:00", b: "Nurul Aisyah · R1", c: "Confirmed" },
          { a: "10:30", b: "Rajesh K. · R2", c: "Confirmed" },
          { a: "11:15", b: "Walk-in", c: "Waiting" },
          { a: "14:00", b: "Lim Wei · R1", c: "Booked" },
          { a: "16:30", b: "Aina Rahman · R3", c: "Booked" },
        ],
      },
      invoices: {
        titleKey: "demoView.clinic.invTitle",
        subtitleKey: "demoView.clinic.invSub",
        panelTitle: t("demoView.clinic.invPanel"),
        rows: [
          { a: "INV-1042", b: "Aina Rahman", c: "RM 85 · Paid" },
          { a: "INV-1041", b: "Dr walk-in", c: "RM 120 · Unpaid" },
          { a: "INV-1040", b: "Lim Wei", c: "RM 60 · Partial" },
          { a: "INV-1039", b: "Siti Aminah", c: "RM 95 · Paid" },
          { a: "INV-1038", b: "Tan Mei Ling", c: "RM 45 · Paid" },
        ],
      },
    };
  }

  if (niche === "retail") {
    return {
      dashboard: {
        titleKey: "demoWelcome",
        subtitleKey: "demoSubtitle.retail",
        showActions: true,
        kpis: [
          { label: t("demoKpi.retail.kpi1"), value: "RM 2,450" },
          { label: t("demoKpi.retail.kpi2"), value: "47" },
          { label: t("demoKpi.retail.kpi3"), value: "5" },
          { label: t("demoKpi.retail.kpi4"), value: "RM 380" },
        ],
        panelTitle: t("demoTable.retail"),
        rows: [
          { a: "POS-8821", b: "Counter 1", c: "RM 86.00" },
          { a: "POS-8820", b: "Counter 2", c: "RM 42.50" },
          { a: "INV-331", b: "Wholesale", c: "Unpaid" },
        ],
        secondaryTitle: t("demoPanel.retail.top"),
        secondaryRows: [
          { a: "SKU-12", b: "Cable 2m", c: "38 sold" },
          { a: "SKU-07", b: "Adapter", c: "22 sold" },
          { a: "SKU-21", b: "Tape pack", c: "19 sold" },
        ],
      },
      pos: {
        titleKey: "demoView.retail.posTitle",
        subtitleKey: "demoView.retail.posSub",
        panelTitle: t("demoView.retail.posPanel"),
        rows: [
          { a: "POS-8821", b: "Counter 1 · Cash", c: "RM 86.00" },
          { a: "POS-8820", b: "Counter 2 · QR", c: "RM 42.50" },
          { a: "POS-8819", b: "Counter 1 · Card", c: "RM 125.00" },
          { a: "POS-8818", b: "Counter 2 · Cash", c: "RM 18.90" },
          { a: "POS-8817", b: "Counter 1 · QR", c: "RM 55.00" },
        ],
      },
      inventory: {
        titleKey: "demoView.retail.invTitle",
        subtitleKey: "demoView.retail.invSub",
        panelTitle: t("demoView.retail.invPanel"),
        rows: [
          { a: "SKU-12", b: "Cable 2m", c: "5 left" },
          { a: "SKU-07", b: "Adapter USB-C", c: "3 left" },
          { a: "SKU-21", b: "Tape pack", c: "8 left" },
          { a: "SKU-44", b: "Power bank", c: "2 left" },
          { a: "SKU-09", b: "Mouse pad", c: "6 left" },
        ],
      },
      cash: {
        titleKey: "demoView.retail.cashTitle",
        subtitleKey: "demoView.retail.cashSub",
        panelTitle: t("demoView.retail.cashPanel"),
        rows: [
          { a: "Open", b: "08:00", c: "RM 200.00" },
          { a: "Sale", b: "POS-8821", c: "+ RM 86.00" },
          { a: "Sale", b: "POS-8820", c: "+ RM 42.50" },
          { a: "Float", b: "Top-up", c: "+ RM 50.00" },
          { a: "Expected", b: "Close", c: "RM 378.50" },
        ],
      },
      invoices: {
        titleKey: "demoView.retail.invoicesTitle",
        subtitleKey: "demoView.retail.invoicesSub",
        panelTitle: t("demoView.retail.invoicesPanel"),
        rows: [
          { a: "INV-331", b: "Wholesale Sdn Bhd", c: "RM 1,240 · Unpaid" },
          { a: "INV-330", b: "Cafe Luna", c: "RM 420 · Paid" },
          { a: "INV-329", b: "Workshop 88", c: "RM 890 · Partial" },
          { a: "INV-328", b: "Retail walk-in", c: "RM 65 · Paid" },
        ],
      },
    };
  }

  return {
    dashboard: {
      titleKey: "demoWelcome",
      subtitleKey: "demoSubtitle.gym",
      showActions: true,
      kpis: [
        { label: t("demoKpi.gym.kpi1"), value: "186" },
        { label: t("demoKpi.gym.kpi2"), value: "8" },
        { label: t("demoKpi.gym.kpi3"), value: "RM 920" },
        { label: t("demoKpi.gym.kpi4"), value: "42" },
      ],
      panelTitle: t("demoTable.gym"),
      rows: [
        { a: "MEM-220", b: "Hafiz", c: "Active" },
        { a: "CLS-HIIT", b: "Tonight 7pm", c: "12 booked" },
        { a: "INV-771", b: "PT package", c: "Paid" },
      ],
      secondaryTitle: t("demoPanel.gym.checkins"),
      secondaryRows: [
        { a: "18:02", b: "Gate A · Hafiz", c: "In" },
        { a: "18:05", b: "Gate A · Mei", c: "In" },
        { a: "18:11", b: "Gate B · Amir", c: "In" },
      ],
    },
    members: {
      titleKey: "demoView.gym.membersTitle",
      subtitleKey: "demoView.gym.membersSub",
      panelTitle: t("demoView.gym.membersPanel"),
      rows: [
        { a: "MEM-220", b: "Hafiz Omar", c: "Active" },
        { a: "MEM-219", b: "Mei Ling", c: "Active" },
        { a: "MEM-218", b: "Amir Razak", c: "Due soon" },
        { a: "MEM-217", b: "Siti Noor", c: "Active" },
        { a: "MEM-216", b: "Jason Tan", c: "Frozen" },
      ],
    },
    classes: {
      titleKey: "demoView.gym.classesTitle",
      subtitleKey: "demoView.gym.classesSub",
      panelTitle: t("demoView.gym.classesPanel"),
      rows: [
        { a: "06:30", b: "HIIT · Studio A", c: "14/16" },
        { a: "09:00", b: "Yoga · Studio B", c: "11/12" },
        { a: "12:00", b: "Spin · Bike room", c: "8/10" },
        { a: "19:00", b: "HIIT · Studio A", c: "12/16" },
        { a: "20:00", b: "PT block", c: "Booked" },
      ],
    },
    checkins: {
      titleKey: "demoView.gym.checkinsTitle",
      subtitleKey: "demoView.gym.checkinsSub",
      panelTitle: t("demoView.gym.checkinsPanel"),
      rows: [
        { a: "18:02", b: "Hafiz Omar", c: "Gate A" },
        { a: "18:05", b: "Mei Ling", c: "Gate A" },
        { a: "18:11", b: "Amir Razak", c: "Gate B" },
        { a: "18:20", b: "Siti Noor", c: "Gate A" },
        { a: "18:27", b: "Guest pass", c: "Gate B" },
      ],
    },
    invoices: {
      titleKey: "demoView.gym.invTitle",
      subtitleKey: "demoView.gym.invSub",
      panelTitle: t("demoView.gym.invPanel"),
      rows: [
        { a: "INV-771", b: "PT package · Hafiz", c: "RM 450 · Paid" },
        { a: "INV-770", b: "Monthly · Mei", c: "RM 129 · Paid" },
        { a: "INV-769", b: "Monthly · Amir", c: "RM 129 · Due" },
        { a: "INV-768", b: "Day pass", c: "RM 35 · Paid" },
      ],
    },
  };
}

/** Interactive product mock for homepage hero — mirrors real app shell. */
export function HomeDashboardPreview({
  niche,
  onNicheChange,
}: {
  niche: PreviewNiche;
  onNicheChange: (niche: PreviewNiche) => void;
}) {
  const t = useTranslations("Home");
  const [view, setView] = useState<ViewId>("dashboard");
  const index = PRESETS.indexOf(niche);
  const nav = NAV[niche];
  const actions = ACTIONS[niche];
  const orgName = useMemo(() => t(`demoOrg.${niche}` as "demoOrg.clinic"), [niche, t]);
  const contentMap = useMemo(() => viewsFor(niche, (key) => t(key as "demoWelcome")), [niche, t]);
  const content = contentMap[view] ?? contentMap.dashboard;

  useEffect(() => {
    setView("dashboard");
  }, [niche]);

  function go(delta: number) {
    const next = PRESETS[(index + delta + PRESETS.length) % PRESETS.length];
    onNicheChange(next);
  }

  return (
    <div className="home-demo" data-niche={nicheThemeAttr(niche)}>
      <div className="home-demo__carousel" aria-label={t("demoTabsLabel")}>
        <button
          type="button"
          className="home-demo__arrow"
          aria-label={t("demoPrev")}
          onClick={() => go(-1)}
        >
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

        <button
          type="button"
          className="home-demo__arrow"
          aria-label={t("demoNext")}
          onClick={() => go(1)}
        >
          <ChevronRight size={20} strokeWidth={2.75} />
        </button>
      </div>

      <div className="home-demo__shell">
        <aside className="home-demo__side surface">
          <div className="home-demo__brand brand-lockup">
            <span className="home-demo__logo">A</span>
            <div className="brand-lockup__text">
              <div className="home-demo__product brand-lockup__product">Allvisor</div>
              <div className="home-demo__org brand-lockup__org">{orgName}</div>
            </div>
          </div>

          <div className="home-demo__section">{t("demoOps")}</div>

          <nav className="home-demo__nav">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="home-demo__nav-item row nav-item"
                  data-active={view === item.id ? "true" : "false"}
                  onClick={() => setView(item.id)}
                >
                  <Icon size={16} />
                  <span>{t(`demoNav.${niche}.${item.labelKey}` as "demoNav.clinic.nav1")}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="home-demo__main">
          <div className="home-demo__main-head">
            <div>
              <div className="home-demo__hello">
                {content.titleKey === "demoWelcome"
                  ? t("demoWelcome")
                  : t(content.titleKey as "demoWelcome")}
              </div>
              <div className="home-demo__subtitle">
                {content.subtitleKey.startsWith("demoSubtitle")
                  ? t(content.subtitleKey as "demoSubtitle.clinic")
                  : t(content.subtitleKey as "demoWelcome")}
              </div>
            </div>
            <span className="home-demo__pill">{t("demoLive")}</span>
          </div>

          {content.kpis ? (
            <div className="home-demo__kpis">
              {content.kpis.map((kpi) => (
                <div key={kpi.label} className="home-demo__kpi surface kpi">
                  <div className="home-demo__kpi-label kpi-label">{kpi.label}</div>
                  <div className="home-demo__kpi-value kpi-value">{kpi.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {content.showActions ? (
            <div className="home-demo__actions">
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="home-demo__action btn btn-soft"
                  data-active={view === action.id ? "true" : "false"}
                  onClick={() => setView(action.id)}
                >
                  {t(`demoAct.${niche}.${action.labelKey}` as "demoAct.clinic.act1")}
                </button>
              ))}
            </div>
          ) : null}

          <div className={`home-demo__panels${content.secondaryRows ? " home-demo__panels--split" : ""}`}>
            <div className="home-demo__panel surface">
              <div className="home-demo__panel-title">{content.panelTitle}</div>
              <div className="home-demo__table">
                {content.rows.map((row) => (
                  <div key={`${row.a}-${row.b}`} className="home-demo__row">
                    <span>{row.a}</span>
                    <span>{row.b}</span>
                    <span className="home-demo__status">{row.c}</span>
                  </div>
                ))}
              </div>
            </div>

            {content.secondaryRows && content.secondaryTitle ? (
              <div className="home-demo__panel surface">
                <div className="home-demo__panel-title">{content.secondaryTitle}</div>
                <div className="home-demo__table">
                  {content.secondaryRows.map((row) => (
                    <div key={`${row.a}-${row.b}`} className="home-demo__row">
                      <span>{row.a}</span>
                      <span>{row.b}</span>
                      <span className="home-demo__status">{row.c}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
