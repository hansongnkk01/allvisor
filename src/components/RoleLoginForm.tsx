"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function RoleLoginForm({
  variant,
}: {
  variant: "admin" | "staff";
}) {
  const t = useTranslations("Auth");
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
        background:
          variant === "admin"
            ? "linear-gradient(160deg, rgba(15,23,42,0.04), rgba(37,99,235,0.08))"
            : "linear-gradient(160deg, rgba(15,118,110,0.06), rgba(255,255,255,0.9))",
      }}
    >
      <div className="surface" style={{ width: "100%", maxWidth: 420, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <Link href="/" aria-label="Allvisor" style={{ display: "inline-flex", alignItems: "center" }}>
            <BrandLogo size="auth" />
          </Link>
          <LanguageSwitcher />
        </div>
        <p className="badge" style={{ marginBottom: 8 }}>
          {variant === "admin" ? t("loginAsAdmin") : t("loginAsStaff")}
        </p>
        <h1 style={{ marginTop: 0 }}>
          {variant === "admin" ? t("adminLoginTitle") : t("staffLoginTitle")}
        </h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {variant === "admin" ? t("adminLoginHint") : t("staffLoginHint")}
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

                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                  setError(t("errorGeneric"));
                  return;
                }

                const { data: membership } = await supabase
                  .from("memberships")
                  .select("role")
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: true })
                  .limit(1)
                  .maybeSingle();

                const role = membership?.role as string | undefined;
                const isAdminCapable =
                  role === "owner" ||
                  role === "admin" ||
                  role === "supervisor" ||
                  role === "manager";

                if (isAdminCapable) {
                  router.push("/admin-dashboard");
                } else if (variant === "admin") {
                  router.push("/staff-dashboard?notice=no-admin");
                } else {
                  router.push("/staff-dashboard");
                }
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
          <Link href="/login" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
            {t("backToLoginChooser")}
          </Link>
          {" · "}
          {variant === "admin" ? (
            <Link href="/login/staff" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              {t("loginAsStaff")}
            </Link>
          ) : (
            <Link href="/login/admin" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              {t("loginAsAdmin")}
            </Link>
          )}
        </p>
        {variant === "admin" ? (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            {t("noAccount")}{" "}
            <Link href="/register" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              {t("signupForAdmin")}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
