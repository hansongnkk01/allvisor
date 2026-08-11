"use client";

import { ActionForm } from "@/components/ActionForm";

export type PipelineField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
};

export function PipelineCreateForm({
  action,
  fields,
  submitLabel = "Save",
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>;
  fields: PipelineField[];
  submitLabel?: string;
}) {
  return (
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
            <div
              className="field"
              key={f.name}
              style={f.type === "textarea" ? { gridColumn: "1 / -1" } : undefined}
            >
              <label>{f.label}</label>
              {f.type === "select" ? (
                <select
                  name={f.name}
                  className="select"
                  required={f.required}
                  defaultValue={f.defaultValue ?? ""}
                >
                  <option value="">—</option>
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  className="input"
                  rows={3}
                  required={f.required}
                  defaultValue={f.defaultValue ?? ""}
                />
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
          {submitLabel}
        </button>
      </ActionForm>
    </div>
  );
}
