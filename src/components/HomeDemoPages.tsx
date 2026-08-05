"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { AccountingCashChart } from "@/components/AccountingCashChart";
import {
  AccountingExpenseTable,
  AccountingLedgerTable,
} from "@/components/AccountingPagedTables";
import { AppointmentBoard } from "@/components/AppointmentBoard";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { DemoCensor, DemoCensorField } from "@/components/DemoCensor";
import {
  CashExactDemo,
  CategoriesExactDemo,
  DemoActivityBlock,
  LogisticsExactDemo,
  PrintersExactDemo,
  ReceiptsExactDemo,
} from "@/components/HomeDemoExactPages";
import {
  TuitionAssessmentsDemo,
  TuitionAttendanceDemo,
  TuitionClassesDemo,
  TuitionSubjectsDemo,
} from "@/components/HomeDemoTuitionPages";
import {
  GymCheckinsDemo,
  GymClassesDemo,
  GymMembershipsDemo,
} from "@/components/HomeDemoGymPages";
import {
  OpticalEyeRxDemo,
  OpticalLabOrdersDemo,
} from "@/components/HomeDemoOpticalPages";
import {
  WorkshopJobsDemo,
  WorkshopVehiclesDemo,
} from "@/components/HomeDemoWorkshopPages";
import { InvoicesWorkspace } from "@/components/InvoicesWorkspace";
import { PageHeader } from "@/components/PageHeader";
import { PatientsList } from "@/components/PatientsList";
import { PosWorkspace } from "@/components/PosWorkspace";
import {
  demoAccounting,
  demoAppointments,
  demoBranches,
  demoCustomers,
  demoHeldTickets,
  demoInvoicePreview,
  demoInvoices,
  demoInventoryRows,
  demoLhdnSubmissions,
  demoNicheModule,
  demoProductCategories,
  demoProducts,
  demoServiceCategories,
  demoTeam,
  type NicheModuleConfig,
} from "@/lib/demo-dashboard-data";
import { getNicheVocab, vocabLabels } from "@/lib/niches";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Niche } from "@/lib/types";

type Props = {
  view: string;
  niche: Niche;
  orgName: string;
  entityTitle: string;
  scheduleLabel: string;
};

function DemoNoopForm({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <form
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

function NicheModuleDemo({ config, orgName }: { config: NicheModuleConfig; orgName: string }) {
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={config.title} subtitle={config.subtitle || orgName} />
      {config.fields.length ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Add</h3>
          <DemoNoopForm className="stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {config.fields.map((f) => (
                <div className="field" key={f.name}>
                  <label>{f.label}</label>
                  {f.type === "select" ? (
                    <select className="select" defaultValue={f.defaultValue ?? ""} disabled>
                      <option value="">—</option>
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={f.type || "text"}
                      defaultValue={f.defaultValue ?? ""}
                      readOnly
                    />
                  )}
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </DemoNoopForm>
        </div>
      ) : null}
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
              {!config.rows.length ? (
                <tr>
                  <td colSpan={config.columns.length} className="muted">
                    No records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CustomersDemo({ niche, orgName, entityTitle }: { niche: Niche; orgName: string; entityTitle: string }) {
  const t = useTranslations("Customers");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const vocab = getNicheVocab(niche);
  const V = vocabLabels(niche, locale);
  const isTuition = niche === "tuition";
  const isClinic = vocab.showAllergies;
  const customers = useMemo(() => demoCustomers(niche), [niche]);
  const subjects = [
    { id: "s1", name: "Math Form 4", price: 120 },
    { id: "s2", name: "Science Form 5", price: 130 },
  ];

  const rowLabels = {
    name: t("name"),
    email: t("email"),
    phone: t("phone"),
    ic: t("ic"),
    address: t("address"),
    notes: t("notes"),
    save: t("save"),
    delete: t("delete"),
    edit: t("edit"),
    cancel: t("cancel"),
    addedBy: t("addedBy"),
    risk: t("risk"),
    allergies: t("allergies"),
    timeline: {
      timeline: t("timeline"),
      close: t("timelineClose"),
      loading: t("timelineLoading"),
      empty: isClinic ? t("timelineEmpty") : t("timelineEmptyRetail"),
      visits: t("timelineVisits"),
      invoices: t("timelineInvoices"),
      notes: t("notes"),
      allergies: t("allergies"),
      contact: t("timelineContact"),
      status: t("timelineStatus"),
      total: t("timelineTotal"),
      paid: t("timelinePaid"),
    },
  };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={entityTitle} subtitle={isTuition ? t("tuitionSubtitle") : orgName} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{isTuition ? t("addStudent") : t("add")}</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input name="name" className="input" readOnly />
            </div>
            {isClinic ? (
              <div className="field">
                <label>{t("risk")}</label>
                <select className="select" defaultValue="" disabled>
                  <option value="">—</option>
                  <option value="low">{t("riskLow")}</option>
                  <option value="medium">{t("riskMedium")}</option>
                  <option value="high">{t("riskHigh")}</option>
                </select>
              </div>
            ) : null}
            <DemoCensorField label={t("ic")} />
            <div className="field">
              <label>{t("email")}</label>
              <input name="email" type="email" className="input" readOnly />
            </div>
            <div className="field">
              <label>{t("phone")}</label>
              <input name="phone" className="input" readOnly />
            </div>
          </div>
          <div className="field">
            <label>{t("address")}</label>
            <input
              name="address"
              className="input"
              placeholder="Street, city, postcode, state"
              readOnly
            />
          </div>
          {isClinic ? (
            <div className="field">
              <label>{t("allergies")}</label>
              <input name="allergies" className="input" placeholder={t("allergiesPlaceholder")} readOnly />
            </div>
          ) : null}
          <div className="field">
            <label>{t("notes")}</label>
            <textarea name="notes" className="textarea" readOnly />
          </div>
          {isTuition ? (
            <div className="field">
              <label>{t("subjects")}</label>
              <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
                {t("subjectsHint")}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.4rem",
                }}
              >
                {subjects.map((c) => (
                  <label key={c.id} className="row" style={{ gap: "0.4rem", alignItems: "center" }}>
                    <input type="checkbox" disabled />
                    <span>
                      {c.name} ({c.price})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
        </DemoNoopForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <PatientsList
          customers={customers}
          labels={rowLabels}
          empty={isTuition ? t("emptyTuition") : t("empty")}
          searchPlaceholder={tc("search")}
          showAllergies={vocab.showAllergies}
          showRisk={vocab.showRisk}
          demoMode
        />
      </div>

      {isTuition ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("enrolledSubjectsTitle")}</h3>
          <p className="muted">{t("enrolledSubjectsHint")}</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("subjects")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.id === "c3" ? "Math Form 4, Science Form 5" : "Math Form 4"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="fluid-grid">
        <div className="surface history-zone" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{V.deletedTitle}</h3>
          <p className="muted">{V.deletedHint}</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("deletedBy")}</th>
                  <th>{t("deletedAt")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="muted">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <DemoActivityBlock
          title={V.activityTitle}
          logs={[
            {
              id: "ca1",
              actor_name: "Reception Lina",
              summary: `Registered ${V.entity}: ${customers[0]?.name || "Customer"}`,
              action: "customer.create",
              created_at: customers[0]?.created_at || new Date().toISOString(),
            },
            {
              id: "ca2",
              actor_name: "Admin",
              summary: `Updated ${V.entity}: ${customers[1]?.name || "Customer"}`,
              action: "customer.update",
              created_at: customers[1]?.created_at || new Date().toISOString(),
            },
          ]}
        />
      </div>
    </div>
  );
}

function AppointmentsDemo({ niche, orgName, scheduleLabel }: { niche: Niche; orgName: string; scheduleLabel: string }) {
  const t = useTranslations("Appointments");
  const locale = useLocale();
  const V = vocabLabels(niche, locale);
  const entityCap = V.entity.replace(/\b\w/g, (c) => c.toUpperCase());
  const appointments = useMemo(() => demoAppointments(niche), [niche]);
  const patients = useMemo(
    () =>
      demoCustomers(niche).map((c) => ({
        id: c.id,
        name: c.name,
        risk_level: c.risk_level,
        allergies: c.allergies,
      })),
    [niche]
  );
  const categories = demoServiceCategories(niche);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={scheduleLabel} subtitle={orgName} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <AppointmentBoard
          demoMode
          appointments={appointments}
          patients={patients}
          categories={categories}
          hoursConfig={{
            openHour: 9,
            closeHour: 18,
            closedWeekdays: [0],
            locale,
          }}
          labels={{
            calendar: t("calendar"),
            list: t("list"),
            today: t("today"),
            patient: entityCap,
            status: t("status"),
            notes: t("notes"),
            reminder: t("reminder"),
            delete: t("delete"),
            empty: t("empty"),
            prev: t("prev"),
            next: t("next"),
            timetable: t("timetable"),
            occupied: t("occupied"),
            free: t("free"),
            closed: `${V.businessTitle} closed`,
            publicHoliday: t("publicHoliday"),
            edit: t("edit"),
            save: t("save"),
            cancel: t("cancel"),
            startsAt: t("startsAt"),
            endsAt: t("endsAt"),
            bookHint: t("bookHint").replace(/patient/gi, V.entity),
            pickStart: t("pickStart"),
            pickEnd: t("pickEnd"),
            pickPatient: t("pickPatient").replace(/patient/gi, V.entity),
            bookNow: t("bookNow"),
            category: t("category"),
            needCategory: t("needCategory"),
            resetBooking: t("resetBooking"),
            searchPatient: t("searchPatient"),
            searchCategory: t("searchCategory"),
            completeConfirm1: t("completeConfirm1"),
            completeConfirm2: t("completeConfirm2"),
          }}
        />
      </div>
    </div>
  );
}

function InvoicesDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("Invoices");
  const td = useTranslations("InvoiceDetail");
  const locale = useLocale();
  const vocab = getNicheVocab(niche);
  const V = vocabLabels(niche, locale);
  const isClinic = vocab.showAllergies;
  const invoices = useMemo(() => demoInvoices(niche), [niche]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />
      <InvoicesWorkspace
        demoMode
        invoices={invoices}
        canLhdn
        loadPreview={async (id) => demoInvoicePreview(id, niche, orgName)}
        showAllergies={isClinic}
        labels={{
          number: t("number"),
          customer: V.entity.replace(/\b\w/g, (c) => c.toUpperCase()),
          status: t("status"),
          total: t("total"),
          paid: t("paid"),
          createdAt: t("createdAt"),
          actions: t("actions"),
          view: t("view"),
          viewPrint: t("viewPrint"),
          empty: t("empty"),
          revoke: t("revoke"),
          filterDay: t("filterDay"),
          allDays: t("allDays"),
          submitLhdn: td("submitLhdn"),
          resubmitLhdn: td("resubmitLhdn"),
          submitLhdnHint: td("submitLhdnHint"),
          submitLhdnPlanLocked: td("submitLhdnPlanLocked"),
          submitLhdnNeedTin: td("submitLhdnNeedTin"),
          submitLhdnAlready: td("submitLhdnAlready"),
          refreshLhdnStatus: td("refreshLhdnStatus"),
          lhdnStatusLine: td("lhdnStatusLine"),
          cancelLhdn: td("cancelLhdn"),
          cancelLhdnHint: td("cancelLhdnHint"),
          cancelLhdnPrompt: td("cancelLhdnPrompt"),
          recordPayment: td("recordPayment"),
          balanceDue: td("balanceDue"),
          pay: td("pay"),
          editStatus: td("editStatus"),
          editStatusHint: td("editStatusHint"),
          statusNote: td("statusNote"),
          saveStatus: td("saveStatus"),
          payments: td("payments"),
          noPayments: td("noPayments"),
          date: td("date"),
          method: td("method"),
          print: td("print"),
          billTo: td("billTo"),
          description: td("description"),
          qty: td("qty"),
          price: td("price"),
          amount: td("amount"),
          subtotal: td("subtotal"),
          tax: td("tax"),
          medicine: isClinic ? td("medicine") : td("medicineRetail"),
          additional: td("additional"),
          productService: td("productService"),
          serviceTax: td("serviceTax"),
          addCost: td("addCost"),
          deleteCost: td("deleteCost"),
          costKind: td("costKind"),
          costDesc: td("costDesc"),
          costAmount: td("costAmount"),
          costItem: td("costItem"),
          costQty: td("costQty"),
          noInventory: td("noInventory"),
          extrasHint: isClinic ? td("extrasHint") : td("extrasHintRetail"),
          exitWarn: t("exitWarn"),
          exitReasonTitle: t("exitReasonTitle"),
          exitReasonHint: t("exitReasonHint"),
          exitReasonPlaceholder: t("exitReasonPlaceholder"),
          exitConfirm: t("exitConfirm"),
          searchPlaceholder: locale.startsWith("ms")
            ? `Cari ${V.entity}, no. invois, notes…`
            : `Search ${V.entity}, invoice no., notes…`,
          needTin: false,
          planLocked: false,
        }}
      />
      <DemoActivityBlock
        title={t("activity")}
        logs={[
          {
            id: "ia1",
            actor_name: "Reception Lina",
            summary: "Printed invoice",
            action: "invoice.print",
            created_at: isoDaysAgo(1, 21, 39),
          },
          {
            id: "ia2",
            actor_name: "Reception Lina",
            summary: `POS sale ${invoices[0]?.invoice_number || "INV-1042"} · Item A × 1`,
            action: "pos.checkout",
            created_at: isoDaysAgo(1, 19, 28),
          },
        ]}
      />
    </div>
  );
}

function isoDaysAgo(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function PosDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("POS");
  const products = useMemo(() => demoProducts(niche), [niche]);
  const customers = useMemo(
    () => demoCustomers(niche).map((c) => ({ id: c.id, name: c.name })),
    [niche]
  );
  const categories = demoProductCategories();

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PosWorkspace
        demoMode
        products={products}
        frequentIds={products.slice(0, 3).map((p) => p.id)}
        customers={customers}
        categories={categories}
        initialTickets={demoHeldTickets()}
        labels={{
          search: t("search"),
          searchHint: t("searchHint"),
          cart: t("cart"),
          total: t("total"),
          qty: t("qty"),
          customer: t("customer"),
          payment: t("payment"),
          cash: t("cash"),
          card: t("card"),
          ewallet: t("ewallet"),
          transfer: t("transfer"),
          checkout: t("checkout"),
          emptyCart: t("emptyCart"),
          add: t("add"),
          remove: t("remove"),
          frequent: t("frequent"),
          stock: t("stock"),
          success: t("success"),
          checkingOut: t("checkingOut"),
        }}
      />
    </div>
  );
}

function InventoryDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("Inventory");
  const rows = useMemo(() => demoInventoryRows(niche), [niche]);
  const categories = demoProductCategories();

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={orgName} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input className="input" readOnly />
            </div>
            <div className="field">
              <label>{t("sku")}</label>
              <input className="input" readOnly />
            </div>
            <div className="field">
              <label>{t("barcode")}</label>
              <input className="input" readOnly />
            </div>
            <div className="field">
              <label>{t("price")}</label>
              <input className="input" type="number" readOnly />
            </div>
            <div className="field">
              <label>{t("qty")}</label>
              <input className="input" type="number" readOnly />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select" disabled>
                {categories.map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
        </DemoNoopForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("frequentlyUsed")}</h3>
        <p className="muted">{t("frequentlyUsedHint")}</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {rows.slice(0, 4).map((r) => (
            <div key={r.id} className="surface" style={{ padding: "0.85rem", margin: 0, boxShadow: "none" }}>
              <strong style={{ display: "block" }}>{r.name}</strong>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {r.sku || "—"}
              </div>
              <div style={{ marginTop: 6, fontSize: "0.85rem" }}>
                {t("onHand")} {r.quantity} · {t("usedTimes")} {8 + Number(r.id.replace(/\D/g, "") || 1)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Stock</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("sku")}</th>
                <th>{t("barcode")}</th>
                <th>{t("price")}</th>
                <th>{t("qty")}</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.sku}</td>
                  <td>{r.barcode || "—"}</td>
                  <td>{formatCurrency(r.unit_price)}</td>
                  <td>{r.quantity}</td>
                  <td>{r.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <DemoActivityBlock
        title={t("activity")}
        logs={[
          {
            id: "inv-a1",
            actor_name: "Reception Lina",
            summary: `Adjusted stock: ${rows[0]?.name || "Item"}`,
            action: "inventory.adjust",
            created_at: isoDaysAgo(0, 14, 10),
          },
        ]}
      />
    </div>
  );
}


function AccountingDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("Accounting");
  const data = demoAccounting();
  const [period, setPeriod] = useState("14d");
  const ledgerRows = data.ledger.map((r) => ({
    id: r.id,
    entry_date: r.date,
    entry_type: r.type === "in" ? "income" : "expense",
    description: r.description,
    source: r.category,
    amount: r.amount,
    created_at: `${r.date}T10:00:00+08:00`,
  }));
  const expenseRows = data.expenses.map((r) => ({
    id: r.id,
    expense_date: r.date,
    category: r.category,
    description: r.description,
    amount: r.amount,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={`${orgName} · ${niche}`} />
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {["7d", "14d", "30d", "90d"].map((p) => (
          <button
            key={p}
            type="button"
            className={period === p ? "btn btn-soft" : "btn btn-ghost"}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <div className="surface" style={{ padding: "1rem" }}>
          <div className="muted">Cash in</div>
          <strong style={{ fontSize: "1.35rem" }}>{formatCurrency(data.inflow)}</strong>
        </div>
        <div className="surface" style={{ padding: "1rem" }}>
          <div className="muted">Cash out</div>
          <strong style={{ fontSize: "1.35rem" }}>{formatCurrency(data.outflow)}</strong>
        </div>
        <div className="surface" style={{ padding: "1rem" }}>
          <div className="muted">Net</div>
          <strong style={{ fontSize: "1.35rem" }}>
            {formatCurrency(data.inflow - data.outflow)}
          </strong>
        </div>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <AccountingCashChart
          ledger={ledgerRows.map((r) => ({
            id: r.id,
            entry_type: r.entry_type,
            amount: r.amount,
            entry_date: r.entry_date,
            created_at: r.created_at,
            description: r.description,
          }))}
          labels={{
            title: t("cashFlow"),
            byHour: "Hour",
            byDay: "Day",
            byWeek: "Week",
            byMonth: "Month",
            income: t("income"),
            expense: t("expense"),
            empty: t("emptyLedger"),
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Record cash in</h3>
          <DemoNoopForm className="stack">
            <input className="input" placeholder="Amount" readOnly />
            <input className="input" placeholder="Description" readOnly />
            <button className="btn btn-primary" type="submit">
              Save
            </button>
          </DemoNoopForm>
        </div>
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Record cash out</h3>
          <DemoNoopForm className="stack">
            <input className="input" placeholder="Amount" readOnly />
            <input className="input" placeholder="Description" readOnly />
            <button className="btn btn-primary" type="submit">
              Save
            </button>
          </DemoNoopForm>
        </div>
      </div>
      <AccountingLedgerTable
        title="Ledger"
        exportLabel="Export"
        filename="demo-ledger.csv"
        rows={ledgerRows}
        empty="No entries"
        labels={{
          date: "Date",
          type: "Type",
          description: "Description",
          source: "Source",
          amount: "Amount",
          recordedAt: "Recorded",
        }}
      />
      <AccountingExpenseTable
        title="Expenses"
        exportLabel="Export"
        filename="demo-expenses.csv"
        rows={expenseRows}
        empty="No expenses"
        labels={{
          date: "Date",
          category: "Category",
          description: "Description",
          amount: "Amount",
        }}
      />
      <DemoActivityBlock
        title={t("activity")}
        logs={[
          {
            id: "acc-a1",
            actor_name: "Admin",
            summary: "Recorded cash in RM 85.00",
            action: "accounting.income",
            created_at: isoDaysAgo(0, 10, 20),
          },
        ]}
      />
    </div>
  );
}

function LhdnDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("Lhdn");
  const locale = useLocale();
  const V = vocabLabels(niche, locale);
  const rows = demoLhdnSubmissions();

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={V.lhdnSubtitle} />
      <div className="surface" style={{ padding: "1rem 1.25rem" }}>
        <p style={{ margin: 0 }}>{t("demoMode")}</p>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{V.lhdnHowTitle}</h3>
        <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", lineHeight: 1.55 }}>
          <li>{t("howStep1")}</li>
          <li>{t("howStep2", { name: "Allvisor" })}</li>
          <li>{t("howStep3", { name: "Allvisor" })}</li>
          <li>{t("howStep4")}</li>
        </ol>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <DemoNoopForm className="stack">
          <DemoCensorField label={t("tin")} />
          <DemoCensorField label={t("brn")} />
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {orgName} — values hidden in demo preview.
          </p>
          <label className="row" style={{ gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked readOnly />
            <span>Intermediary linked</span>
          </label>
          <button type="submit" className="btn btn-primary">
            Save LHDN settings
          </button>
        </DemoNoopForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Submissions</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Submitted</th>
                <th>UUID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.invoice}>
                  <td>{r.invoice}</td>
                  <td>{r.customer}</td>
                  <td>{r.submitted}</td>
                  <td>
                    <DemoCensor width={88} height={12} />
                  </td>
                  <td>
                    <span className="badge">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <DemoActivityBlock
        title={t("activity")}
        logs={[
          {
            id: "lhdn-a1",
            actor_name: "Admin",
            summary: "Saved LHDN settings",
            action: "lhdn.settings",
            created_at: isoDaysAgo(0, 11, 0),
          },
          {
            id: "lhdn-a2",
            actor_name: "Admin",
            summary: "Submitted INV-1042 to MyInvois",
            action: "lhdn.submit",
            created_at: isoDaysAgo(1, 17, 5),
          },
        ]}
      />
    </div>
  );
}

function AdminDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("Admin");
  const team = demoTeam();
  const branches = demoBranches();
  const categories = demoServiceCategories(niche);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={orgName} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("staffTitle")}</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>
                    <span className="badge">{m.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Business settings</h3>
        <DemoNoopForm className="stack">
          <div className="field">
            <label>Organization name</label>
            <input className="input" defaultValue={orgName} readOnly />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" defaultValue="03-1234 5678" readOnly />
          </div>
          <div className="field">
            <label>Address</label>
            <input className="input" defaultValue="12 Jalan Demo, 50000 Kuala Lumpur" readOnly />
          </div>
          <DemoCensorField label="Business TIN" />
          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
        </DemoNoopForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Invoice format</h3>
        <DemoNoopForm className="stack">
          <div className="field">
            <label>Prefix</label>
            <input className="input" defaultValue="INV-" readOnly />
          </div>
          <div className="field">
            <label>Next number</label>
            <input className="input" defaultValue="1043" readOnly />
          </div>
          <button type="submit" className="btn btn-soft">
            Save format
          </button>
        </DemoNoopForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Branches</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Service catalogue</h3>
        <DemoNoopForm className="stack">
          <div className="field">
            <label>Category</label>
            <select className="select" disabled>
              {categories.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Service item</label>
            <input className="input" placeholder="New service" readOnly />
          </div>
          <button type="submit" className="btn btn-primary">
            Add service
          </button>
        </DemoNoopForm>
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.name} standard</td>
                  <td>{formatCurrency(40 + i * 20)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Opening hours</h3>
        <DemoNoopForm className="row" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="field">
            <label>Open</label>
            <input className="input" defaultValue="09:00" readOnly />
          </div>
          <div className="field">
            <label>Close</label>
            <input className="input" defaultValue="18:00" readOnly />
          </div>
          <button type="submit" className="btn btn-soft">
            Save hours
          </button>
        </DemoNoopForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Data import</h3>
        <p className="muted">Import customers / products from CSV (disabled in demo).</p>
        <button type="button" className="btn btn-soft" disabled>
          Choose file
        </button>
      </div>
    </div>
  );
}

/** Rich frontend-only pages that mount the same client UI as the real app. */
export function HomeDemoPage({ view, niche, orgName, entityTitle, scheduleLabel }: Props) {
  const content = (() => {
    if (view === "customers") {
      return <CustomersDemo niche={niche} orgName={orgName} entityTitle={entityTitle} />;
    }
    if (view === "appointments") {
      return <AppointmentsDemo niche={niche} orgName={orgName} scheduleLabel={scheduleLabel} />;
    }
    if (view === "invoices") return <InvoicesDemo niche={niche} orgName={orgName} />;
    if (view === "inventory") return <InventoryDemo niche={niche} orgName={orgName} />;
    if (view === "pos") return <PosDemo niche={niche} orgName={orgName} />;
    if (view === "cash") return <CashExactDemo />;
    if (view === "categories") return <CategoriesExactDemo niche={niche} />;
    if (view === "receipts") return <ReceiptsExactDemo niche={niche} orgName={orgName} />;
    if (view === "logistics") return <LogisticsExactDemo />;
    if (view === "printers") return <PrintersExactDemo />;
    if (view === "admin") return <AdminDemo niche={niche} orgName={orgName} />;
    if (view === "accounting") return <AccountingDemo niche={niche} orgName={orgName} />;
    if (view === "lhdn") return <LhdnDemo niche={niche} orgName={orgName} />;

    // Tuition niche — exact real-page layouts (not NicheModuleDemo)
    if (view === "subjects") return <TuitionSubjectsDemo />;
    if (view === "assessments") return <TuitionAssessmentsDemo />;
    if (view === "classes" && niche === "tuition") return <TuitionClassesDemo />;
    if (view === "attendance" && niche === "tuition") return <TuitionAttendanceDemo />;

    // Gym niche — exact real-page layouts
    if (view === "memberships") return <GymMembershipsDemo />;
    if (view === "checkins") return <GymCheckinsDemo />;
    if (view === "classes" && niche === "gym") return <GymClassesDemo />;

    // Optical niche — exact real-page layouts
    if (view === "eyeRx") return <OpticalEyeRxDemo />;
    if (view === "labOrders") return <OpticalLabOrdersDemo />;

    // Workshop niche — exact real-page layouts
    if (view === "jobs") return <WorkshopJobsDemo />;
    if (view === "vehicles") return <WorkshopVehiclesDemo />;

    const moduleConfig = demoNicheModule(view, niche);
    if (moduleConfig) {
      return <NicheModuleDemo config={moduleConfig} orgName={orgName} />;
    }

    return (
      <div className="surface" style={{ padding: "1.25rem" }}>
        <PageHeader title={view} subtitle={orgName} />
        <p className="muted">Demo preview for this section.</p>
      </div>
    );
  })();

  return <ConfirmProvider>{content}</ConfirmProvider>;
}
