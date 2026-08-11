import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createPetVaccinationAction } from "@/app/pipeline-actions";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "pet_vaccinations");
  const supabase = await createClient();

  const [{ data: rows }, { data: pets }] = await Promise.all([
    supabase
      .from("pet_vaccinations")
      .select("id, pet_id, vaccine_name, given_on, due_on, batch_lot, notes, created_at, pets(name, species, owner_id)")
      .eq("organization_id", ctx.organization.id)
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(150),
    supabase
      .from("pets")
      .select("id, name, species")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Vaccinations"
        subtitle="Pet vaccine log with overdue due dates highlighted."
      />
      <PipelineCreateForm
        action={createPetVaccinationAction}
        fields={[
          {
            name: "pet_id",
            label: "Pet",
            type: "select",
            required: true,
            options: (pets || []).map((p) => ({
              value: p.id,
              label: `${p.name}${p.species ? ` (${p.species})` : ""}`,
            })),
          },
          { name: "vaccine_name", label: "Vaccine", required: true },
          { name: "given_on", label: "Given on", type: "date" },
          { name: "due_on", label: "Next due", type: "date" },
          { name: "batch_lot", label: "Batch / lot" },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Pet</th>
              <th align="left">Vaccine</th>
              <th align="left">Given</th>
              <th align="left">Due</th>
              <th align="left">Lot</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => {
              const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
              const overdue = row.due_on && row.due_on < today;
              return (
                <tr
                  key={row.id}
                  style={overdue ? { background: "rgba(185,28,28,0.08)" } : undefined}
                >
                  <td>
                    {pet?.name || "—"}
                    {pet?.species ? (
                      <span className="muted"> · {pet.species}</span>
                    ) : null}
                  </td>
                  <td>{row.vaccine_name}</td>
                  <td>{row.given_on || "—"}</td>
                  <td>
                    {row.due_on || "—"}
                    {overdue ? (
                      <span style={{ color: "var(--danger)", marginLeft: 6 }}>Overdue</span>
                    ) : null}
                  </td>
                  <td>{row.batch_lot || "—"}</td>
                </tr>
              );
            })}
            {!rows?.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No vaccinations recorded.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
