import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import type { Capability } from "@/lib/niche-capabilities";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createClient } from "@/lib/supabase/server";

type Field = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
};

export async function NicheModulePage({
  params,
  capability,
  title,
  subtitle,
  table,
  columns,
  fields,
  action,
  order = "created_at",
}: {
  params: Promise<{ locale: string }>;
  capability: Capability;
  title: string;
  subtitle: string;
  table: string;
  columns: string[];
  fields: Field[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>;
  order?: string;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, capability);
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from(table)
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order(order, { ascending: false })
    .limit(100);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add</h3>
        <ActionForm action={action} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {fields.map((f) => (
              <div className="field" key={f.name}>
                <label>{f.label}</label>
                {f.type === "select" ? (
                  <select name={f.name} className="select" required={f.required} defaultValue={f.defaultValue ?? ""}>
                    <option value="">—</option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.name}
                    className="input"
                    type={f.type || "text"}
                    required={f.required}
                    defaultValue={f.defaultValue ?? ""}
                  />
                )}
              </div>
            ))}
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </ActionForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c}>{String(row[c] ?? "—")}</td>
                  ))}
                </tr>
              ))}
              {!rows?.length ? (
                <tr>
                  <td colSpan={columns.length} className="muted">
                    No records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
