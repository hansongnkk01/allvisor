import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createDiningTableAction } from "@/app/niche-actions";
import { updateTableStatusAction } from "@/app/pipeline-actions";
import { TABLE_STATUSES } from "@/lib/status-pipelines";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "tables_kot");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("dining_tables")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("name")
    .limit(100);

  const items = (rows || []).map((row) => ({
    id: row.id,
    title: row.name,
    status: row.status || "free",
    subtitle: `${row.seats || 4} seats`,
    meta: row.covers ? `${row.covers} covers` : undefined,
    tone: row.status === "dirty" ? ("alert" as const) : row.status === "bill" ? ("good" as const) : undefined,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Tables"
        subtitle="Floor status: free → occupied → bill → dirty."
      />
      <PipelineCreateForm
        action={createDiningTableAction}
        fields={[
          { name: "name", label: "Table name", required: true },
          { name: "seats", label: "Seats", type: "number", defaultValue: 4 },
        ]}
      />
      <StatusPipelineBoard
        statuses={TABLE_STATUSES}
        items={items}
        updateAction={updateTableStatusAction}
        showInvoice={false}
      />
    </div>
  );
}
