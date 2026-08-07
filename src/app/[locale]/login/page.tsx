"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Login chooser — preserves /login for old links. */
export default function LoginChooserPage() {
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
      <div className="surface" style={{ width: "100%", maxWidth: 480, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <Link href="/" aria-label="Allvisor" style={{ display: "inline-flex", alignItems: "center" }}>
            <BrandLogo size="auth" />
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 style={{ marginTop: 0 }}>{t("loginChooserTitle")}</h1>
        <p className="muted">{t("loginChooserHint")}</p>
        <div className="stack" style={{ gap: "0.75rem", marginTop: "1.25rem" }}>
          <Link href="/login/admin" className="btn btn-primary" style={{ textAlign: "center" }}>
            {t("loginAsAdmin")}
          </Link>
          <Link href="/login/staff" className="btn btn-soft" style={{ textAlign: "center" }}>
            {t("loginAsStaff")}
          </Link>
        </div>
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          {t("noAccount")}{" "}
          <Link href="/register" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
            {t("signupForAdmin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
