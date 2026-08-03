import { ActionForm } from "@/components/ActionForm";
import { unlockSectionAction, getDefaultAdminPasswordHint } from "@/app/actions";
import type { LockedSection } from "@/lib/admin-lock";
import { PageHeader } from "@/components/PageHeader";

export async function SectionLockGate({
  section,
  title,
  subtitle,
}: {
  section: LockedSection;
  title: string;
  subtitle?: string;
}) {
  const hint = await getDefaultAdminPasswordHint();
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={title} subtitle={subtitle || "Password required"} />
      <div className="surface" style={{ padding: "1.25rem", maxWidth: 480 }}>
        <p className="muted">
          Only admin / supervisor / manager can open this section. One unlock
          opens Admin, Accounting and LHDN together (same password; default =
          business name without spaces + year).
        </p>
        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Default / hint: <code>{hint}</code>
        </p>
        <ActionForm action={unlockSectionAction} className="stack">
          <input type="hidden" name="section" value={section} />
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" required className="input" />
          </div>
          <button type="submit" className="btn btn-primary">
            Unlock
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
