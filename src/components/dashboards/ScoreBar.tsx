/** Percentage bar shared by the Team page, Performance ranking and the demo. */
export function ScoreBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const tone =
    clamped >= 75 ? "var(--success, #16a34a)" : clamped >= 50 ? "var(--accent)" : "var(--warn, #d97706)";

  return (
    <div className="row" style={{ gap: "0.5rem", flexWrap: "nowrap", alignItems: "center" }}>
      <div
        style={{
          flex: 1,
          minWidth: 60,
          height: 8,
          borderRadius: 999,
          background: "var(--line)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${clamped}%`, height: "100%", background: tone }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{clamped}%</span>
    </div>
  );
}
