export function FrequentlyUsedStock({
  title,
  hint,
  items,
  usedLabel,
  onHandLabel,
  empty,
}: {
  title: string;
  hint: string;
  items: {
    id: string;
    name: string;
    sku?: string | null;
    quantity: number;
    usedQty: number;
  }[];
  usedLabel: string;
  onHandLabel: string;
  empty: string;
}) {
  return (
    <div className="surface" style={{ padding: "1.15rem 1.25rem" }}>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>{title}</h3>
      <p className="muted" style={{ margin: "0 0 0.85rem", fontSize: "0.85rem" }}>
        {hint}
      </p>
      {items.length ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.55rem",
          }}
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                padding: "0.65rem 0.75rem",
                borderRadius: 12,
                background:
                  i < 3 ? "rgba(15, 118, 110, 0.08)" : "rgba(15, 23, 42, 0.04)",
                border: "1px solid rgba(15, 23, 42, 0.06)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.name}</div>
              {item.sku ? (
                <div className="muted" style={{ fontSize: "0.75rem" }}>
                  {item.sku}
                </div>
              ) : null}
              <div
                className="muted"
                style={{ fontSize: "0.8rem", marginTop: 4, fontWeight: 600 }}
              >
                {item.usedQty} {usedLabel} · {item.quantity} {onHandLabel}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {empty}
        </p>
      )}
    </div>
  );
}
