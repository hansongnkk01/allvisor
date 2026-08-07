import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DashboardAiPanel } from "@/components/DashboardAiPanel";
import { DailyClosePanel } from "@/components/DailyClosePanel";
import {
  DashboardRecentInvoices,
  DashboardTodaySales,
  DashboardUpcomingAppointments,
  DashboardTopSellers,
} from "@/components/DashboardLists";
import { DayHourTimetable } from "@/components/DayHourTimetable";
import { formatCurrency } from "@/lib/utils";
import { hasCapability } from "@/lib/niches";
import type { SharedDashboardData, DashboardMode } from "@/lib/dashboard-data";
import { ActionForm } from "@/components/ActionForm";
import { updateTaskStatusAction } from "@/app/ops-brain-actions";

export type StaffDashLabels = {
  welcome: string;
  salesToday: string;
  appointmentsToday: string;
  unpaidInvoices: string;
  lowStock: string;
  peopleLabel: string;
  aiTitle: string;
  dailyClose: string;
  dailyCloseHint: string;
  closeIncome: string;
  closeUnpaid: string;
  closeNoShow: string;
  closeTxnToday: string;
  closeLowStock: string;
  closeLhdnPending: string;
  closeLhdnRejected: string;
  closeNone: string;
  closeOpenInvoices: string;
  closeOpenInventory: string;
  closeOpenLhdn: string;
  closeOpenPos: string;
  quickActions: string;
  recentInvoices: string;
  upcomingAppointments: string;
  todaySales: string;
  todaySalesEmpty: string;
  topSellers: string;
  topSellersEmpty: string;
  miniTimetable: string;
  occupied: string;
  free: string;
  clinicClosed: string;
  publicHoliday: string;
  myTasks: string;
  myScore: string;
  noTasks: string;
  markDone: string;
  invoices: string;
  appointments: string;
  pos: string;
  inventory: string;
  alerts: string;
  cycleCount: string;
};

export function StaffDashboardView({
  mode,
  data,
  labels,
  locale,
  unpaidTotal = 0,
}: {
  mode: DashboardMode;
  data: SharedDashboardData;
  labels: StaffDashLabels;
  locale: string;
  unpaidTotal?: number;
}) {
  const niche = data.niche;
  const canPos = hasCapability(niche, "pos");
  const canAppts = hasCapability(niche, "appointments");
  const canInventory = hasCapability(niche, "inventory");
  const demo = mode === "demo";
  const now = new Date();
  const openTasks = data.tasks.filter((t) => t.status !== "done").length;

  const quickActions: Array<{ href: string; label: string }> = [];
  if (canPos) quickActions.push({ href: "/pos", label: labels.pos });
  if (canAppts) quickActions.push({ href: "/appointments", label: labels.appointments });
  quickActions.push({ href: "/customers", label: labels.peopleLabel });
  quickActions.push({ href: "/invoices", label: labels.invoices });
  if (canInventory) quickActions.push({ href: "/inventory", label: labels.inventory });
  if (canInventory && data.opsBrainEnabled)
    quickActions.push({ href: "/cycle-count", label: labels.cycleCount });
  if (data.opsBrainEnabled) quickActions.push({ href: "/alerts", label: labels.alerts });

  return (
    <div className="stack dash-staff" data-dash-mode={mode} data-dash-role="staff" style={{ gap: "1.25rem" }}>
      <PageHeader title={`${labels.welcome}, ${data.welcomeName}`} subtitle={data.orgName} />

      <section className="dash-staff-actions" aria-label={labels.quickActions}>
        {quickActions.map((action) =>
          demo ? (
            <span key={action.href} className="dash-action-tile" aria-disabled>
              {action.label}
            </span>
          ) : (
            <Link key={action.href} href={action.href} className="dash-action-tile">
              {action.label}
            </Link>
          )
        )}
      </section>

      <div
        className="dash-kpi-ai-row"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "stretch" }}
      >
        <div
          className="dash-kpi-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.65rem",
            flex: "1 1 280px",
            minWidth: 0,
          }}
        >
          {canAppts && !canPos ? (
            <div className="surface kpi" style={{ margin: 0 }}>
              <div className="kpi-label">{labels.appointmentsToday}</div>
              <div className="kpi-value">{data.kpi.appointmentsToday}</div>
            </div>
          ) : (
            <div className="surface kpi" style={{ margin: 0 }}>
              <div className="kpi-label">{labels.salesToday}</div>
              <div className="kpi-value">{formatCurrency(data.kpi.salesToday)}</div>
            </div>
          )}
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{labels.unpaidInvoices}</div>
            <div className="kpi-value">{data.kpi.unpaidCount}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{labels.myTasks}</div>
            <div className="kpi-value">{openTasks}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{canInventory ? labels.lowStock : labels.peopleLabel}</div>
            <div className="kpi-value">
              {canInventory ? data.kpi.lowStockCount : data.kpi.customerCount}
            </div>
          </div>
        </div>
        <DashboardAiPanel
          title={labels.aiTitle}
          opsBrainEnabled={data.opsBrainEnabled}
          dbAlerts={data.dbAlerts}
          includeHighSeverity={false}
          canResolveAlerts={!demo && data.opsBrainEnabled}
          data={{
            niche,
            patients: data.kpi.customerCount,
            unpaidInvoices: data.kpi.unpaidCount,
            lowStock: data.kpi.lowStockCount,
            lowStockNames: data.kpi.lowStockNames,
            income: data.kpi.income,
            expense: data.kpi.expense,
            appointmentsToday: data.kpi.appointmentsToday,
            lhdnPending: data.kpi.lhdnPending,
            orgHasTin: data.kpi.orgHasTin,
          }}
        />
      </div>

      {data.myScore ? (
        <div className="surface" style={{ padding: "0.85rem 1rem" }}>
          <strong>{labels.myScore}</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Score {data.myScore.score} · Sales {formatCurrency(data.myScore.salesAmount)} · Txns{" "}
            {data.myScore.transactionCount}
          </p>
        </div>
      ) : null}

      <DailyClosePanel
        title={labels.dailyClose}
        subtitle={labels.dailyCloseHint}
        incomeToday={data.kpi.salesToday}
        unpaidCount={data.kpi.unpaidCount}
        unpaidTotal={unpaidTotal}
        noShowToday={canAppts ? 0 : -1}
        txnToday={canPos ? data.kpi.txnToday : -1}
        lowStockNames={data.kpi.lowStockNames}
        lhdnPendingCount={data.kpi.lhdnPending}
        lhdnRejectedCount={0}
        labels={{
          income: labels.closeIncome,
          unpaid: labels.closeUnpaid,
          noShow: labels.closeNoShow,
          txnToday: labels.closeTxnToday,
          lowStock: labels.closeLowStock,
          lhdnPending: labels.closeLhdnPending,
          lhdnRejected: labels.closeLhdnRejected,
          none: labels.closeNone,
          openInvoices: labels.closeOpenInvoices,
          openInventory: labels.closeOpenInventory,
          openLhdn: labels.closeOpenLhdn,
          openPos: canPos ? labels.closeOpenPos : undefined,
        }}
      />

      <div className="surface" style={{ padding: "1rem" }}>
        <strong>{labels.myTasks}</strong>
        {!data.tasks.length ? (
          <p className="muted">{labels.noTasks}</p>
        ) : (
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
            {data.tasks.map((task) => (
              <li key={task.id} style={{ marginBottom: 6 }}>
                {task.title} <span className="badge">{task.status}</span>
                {!demo && task.status !== "done" ? (
                  <ActionForm action={updateTaskStatusAction} style={{ display: "inline", marginLeft: 8 }}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <input type="hidden" name="status" value="done" />
                    <button type="submit" className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
                      {labels.markDone}
                    </button>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canAppts ? (
        <DayHourTimetable
          date={now}
          appointments={data.todayAppointments}
          orientation="horizontal"
          hoursConfig={{ openHour: 0, closeHour: 23, closedWeekdays: [], locale }}
          labels={{
            timetable: labels.miniTimetable,
            occupied: labels.occupied,
            free: labels.free,
            closed: labels.clinicClosed,
            publicHoliday: labels.publicHoliday,
          }}
        />
      ) : null}

      <div className="fluid-grid">
        <DashboardRecentInvoices
          title={labels.recentInvoices}
          invoices={data.recentInvoices.map((r) => ({
            id: r.id,
            title: r.label,
            invoice_number: r.subtitle || r.label,
            status: "paid",
            total: r.amount || 0,
            created_at: r.at || new Date().toISOString(),
          }))}
        />
        {canAppts && !canPos ? (
          <DashboardUpcomingAppointments title={labels.upcomingAppointments} items={data.upcomingAppointments} />
        ) : canPos ? (
          <DashboardTodaySales
            title={labels.todaySales}
            empty={labels.todaySalesEmpty}
            rows={data.todaySales.map((r) => ({
              id: r.id,
              label: r.label,
              customer: r.subtitle || null,
              amount: r.amount || 0,
              paid_at: r.at || "",
            }))}
          />
        ) : (
          <DashboardUpcomingAppointments title={labels.upcomingAppointments} items={data.upcomingAppointments} />
        )}
      </div>

      {canPos ? (
        <DashboardTopSellers title={labels.topSellers} empty={labels.topSellersEmpty} rows={data.topSellers} />
      ) : null}
    </div>
  );
}
