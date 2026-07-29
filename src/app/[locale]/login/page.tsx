"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const brand = useTranslations("Brand");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
      }}
    >
      <div className="surface" style={{ width: "100%", maxWidth: 420, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div className="display" style={{ fontSize: "1.6rem" }}>
            {brand("name")}
          </div>
          <LanguageSwitcher />
        </div>
        <h1 style={{ marginTop: 0 }}>{t("loginTitle")}</h1>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              try {
                const supabase = createClient();
                const { error: authError } = await supabase.auth.signInWithPassword({
                  email: String(form.get("email")),
                  password: String(form.get("password")),
                });
                if (authError) {
                  setError(authError.message);
                  return;
                }
                router.push("/dashboard");
                router.refresh();
              } catch {
                setError(t("errorGeneric"));
              }
            });
          }}
        >
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
            {t("login")}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem" }}>
          {t("noAccount")}{" "}
          <Link href="/register" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
