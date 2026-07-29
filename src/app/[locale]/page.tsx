import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Stethoscope, Store } from "lucide-react";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const brand = await getTranslations("Brand");

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        className="row"
        style={{
          justifyContent: "space-between",
          padding: "1.25rem clamp(1rem, 4vw, 3rem)",
        }}
      >
        <div className="display" style={{ fontSize: "1.8rem" }}>
          {brand("name")}
        </div>
        <div className="row">
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost">
            {t("ctaLogin")}
          </Link>
        </div>
      </header>

      <section
        style={{
          padding: "4rem clamp(1rem, 4vw, 3rem) 2rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          {brand("tagline")}
        </p>
        <h1
          className="display"
          style={{
            fontSize: "clamp(2.4rem, 6vw, 4.4rem)",
            lineHeight: 1.05,
            margin: "0 0 1rem",
            maxWidth: 820,
          }}
        >
          {t("heroTitle")}
        </h1>
        <p
          className="muted"
          style={{
            fontSize: "1.1rem",
            maxWidth: 640,
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          {t("heroSubtitle")}
        </p>

        <div className="row" style={{ marginBottom: "3rem" }}>
          <span className="badge">{t("featureCrm")}</span>
          <span className="badge">{t("featureBilling")}</span>
          <span className="badge">{t("featureLhdn")}</span>
          <span className="badge">{t("featureBilingual")}</span>
        </div>

        <h2 className="page-title" style={{ marginBottom: "1rem" }}>
          {t("chooseBusiness")}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          <Link
            href="/register?niche=clinic"
            className="surface"
            data-niche="clinic"
            style={{ padding: "1.5rem", display: "block" }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
                display: "grid",
                placeItems: "center",
                marginBottom: "1rem",
              }}
            >
              <Stethoscope />
            </div>
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.35rem" }}>
              {t("clinicTitle")}
            </h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
              {t("clinicDesc")}
            </p>
          </Link>

          <Link
            href="/register?niche=retail"
            className="surface"
            data-niche="retail"
            style={{ padding: "1.5rem", display: "block" }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
                display: "grid",
                placeItems: "center",
                marginBottom: "1rem",
              }}
            >
              <Store />
            </div>
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "1.35rem" }}>
              {t("retailTitle")}
            </h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
              {t("retailDesc")}
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
