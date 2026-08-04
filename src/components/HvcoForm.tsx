"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useState, useTransition } from "react";
import { submitHvcoLeadAction } from "@/app/marketing-actions";

export function HvcoForm({ source = "hvco_start" }: { source?: string }) {
  const t = useTranslations("StartLanding");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="stack"
      style={{ gap: "0.75rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        fd.set("locale", locale);
        fd.set("source", source);
        startTransition(async () => {
          const name = String(fd.get("full_name") || "").trim();
          const email = String(fd.get("email") || "").trim();
          const res = await submitHvcoLeadAction(fd);
          if (!res.ok) {
            setError(res.error === "name" ? t("formErrorName") : t("formErrorEmail"));
            return;
          }
          const q = new URLSearchParams();
          if (name) q.set("name", name);
          if (email) q.set("email", email);
          router.push(`/start/thank-you?${q.toString()}`);
        });
      }}
    >
      <div className="field">
        <label htmlFor={`hvco-name-${source}`}>{t("formName")}</label>
        <input
          id={`hvco-name-${source}`}
          name="full_name"
          className="input"
          required
          autoComplete="name"
          disabled={pending}
        />
      </div>
      <div className="field">
        <label htmlFor={`hvco-email-${source}`}>{t("formEmail")}</label>
        <input
          id={`hvco-email-${source}`}
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
          disabled={pending}
        />
      </div>
      {error ? (
        <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "100%" }}>
        {pending ? t("formPending") : t("formSubmit")}
      </button>
    </form>
  );
}
