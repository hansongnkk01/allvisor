"use client";

function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export function CsvDownloadButton({
  filename,
  headers,
  rows,
  label,
}: {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  label: string;
}) {
  function download() {
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="btn btn-soft" style={{ padding: "0.4rem 0.8rem" }} onClick={download}>
      {label}
    </button>
  );
}
