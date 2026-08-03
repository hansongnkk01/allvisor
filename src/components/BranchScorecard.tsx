import { formatCurrency } from "@/lib/utils";

export type BranchScoreRow = {
  id: string;
  name: string;
  isCurrent: boolean;
  incomeToday: number;
  incomeMonth: number;
  unpaidCount: number;
  unpaidTotal: number;
  appointmentsToday: number;
  noShowToday: number;
};

export function BranchScorecard({
  title,
  subtitle,
  rows,
  labels,
}: {
  title: string;
  subtitle: string;
  rows: BranchScoreRow[];
  labels: {
    branch: string;
    incomeToday: string;
    incomeMonth: string;
    unpaid: string;
    appointmentsToday: string;
    noShow: string;
    thisClinic: string;
  };
}) {
  if (rows.length < 2) return null;

  const bestIncome = Math.max(...rows.map((r) => r.incomeMonth));

  return (
    <div
      className="surface"
      style={{
        padding: "1.15rem 1.25rem",
        borderColor: "rgba(15, 118, 110, 0.35)",
        background:
          "linear-gradient(135deg, rgba(15,118,110,0.06), rgba(255,255,255,0.92))",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h3>
      <p className="muted" style={{ margin: "0 0 0.85rem", fontSize: "0.85rem" }}>
        {subtitle}
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{labels.branch}</th>
              <th>{labels.incomeToday}</th>
              <th>{labels.incomeMonth}</th>
              <th>{labels.unpaid}</th>
              <th>{labels.appointmentsToday}</th>
              <th>{labels.noShow}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const lead = r.incomeMonth === bestIncome && bestIncome > 0;
              return (
                <tr
                  key={r.id}
                  style={
                    lead
                      ? { background: "rgba(22, 163, 74, 0.08)" }
                      : undefined
                  }
                >
                  <td>
                    <strong>{r.name}</strong>
                    {r.isCurrent ? (
                      <div className="muted" style={{ fontSize: "0.75rem" }}>
                        {labels.thisClinic}
                      </div>
                    ) : null}
                  </td>
                  <td>{formatCurrency(r.incomeToday)}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(r.incomeMonth)}</td>
                  <td>
                    {r.unpaidCount} · {formatCurrency(r.unpaidTotal)}
                  </td>
                  <td>{r.appointmentsToday}</td>
                  <td
                    style={{
                      fontWeight: r.noShowToday > 0 ? 700 : 400,
                      color: r.noShowToday > 0 ? "#b45309" : undefined,
                    }}
                  >
                    {r.noShowToday}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
