"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { importMigrationDataAction } from "@/app/actions";
import {
  downloadTemplate,
  IMPORT_KIND_ORDER,
  IMPORT_TEMPLATES,
  mapRow,
  type ImportKind,
  type ImportRow,
} from "@/lib/data-import";

async function parseFile(file: File): Promise<ImportRow[]> {
  const XLSX = await import("xlsx");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
          resolve([]);
          return;
        }
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });
        resolve(
          json.map((row) => {
            const out: ImportRow = {};
            for (const [k, v] of Object.entries(row)) {
              out[String(k)] = v == null ? "" : String(v).trim();
            }
            return out;
          })
        );
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function DataImportPanel({
  labels,
  allowedKinds,
  omitRisk = false,
}: {
  labels: {
    title: string;
    hint: string;
    steps: string;
    kind: string;
    downloadTemplate: string;
    chooseFile: string;
    preview: string;
    importBtn: string;
    importing: string;
    patients: string;
    products: string;
    productCategories: string;
    suppliers: string;
    pastSales: string;
    serviceCategories: string;
    serviceItems: string;
    appointments: string;
    orderHint: string;
    noRows: string;
    success: string;
    partial: string;
  };
  /** When set, only these import kinds are offered (e.g. retail omits appointments). */
  allowedKinds?: ImportKind[];
  /** Tuition: hide risk_level from patients template / preview guidance. */
  omitRisk?: boolean;
}) {
  const kinds = allowedKinds?.length
    ? IMPORT_KIND_ORDER.filter((k) => allowedKinds.includes(k))
    : IMPORT_KIND_ORDER;
  const router = useRouter();
  const [kind, setKind] = useState<ImportKind>(kinds[0] || "patients");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const kindLabel = (k: ImportKind) => {
    switch (k) {
      case "patients":
        return labels.patients;
      case "products":
        return labels.products;
      case "product_categories":
        return labels.productCategories;
      case "suppliers":
        return labels.suppliers;
      case "past_sales":
        return labels.pastSales;
      case "service_categories":
        return labels.serviceCategories;
      case "service_items":
        return labels.serviceItems;
      case "appointments":
        return labels.appointments;
    }
  };

  const mapped = useMemo(() => rows.map((r) => mapRow(kind, r)), [rows, kind]);
  const preview = mapped.slice(0, 5);
  const headers = useMemo(() => {
    const all = IMPORT_TEMPLATES[kind].headers;
    if (omitRisk && kind === "patients") {
      return all.filter((h) => h !== "risk_level");
    }
    return all;
  }, [kind, omitRisk]);

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{labels.title}</h3>
      <p className="muted">{labels.hint}</p>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        {labels.steps}
      </p>
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        {labels.orderHint}
      </p>

      <div className="stack" style={{ gap: "0.85rem", marginTop: "0.75rem" }}>
        <div className="field">
          <label>{labels.kind}</label>
          <select
            className="select"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as ImportKind);
              setResult(null);
              setError(null);
            }}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => downloadTemplate(kind, { omitRisk: omitRisk && kind === "patients" })}
          >
            {labels.downloadTemplate}
          </button>
          <label className="btn btn-soft" style={{ cursor: "pointer", margin: 0 }}>
            {labels.chooseFile}
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                setError(null);
                setResult(null);
                if (!file) return;
                try {
                  const parsed = await parseFile(file);
                  setRows(parsed);
                  setFileName(file.name);
                  if (!parsed.length) setError(labels.noRows);
                } catch {
                  setRows([]);
                  setFileName("");
                  setError("Could not read file. Use CSV or Excel (.xlsx).");
                }
              }}
            />
          </label>
        </div>

        {fileName ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            {fileName} · {mapped.length} row(s)
          </p>
        ) : null}

        {preview.length > 0 ? (
          <div>
            <strong style={{ fontSize: "0.9rem" }}>{labels.preview}</strong>
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="data">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h}>{row[h] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || mapped.length === 0}
          onClick={() => {
            setError(null);
            setResult(null);
            startTransition(async () => {
              const res = await importMigrationDataAction(kind, mapped);
              if (res.error) {
                setError(res.error);
                return;
              }
              const errCount = res.errors?.length || 0;
              setResult(
                errCount
                  ? `${labels.partial}: ${res.inserted} ok, ${res.skipped} skipped. ${errCount} error(s)${
                      res.errors?.[0] ? ` — row ${res.errors[0].row}: ${res.errors[0].message}` : ""
                    }`
                  : `${labels.success}: ${res.inserted} imported.`
              );
              router.refresh();
            });
          }}
        >
          {pending ? labels.importing : labels.importBtn}
        </button>

        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        {result ? <p style={{ color: "var(--success)", margin: 0 }}>{result}</p> : null}
      </div>
    </div>
  );
}
