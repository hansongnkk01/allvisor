"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  ScanBarcode,
  Package,
  Dumbbell,
  type LucideIcon,
} from "lucide-react";
import { nicheThemeAttr } from "@/lib/utils";
import type { Niche } from "@/lib/types";

type PreviewNiche = Extract<Niche, "clinic" | "retail" | "gym">;

const PRESETS: PreviewNiche[] = ["clinic", "retail", "gym"];

const NAV: Record<
  PreviewNiche,
  Array<{ icon: LucideIcon; labelKey: "nav1" | "nav2" | "nav3" | "nav4" }>
> = {
  clinic: [
    { icon: LayoutDashboard, labelKey: "nav1" },
    { icon: Users, labelKey: "nav2" },
    { icon: CalendarDays, labelKey: "nav3" },
    { icon: FileText, labelKey: "nav4" },
  ],
  retail: [
    { icon: LayoutDashboard, labelKey: "nav1" },
    { icon: ScanBarcode, labelKey: "nav2" },
    { icon: Package, labelKey: "nav3" },
    { icon: FileText, labelKey: "nav4" },
  ],
  gym: [
    { icon: LayoutDashboard, labelKey: "nav1" },
    { icon: Users, labelKey: "nav2" },
    { icon: Dumbbell, labelKey: "nav3" },
    { icon: FileText, labelKey: "nav4" },
  ],
};

const KPIS: Record<PreviewNiche, Array<{ labelKey: "kpi1" | "kpi2" | "kpi3"; value: string }>> = {
  clinic: [
    { labelKey: "kpi1", value: "12" },
    { labelKey: "kpi2", value: "RM 1,280" },
    { labelKey: "kpi3", value: "3" },
  ],
  retail: [
    { labelKey: "kpi1", value: "RM 2,450" },
    { labelKey: "kpi2", value: "47" },
    { labelKey: "kpi3", value: "5" },
  ],
  gym: [
    { labelKey: "kpi1", value: "186" },
    { labelKey: "kpi2", value: "8" },
    { labelKey: "kpi3", value: "RM 920" },
  ],
};

const ROWS: Record<PreviewNiche, Array<{ a: string; b: string; c: string }>> = {
  clinic: [
    { a: "INV-1042", b: "Aina Rahman", c: "Paid" },
    { a: "INV-1041", b: "Dr walk-in", c: "Unpaid" },
    { a: "INV-1040", b: "Lim Wei", c: "Partial" },
  ],
  retail: [
    { a: "POS-8821", b: "Counter 1", c: "RM 86.00" },
    { a: "POS-8820", b: "Counter 2", c: "RM 42.50" },
    { a: "INV-331", b: "Wholesale", c: "Unpaid" },
  ],
  gym: [
    { a: "MEM-220", b: "Hafiz", c: "Active" },
    { a: "CLS-HIIT", b: "Tonight 7pm", c: "12 booked" },
    { a: "INV-771", b: "PT package", c: "Paid" },
  ],
};

/** Interactive product mock for homepage hero — stay calm, not noisy. */
export function HomeDashboardPreview() {
  const t = useTranslations("Home");
  const [niche, setNiche] = useState<PreviewNiche>("clinic");
  const [activeNav, setActiveNav] = useState(0);

  const nav = NAV[niche];
  const kpis = KPIS[niche];
  const rows = ROWS[niche];

  const orgName = useMemo(() => t(`demoOrg.${niche}` as "demoOrg.clinic"), [niche, t]);

  return (
    <div className="home-demo" data-niche={nicheThemeAttr(niche)}>
      <div className="home-demo__tabs" role="tablist" aria-label={t("demoTabsLabel")}>
        {PRESETS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={niche === id}
            className="home-demo__tab"
            data-active={niche === id ? "true" : "false"}
            onClick={() => {
              setNiche(id);
              setActiveNav(0);
            }}
          >
            {t(`demoTab.${id}` as "demoTab.clinic")}
          </button>
        ))}
      </div>

      <div className="home-demo__frame" aria-hidden={false}>
        <aside className="home-demo__side">
          <div className="home-demo__brand">
            <span className="home-demo__logo">A</span>
            <div>
              <div className="home-demo__product">Allvisor</div>
              <div className="home-demo__org">{orgName}</div>
            </div>
          </div>
          <nav className="home-demo__nav">
            {nav.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.labelKey}
                  type="button"
                  className="home-demo__nav-item"
                  data-active={activeNav === i ? "true" : "false"}
                  onClick={() => setActiveNav(i)}
                >
                  <Icon size={15} />
                  <span>{t(`demoNav.${niche}.${item.labelKey}` as "demoNav.clinic.nav1")}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="home-demo__main">
          <div className="home-demo__main-head">
            <div>
              <div className="home-demo__hello">{t("demoWelcome")}</div>
              <div className="home-demo__subtitle">{t(`demoSubtitle.${niche}` as "demoSubtitle.clinic")}</div>
            </div>
            <span className="home-demo__pill">{t("demoLive")}</span>
          </div>

          <div className="home-demo__kpis">
            {kpis.map((kpi) => (
              <div key={kpi.labelKey} className="home-demo__kpi">
                <div className="home-demo__kpi-label">
                  {t(`demoKpi.${niche}.${kpi.labelKey}` as "demoKpi.clinic.kpi1")}
                </div>
                <div className="home-demo__kpi-value">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="home-demo__panel">
            <div className="home-demo__panel-title">
              {t(`demoTable.${niche}` as "demoTable.clinic")}
            </div>
            <div className="home-demo__table">
              {rows.map((row) => (
                <div key={row.a} className="home-demo__row">
                  <span>{row.a}</span>
                  <span>{row.b}</span>
                  <span className="home-demo__status">{row.c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
