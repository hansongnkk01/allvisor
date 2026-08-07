"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Entry chooser kept at /login so older links and bookmarks still land somewhere useful. */
export default function LoginPage() {
  const t = useTranslations("Auth");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
      }}
    >
      <div className="surface" style={{ width: "100%", maxWidth: 460, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <Link href="/" aria-label="Allvisor" style={{ display: "inline-flex", alignItems: "center" }}>
            <BrandLogo size="auth" />
          </Link>
          <LanguageSwitcher />
        </div>

        <h1 style={{ marginTop: 0 }}>{t("chooseEntryTitle")}</h1>
        <p className="muted">{t("chooseEntryHint")}</p>

        <div className="stack" style={{ gap: "0.75rem", marginTop: "1.25rem" }}>
          <Link href="/login/admin" className="btn btn-primary" style={{ width: "100%" }}>
            {t("loginAsAdmin")}
          </Link>
          <Link href="/login/staff" className="btn btn-soft" style={{ width: "100%" }}>
            {t("loginAsStaff")}
          </Link>
        </div>

        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t("noAccount")}{" "}
          <Link href="/register" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
