"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/PageHeader";
import { StaffDashboardView } from "@/components/dashboards/StaffDashboardView";
import { ADMIN_CARD_COMPONENTS } from "@/components/dashboards/AdminCards";
import { cardsFor, type DashboardCardDef } from "@/lib/dashboard-cards";
import type { SharedDashboardData } from "@/lib/dashboard-data";

/** Groups consecutive half-width cards into pairs so the grid never leaves a gap. */
function toRows(cards: DashboardCardDef[]): DashboardCardDef[][] {
  const rows: DashboardCardDef[][] = [];
  let pending: DashboardCardDef | null = null;

  for (const card of cards) {
    if (card.span === "full") {
      if (pending) {
        rows.push([pending]);
        pending = null;
      }
      rows.push([card]);
      continue;
    }
    if (pending) {
      rows.push([pending, card]);
      pending = null;
    } else {
      pending = card;
    }
  }
  if (pending) rows.push([pending]);
  return rows;
}

/**
 * The owner view. Oversight only — the counter tools stay on the staff dashboard.
 * Which cards appear is decided by the niche's capabilities, never hand-written per niche.
 */
export function AdminDashboardView({ data }: { data: SharedDashboardData }) {
  const t = useTranslations("Owner");
  const tDash = useTranslations("Dashboard");
  const insights = data.adminInsights;

  // Without the owner slice there is nothing to oversee, so fall back rather than blank out.
  if (!insights) return <StaffDashboardView data={data} />;

  const rows = toRows(
    cardsFor(data.niche, "admin", { opsBrainEnabled: data.opsBrainEnabled }).filter(
      (card) => ADMIN_CARD_COMPONENTS[card.id]
    )
  );

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={`${tDash("welcome")}, ${data.greetingName}`}
        subtitle={t("adminSubtitle")}
      />

      {rows.map((row) => {
        const key = row.map((card) => card.id).join("+");
        if (row.length === 1 && row[0].span === "full") {
          const Card = ADMIN_CARD_COMPONENTS[row[0].id];
          return <Card key={key} data={data} insights={insights} />;
        }
        return (
          <div className="fluid-grid" key={key}>
            {row.map((card) => {
              const Card = ADMIN_CARD_COMPONENTS[card.id];
              return <Card key={card.id} data={data} insights={insights} />;
            })}
          </div>
        );
      })}
    </div>
  );
}
