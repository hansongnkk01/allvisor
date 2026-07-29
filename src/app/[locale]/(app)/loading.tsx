export default function AppLoading() {
  return (
    <div className="stack" style={{ gap: "1rem", paddingTop: "0.5rem" }}>
      <div className="skeleton" style={{ height: 36, width: "42%", borderRadius: 10 }} />
      <div className="skeleton" style={{ height: 16, width: "28%", borderRadius: 8 }} />
      <div className="grid-kpi" style={{ marginTop: "0.5rem" }}>
        <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 96, borderRadius: 18 }} />
      </div>
      <div className="skeleton" style={{ height: 220, borderRadius: 18, marginTop: "0.5rem" }} />
    </div>
  );
}
