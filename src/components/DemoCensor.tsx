/** Grey bar used to hide IC / TIN / BRN values in the homepage demo. */
export function DemoCensor({
  width = 110,
  height = 14,
  className,
  "aria-label": ariaLabel = "Hidden",
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <span
      className={["demo-censor", className].filter(Boolean).join(" ")}
      style={{ width, height }}
      aria-label={ariaLabel}
      role="img"
    />
  );
}

/** Read-only field that shows a censor bar instead of a real IC/TIN value. */
export function DemoCensorField({
  label,
  width = "100%",
}: {
  label: string;
  width?: number | string;
}) {
  return (
    <div className="field">
      {label ? <label>{label}</label> : null}
      <div className="demo-censor-field">
        <DemoCensor width={width} height={16} />
      </div>
    </div>
  );
}
