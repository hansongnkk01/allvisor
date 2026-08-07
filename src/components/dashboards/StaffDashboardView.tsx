"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DashboardAiPanel } from "@/components/DashboardAiPanel";
import { DailyClosePanel } from "@/components/DailyClosePanel";
import { DayHourTimetable } from "@/components/DayHourTimetable";
import {
  DashboardRecentInvoices,
  DashboardUpcomingAppointments,
  DashboardTodaySales,
  DashboardTopSellers,
} from "@/components/DashboardLists";
import { NicheCardGrid } from "@/components/dashboards/NicheCardGrid";
import { hasCapability, vocabLabels } from "@/lib/niches";
import { formatCurrency } from "@/lib/utils";
import { lhdnOutstanding, type SharedDashboardData } from "@/lib/dashboard-data";

/**
 * The floor view. Rendered identically by the real app, the desktop shell and the
 * homepage demo — only the data behind it differs, so a layout change lands everywhere.
 */
export function StaffDashboardView({ data }: { data: SharedDashboardData }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const { niche, kpis } = data;
  const canAppointments = hasCapability(niche, "appointments");
  const canPos = hasCapability(niche, "pos");
  const V = vocabLabels(niche, locale);
  const peopleLabel = V.entityTitle;
  const now = useMemo(() => new Date(data.nowIso), [data.nowIso]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={`${t("welcome")}, ${data.greetingName}`} subtitle={data.orgName} />

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
              <div className="kpi-label">{t("appointmentsToday")}</div>
              <div className="kpi-value">{kpis.appointmentsToday}</div>
            </div>
          ) : (
            <div className="surface kpi" style={{ margin: 0 }}>
              <div className="kpi-label">{t("salesToday")}</div>
              <div className="kpi-value">{formatCurrency(kpis.salesToday)}</div>
            </div>
          )}
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{t("unpaidInvoices")}</div>
            <div className="kpi-value">{kpis.unpaidCount}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{peopleLabel}</div>
            <div className="kpi-value">{kpis.customerCount}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{t("lowStock")}</div>
            <div className="kpi-value">{kpis.lowStockCount}</div>
          </div>
        </div>

        <DashboardAiPanel
          title={t("aiTitle")}
          data={{
            niche,
            patients: kpis.customerCount,
            unpaidInvoices: kpis.unpaidCount,
            lowStock: kpis.lowStockCount,
            lowStockNames: kpis.lowStockNames,
            income: kpis.incomeMonth,
            expense: kpis.expenseMonth,
            appointmentsToday: kpis.appointmentsToday,
            lhdnPending: lhdnOutstanding(kpis),
            orgHasTin: kpis.orgHasTin,
          }}
        />
      </div>

      <DailyClosePanel
        title={t("dailyClose")}
        subtitle={t("dailyCloseHint")}
        incomeToday={kpis.salesToday}
        unpaidCount={kpis.unpaidCount}
        unpaidTotal={kpis.unpaidTotal}
        noShowToday={canAppointments ? kpis.noShowToday : -1}
        txnToday={canPos ? kpis.txnToday : -1}
        lowStockNames={kpis.lowStockNames}
        lhdnPendingCount={kpis.lhdnPendingCount}
        lhdnRejectedCount={kpis.lhdnRejectedCount}
        labels={{
          income: t("closeIncome"),
          unpaid: t("closeUnpaid"),
          noShow: t("closeNoShow"),
          txnToday: t("closeTxnToday"),
          lowStock: t("closeLowStock"),
          lhdnPending: t("closeLhdnPending"),
          lhdnRejected: t("closeLhdnRejected"),
          none: t("closeNone"),
          openInvoices: t("closeOpenInvoices"),
          openInventory: t("closeOpenInventory"),
          openLhdn: t("closeOpenLhdn"),
          openPos: canPos ? t("closeOpenPos") : undefined,
        }}
      />

      <div className="row">
        <span className="muted">{t("quickActions")}:</span>
        <Link href="/customers" className="btn btn-soft">
          {peopleLabel}
        </Link>
        <Link href="/invoices" className="btn btn-soft">
          Invoices
        </Link>
        {canAppointments ? (
          <Link href="/appointments" className="btn btn-soft">
            {V.schedule}
          </Link>
        ) : null}
        {canPos ? (
          <Link href="/pos" className="btn btn-soft">
            POS
          </Link>
        ) : null}
      </div>

      <NicheCardGrid cards={data.nicheCards} />

      {canAppointments ? (
        <DayHourTimetable
          date={now}
          appointments={data.todayAppointments}
          orientation="horizontal"
          hoursConfig={{
            openHour: data.hours.openHour,
            closeHour: data.hours.closeHour,
            closedWeekdays: data.hours.closedWeekdays,
            locale,
          }}
          labels={{
            timetable: t("miniTimetable"),
            occupied: t("occupied"),
            free: t("free"),
            closed: t("clinicClosed"),
            publicHoliday: t("publicHoliday"),
          }}
        />
      ) : null}

      <div className="fluid-grid">
        <DashboardRecentInvoices title={t("recentInvoices")} invoices={data.recentInvoices} />

        {canPos ? (
          <DashboardTodaySales
            title={t("todaySales")}
            empty={t("todaySalesEmpty")}
            rows={data.todaySales}
          />
        ) : (
          <DashboardUpcomingAppointments
            title={t("upcomingAppointments")}
            items={data.upcomingAppointments}
          />
        )}
      </div>

      {canPos ? (
        <DashboardTopSellers
          title={t("topSellers")}
          empty={t("topSellersEmpty")}
          rows={data.topSellers}
        />
      ) : null}
    </div>
  );
}
