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
