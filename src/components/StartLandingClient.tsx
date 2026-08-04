"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HvcoForm } from "@/components/HvcoForm";

/** Long-form Sell Like Crazy landing — sells the next step (HVCO + trial). */
export function StartLandingClient() {
  const t = useTranslations("StartLanding");
  const brand = useTranslations("Brand");

  return (
    <div className="start-shell" style={{ minHeight: "100vh" }}>
      <header
        className="row"
        style={{
          justifyContent: "space-between",
          padding: "1.15rem clamp(1rem, 4vw, 3rem)",
          gap: "0.75rem",
          flexWrap: "wrap",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/" className="display" style={{ fontSize: "1.55rem" }}>
          {brand("name")}
        </Link>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <Link href="/" className="btn btn-ghost" style={{ padding: "0.5rem 0.9rem" }}>
            {t("navHome")}
          </Link>
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost" style={{ padding: "0.5rem 0.9rem" }}>
            {t("navLogin")}
          </Link>
          <Link href="/register" className="btn btn-soft" style={{ padding: "0.5rem 0.9rem" }}>
            {t("navTrial")}
          </Link>
        </div>
      </header>

      <article style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem clamp(1rem, 4vw, 2rem) 4rem" }}>
        <p
          style={{
            display: "inline-block",
            margin: "0 0 0.75rem",
            padding: "0.25rem 0.65rem",
            fontWeight: 800,
            letterSpacing: "0.06em",
            fontSize: "0.78rem",
            background: "var(--accent-soft)",
            color: "var(--accent-ink)",
            borderRadius: 6,
          }}
        >
          {t("warning")}
        </p>
        <h1 className="display" style={{ fontSize: "clamp(1.85rem, 4.2vw, 2.75rem)", lineHeight: 1.15, margin: "0 0 1rem" }}>
          {t("hookTitle")}
        </h1>
        <p className="muted" style={{ fontSize: "1.12rem", lineHeight: 1.65, marginBottom: "1.75rem" }}>
          {t("hookSub")}
        </p>

        <div
          className="surface"
          style={{
            padding: "1.15rem 1.25rem",
            marginBottom: "2rem",
            borderLeft: "4px solid var(--accent)",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{t("whyBoxTitle")}</h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>{t("whyBoxBody")}</p>
        </div>

        <h2 className="page-title" style={{ marginBottom: "0.65rem" }}>
          {t("problemTitle")}
        </h2>
        <p style={{ lineHeight: 1.65, marginBottom: "1.5rem" }}>{t("problemBody")}</p>

        <h2 className="page-title" style={{ marginBottom: "0.65rem" }}>
          {t("agitateTitle")}
        </h2>
        <ul style={{ margin: "0 0 2rem", paddingLeft: "1.2rem", lineHeight: 1.7 }}>
          <li>{t("agitate1")}</li>
          <li>{t("agitate2")}</li>
          <li>{t("agitate3")}</li>
          <li>{t("agitate4")}</li>
        </ul>

        <h2 className="page-title" style={{ marginBottom: "1rem" }}>
          {t("eduTitle")}
        </h2>
        {(
          [
            ["edu1Title", "edu1Body"],
            ["edu2Title", "edu2Body"],
            ["edu3Title", "edu3Body"],
            ["edu4Title", "edu4Body"],
          ] as const
        ).map(([title, body]) => (
          <div key={title} style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{t(title)}</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
              {t(body)}
            </p>
          </div>
        ))}

        <div id="playbook" className="surface" style={{ padding: "1.35rem", margin: "2.25rem 0" }}>
          <p className="muted" style={{ margin: "0 0 0.35rem", fontWeight: 700, letterSpacing: "0.04em", fontSize: "0.8rem" }}>
            {t("hvcoTitle")}
          </p>
          <h2 style={{ margin: "0 0 0.5rem" }}>{t("hvcoName")}</h2>
          <p style={{ lineHeight: 1.6, marginBottom: "0.85rem" }}>{t("hvcoDesc")}</p>
          <ul style={{ margin: "0 0 1.15rem", paddingLeft: "1.15rem", lineHeight: 1.65 }}>
            <li>{t("hvcoBullet1")}</li>
            <li>{t("hvcoBullet2")}</li>
            <li>{t("hvcoBullet3")}</li>
          </ul>
          <HvcoForm source="hvco_start_mid" />
        </div>

        <h2 className="page-title" style={{ marginBottom: "0.65rem" }}>
          {t("offerTitle")}
        </h2>
        <p style={{ fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.45, marginBottom: "0.75rem" }}>
          {t("offerHeadline")}
        </p>
        <p className="muted" style={{ lineHeight: 1.65, marginBottom: "1rem" }}>
          {t("offerBody")}
        </p>
        <Link href="/register" className="btn btn-soft" style={{ marginBottom: "2rem" }}>
          {t("offerCta")}
        </Link>

        <h2 className="page-title" style={{ margin: "2rem 0 1rem" }}>
          {t("stackTitle")}
        </h2>
        <div className="stack" style={{ gap: "0.65rem", marginBottom: "2rem" }}>
          {(
            [
              ["stack1F", "stack1B"],
              ["stack2F", "stack2B"],
              ["stack3F", "stack3B"],
              ["stack4F", "stack4B"],
              ["stack5F", "stack5B"],
            ] as const
          ).map(([f, b]) => (
            <div key={f} className="surface" style={{ padding: "0.9rem 1.05rem" }}>
              <div style={{ fontWeight: 700 }}>{t(f)}</div>
              <div className="muted" style={{ marginTop: "0.25rem", lineHeight: 1.5 }}>
                {t(b)}
              </div>
            </div>
          ))}
        </div>

        <h2 className="page-title" style={{ marginBottom: "0.5rem" }}>
          {t("proofTitle")}
        </h2>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.85rem" }}>
          {t("proofNote")}
        </p>
        <div className="stack" style={{ gap: "0.75rem", marginBottom: "2rem" }}>
          {(
            [
              ["proof1", "proof1By"],
              ["proof2", "proof2By"],
              ["proof3", "proof3By"],
            ] as const
          ).map(([q, by]) => (
            <div key={q} className="surface" style={{ padding: "1rem 1.1rem" }}>
              <p style={{ margin: "0 0 0.45rem", lineHeight: 1.5 }}>{t(q)}</p>
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                {t(by)}
              </p>
            </div>
          ))}
        </div>

        <h2 className="page-title" style={{ marginBottom: "1rem" }}>
          {t("faqTitle")}
        </h2>
        {(
          [
            ["faq1Q", "faq1A"],
            ["faq2Q", "faq2A"],
            ["faq3Q", "faq3A"],
            ["faq4Q", "faq4A"],
          ] as const
        ).map(([q, a]) => (
          <div key={q} style={{ marginBottom: "1.1rem" }}>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.02rem" }}>{t(q)}</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
              {t(a)}
            </p>
          </div>
        ))}

        <div className="surface" style={{ padding: "1.35rem", marginTop: "2.5rem" }}>
          <h2 style={{ margin: "0 0 0.5rem" }}>{t("finalTitle")}</h2>
          <p className="muted" style={{ margin: "0 0 1.15rem", lineHeight: 1.55 }}>
            {t("finalBody")}
          </p>
          <HvcoForm source="hvco_start_final" />
          <div style={{ marginTop: "1rem" }}>
            <Link href="/register" className="btn btn-ghost" style={{ width: "100%" }}>
              {t("finalTrial")}
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
