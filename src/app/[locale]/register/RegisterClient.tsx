"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { isNiche } from "@/lib/niches";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function RegisterClient() {
  const t = useTranslations("Auth");
  const brand = useTranslations("Brand");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const initialNiche = useMemo(() => {
    const n = params.get("niche");
    return isNiche(n) ? n : "clinic";
  }, [params]);

  const [niche, setNiche] = useState(initialNiche);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      data-niche={niche}
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
      }}
    >
      <div className="surface" style={{ width: "100%", maxWidth: 480, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div className="display" style={{ fontSize: "1.6rem" }}>
            {brand("name")}
          </div>
          <LanguageSwitcher />
        </div>
        <h1 style={{ marginTop: 0 }}>{t("registerTitle")}</h1>

        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              try {
                const supabase = createClient();
                const email = String(form.get("email"));
                const password = String(form.get("password"));
                const fullName = String(form.get("full_name"));
                const selectedNiche = String(form.get("niche"));

                const { error: authError } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    data: {
                      full_name: fullName,
                      locale,
                      intended_niche: selectedNiche,
                    },
                  },
                });
                if (authError) {
                  setError(authError.message);
                  return;
                }
                router.push(`/onboarding?niche=${selectedNiche}`);
                router.refresh();
              } catch {
                setError(t("errorGeneric"));
              }
            });
          }}
        >
          <div className="field">
            <label>
              {t("nicheClinic")} / {t("nicheRetail")}
            </label>
            <div className="row">
              <button
                type="button"
                className={niche === "clinic" ? "btn btn-soft" : "btn btn-ghost"}
                onClick={() => setNiche("clinic")}
              >
                {t("nicheClinic")}
              </button>
              <button
                type="button"
                className={niche === "retail" ? "btn btn-soft" : "btn btn-ghost"}
                onClick={() => setNiche("retail")}
              >
                {t("nicheRetail")}
              </button>
            </div>
            <input type="hidden" name="niche" value={niche} />
          </div>
          <div className="field">
            <label htmlFor="full_name">{t("fullName")}</label>
            <input id="full_name" name="full_name" required className="input" />
          </div>
          <div className="field">
            <label htmlFor="email">{t("email")}</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div className="field">
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="input"
            />
          </div>
          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {t("register")}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem" }}>
          {t("haveAccount")}{" "}
          <Link href="/login" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
            {t("login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
