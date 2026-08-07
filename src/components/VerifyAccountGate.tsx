"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { signOutAction, verifyMembershipAction } from "@/app/actions";

/**
 * Full-screen block shown instead of the dashboard until a newly added member
 * confirms their account. Nothing behind it renders, so there is no preview.
 */
export function VerifyAccountGate({
  email,
  orgName,
  devCode,
}: {
  email: string | null;
  orgName: string;
  devCode?: string | null;
}) {
  const t = useTranslations("Verify");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <div className="surface" style={{ width: "100%", maxWidth: 440, padding: "1.75rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <BrandLogo size="auth" />
          <LanguageSwitcher />
        </div>

        <h1 style={{ marginTop: 0 }}>{t("title")}</h1>
        <p className="muted" style={{ marginTop: "-0.35rem" }}>
          {t("subtitle", { org: orgName, email: email || t("yourEmail") })}
        </p>

        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await verifyMembershipAction(form);
              if (result?.error) {
                setError(
                  result.error === "codeWrong"
                    ? t("codeWrong")
                    : result.error === "codeRequired"
                      ? t("codeRequired")
                      : result.error
                );
                return;
              }
              router.refresh();
            });
          }}
        >
          <div className="field">
            <label htmlFor="code">{t("codeLabel")}</label>
            <input
              id="code"
              name="code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••"
              required
              style={{ letterSpacing: "0.35em", fontSize: "1.1rem" }}
            />
          </div>
          {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? t("checking") : t("confirm")}
          </button>
        </form>

        {devCode ? (
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            {t("devHint")} <code>{devCode}</code>
          </p>
        ) : null}

        <form action={signOutAction} style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn btn-ghost" style={{ width: "100%" }}>
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
