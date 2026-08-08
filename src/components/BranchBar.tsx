"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { switchBranchAction } from "@/app/actions";

export type BranchOption = { id: string; name: string };

/**
 * Sticky bar shown at the top of every page when the account belongs to more
 * than one organisation. Picking a branch re-scopes the whole app (every tab
 * reads the active org server-side via the active-org cookie).
 */
export function BranchBar({
  branches,
  activeOrgId,
}: {
  branches: BranchOption[];
  activeOrgId: string;
}) {
  const t = useTranslations("Nav");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = branches.find((b) => b.id === activeOrgId) || branches[0];

  return (
    <div
      className="surface"
      style={{
        position: "sticky",
        top: "0.5rem",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.55rem 0.9rem",
        marginBottom: "1rem",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          minWidth: 0,
          fontSize: "0.92rem",
        }}
      >
        <Building2 size={16} style={{ flexShrink: 0, color: "var(--accent)" }} />
        <span className="muted">{t("branchBarLabel")}</span>
        <strong
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {active?.name}
        </strong>
      </span>
      <select
        className="select"
        value={active?.id || ""}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (!next || next === active?.id) return;
          startTransition(async () => {
            await switchBranchAction(next);
            router.refresh();
          });
        }}
        style={{ maxWidth: 220, padding: "0.3rem 0.6rem", fontSize: "0.9rem" }}
        aria-label={t("branchBarLabel")}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
