import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function StartThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ name?: string; email?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("StartLanding");

  const regQ = new URLSearchParams();
  if (sp.name) regQ.set("name", sp.name);
  if (sp.email) regQ.set("email", sp.email);
  const registerHref = regQ.size ? `/register?${regQ.toString()}` : "/register";

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        className="row"
        style={{
          justifyContent: "space-between",
          padding: "1.15rem clamp(1rem, 4vw, 3rem)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link href="/" aria-label="Allvisor" style={{ textDecoration: "none" }}>
          <BrandLogo size="nav" />
        </Link>
        <div className="row" style={{ gap: "0.5rem" }}>
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost">
            {t("navLogin")}
          </Link>
        </div>
      </header>

      <section style={{ maxWidth: 640, margin: "0 auto", padding: "3rem clamp(1rem, 4vw, 2rem)" }}>
        <h1 className="display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBottom: "0.75rem" }}>
          {t("thanksTitle")}
        </h1>
        <p className="muted" style={{ lineHeight: 1.65, marginBottom: "1.5rem" }}>
          {t("thanksBody")}
        </p>
        <div className="stack" style={{ gap: "0.75rem" }}>
          <a href="/hvco/allvisor-sme-ops-playbook.md" className="btn btn-primary" download>
            {t("thanksDownload")}
          </a>
          <Link href={registerHref} className="btn btn-soft">
            {t("thanksNext")}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t("thanksHome")}
          </Link>
        </div>
      </section>
    </div>
  );
}
