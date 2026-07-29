import { formatDateTime } from "@/lib/utils";

type Log = {
  id: string;
  actor_name: string | null;
  summary: string;
  action: string;
  created_at: string;
};

export function SectionActivityLog({
  title,
  logs,
  empty = "No activity yet.",
}: {
  title: string;
  logs: Log[];
  empty?: string;
}) {
  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="stack" style={{ gap: "0.55rem", maxHeight: 320, overflowY: "auto" }}>
        {logs.map((a) => (
          <div
            key={a.id}
            style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
          >
            <div>
              <strong>{a.actor_name || "Staff"}</strong>
              <span className="muted"> · {a.summary}</span>
            </div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {formatDateTime(a.created_at)} · {a.action}
            </div>
          </div>
        ))}
        {!logs.length ? <p className="muted">{empty}</p> : null}
      </div>
    </div>
  );
}
