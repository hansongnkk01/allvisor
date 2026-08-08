"use client";

/** The member's own daily score — transparent inputs, nothing about colleagues. */

import { useTranslations } from "next-intl";
import { ScoreBar } from "@/components/dashboards/ScoreBar";
import { formatCurrency } from "@/lib/utils";
import type { StaffScoreEntry } from "@/lib/dashboard-data";

export function StaffMyScoreCard({ score }: { score: StaffScoreEntry }) {
  const t = useTranslations("Dashboard");

  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("myScoreTitle")}</h2>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {t("myScoreToday")}
        </span>
      </div>

      <ScoreBar percent={score.score} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "0.6rem",
          marginTop: "0.75rem",
        }}
      >
        <div>
          <div className="muted" style={{ fontSize: "0.72rem" }}>
            {t("myScoreSales")}
          </div>
          <div style={{ fontWeight: 700 }}>{formatCurrency(score.sales)}</div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.72rem" }}>
            {t("myScoreMistakes")}
          </div>
          <div style={{ fontWeight: 700 }}>{score.mistakes}</div>
        </div>
      </div>
      <p className="muted" style={{ margin: "0.6rem 0 0", fontSize: "0.78rem" }}>
        {t("myScoreHint")}
      </p>
    </section>
  );
}
