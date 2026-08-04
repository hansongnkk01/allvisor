import type { PosProduct } from "@/components/PosWorkspace";
import type { InvoiceListRow } from "@/components/InvoicesWorkspace";
import { DEMO_ORG } from "@/lib/demo-orgs";
import type { AppointmentStatus, Customer, InvoiceStatus, Niche } from "@/lib/types";

const ORG_ID = "demo-org";

function isoDaysFromNow(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** IC values exist for search demos but must never be rendered — use DemoCensor. */
export function demoCustomers(niche: Niche): Customer[] {
  const care = niche === "clinic" || niche === "physio" || niche === "vet" || niche === "optical";
  return [
    {
      id: "c1",
      organization_id: ORG_ID,
      name: "Aina Rahman",
      email: "aina@email.com",
      phone: "012-345 6789",
      ic_number: "CENSORED",
      address: "12 Jalan Melati, Shah Alam",
      notes: care ? "Prefers morning slots" : "Regular customer",
      created_by: null,
      created_by_name: "Reception Lina",
      risk_level: care ? "high" : null,
      allergies: care ? "Nuts" : null,
      created_at: isoDaysFromNow(-40, 9),
    },
    {
      id: "c2",
      organization_id: ORG_ID,
      name: "Lim Wei",
      email: "limwei@email.com",
      phone: "016-778 2210",
      ic_number: "CENSORED",
      address: "88 SS2, Petaling Jaya",
      notes: null,
      created_by: null,
      created_by_name: "Admin",
      risk_level: care ? "low" : null,
      allergies: null,
      created_at: isoDaysFromNow(-28, 11),
    },
    {
      id: "c3",
      organization_id: ORG_ID,
      name: "Siti Aminah",
      email: "siti@email.com",
      phone: "019-220 1188",
      ic_number: "CENSORED",
      address: "5 Taman Desa, KL",
      notes: niche === "tuition" ? "Form 4 — Science" : null,
      created_by: null,
      created_by_name: "Staff",
      risk_level: care ? "medium" : null,
      allergies: care ? "Penicillin" : null,
      created_at: isoDaysFromNow(-12, 14),
    },
    {
      id: "c4",
      organization_id: ORG_ID,
      name: "Hafiz Omar",
      email: "hafiz@email.com",
      phone: "013-555 9090",
      ic_number: "CENSORED",
      address: "22 Bandar Utama",
      notes: null,
      created_by: null,
      created_by_name: "Reception Lina",
      risk_level: care ? "low" : null,
      allergies: null,
      created_at: isoDaysFromNow(-5, 16),
    },
  ];
}

export function demoServiceCategories(niche: Niche) {
  if (niche === "clinic" || niche === "physio") {
    return [
      { id: "cat1", name: "Consultation" },
      { id: "cat2", name: "Follow-up" },
      { id: "cat3", name: "Procedure" },
    ];
  }
  if (niche === "salon") {
    return [
      { id: "cat1", name: "Haircut" },
      { id: "cat2", name: "Colour" },
      { id: "cat3", name: "Treatment" },
    ];
  }
  if (niche === "optical") {
    return [
      { id: "cat1", name: "Eye exam" },
      { id: "cat2", name: "Fitting" },
    ];
  }
  return [
    { id: "cat1", name: "Standard" },
    { id: "cat2", name: "Priority" },
  ];
}

export function demoAppointments(niche: Niche) {
  const customers = demoCustomers(niche);
  const statuses: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "scheduled"];
  return [
    {
      id: "a1",
      title: "Consultation",
      starts_at: isoDaysFromNow(0, 10, 0),
      ends_at: isoDaysFromNow(0, 10, 30),
      status: statuses[0],
      notes: null,
      reminder_sent: true,
      customers: {
        name: customers[0].name,
        risk_level: customers[0].risk_level,
        allergies: customers[0].allergies,
      },
    },
    {
      id: "a2",
      title: "Follow-up",
      starts_at: isoDaysFromNow(0, 14, 0),
      ends_at: isoDaysFromNow(0, 14, 30),
      status: statuses[1],
      notes: "Bring previous report",
      reminder_sent: false,
      customers: {
        name: customers[1].name,
        risk_level: customers[1].risk_level,
        allergies: customers[1].allergies,
      },
    },
    {
      id: "a3",
      title: "Check-in",
      starts_at: isoDaysFromNow(1, 11, 0),
      ends_at: isoDaysFromNow(1, 11, 45),
      status: statuses[0],
      notes: null,
      reminder_sent: false,
      customers: {
        name: customers[2].name,
        risk_level: customers[2].risk_level,
        allergies: customers[2].allergies,
      },
    },
    {
      id: "a4",
      title: "Session",
      starts_at: isoDaysFromNow(-1, 16, 0),
      ends_at: isoDaysFromNow(-1, 16, 30),
      status: statuses[2],
      notes: null,
      reminder_sent: true,
      customers: {
        name: customers[3].name,
        risk_level: customers[3].risk_level,
        allergies: customers[3].allergies,
      },
    },
  ];
}

export function demoProductCategories() {
  return [
    { id: "pc1", name: "General" },
    { id: "pc2", name: "Premium" },
    { id: "pc3", name: "Consumables" },
  ];
}

export function demoProducts(niche: Niche): PosProduct[] {
  const base: PosProduct[] = [
    {
      id: "p1",
      name: niche === "pharmacy" ? "Paracetamol 500mg" : niche === "optical" ? "Lens cleaner" : "Item A",
      sku: "SKU-001",
      barcode: "9550001001",
      unit_price: 12.5,
      quantity: 48,
      sold_by: "each",
      track_stock: true,
      price_on_sale: false,
      category_id: "pc1",
    },
    {
      id: "p2",
      name: niche === "fashion" ? "Cotton tee M" : niche === "fnb" ? "Set lunch" : "Item B",
      sku: "SKU-002",
      barcode: "9550001002",
      unit_price: 45,
      quantity: 20,
      sold_by: "each",
      track_stock: true,
      price_on_sale: false,
      category_id: "pc2",
    },
    {
      id: "p3",
      name: niche === "workshop" ? "Engine oil 4L" : "Item C",
      sku: "SKU-003",
      barcode: "9550001003",
      unit_price: 68,
      quantity: 12,
      sold_by: "each",
      track_stock: true,
      price_on_sale: true,
      category_id: "pc1",
    },
    {
      id: "p4",
      name: "Service fee",
      sku: "SVC-001",
      barcode: null,
      unit_price: 30,
      quantity: 999,
      sold_by: "each",
      track_stock: false,
      price_on_sale: false,
      category_id: "pc3",
    },
  ];
  return base;
}

export function demoHeldTickets() {
  return [
    {
      id: "t1",
      ticket_number: "T-102",
      customer_id: "c1",
      payment_method: "cash" as string | null,
      lines: [{ productId: "p1", name: "Item A", unitPrice: 12.5, qty: 2 }],
    },
  ];
}

export function demoInvoices(niche: Niche): InvoiceListRow[] {
  const customers = demoCustomers(niche);
  const rows: Array<{
    id: string;
    num: string;
    title: string;
    status: InvoiceStatus;
    total: number;
    paid: number;
    days: number;
    cust: number;
    lhdn: string | null;
  }> = [
    {
      id: "inv1",
      num: "INV-1042",
      title: niche === "tuition" ? "Monthly fees" : "Consult + items",
      status: "paid",
      total: 85,
      paid: 85,
      days: -1,
      cust: 0,
      lhdn: "accepted",
    },
    {
      id: "inv2",
      num: "INV-1041",
      title: niche === "retail" ? "Counter sale" : "Walk-in",
      status: "unpaid",
      total: 120,
      paid: 0,
      days: -2,
      cust: 1,
      lhdn: null,
    },
    {
      id: "inv3",
      num: "INV-1040",
      title: "Package",
      status: "partial",
      total: 200,
      paid: 80,
      days: -3,
      cust: 2,
      lhdn: "pending",
    },
  ];

  return rows.map((r) => {
    const c = customers[r.cust];
    const created = isoDaysFromNow(r.days, 17, 5);
    return {
      id: r.id,
      invoice_number: r.num,
      title: r.title,
      notes: null,
      status: r.status,
      total: r.total,
      amount_paid: r.paid,
      created_at: created,
      issue_date: created.slice(0, 10),
      lhdn_status: r.lhdn,
      tax_amount: Number((r.total * 0.06).toFixed(2)),
      customers: {
        name: c.name,
        risk_level: c.risk_level,
        allergies: c.allergies,
      },
    };
  });
}

export function demoInvoicePreview(id: string, niche: Niche, orgName?: string) {
  const invoices = demoInvoices(niche);
  const inv = invoices.find((i) => i.id === id) || invoices[0];
  const cust = demoCustomers(niche).find((c) => c.name === inv.customers?.name) || demoCustomers(niche)[0];
  const products = demoProducts(niche);
  return {
    data: {
      invoice: {
        ...inv,
        subtotal: inv.total - inv.tax_amount,
        medicine_amount: 0,
        additional_amount: 0,
        medicine_description: null,
        additional_description: null,
      },
      lines: [
        {
          id: "l1",
          description: inv.title || "Line item",
          quantity: 1,
          unit_price: inv.total - inv.tax_amount,
          line_total: inv.total - inv.tax_amount,
          line_kind: "service" as const,
        },
      ],
      payments:
        inv.amount_paid > 0
          ? [
              {
                id: "pay1",
                amount: inv.amount_paid,
                method: "cash",
                paid_at: inv.created_at,
              },
            ]
          : [],
      latestLhdn: inv.lhdn_status
        ? { uuid: "demo-uuid", status: inv.lhdn_status, myinvoisStatus: inv.lhdn_status }
        : null,
      orgName: orgName || DEMO_ORG[niche],
      orgAddress: "12 Jalan Demo, 50000 Kuala Lumpur",
      orgPhone: "03-1234 5678",
      orgLogoUrl: null,
      orgLogoShape: "round" as const,
      serviceChargePercent: 0,
      customer: {
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address,
        risk_level: cust.risk_level,
        allergies: cust.allergies,
      },
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        unit_price: p.unit_price,
        quantity: p.quantity,
      })),
    },
  };
}

export function demoInventoryRows(niche: Niche) {
  return demoProducts(niche).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    unit_price: p.unit_price,
    cost_price: Math.round(p.unit_price * 0.6 * 100) / 100,
    quantity: p.quantity,
    low_stock_threshold: 5,
    sold_by: p.sold_by,
    category: demoProductCategories().find((c) => c.id === p.category_id)?.name || "General",
  }));
}

export function demoCashSession() {
  return {
    open: true,
    openingFloat: 200,
    cashIn: 450,
    cashOut: 80,
    expected: 570,
    movements: [
      { id: "m1", type: "in" as const, amount: 85, note: "Sale INV-1042", at: isoDaysFromNow(0, 10, 20) },
      { id: "m2", type: "out" as const, amount: 40, note: "Petty cash", at: isoDaysFromNow(0, 12, 0) },
      { id: "m3", type: "in" as const, amount: 120, note: "Sale", at: isoDaysFromNow(0, 15, 30) },
    ],
  };
}

export function demoAccounting() {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const inflow = 80 + ((i * 37) % 120);
    const outflow = 20 + ((i * 19) % 60);
    return {
      day: d.toISOString().slice(0, 10),
      inflow,
      outflow,
      net: inflow - outflow,
    };
  });
  const ledger = [
    { id: "al1", date: isoDaysFromNow(0, 10).slice(0, 10), category: "Sales", description: "INV-1042", amount: 85, type: "in" as const },
    { id: "al2", date: isoDaysFromNow(0, 12).slice(0, 10), category: "Supplies", description: "Stock restock", amount: 40, type: "out" as const },
    { id: "al3", date: isoDaysFromNow(-1, 16).slice(0, 10), category: "Sales", description: "INV-1041", amount: 120, type: "in" as const },
  ];
  const expenses = [
    { id: "ae1", date: isoDaysFromNow(-2).slice(0, 10), category: "Utilities", description: "Electricity", amount: 180 },
    { id: "ae2", date: isoDaysFromNow(-5).slice(0, 10), category: "Rent", description: "Shop rent", amount: 2500 },
  ];
  return {
    chart: days,
    inflow: days.reduce((s, d) => s + d.inflow, 0),
    outflow: days.reduce((s, d) => s + d.outflow, 0),
    ledger,
    expenses,
  };
}

export function demoLhdnSubmissions() {
  return [
    { invoice: "INV-1042", customer: "Aina Rahman", submitted: "4 Aug 17:05", uuid: "—", status: "Accepted" },
    { invoice: "INV-1040", customer: "Siti Aminah", submitted: "3 Aug 17:05", uuid: "—", status: "Pending" },
    { invoice: "INV-1038", customer: "Lim Wei", submitted: "2 Aug 11:20", uuid: "—", status: "Accepted" },
  ];
}

export function demoTeam() {
  return [
    { id: "u1", name: "Dr. Amin", email: "amin@demo.com", role: "owner" },
    { id: "u2", name: "Reception Lina", email: "lina@demo.com", role: "staff" },
    { id: "u3", name: "Supervisor Mei", email: "mei@demo.com", role: "supervisor" },
  ];
}

export function demoBranches() {
  return [
    { id: "b1", name: "HQ", address: "KL" },
    { id: "b2", name: "Branch B", address: "Shah Alam" },
  ];
}

export type NicheModuleConfig = {
  title: string;
  subtitle: string;
  fields: Array<{
    name: string;
    label: string;
    type?: "text" | "number" | "date" | "select";
    options?: string[];
    defaultValue?: string;
  }>;
  columns: string[];
  rows: string[][];
};

export function demoNicheModule(view: string, niche: Niche): NicheModuleConfig | null {
  const map: Record<string, NicheModuleConfig> = {
    pets: {
      title: "Pets",
      subtitle: `${DEMO_ORG[niche]} — patient pets`,
      fields: [
        { name: "name", label: "Pet name" },
        { name: "species", label: "Species" },
        { name: "owner", label: "Owner" },
        { name: "vaccine", label: "Vaccine due", type: "date" },
      ],
      columns: ["Pet", "Species", "Owner", "Next vaccine", "Status"],
      rows: [
        ["Buddy", "Dog", "Aina Rahman", "12 Sep 2026", "Active"],
        ["Mimi", "Cat", "Lim Wei", "3 Oct 2026", "Active"],
      ],
    },
    memberships: {
      title: "Memberships",
      subtitle: `${DEMO_ORG[niche]} — active plans`,
      fields: [
        { name: "member", label: "Member" },
        { name: "plan", label: "Plan", type: "select", options: ["Monthly", "Quarterly", "Annual"] },
        { name: "start", label: "Start", type: "date", defaultValue: "2026-08-05" },
      ],
      columns: ["Member", "Plan", "Start", "Renewal", "Status"],
      rows: [
        ["Hafiz Omar", "Monthly", "5 Jul 2026", "5 Aug 2026", "Active"],
        ["Mei Ling", "Monthly", "12 Jul 2026", "12 Aug 2026", "Active"],
      ],
    },
    checkins: {
      title: "Check-ins",
      subtitle: `${DEMO_ORG[niche]} — gate entries`,
      fields: [
        { name: "member", label: "Member / pass" },
        { name: "gate", label: "Gate", type: "select", options: ["Gate A", "Gate B"] },
      ],
      columns: ["Time", "Member", "Gate", "Plan", "Status"],
      rows: [
        ["18:02", "Hafiz Omar", "Gate A", "Monthly", "In"],
        ["18:15", "Mei Ling", "Gate B", "Monthly", "In"],
      ],
    },
    jobs: {
      title: "Jobs",
      subtitle: `${DEMO_ORG[niche]} — workshop jobs`,
      fields: [
        { name: "vehicle", label: "Vehicle" },
        { name: "customer", label: "Customer" },
        { name: "bay", label: "Bay" },
      ],
      columns: ["Job", "Vehicle", "Customer", "Bay", "Status"],
      rows: [
        ["JOB-440", "ABC 9988", "Mei Ling", "Bay 1", "Waiting parts"],
        ["JOB-441", "WXY 1122", "Lim Wei", "Bay 2", "In progress"],
      ],
    },
    vehicles: {
      title: "Vehicles",
      subtitle: `${DEMO_ORG[niche]} — registered vehicles`,
      fields: [
        { name: "plate", label: "Plate" },
        { name: "model", label: "Model" },
        { name: "owner", label: "Owner" },
      ],
      columns: ["Plate", "Model", "Owner", "Last service", "Status"],
      rows: [
        ["ABC 9988", "Honda City", "Mei Ling", "12 Jul 2026", "OK"],
        ["WXY 1122", "Toyota Vios", "Lim Wei", "1 Aug 2026", "Due"],
      ],
    },
    classes: {
      title: "Classes",
      subtitle: `${DEMO_ORG[niche]} — timetable`,
      fields: [
        { name: "name", label: "Class name" },
        { name: "coach", label: niche === "tuition" ? "Teacher" : "Coach" },
        { name: "time", label: "Time" },
        { name: "capacity", label: "Capacity", type: "number", defaultValue: "16" },
      ],
      columns: niche === "tuition"
        ? ["Time", "Subject", "Teacher", "Room", "Enrolled"]
        : ["Time", "Class", "Coach", "Studio", "Booked"],
      rows:
        niche === "tuition"
          ? [
              ["16:00", "Math Form 4", "Cikgu Nora", "R1", "12/15"],
              ["18:00", "Science Form 5", "Encik Rizal", "R2", "10/12"],
            ]
          : [
              ["06:30", "HIIT", "Coach Dan", "Studio A", "14/16"],
              ["09:00", "Yoga", "Coach Mei", "Studio B", "11/12"],
            ],
    },
    subjects: {
      title: "Subjects",
      subtitle: `${DEMO_ORG[niche]} — subject catalogue`,
      fields: [
        { name: "name", label: "Subject" },
        { name: "teacher", label: "Teacher" },
        { name: "price", label: "Price", type: "number", defaultValue: "120" },
      ],
      columns: ["Subject", "Teacher", "Price", "Students", "Status"],
      rows: [
        ["Math Form 4", "Cikgu Nora", "RM 120", "18", "Active"],
        ["Science Form 5", "Encik Rizal", "RM 130", "14", "Active"],
      ],
    },
    attendance: {
      title: "Attendance",
      subtitle: `${DEMO_ORG[niche]} — class attendance`,
      fields: [
        { name: "class", label: "Class", type: "select", options: ["Math Form 4", "Science Form 5"] },
        { name: "date", label: "Date", type: "date", defaultValue: "2026-08-05" },
      ],
      columns: ["Date", "Class", "Present", "Absent", "Rate"],
      rows: [
        ["5 Aug 2026", "Math Form 4", "16", "2", "89%"],
        ["4 Aug 2026", "Science Form 5", "12", "2", "86%"],
      ],
    },
    assessments: {
      title: "Assessments",
      subtitle: `${DEMO_ORG[niche]} — tests & scores`,
      fields: [
        { name: "title", label: "Assessment" },
        { name: "subject", label: "Subject", type: "select", options: ["Math Form 4", "Science Form 5"] },
        { name: "date", label: "Date", type: "date" },
      ],
      columns: ["Assessment", "Subject", "Date", "Avg score", "Status"],
      rows: [
        ["Chapter 3 quiz", "Math Form 4", "1 Aug 2026", "78%", "Graded"],
        ["Lab test 2", "Science Form 5", "28 Jul 2026", "82%", "Graded"],
      ],
    },
    listings: {
      title: "Listings",
      subtitle: `${DEMO_ORG[niche]} — property listings`,
      fields: [
        { name: "title", label: "Listing" },
        { name: "area", label: "Area" },
        { name: "price", label: "Price", type: "number" },
      ],
      columns: ["Listing", "Area", "Type", "Price", "Status"],
      rows: [
        ["Condo A-12", "KLCC", "Condo", "RM 850k", "Active"],
        ["Terrace B", "Shah Alam", "Terrace", "RM 620k", "Reserved"],
      ],
    },
    shipments: {
      title: "Shipments",
      subtitle: `${DEMO_ORG[niche]} — parcels`,
      fields: [
        { name: "tracking", label: "Tracking" },
        { name: "destination", label: "Destination" },
      ],
      columns: ["Tracking", "Destination", "Weight", "ETA", "Status"],
      rows: [
        ["SP-9001", "Penang", "2.1 kg", "6 Aug", "In transit"],
        ["SP-9002", "JB", "0.8 kg", "5 Aug", "Out for delivery"],
      ],
    },
    projects: {
      title: "Projects",
      subtitle: `${DEMO_ORG[niche]} — contracts`,
      fields: [
        { name: "name", label: "Project" },
        { name: "client", label: "Client" },
      ],
      columns: ["Project", "Client", "Value", "Progress", "Status"],
      rows: [
        ["Shop reno", "Aina Rahman", "RM 45k", "60%", "Active"],
        ["Office fit-out", "Lim Wei", "RM 120k", "20%", "Active"],
      ],
    },
    workOrders: {
      title: "Work orders",
      subtitle: `${DEMO_ORG[niche]} — production orders`,
      fields: [
        { name: "order", label: "Order #" },
        { name: "sku", label: "SKU" },
        { name: "qty", label: "Qty", type: "number" },
      ],
      columns: ["Order", "SKU", "Qty", "Due", "Status"],
      rows: [
        ["WO-221", "SKU-001", "200", "10 Aug", "Running"],
        ["WO-222", "SKU-002", "80", "12 Aug", "Queued"],
      ],
    },
    matters: {
      title: "Matters",
      subtitle: `${DEMO_ORG[niche]} — legal matters`,
      fields: [
        { name: "title", label: "Matter" },
        { name: "client", label: "Client" },
      ],
      columns: ["Matter", "Client", "Type", "Next date", "Status"],
      rows: [
        ["Sale SPA", "Aina Rahman", "Conveyancing", "12 Aug", "Open"],
        ["Review NDA", "Lim Wei", "Corporate", "8 Aug", "Open"],
      ],
    },
    events: {
      title: "Events",
      subtitle: `${DEMO_ORG[niche]} — booked events`,
      fields: [
        { name: "name", label: "Event" },
        { name: "date", label: "Date", type: "date" },
        { name: "venue", label: "Venue" },
      ],
      columns: ["Event", "Date", "Venue", "Pax", "Status"],
      rows: [
        ["Wedding A", "20 Sep 2026", "Ballroom", "180", "Confirmed"],
        ["Corp dinner", "5 Oct 2026", "Hall B", "90", "Deposit"],
      ],
    },
    plots: {
      title: "Plots",
      subtitle: `${DEMO_ORG[niche]} — farm plots`,
      fields: [
        { name: "name", label: "Plot" },
        { name: "crop", label: "Crop" },
      ],
      columns: ["Plot", "Crop", "Area", "Harvest", "Status"],
      rows: [
        ["P-A1", "Chili", "0.5 acre", "Sep 2026", "Growing"],
        ["P-B2", "Leafy greens", "0.3 acre", "Aug 2026", "Ready"],
      ],
    },
    laundry: {
      title: "Laundry orders",
      subtitle: `${DEMO_ORG[niche]} — tickets`,
      fields: [
        { name: "ticket", label: "Ticket" },
        { name: "customer", label: "Customer" },
      ],
      columns: ["Ticket", "Customer", "Items", "Ready", "Status"],
      rows: [
        ["L-331", "Aina Rahman", "12 pcs", "6 Aug", "Washing"],
        ["L-332", "Lim Wei", "5 pcs", "5 Aug", "Ready"],
      ],
    },
    packages: {
      title: "Packages",
      subtitle: `${DEMO_ORG[niche]} — treatment packages`,
      fields: [
        { name: "name", label: "Package" },
        { name: "sessions", label: "Sessions", type: "number" },
      ],
      columns: ["Package", "Sessions", "Price", "Sold", "Status"],
      rows: [
        ["Glow 6x", "6", "RM 480", "14", "Active"],
        ["Deep clean 3x", "3", "RM 240", "9", "Active"],
      ],
    },
    labResults: {
      title: "Lab results",
      subtitle: `${DEMO_ORG[niche]} — results queue`,
      fields: [
        { name: "patient", label: "Patient" },
        { name: "panel", label: "Panel" },
      ],
      columns: ["Patient", "Panel", "Collected", "Ready", "Status"],
      rows: [
        ["Aina Rahman", "Full blood", "4 Aug", "5 Aug", "Ready"],
        ["Lim Wei", "Lipid", "5 Aug", "6 Aug", "Processing"],
      ],
    },
    tables: {
      title: "Tables",
      subtitle: `${DEMO_ORG[niche]} — floor plan`,
      fields: [
        { name: "table", label: "Table" },
        { name: "seats", label: "Seats", type: "number" },
      ],
      columns: ["Table", "Seats", "Zone", "Guests", "Status"],
      rows: [
        ["T1", "4", "Indoor", "4", "Occupied"],
        ["T2", "2", "Window", "—", "Free"],
      ],
    },
    rooms: {
      title: "Rooms",
      subtitle: `${DEMO_ORG[niche]} — room board`,
      fields: [
        { name: "room", label: "Room" },
        { name: "type", label: "Type" },
      ],
      columns: ["Room", "Type", "Guest", "Checkout", "Status"],
      rows: [
        ["101", "Deluxe", "Aina Rahman", "7 Aug", "Occupied"],
        ["102", "Standard", "—", "—", "Vacant"],
      ],
    },
    eyeRx: {
      title: "Eye prescriptions",
      subtitle: `${DEMO_ORG[niche]} — Rx records`,
      fields: [
        { name: "patient", label: "Patient" },
        { name: "sphere", label: "Sphere" },
      ],
      columns: ["Patient", "OD", "OS", "Date", "Status"],
      rows: [
        ["Aina Rahman", "-1.25", "-1.50", "1 Aug", "Active"],
        ["Lim Wei", "-2.00", "-1.75", "28 Jul", "Active"],
      ],
    },
    labOrders: {
      title: "Lab orders",
      subtitle: `${DEMO_ORG[niche]} — lens / lab orders`,
      fields: [
        { name: "patient", label: "Patient" },
        { name: "lab", label: "Lab" },
      ],
      columns: ["Order", "Patient", "Lab", "Due", "Status"],
      rows: [
        ["LO-88", "Aina Rahman", "LensCo", "8 Aug", "Sent"],
        ["LO-89", "Lim Wei", "LensCo", "10 Aug", "Draft"],
      ],
    },
    variants: {
      title: "Variants",
      subtitle: `${DEMO_ORG[niche]} — SKU variants`,
      fields: [
        { name: "name", label: "Variant" },
        { name: "sku", label: "SKU" },
      ],
      columns: ["Variant", "SKU", "Size", "Stock", "Status"],
      rows: [
        ["Tee / Black", "TEE-BK-M", "M", "24", "Active"],
        ["Tee / White", "TEE-WH-L", "L", "12", "Active"],
      ],
    },
    serials: {
      title: "Serials",
      subtitle: `${DEMO_ORG[niche]} — serial tracking`,
      fields: [
        { name: "serial", label: "Serial" },
        { name: "product", label: "Product" },
      ],
      columns: ["Serial", "Product", "In", "Out", "Status"],
      rows: [
        ["SN-1001", "Phone X", "1 Aug", "—", "In stock"],
        ["SN-1002", "Phone X", "1 Aug", "4 Aug", "Sold"],
      ],
    },
    priceTiers: {
      title: "Price tiers",
      subtitle: `${DEMO_ORG[niche]} — wholesale tiers`,
      fields: [
        { name: "tier", label: "Tier" },
        { name: "discount", label: "Discount %", type: "number" },
      ],
      columns: ["Tier", "Min qty", "Discount", "Accounts", "Status"],
      rows: [
        ["Silver", "10", "5%", "8", "Active"],
        ["Gold", "50", "12%", "3", "Active"],
      ],
    },
    commissions: {
      title: "Commissions",
      subtitle: `${DEMO_ORG[niche]} — staff commissions`,
      fields: [
        { name: "staff", label: "Staff" },
        { name: "rate", label: "Rate %", type: "number" },
      ],
      columns: ["Staff", "Sales", "Rate", "Commission", "Period"],
      rows: [
        ["Mei Ling", "RM 4,200", "8%", "RM 336", "Jul 2026"],
        ["Hafiz Omar", "RM 3,100", "8%", "RM 248", "Jul 2026"],
      ],
    },
    batches: {
      title: "Batches",
      subtitle: `${DEMO_ORG[niche]} — batch / expiry`,
      fields: [
        { name: "batch", label: "Batch #" },
        { name: "product", label: "Product" },
        { name: "expiry", label: "Expiry", type: "date" },
      ],
      columns: ["Batch", "Product", "Qty", "Expiry", "Status"],
      rows: [
        ["B-901", "Paracetamol", "120", "2027-01-01", "OK"],
        ["B-902", "Vitamin C", "40", "2026-09-01", "Near expiry"],
      ],
    },
    categories: {
      title: "Categories",
      subtitle: `${DEMO_ORG[niche]} — product categories`,
      fields: [{ name: "name", label: "Category name" }],
      columns: ["Category", "Products", "Active", "Updated"],
      rows: [
        ["General", "18", "Yes", "1 Aug"],
        ["Premium", "6", "Yes", "28 Jul"],
        ["Consumables", "11", "Yes", "20 Jul"],
      ],
    },
    printers: {
      title: "Printers",
      subtitle: `${DEMO_ORG[niche]} — receipt printers`,
      fields: [
        { name: "name", label: "Printer name" },
        { name: "type", label: "Type", type: "select", options: ["Thermal 80mm", "A4"] },
      ],
      columns: ["Printer", "Type", "Connection", "Default", "Status"],
      rows: [
        ["Counter 1", "Thermal 80mm", "USB", "Yes", "Online"],
        ["Kitchen", "Thermal 80mm", "Network", "No", "Online"],
      ],
    },
    receipts: {
      title: "Receipts",
      subtitle: `${DEMO_ORG[niche]} — paid receipts`,
      fields: [],
      columns: ["Receipt", "Customer", "Total", "Method", "Paid at"],
      rows: [
        ["RCP-1042", "Aina Rahman", "RM 85.00", "Cash", "4 Aug 17:05"],
        ["RCP-1040", "Siti Aminah", "RM 80.00", "Card", "3 Aug 17:05"],
      ],
    },
    logistics: {
      title: "Logistics",
      subtitle: `${DEMO_ORG[niche]} — stock documents`,
      fields: [
        { name: "doc", label: "Document #" },
        { name: "type", label: "Type", type: "select", options: ["GRN", "Adjustment", "Transfer"] },
      ],
      columns: ["Document", "Type", "Supplier / from", "Lines", "Status"],
      rows: [
        ["GRN-220", "GRN", "MedSupply", "8", "Posted"],
        ["ADJ-44", "Adjustment", "—", "2", "Draft"],
      ],
    },
  };

  return map[view] || null;
}
