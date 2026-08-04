"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DayHourTimetable } from "@/components/DayHourTimetable";
import { PatientName } from "@/components/PatientName";

export type DemoNiche = "clinic" | "retail" | "gym";

type Props = {
  view: string;
  niche: DemoNiche;
  orgName: string;
  entityTitle: string;
  scheduleLabel: string;
};

function DemoInput({
  label,
  placeholder,
  defaultValue,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        readOnly
      />
    </div>
  );
}

function DemoSelect({ label, options, value }: { label: string; options: string[]; value?: string }) {
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      <select className="select" defaultValue={value || options[0]} disabled>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function DemoTextarea({ label, placeholder, rows = 3 }: { label: string; placeholder?: string; rows?: number }) {
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      <textarea className="textarea" placeholder={placeholder} rows={rows} readOnly defaultValue="" />
    </div>
  );
}

function SoftBtn({ children, tone = "soft" }: { children: ReactNode; tone?: "soft" | "danger" | "primary" }) {
  const cls =
    tone === "danger" ? "btn btn-ghost" : tone === "primary" ? "btn btn-primary" : "btn btn-soft";
  return (
    <button type="button" className={cls} style={tone === "danger" ? { color: "#b42318", background: "rgba(220,38,38,0.08)" } : undefined}>
      {children}
    </button>
  );
}

function PatientsDemo({ orgName, entityTitle }: { orgName: string; entityTitle: string }) {
  const rows = [
    {
      name: "Aina Rahman",
      risk: "high" as const,
      allergies: "Nuts",
      ic: "900101-14-5678",
      address: "12 Jalan Melati, Shah Alam",
      phone: "012-345 6789",
      email: "aina@email.com",
      added: "Reception Lina",
    },
    {
      name: "Lim Wei",
      risk: "low" as const,
      allergies: null as string | null,
      ic: "880512-10-3344",
      address: "88 SS2, Petaling Jaya",
      phone: "016-778 2210",
      email: "limwei@email.com",
      added: "Dr. Amin",
    },
    {
      name: "Siti Aminah",
      risk: "medium" as const,
      allergies: "Amoxycillin",
      ic: "950303-08-1122",
      address: "B-12-03 Residensi Harmoni",
      phone: "019-441 2200",
      email: "siti@email.com",
      added: "Nurse Farah",
    },
    {
      name: "Tan Mei Ling",
      risk: "low" as const,
      allergies: null,
      ic: "920720-14-9900",
      address: "No. 5 Lorong Kemboja",
      phone: "013-990 1188",
      email: "mei@email.com",
      added: "Reception Lina",
    },
    {
      name: "Rajesh K.",
      risk: "medium" as const,
      allergies: "Seafood",
      ic: "860909-10-2211",
      address: "Taman Desa, KL",
      phone: "014-332 1100",
      email: "rajesh@email.com",
      added: "Dr. Amin",
    },
  ];

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={entityTitle} subtitle={orgName} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <DemoInput label="Name" placeholder="Full name" />
          <DemoSelect label="Risk" options={["—", "low", "medium", "high"]} />
          <DemoInput label="IC number" placeholder="900101-14-5678" />
          <DemoInput label="Email" placeholder="name@email.com" />
          <DemoInput label="Phone" placeholder="012-3456789" />
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <DemoInput label="Address" placeholder="Unit / street / city" />
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <DemoInput label="Allergies" placeholder="e.g. Penicillin, nuts" />
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <DemoTextarea label="Notes" placeholder="Clinical notes…" rows={2} />
        </div>
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "0.9rem" }}>
          Save
        </button>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="field" style={{ maxWidth: 280, marginBottom: "0.85rem" }}>
          <label>Search</label>
          <input className="input" placeholder="Search name, IC, phone…" readOnly />
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Risk</th>
                <th>IC number</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Added by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ic}>
                  <td>
                    <PatientName name={r.name} risk={r.risk} allergies={r.allergies} />
                  </td>
                  <td>{r.risk}</td>
                  <td>{r.ic}</td>
                  <td>{r.address}</td>
                  <td>{r.phone}</td>
                  <td>{r.email}</td>
                  <td>{r.added}</td>
                  <td>
                    <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                      <SoftBtn>History</SoftBtn>
                      <SoftBtn>Edit</SoftBtn>
                      <SoftBtn tone="danger">Delete</SoftBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AppointmentsDemo({
  orgName,
  scheduleLabel,
}: {
  orgName: string;
  scheduleLabel: string;
}) {
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const now = useMemo(() => new Date(2026, 7, 5), []);
  const appts = useMemo(
    () => [
      {
        id: "1",
        title: "Emergency / walk-in",
        starts_at: "2026-08-05T02:30:00+08:00",
        ends_at: "2026-08-05T03:00:00+08:00",
        status: "completed",
        customers: { name: "estatotitu", risk_level: "low" as const, allergies: null },
      },
      {
        id: "2",
        title: "Consult",
        starts_at: "2026-08-05T09:00:00+08:00",
        ends_at: "2026-08-05T09:30:00+08:00",
        status: "confirmed",
        customers: { name: "Nurul Aisyah", risk_level: "low" as const, allergies: null },
      },
      {
        id: "3",
        title: "Follow-up",
        starts_at: "2026-08-05T10:30:00+08:00",
        ends_at: "2026-08-05T11:00:00+08:00",
        status: "confirmed",
        customers: { name: "Rajesh K.", risk_level: "medium" as const, allergies: "Penicillin" },
      },
    ],
    []
  );

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const counts: Record<number, number> = { 3: 7, 5: 3, 8: 2, 12: 4, 19: 1, 26: 5 };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={scheduleLabel} subtitle={orgName} />

      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn ${mode === "calendar" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("calendar")}
        >
          Calendar
        </button>
        <button
          type="button"
          className={`btn ${mode === "list" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("list")}
        >
          List
        </button>
        <div className="row" style={{ marginLeft: "auto", gap: "0.4rem", alignItems: "center" }}>
          <SoftBtn>Prev</SoftBtn>
          <strong style={{ minWidth: 120, textAlign: "center" }}>August 2026</strong>
          <SoftBtn>Next</SoftBtn>
          <SoftBtn>Today</SoftBtn>
        </div>
      </div>

      {mode === "calendar" ? (
        <div className="surface" style={{ padding: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "0.45rem",
              marginBottom: "0.5rem",
            }}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="muted" style={{ fontSize: "0.75rem", textAlign: "center" }}>
                {d}
              </div>
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((d) => {
              const selected = d === 5;
              return (
                <div
                  key={d}
                  className="surface"
                  style={{
                    margin: 0,
                    padding: "0.55rem 0.4rem",
                    textAlign: "center",
                    minHeight: 54,
                    border: selected ? "1px solid var(--accent)" : undefined,
                    background: selected ? "var(--accent-soft)" : undefined,
                  }}
                >
                  <div style={{ fontWeight: 650 }}>{d}</div>
                  {counts[d] ? (
                    <span
                      className="badge"
                      style={{ marginTop: 4, display: "inline-block", minWidth: 22 }}
                    >
                      {counts[d]}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <DayHourTimetable
        date={now}
        appointments={appts}
        orientation="horizontal"
        hoursConfig={{ openHour: 0, closeHour: 20, closedWeekdays: [6, 0], locale: "en" }}
        labels={{
          timetable: "Hour timetable — Wed 5 Aug",
          occupied: "Occupied",
          free: "Free",
          closed: "Clinic closed",
          publicHoliday: "Public holiday",
        }}
      />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Wed, 5 Aug 2026</h3>
        <div className="stack" style={{ gap: "0.85rem" }}>
          {appts.map((a) => (
            <div
              key={a.id}
              className="row"
              style={{
                justifyContent: "space-between",
                gap: "0.75rem",
                flexWrap: "wrap",
                borderBottom: "1px solid var(--line)",
                paddingBottom: 10,
              }}
            >
              <div>
                <strong>{a.customers?.name}</strong>
                <div className="muted" style={{ fontSize: "0.88rem" }}>
                  {a.title} · {new Date(a.starts_at).toLocaleString("en-MY")} –{" "}
                  {new Date(a.ends_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                <DemoSelect label="" options={["completed", "confirmed", "booked", "no_show"]} value={a.status} />
                <SoftBtn>✓</SoftBtn>
                <button type="button" className="btn btn-soft" style={{ background: "rgba(234,179,8,0.2)" }}>
                  Edit
                </button>
                <SoftBtn tone="danger">Delete</SoftBtn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoicesDemo({ orgName }: { orgName: string }) {
  const rows = [
    {
      cat: "Dental · paid",
      title: "gigi cabut",
      no: "INV-2026-00032",
      patient: "Aisyah Zahra",
      risk: "low" as const,
      total: "RM 200.00",
      paid: "RM 200.00",
      at: "3 Ogo 2026, 04:35 PTG",
      status: "paid",
    },
    {
      cat: "Follow-up · pending",
      title: "mental",
      no: "INV-2026-00031",
      patient: "Hanson Glenn",
      risk: "high" as const,
      total: "RM 120.00",
      paid: "RM 0.00",
      at: "3 Ogo 2026, 02:10 PTG",
      status: "unpaid",
    },
    {
      cat: "Consult · paid",
      title: "Consult + meds",
      no: "INV-2026-00030",
      patient: "Aina Rahman",
      risk: "high" as const,
      total: "RM 85.00",
      paid: "RM 85.00",
      at: "2 Ogo 2026, 11:20 PG",
      status: "paid",
    },
    {
      cat: "Lab · partial",
      title: "Blood panel",
      no: "INV-2026-00029",
      patient: "Lim Wei",
      risk: "low" as const,
      total: "RM 95.00",
      paid: "RM 40.00",
      at: "1 Ogo 2026, 03:05 PTG",
      status: "partial",
    },
  ];

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Invoices" subtitle={orgName} />
      <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <DemoSelect label="Filter by day" options={["All days", "Today", "This week"]} />
        <div className="field" style={{ flex: "1 1 260px" }}>
          <label>Search</label>
          <input className="input" placeholder="Search patient, invoice no., notes…" readOnly />
        </div>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice no.</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Added at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.no}>
                  <td>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {r.cat}
                    </div>
                    <div>{r.title}</div>
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      {r.no}
                    </div>
                  </td>
                  <td>
                    <PatientName name={r.patient} risk={r.risk} allergies={null} />
                  </td>
                  <td>
                    <span className="badge">{r.status}</span>
                  </td>
                  <td>{r.total}</td>
                  <td>{r.paid}</td>
                  <td>{r.at}</td>
                  <td>
                    <SoftBtn tone="danger">Revoke</SoftBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventoryDemo({ orgName }: { orgName: string }) {
  const frequent = [
    { name: "Surgical gloves M", sku: "SUP-002", used: 54, onHand: 4100 },
    { name: "OR S oral rehydration", sku: "MED-003", used: 1, onHand: 153 },
    { name: "Gauze swab 7.5cm", sku: "SUP-004", used: 1, onHand: 73 },
    { name: "Paracetamol", sku: "123456", used: 1, onHand: 2004 },
    { name: "Antiseptic solution 100ml", sku: "SUP-001", used: 1, onHand: 43 },
  ];
  const rows = [
    {
      name: "Amoxycillin Antibiotics",
      sku: "160317",
      barcode: "—",
      price: "RM 10.00",
      qty: 206,
      at: "31 Jul 2026, 02:01 PG",
    },
    {
      name: "Syringe 5ml",
      sku: "SUP-005",
      barcode: "—",
      price: "RM 0.80",
      qty: 304,
      at: "30 Jul 2026, 04:41 PTG",
    },
    {
      name: "Saline 500ml",
      sku: "MED-007",
      barcode: "8901234567890",
      price: "RM 3.50",
      qty: 48,
      at: "28 Jul 2026, 10:12 PG",
    },
    {
      name: "Face mask (box)",
      sku: "SUP-010",
      barcode: "—",
      price: "RM 12.00",
      qty: 22,
      at: "25 Jul 2026, 03:20 PTG",
    },
  ];

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Inventory" subtitle="Medicines and clinic supplies." />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Frequently used</h3>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.88rem" }}>
          Most issued / sold in the last 90 days — keep these easy to find.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {frequent.map((f) => (
            <div key={f.sku} className="surface" style={{ margin: 0, padding: "0.75rem" }}>
              <strong style={{ fontSize: "0.9rem" }}>{f.name}</strong>
              <div className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
                SKU: {f.sku}
              </div>
              <div style={{ fontSize: "0.82rem", marginTop: 6 }}>
                {f.used} used · {f.onHand} on hand
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add item</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.65rem",
          }}
        >
          <DemoInput label="Name" defaultValue="Paracetamol 500mg" />
          <DemoInput label="SKU" />
          <DemoInput label="Barcode" placeholder="EAN / scan code (opt)" />
          <DemoInput label="Price" defaultValue="0" />
          <DemoInput label="Cost" defaultValue="0" />
          <DemoInput label="Quantity" defaultValue="0" />
          <DemoInput label="Low threshold" defaultValue="5" />
        </div>
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "0.85rem" }}>
          Save
        </button>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="field" style={{ maxWidth: 280, marginBottom: "0.75rem" }}>
          <label>Search</label>
          <input className="input" placeholder="Search item…" readOnly />
        </div>
        <div className="row" style={{ gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" readOnly /> Select all items
          </label>
          <DemoSelect label="" options={["Adjust qty", "Set threshold"]} />
          <input style={{ width: 70 }} defaultValue="0" readOnly />
          <SoftBtn>OK for selected items (0)</SoftBtn>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Retail</th>
                <th>Category</th>
                <th>Added at</th>
                <th>Adjust stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sku}>
                  <td>
                    <input type="checkbox" readOnly />
                  </td>
                  <td>{r.name}</td>
                  <td>{r.sku}</td>
                  <td>{r.barcode}</td>
                  <td>{r.price}</td>
                  <td>{r.qty}</td>
                  <td>
                    <span className="badge">each</span>
                  </td>
                  <td>—</td>
                  <td>{r.at}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <select disabled defaultValue="+">
                        <option>+</option>
                        <option>-</option>
                      </select>
                      <input style={{ width: 56 }} defaultValue="0" readOnly />
                      <SoftBtn>OK</SoftBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
        Showing demo stock for {orgName}.
      </p>
    </div>
  );
}

function AdminDemo({ orgName }: { orgName: string }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Admin" subtitle={orgName} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add branch</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Link another clinic branch under the same owner account.
        </p>
        <div className="row" style={{ gap: "0.55rem", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 220px" }}>
            <label>Branch name</label>
            <input className="input" defaultValue="Klinik Bestari KL" readOnly />
          </div>
          <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
            Link branch
          </button>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>1. {orgName} (this clinic)</h3>
          <SoftBtn>Minimize</SoftBtn>
        </div>

        <h4 style={{ marginBottom: "0.55rem" }}>Clinic hours & weekly off</h4>
        <DemoInput label="Service charge (%)" defaultValue="0" />
        <button type="button" className="btn btn-soft" style={{ width: "100%", margin: "0.55rem 0 1rem" }}>
          Save service charge
        </button>

        <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <DemoSelect
            label="Opens at"
            options={["00:00", "08:00", "09:00"]}
            value="00:00"
          />
          <DemoSelect
            label="Closes at (last hour shown)"
            options={["18:00", "20:00", "22:00"]}
            value="20:00"
          />
        </div>

        <div style={{ marginTop: "0.85rem" }}>
          <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 6 }}>
            Weekly off days
          </div>
          <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
            {days.map((d) => (
              <label key={d} className="row" style={{ gap: 4 }}>
                <input type="checkbox" defaultChecked={d === "Sat" || d === "Sun"} readOnly />
                {d}
              </label>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
          Save clinic hours
        </button>

        <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h4 style={{ margin: 0 }}>Categories</h4>
            <SoftBtn>Expand</SoftBtn>
          </div>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            Category name · Description (collapsed in demo)
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-ghost"
        style={{ borderColor: "rgba(220,38,38,0.35)", color: "#b42318" }}
      >
        Exit admin zone
      </button>
    </div>
  );
}

function AccountingDemo({ orgName }: { orgName: string }) {
  const periods = ["Today", "This week", "This month", "Previous 3 months", "Previous 6 months", "This year"];
  const [period, setPeriod] = useState("This month");
  const scales = ["By hour", "By day", "By week", "By month"];
  const [scale, setScale] = useState("By day");

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Clinic accounting" subtitle="Track all cash in and cash out for the clinic." />

      <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${period === p ? "btn-primary" : "btn-ghost"}`}
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
          gap: "0.65rem",
        }}
      >
        {[
          ["Income (cash in)", "RM 113,660.50"],
          ["Expenses (cash out)", "RM 0.00"],
          ["Profit / Loss", "RM 113,660.50"],
          ["Net cash flow", "RM 113,660.50"],
        ].map(([label, value]) => (
          <div key={label} className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={{ fontSize: "1.15rem" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "0.85rem",
        }}
      >
        <div className="surface" style={{ padding: "1.15rem" }}>
          <h3 style={{ marginTop: 0 }}>Add cash in</h3>
          <DemoSelect label="Category" options={["Consultation", "Procedure", "Medicine"]} />
          <DemoInput label="Amount" placeholder="0.00" />
          <DemoInput label="Date" type="date" defaultValue="2026-08-05" />
          <DemoTextarea label="Description" rows={2} />
          <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "0.65rem" }}>
            Save
          </button>
        </div>
        <div className="surface" style={{ padding: "1.15rem" }}>
          <h3 style={{ marginTop: 0 }}>Add cash out</h3>
          <DemoSelect label="Category" options={["Rent", "Utilities", "Payroll", "Inventory"]} />
          <DemoInput label="Amount" placeholder="0.00" />
          <DemoInput label="Date" type="date" defaultValue="2026-08-05" />
          <DemoTextarea label="Description" rows={2} />
          <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: "0.65rem" }}>
            Save
          </button>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Money vs time</h3>
        <div className="row" style={{ gap: "0.4rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
          {scales.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn ${scale === s ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setScale(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div
          style={{
            height: 160,
            borderRadius: 12,
            border: "1px solid var(--line)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              points="0,120 40,110 80,90 120,95 160,70 200,60 240,55 280,40 320,45 360,30 400,25"
            />
          </svg>
          <div className="muted" style={{ position: "absolute", bottom: 8, left: 12, fontSize: "0.78rem" }}>
            Demo chart · {period} · {scale} · {orgName}
          </div>
        </div>
      </div>
    </div>
  );
}

function LhdnDemo({ orgName }: { orgName: string }) {
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="LHDN e-Invoice"
        subtitle="Allvisor submits e-Invoices to MyInvois as your authorized intermediary. Each clinic uses its own TIN."
      />

      <div
        className="surface"
        style={{
          padding: "0.75rem 1rem",
          background: "rgba(22,163,74,0.08)",
          borderColor: "rgba(22,163,74,0.25)",
        }}
      >
        Live MyInvois credentials detected (taxpayer mode).
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>How this works for your clinic</h3>
        <ol style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.55 }}>
          <li>Create / log in to your MyInvois portal with your business TIN.</li>
          <li>Add Allvisor as intermediary under Representatives → Intermediaries.</li>
          <li>Save your TIN + NRIC/ROB/ROC below and mark the checkbox.</li>
          <li>Paid invoices can auto-submit; track status under Submissions.</li>
        </ol>
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 0 }}>
          Allvisor holds one platform API credential. Your Client Secret is never required.
        </p>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <DemoInput label="Your business TIN" defaultValue="IG50742749010" />
        <div style={{ marginTop: "0.75rem" }}>
          <DemoInput label="NRIC / ROB / ROC" defaultValue="011216100769" />
        </div>
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Use NRIC for sole prop, ROB/ROC for companies — same as MyInvois registration.
        </p>
        <label className="row" style={{ gap: 8, margin: "0.75rem 0" }}>
          <input type="checkbox" defaultChecked readOnly />
          I authorized Allvisor as my intermediary in the MyInvois portal (Representatives →
          Intermediaries).
        </label>
        <p className="muted" style={{ fontSize: "0.78rem" }}>
          Marked linked: 31 Jul 2026, 09:36 PM · {orgName}
        </p>
        <button type="button" className="btn btn-primary" style={{ width: "100%" }}>
          Save LHDN settings
        </button>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Submissions</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Patient</th>
                <th>Submitted</th>
                <th>MyInvois</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["INV-1042", "Aina Rahman", "4 Aug 09:20", "a1b2…9f", "Accepted"],
                ["INV-1040", "Lim Wei", "3 Aug 17:05", "—", "Awaiting"],
                ["INV-1039", "Siti Aminah", "3 Aug 12:40", "c3d4…1a", "Accepted"],
                ["INV-1036", "Rajesh K.", "1 Aug 11:00", "—", "Rejected"],
              ].map((r) => (
                <tr key={r[0]}>
                  <td>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>{r[3]}</td>
                  <td>
                    <span className="badge">{r[4]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GenericOpsDemo({
  title,
  orgName,
  columns,
  rows,
}: {
  title: string;
  orgName: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={title} subtitle={orgName} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${title}-${i}`}>
                  {row.map((cell, j) => (
                    <td key={j}>
                      {j === row.length - 1 ? <span className="badge">{cell}</span> : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Rich frontend-only pages that mirror the real authenticated dashboard UI. */
export function HomeDemoPage({ view, niche, orgName, entityTitle, scheduleLabel }: Props) {
  if (view === "customers") {
    if (niche === "clinic") return <PatientsDemo orgName={orgName} entityTitle={entityTitle} />;
    if (niche === "gym") {
      return (
        <GenericOpsDemo
          title={entityTitle}
          orgName={orgName}
          columns={["Member ID", "Name", "Plan", "Check-ins (30d)", "Status"]}
          rows={[
            ["MEM-220", "Hafiz Omar", "Monthly", "14", "Active"],
            ["MEM-219", "Mei Ling", "Monthly", "11", "Active"],
            ["MEM-218", "Amir Razak", "Quarterly", "6", "Due soon"],
            ["MEM-216", "Jason Tan", "PT pack", "3", "Frozen"],
          ]}
        />
      );
    }
    return (
      <GenericOpsDemo
        title={entityTitle}
        orgName={orgName}
        columns={["Code", "Customer", "Phone", "Last purchase", "Status"]}
        rows={[
          ["CU-4201", "Cafe Luna Sdn Bhd", "07-3321 8890", "4 Aug · RM 420", "Active"],
          ["CU-4198", "Workshop 88", "012-778 2211", "3 Aug · RM 890", "Active"],
          ["CU-4192", "Mei Hardware", "016-554 0091", "1 Aug · RM 156", "Active"],
        ]}
      />
    );
  }

  if (view === "appointments") {
    return <AppointmentsDemo orgName={orgName} scheduleLabel={scheduleLabel} />;
  }
  if (view === "invoices") {
    return niche === "clinic" ? (
      <InvoicesDemo orgName={orgName} />
    ) : (
      <GenericOpsDemo
        title="Invoices"
        orgName={orgName}
        columns={["Invoice", "Customer", "Date", "Total", "Status"]}
        rows={[
          ["INV-331", "Wholesale Sdn Bhd", "4 Aug 2026", "RM 1,240.00", "Unpaid"],
          ["INV-330", "Cafe Luna", "3 Aug 2026", "RM 420.00", "Paid"],
          ["INV-329", "Workshop 88", "2 Aug 2026", "RM 890.00", "Partial"],
        ]}
      />
    );
  }
  if (view === "inventory") {
    return niche === "clinic" ? (
      <InventoryDemo orgName={orgName} />
    ) : (
      <GenericOpsDemo
        title="Inventory"
        orgName={orgName}
        columns={["SKU", "Product", "Qty", "Reorder", "Status"]}
        rows={[
          ["SKU-12", "Cable 2m", "5", "10", "Low"],
          ["SKU-07", "Adapter USB-C", "3", "8", "Low"],
          ["SKU-44", "Power bank 10k", "2", "6", "Critical"],
        ]}
      />
    );
  }
  if (view === "admin") return <AdminDemo orgName={orgName} />;
  if (view === "accounting") return <AccountingDemo orgName={orgName} />;
  if (view === "lhdn") return <LhdnDemo orgName={orgName} />;

  if (view === "pos") {
    return (
      <GenericOpsDemo
        title="POS / Sales"
        orgName={orgName}
        columns={["Ticket", "Counter", "Method", "Time", "Amount"]}
        rows={[
          ["POS-8821", "Counter 1", "Cash", "10:12", "RM 86.00"],
          ["POS-8820", "Counter 2", "QR", "11:05", "RM 42.50"],
          ["POS-8819", "Counter 1", "Card", "12:40", "RM 125.00"],
        ]}
      />
    );
  }
  if (view === "cash") {
    return (
      <GenericOpsDemo
        title="Cash drawer"
        orgName={orgName}
        columns={["Type", "Ref", "Time", "Amount", "Balance"]}
        rows={[
          ["Open", "Drawer A", "08:00", "RM 200.00", "RM 200.00"],
          ["Sale", "POS-8821", "10:12", "+ RM 86.00", "RM 286.00"],
          ["Expected", "Close", "—", "—", "RM 378.50"],
        ]}
      />
    );
  }
  if (view === "memberships" || view === "classes" || view === "checkins") {
    const title =
      view === "memberships" ? "Memberships" : view === "classes" ? "Classes" : "Check-ins";
    return (
      <GenericOpsDemo
        title={title}
        orgName={orgName}
        columns={
          view === "checkins"
            ? ["Time", "Member", "Gate", "Status"]
            : view === "classes"
              ? ["Time", "Class", "Coach", "Booked"]
              : ["Member", "Plan", "Renewal", "Status"]
        }
        rows={
          view === "checkins"
            ? [
                ["18:02", "Hafiz Omar", "Gate A", "In"],
                ["18:05", "Mei Ling", "Gate A", "In"],
              ]
            : view === "classes"
              ? [
                  ["06:30", "HIIT", "Coach Dan", "14/16"],
                  ["09:00", "Yoga", "Coach Mei", "11/12"],
                ]
              : [
                  ["Hafiz Omar", "Monthly", "5 Aug 2026", "Active"],
                  ["Mei Ling", "Monthly", "12 Aug 2026", "Active"],
                ]
        }
      />
    );
  }

  return (
    <GenericOpsDemo
      title={view}
      orgName={orgName}
      columns={["#", "Detail", "Status"]}
      rows={[["—", "Demo page", "Ready"]]}
    />
  );
}
