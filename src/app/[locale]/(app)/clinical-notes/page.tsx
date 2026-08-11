import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { saveClinicalNotesAction } from "@/app/pipeline-actions";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "appointments");
  const supabase = await createClient();

  const from = new Date();
  from.setDate(from.getDate() - 2);
  from.setHours(0, 0, 0, 0);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, title, starts_at, status, clinical_notes, room_name, customers(name)")
    .eq("organization_id", ctx.organization.id)
    .gte("starts_at", from.toISOString())
    .order("starts_at", { ascending: false })
    .limit(80);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Clinical notes"
        subtitle="Quick notes against today's and recent appointments."
      />
      <div className="stack" style={{ gap: "0.85rem" }}>
        {(appointments || []).map((row) => {
          const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
          const when = row.starts_at
            ? new Date(row.starts_at).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";
          return (
            <div key={row.id} className="surface" style={{ padding: "1rem 1.15rem" }}>
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>{customer?.name || row.title || "Appointment"}</strong>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[when, row.room_name, row.status].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <ActionForm action={saveClinicalNotesAction} className="stack" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={row.id} />
                <div className="field">
                  <label>Clinical notes</label>
                  <textarea
                    name="clinical_notes"
                    className="input"
                    rows={4}
                    defaultValue={row.clinical_notes || ""}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Save notes
                </button>
              </ActionForm>
            </div>
          );
        })}
        {!appointments?.length ? (
          <p className="muted">No recent appointments.</p>
        ) : null}
      </div>
    </div>
  );
}
