"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Printer, ArrowRight, Check } from "lucide-react";

const TRAP_COUNT = 11;
const AUDIT_COUNT = 6;
const NICHE_ROWS = 6;

/**
 * The lead magnet itself, delivered as a page instead of a file download so the
 * reader never leaves and every trap can carry the next step.
 */
export function PlaybookClient() {
  const t = useTranslations("Playbook");

  const traps = Array.from({ length: TRAP_COUNT }, (_, i) => i + 1);
  const audit = Array.from({ length: AUDIT_COUNT }, (_, i) => i + 1);
  const rows = Array.from({ length: NICHE_ROWS }, (_, i) => i + 1);

  return (
    <div className="pb-shell">
      <header className="pb-nav no-print">
        <Link href="/" aria-label="Allvisor" className="pb-nav__brand">
          <BrandLogo size="nav" />
        </Link>
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <LanguageSwitcher />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            {t("print")}
          </button>
          <Link href="/register" className="btn btn-primary">
            {t("navTrial")}
          </Link>
        </div>
      </header>

      <section className="pb-hero">
        <div className="pb-hero__inner">
          <p className="pb-hero__kicker">{t("kicker")}</p>
          <h1 className="pb-hero__title">{t("title")}</h1>
          <p className="pb-hero__lead">{t("lead")}</p>
          <p className="pb-hero__meta">{t("meta")}</p>
        </div>
      </section>

      <article className="pb-body">
        <div className="pb-note">
          <h2>{t("whyTitle")}</h2>
          <p>{t("whyBody")}</p>
        </div>

        <h2 className="pb-h2">{t("trapsTitle")}</h2>

        <ol className="pb-traps">
          {traps.map((n) => (
            <li key={n} className="pb-trap">
              <span className="pb-trap__num" aria-hidden>
                {String(n).padStart(2, "0")}
              </span>
              <div className="pb-trap__body">
                <h3>{t(`trap${n}T` as "trap1T")}</h3>
                <p className="pb-trap__symptom">
                  <strong>{t("symptom")}</strong> {t(`trap${n}S` as "trap1S")}
                </p>
                <p className="pb-trap__fix">
                  <strong>{t("fix")}</strong> {t(`trap${n}F` as "trap1F")}
                </p>
                <p className="pb-trap__cost">{t(`trap${n}C` as "trap1C")}</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="pb-cta no-print">
          <div>
            <h3>{t("midCtaTitle")}</h3>
            <p>{t("midCtaBody")}</p>
          </div>
          <Link href="/register" className="btn btn-primary">
            {t("midCtaBtn")}
            <ArrowRight size={16} />
          </Link>
        </aside>

        <h2 className="pb-h2">{t("auditTitle")}</h2>
        <p className="pb-p">{t("auditLead")}</p>
        <ul className="pb-audit">
          {audit.map((n) => (
            <li key={n}>
              <span className="pb-audit__box" aria-hidden>
                <Check size={13} />
              </span>
              {t(`audit${n}` as "audit1")}
            </li>
          ))}
        </ul>
        <p className="pb-audit__verdict">{t("auditVerdict")}</p>

        <h2 className="pb-h2">{t("nicheTitle")}</h2>
        <p className="pb-p">{t("nicheLead")}</p>
        <div className="pb-table-wrap">
          <table className="pb-table">
            <thead>
              <tr>
                <th>{t("nicheCol1")}</th>
                <th>{t("nicheCol2")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n}>
                  <td>{t(`nicheRow${n}A` as "nicheRow1A")}</td>
                  <td>{t(`nicheRow${n}B` as "nicheRow1B")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pb-end">
          <h2>{t("endTitle")}</h2>
          <p>{t("endBody")}</p>
          <div className="pb-end__cta no-print">
            <Link href="/register" className="btn btn-primary">
              {t("endBtn")}
            </Link>
            <Link href="/start" className="btn btn-ghost">
              {t("endBack")}
            </Link>
          </div>
          <p className="pb-end__sign">{t("sign")}</p>
        </div>
      </article>
    </div>
  );
}
