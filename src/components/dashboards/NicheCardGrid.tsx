"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CardTone, NicheCardPayload } from "@/lib/dashboard-data";

const TONE_COLOR: Record<CardTone, string | undefined> = {
  neutral: undefined,
  good: "var(--success, #067647)",
  warn: "var(--warning, #b54708)",
  danger: "var(--danger)",
};

function toneStyle(tone?: CardTone) {
  const color = tone ? TONE_COLOR[tone] : undefined;
  return color ? { color } : undefined;
}

function NicheCard({ card }: { card: NicheCardPayload }) {
  const t = useTranslations("DashCards");
  const isEmpty = card.stats.length === 0 && card.rows.length === 0;

  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t(`${card.id}.title`)}</h2>
        {card.href ? (
          <Link href={card.href} className="btn btn-soft">
            {t("open")}
          </Link>
        ) : null}
      </div>

      {isEmpty ? (
        <p className="muted" style={{ margin: 0 }}>
          {t(`${card.id}.empty`)}
        </p>
      ) : null}

      {card.stats.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {card.stats.map((item) => (
            <div key={item.key}>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                {t(`stat.${item.key}`)}
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, ...toneStyle(item.tone) }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {card.rows.length > 0 ? (
        <ul className="stack" style={{ gap: "0.4rem", listStyle: "none", padding: 0, marginTop: "0.85rem", marginBottom: 0 }}>
          {card.rows.map((row) => (
            <li
              key={row.id}
              className="row"
              style={{ justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{row.primary}</span>
                {row.secondary ? (
                  <span className="muted" style={{ marginLeft: "0.4rem" }}>
                    {row.secondary}
                  </span>
                ) : null}
              </span>
              {row.meta ? (
                <span className="muted" style={{ whiteSpace: "nowrap", ...toneStyle(row.tone) }}>
                  {row.meta}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** One renderer for every niche card, so all 24 niches share the exact same look. */
export function NicheCardGrid({ cards }: { cards: NicheCardPayload[] }) {
  if (!cards.length) return null;

  return (
    <div className="fluid-grid">
      {cards.map((card) => (
        <NicheCard key={card.id} card={card} />
      ))}
    </div>
  );
}
