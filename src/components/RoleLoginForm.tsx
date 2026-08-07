"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Audience } from "@/lib/types";

/**
 * Both entrances share Supabase auth. The landing page is decided by the member's
 * real role at /dashboard, so signing in from the wrong door still works.
 */
export function RoleLoginForm({ audience }: { audience: Audience }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isAdmin = audience === "admin";

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
          <Link href="/" aria-label="Allvisor" style={{ display: "inline-flex", alignItems: "center" }}>
            <BrandLogo size="auth" />
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 style={{ marginTop: 0 }}>{isAdmin ? t("adminLoginTitle") : t("staffLoginTitle")}</h1>
        <p className="muted" style={{ marginTop: "-0.35rem" }}>
          {isAdmin ? t("adminLoginHint") : t("staffLoginHint")}
        </p>
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

        {isAdmin ? (
          <p className="muted" style={{ marginTop: "1rem" }}>
            {t("noAccount")}{" "}
            <Link href="/register" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              {t("register")}
            </Link>
          </p>
        ) : (
          <p className="muted" style={{ marginTop: "1rem" }}>
            {t("staffNoSignup")}
          </p>
        )}

        <p className="muted" style={{ marginTop: "0.5rem" }}>
          <Link
            href={isAdmin ? "/login/staff" : "/login/admin"}
            style={{ color: "var(--accent-ink)", fontWeight: 600 }}
          >
            {isAdmin ? t("switchToStaffLogin") : t("switchToAdminLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
