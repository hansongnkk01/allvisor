"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createOrganizationAction } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { isNiche } from "@/lib/niches";
import type { Niche } from "@/lib/types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NichePicker } from "@/components/NichePicker";

export default function OnboardingClient() {
  const t = useTranslations("Onboarding");
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
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace(`/login`);
        return;
      }
      setCheckingAuth(false);
    });
  }, [router]);

  if (checkingAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p className="muted">…</p>
      </div>
    );
  }

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
      <div className="surface" style={{ width: "100%", maxWidth: 640, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0 }}>{t("title")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="muted">{t("hint")}</p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            formData.set("niche", niche);
            formData.set("locale", locale);
            setError(null);
            startTransition(async () => {
              const result = await createOrganizationAction(formData);
              if (result.error) {
                setError(result.error);
                return;
              }
              router.push("/dashboard");
              router.refresh();
            });
          }}
        >
          <div className="field">
            <label htmlFor="name">{t("businessName")}</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div className="field">
            <label>{t("niche")}</label>
            <NichePicker value={niche as Niche} onChange={setNiche} />
          </div>
          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {t("continue")}
          </button>
        </form>
      </div>
    </div>
  );
}
