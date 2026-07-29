export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="row"
      style={{
        justifyContent: "space-between",
        marginBottom: "1.25rem",
        alignItems: "flex-end",
      }}
    >
      <div>
        <h1 className="page-title display">{title}</h1>
        {subtitle ? (
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
