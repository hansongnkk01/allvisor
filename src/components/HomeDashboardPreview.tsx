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
  { name: "Paracetamol 500mg", units: 38 },
  { name: "Saline 500ml", units: 22 },
  { name: "Gloves M", units: 19 },
  { name: "Alcohol swab", units: 14 },
];

type DemoTable = {
  columns: string[];
  rows: string[][];
  hint?: string;
};

function demoTableFor(niche: PreviewNiche, view: string): DemoTable {
  if (view === "customers") {
    if (niche === "retail") {
      return {
        columns: ["Code", "Customer", "Phone", "Last purchase", "Status"],
        rows: [
          ["CU-4201", "Cafe Luna Sdn Bhd", "07-3321 8890", "4 Aug · RM 420", "Active"],
          ["CU-4198", "Workshop 88", "012-778 2211", "3 Aug · RM 890", "Active"],
          ["CU-4192", "Mei Hardware", "016-554 0091", "1 Aug · RM 156", "Active"],
          ["CU-4180", "Walk-in cash", "—", "4 Aug · RM 86", "Walk-in"],
          ["CU-4175", "Rina Trading", "019-220 4412", "28 Jul · RM 1,240", "Credit"],
          ["CU-4168", "Kedai Bahagia", "013-990 1122", "20 Jul · RM 65", "Inactive"],
        ],
        hint: "Customer list with last purchase — demo data only.",
      };
    }
    if (niche === "gym") {
      return {
        columns: ["Member ID", "Name", "Plan", "Check-ins (30d)", "Status"],
        rows: [
          ["MEM-220", "Hafiz Omar", "Monthly", "14", "Active"],
          ["MEM-219", "Mei Ling", "Monthly", "11", "Active"],
          ["MEM-218", "Amir Razak", "Quarterly", "6", "Due soon"],
          ["MEM-217", "Siti Noor", "Monthly", "9", "Active"],
          ["MEM-216", "Jason Tan", "PT pack", "3", "Frozen"],
          ["MEM-214", "Aina Rahman", "Annual", "18", "Active"],
          ["MEM-210", "Rajesh K.", "Monthly", "0", "Lapsed"],
        ],
        hint: "Members roster with plan status — demo data only.",
      };
    }
    return {
      columns: ["Patient ID", "Name", "Phone", "IC / Allergy", "Risk", "Status"],
      rows: [
        ["PT-081", "Aina Rahman", "012-345 6789", "900101-14-**** · Nuts", "High", "Active"],
        ["PT-080", "Lim Wei", "016-778 2210", "880512-10-****", "Low", "Active"],
        ["PT-079", "Siti Aminah", "019-441 2200", "950303-08-**** · Penicillin", "Medium", "New"],
        ["PT-078", "Tan Mei Ling", "013-990 1188", "920720-14-****", "Low", "Active"],
        ["PT-077", "Hafiz Omar", "017-220 3344", "870215-01-****", "Low", "Inactive"],
        ["PT-076", "Nurul Aisyah", "011-567 8890", "010418-14-****", "Low", "Active"],
        ["PT-075", "Rajesh K.", "014-332 1100", "860909-10-**** · Seafood", "Medium", "Active"],
        ["PT-074", "Dr walk-in", "—", "—", "Low", "Walk-in"],
      ],
      hint: "Patient records with allergy & risk flags — demo data only.",
    };
  }

  if (view === "appointments") {
    return {
      columns: ["Time", "Patient", "Room / Doctor", "Type", "Status"],
      rows: [
        ["09:00", "Nurul Aisyah", "R1 · Dr Amin", "Consult", "Confirmed"],
        ["09:30", "Tan Mei Ling", "R2 · Dr Amin", "Follow-up", "Confirmed"],
        ["10:30", "Rajesh K.", "R2 · Nurse Farah", "Wound care", "Confirmed"],
        ["11:15", "Walk-in", "R1 · Open", "Consult", "Waiting"],
        ["14:00", "Lim Wei", "R1 · Dr Amin", "Follow-up", "Booked"],
        ["15:00", "Siti Aminah", "R3 · Dr Amin", "Lab review", "Booked"],
        ["16:30", "Aina Rahman", "R3 · Dr Amin", "Consult", "Booked"],
        ["17:00", "Hafiz Omar", "R1 · Nurse Farah", "Injection", "Booked"],
      ],
      hint: "Today’s clinic schedule by room — demo data only.",
    };
  }

  if (view === "invoices") {
    if (niche === "retail") {
      return {
        columns: ["Invoice", "Customer", "Date", "Total", "Status"],
        rows: [
          ["INV-331", "Wholesale Sdn Bhd", "4 Aug 2026", "RM 1,240.00", "Unpaid"],
          ["INV-330", "Cafe Luna", "3 Aug 2026", "RM 420.00", "Paid"],
          ["INV-329", "Workshop 88", "2 Aug 2026", "RM 890.00", "Partial"],
          ["INV-328", "Retail walk-in", "2 Aug 2026", "RM 65.00", "Paid"],
          ["INV-327", "Mei Hardware", "1 Aug 2026", "RM 156.00", "Paid"],
          ["INV-326", "Rina Trading", "30 Jul 2026", "RM 2,100.00", "Unpaid"],
        ],
      };
    }
    if (niche === "gym") {
      return {
        columns: ["Invoice", "Member", "Item", "Total", "Status"],
        rows: [
          ["INV-771", "Hafiz Omar", "PT package (8)", "RM 450.00", "Paid"],
          ["INV-770", "Mei Ling", "Monthly membership", "RM 129.00", "Paid"],
          ["INV-769", "Amir Razak", "Monthly membership", "RM 129.00", "Due"],
          ["INV-768", "Day pass", "Guest pass", "RM 35.00", "Paid"],
          ["INV-767", "Jason Tan", "Monthly (frozen)", "RM 129.00", "On hold"],
          ["INV-766", "Aina Rahman", "Annual plan", "RM 1,188.00", "Paid"],
        ],
      };
    }
    return {
      columns: ["Invoice", "Patient", "Service", "Date", "Total", "Status"],
      rows: [
        ["INV-1042", "Aina Rahman", "Consult + meds", "4 Aug 2026", "RM 85.00", "Paid"],
        ["INV-1041", "Dr walk-in", "Treatment", "4 Aug 2026", "RM 120.00", "Unpaid"],
        ["INV-1040", "Lim Wei", "Follow-up", "3 Aug 2026", "RM 60.00", "Partial"],
        ["INV-1039", "Siti Aminah", "Lab panel", "3 Aug 2026", "RM 95.00", "Paid"],
        ["INV-1038", "Tan Mei Ling", "Procedure", "2 Aug 2026", "RM 45.00", "Paid"],
        ["INV-1037", "Nurul Aisyah", "Consult", "2 Aug 2026", "RM 70.00", "Paid"],
        ["INV-1036", "Rajesh K.", "Wound care + dressing", "1 Aug 2026", "RM 110.00", "Unpaid"],
        ["INV-1035", "Hafiz Omar", "Injection", "31 Jul 2026", "RM 35.00", "Paid"],
      ],
      hint: "Billing list ready for MyInvois path — demo data only.",
    };
  }

  if (view === "inventory") {
    if (niche === "retail") {
      return {
        columns: ["SKU", "Product", "Category", "Qty", "Reorder", "Status"],
        rows: [
          ["SKU-12", "Cable 2m", "Cables", "5", "10", "Low"],
          ["SKU-07", "Adapter USB-C", "Adapters", "3", "8", "Low"],
          ["SKU-21", "Tape pack", "Accessories", "8", "12", "Low"],
          ["SKU-44", "Power bank 10k", "Accessories", "2", "6", "Critical"],
          ["SKU-09", "Mouse pad", "Accessories", "6", "10", "Low"],
          ["SKU-31", "HDMI 1.5m", "Cables", "42", "15", "OK"],
          ["SKU-18", "Multi plug", "Power", "19", "10", "OK"],
        ],
      };
    }
    return {
      columns: ["SKU", "Item", "Category", "Qty", "Reorder at", "Status"],
      rows: [
        ["MED-12", "Paracetamol 500mg (100)", "Medicine", "18", "20", "Low"],
        ["MED-07", "Saline 500ml", "Consumable", "6", "12", "Low"],
        ["MED-21", "Gloves M (box)", "PPE", "4", "10", "Critical"],
        ["MED-44", "Alcohol swab (box)", "Consumable", "9", "15", "Low"],
        ["MED-09", "Syringe 3ml (pack)", "Consumable", "22", "15", "OK"],
        ["MED-31", "Amoxicillin 500mg", "Medicine", "14", "10", "OK"],
        ["MED-18", "Face mask (box)", "PPE", "3", "8", "Critical"],
        ["MED-05", "Cotton roll", "Consumable", "11", "8", "OK"],
      ],
      hint: "Clinic stock with reorder alerts — demo data only.",
    };
  }

  if (view === "admin") {
    return {
      columns: ["Type", "Name / Setting", "Role / Value", "Last updated", "Status"],
      rows: [
        ["Staff", "Dr. Amin", "Owner", "1 Aug 2026", "Active"],
        ["Staff", "Nurse Farah", "Staff", "28 Jul 2026", "Active"],
        ["Staff", "Reception Lina", "Staff", "15 Jul 2026", "Active"],
        ["Org", "Business TIN", "C12345678901", "12 Jun 2026", "Set"],
        ["Org", "Clinic hours", "08:00–18:00", "12 Jun 2026", "Set"],
        ["Org", "Closed weekdays", "Sunday", "12 Jun 2026", "Set"],
        ["Billing", "Subscription", "Pro · Monthly", "1 Aug 2026", "Active"],
      ],
      hint: "Staff & organisation settings — demo data only.",
    };
  }

  if (view === "accounting") {
    return {
      columns: ["Date", "Entry", "Category", "Amount", "Type"],
      rows: [
        ["4 Aug", "Consult collections", "Income", "RM 1,280.00", "Income"],
        ["4 Aug", "Pharmacy restock", "Inventory", "RM 420.00", "Expense"],
        ["3 Aug", "Lab panel income", "Income", "RM 380.00", "Income"],
        ["3 Aug", "Utilities (TNB)", "Ops", "RM 210.50", "Expense"],
        ["2 Aug", "Procedure fees", "Income", "RM 540.00", "Income"],
        ["1 Aug", "Staff salary advance", "Payroll", "RM 800.00", "Expense"],
        ["31 Jul", "Month close — net", "Summary", "RM 8,270.00", "Net"],
      ],
      hint: "Ledger snapshot for August — demo data only.",
    };
  }

  if (view === "lhdn") {
    return {
      columns: ["Invoice", "Patient / Buyer", "Submitted", "MyInvois", "UUID", "Status"],
      rows: [
        ["INV-1042", "Aina Rahman", "4 Aug 09:20", "Accepted", "a1b2…9f", "Accepted"],
        ["INV-1040", "Lim Wei", "3 Aug 17:05", "Pending", "—", "Awaiting"],
        ["INV-1039", "Siti Aminah", "3 Aug 12:40", "Accepted", "c3d4…1a", "Accepted"],
        ["INV-1038", "Tan Mei Ling", "2 Aug 16:10", "Accepted", "e5f6…2b", "Accepted"],
        ["INV-1036", "Rajesh K.", "1 Aug 11:00", "Rejected", "—", "Fix TIN"],
        ["INV-1035", "Hafiz Omar", "31 Jul 15:22", "Accepted", "g7h8…3c", "Accepted"],
      ],
      hint: "e-Invoice submission queue — demo data only.",
    };
  }

  // retail / gym extras
  if (view === "pos") {
    return {
      columns: ["Ticket", "Counter", "Method", "Time", "Amount"],
      rows: [
        ["POS-8821", "Counter 1", "Cash", "10:12", "RM 86.00"],
        ["POS-8820", "Counter 2", "QR", "11:05", "RM 42.50"],
        ["POS-8819", "Counter 1", "Card", "12:40", "RM 125.00"],
        ["POS-8818", "Counter 2", "Cash", "14:18", "RM 18.90"],
        ["POS-8817", "Counter 1", "QR", "15:02", "RM 55.00"],
      ],
    };
  }
  if (view === "cash") {
    return {
      columns: ["Type", "Ref", "Time", "Amount", "Balance"],
      rows: [
        ["Open", "Drawer A", "08:00", "RM 200.00", "RM 200.00"],
        ["Sale", "POS-8821", "10:12", "+ RM 86.00", "RM 286.00"],
        ["Sale", "POS-8820", "11:05", "+ RM 42.50", "RM 328.50"],
        ["Float", "Top-up", "12:00", "+ RM 50.00", "RM 378.50"],
        ["Expected", "Close", "—", "—", "RM 378.50"],
      ],
    };
  }
  if (view === "memberships") {
    return {
      columns: ["Member", "Plan", "Start", "Renewal", "Status"],
      rows: [
        ["Hafiz Omar", "Monthly", "5 Jul 2026", "5 Aug 2026", "Active"],
        ["Mei Ling", "Monthly", "12 Jul 2026", "12 Aug 2026", "Active"],
        ["Amir Razak", "Quarterly", "1 Jun 2026", "1 Sep 2026", "Due soon"],
        ["Jason Tan", "Monthly", "20 Jun 2026", "20 Jul 2026", "Frozen"],
      ],
    };
  }
  if (view === "classes") {
    return {
      columns: ["Time", "Class", "Coach", "Studio", "Booked"],
      rows: [
        ["06:30", "HIIT", "Coach Dan", "Studio A", "14/16"],
        ["09:00", "Yoga", "Coach Mei", "Studio B", "11/12"],
        ["12:00", "Spin", "Coach Amir", "Bike room", "8/10"],
        ["19:00", "HIIT", "Coach Dan", "Studio A", "12/16"],
      ],
    };
  }
  if (view === "checkins") {
    return {
      columns: ["Time", "Member", "Gate", "Plan", "Status"],
      rows: [
        ["18:02", "Hafiz Omar", "Gate A", "Monthly", "In"],
        ["18:05", "Mei Ling", "Gate A", "Monthly", "In"],
        ["18:11", "Amir Razak", "Gate B", "Quarterly", "In"],
        ["18:20", "Siti Noor", "Gate A", "Monthly", "In"],
        ["18:27", "Guest pass", "Gate B", "Day", "In"],
      ],
    };
  }

  return {
    columns: ["#", "Detail", "Status"],
    rows: [
      ["—", "Demo page", "Ready"],
    ],
  };
}

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
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [stageH, setStageH] = useState(800);
  const [asideH, setAsideH] = useState(720);

  useEffect(() => {
    setView("dashboard");
  }, [niche]);

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
      // Fill the frame height after scale — sidebar stays put, main scrolls inside.
      const layoutH = frame.clientHeight / safe;
      setStageH(layoutH);
      setAsideH(Math.max(560, layoutH - 32));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(frame);
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

  const listTable = useMemo(() => demoTableFor(niche, view), [niche, view]);

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
                <div className="stack" style={{ gap: "1.25rem" }}>
                  <PageHeader
                    title={labelFor(view === "customers" ? "customers" : view)}
                    subtitle={orgName}
                  />
                  {listTable.hint ? (
                    <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
                      {listTable.hint}
                    </p>
                  ) : null}
                  <div className="surface" style={{ padding: "1.25rem" }}>
                    <div className="table-wrap">
                      <table className="data">
                        <thead>
                          <tr>
                            {listTable.columns.map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {listTable.rows.map((row, idx) => (
                            <tr key={`${view}-${idx}-${row[0]}`}>
                              {row.map((cell, cellIdx) => (
                                <td key={`${idx}-${cellIdx}`}>
                                  {cellIdx === row.length - 1 ? (
                                    <span className="badge">{cell}</span>
                                  ) : (
                                    cell
                                  )}
                                </td>
                              ))}
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
