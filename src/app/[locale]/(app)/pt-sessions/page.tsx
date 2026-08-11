import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { ActionForm } from "@/components/ActionForm";
import {
  createPtPackageAction,
  usePtSessionAction,
} from "@/app/pipeline-actions";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "pt_sessions");
  const supabase = await createClient();

  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase
      .from("gym_pt_sessions")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c.name]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="PT sessions"
        subtitle="Personal trainer packages — create and burn sessions."
      />
      <PipelineCreateForm
        action={createPtPackageAction}
        submitLabel="Create PT package"
        fields={[
          {
            name: "customer_id",
            label: "Member",
            type: "select",
            required: true,
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "package_name", label: "Package", defaultValue: "PT package" },
          { name: "total_sessions", label: "Sessions", type: "number", defaultValue: 10 },
          { name: "trainer_name", label: "Trainer" },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Member</th>
              <th align="left">Package</th>
              <th align="left">Trainer</th>
              <th align="left">Used</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => {
              const remaining =
                Number(row.total_sessions || 0) - Number(row.used_sessions || 0);
              return (
                <tr key={row.id}>
                  <td>{customerMap.get(row.customer_id) || "—"}</td>
                  <td>{row.package_name}</td>
                  <td>{row.trainer_name || "—"}</td>
                  <td>
                    {row.used_sessions} / {row.total_sessions}
                  </td>
                  <td>{row.status}</td>
                  <td>
                    {remaining > 0 && row.status === "active" ? (
                      <ActionForm action={usePtSessionAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="btn btn-soft">
                          Use session
                        </button>
                      </ActionForm>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!rows?.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No PT packages yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
