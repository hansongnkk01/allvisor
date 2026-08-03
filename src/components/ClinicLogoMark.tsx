import type { CSSProperties } from "react";

export type LogoShape = "round" | "square";

const FRAME = {
  round: 999,
  square: 10,
} as const;

/** Grey/black checkerboard when no clinic logo is set. */
function logoPlaceholderBackground(cell = 8): CSSProperties {
  return {
    backgroundColor: "#9c9c9c",
    backgroundImage: `repeating-conic-gradient(#2c2c2c 0% 25%, #9c9c9c 0% 50%)`,
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: "0 0",
  };
}

/** Clinic logo mark used in nav + invoices. Always reserves frame space. */
export function ClinicLogoMark({
  url,
  shape = "round",
  size = 40,
  alt = "Logo",
  style,
  placeholder = true,
}: {
  url?: string | null;
  shape?: LogoShape | null;
  size?: number;
  alt?: string;
  style?: CSSProperties;
  /** When false and no url, render nothing (editor-only). Default true. */
  placeholder?: boolean;
}) {
  const radius = shape === "square" ? FRAME.square : FRAME.round;
  const cell = Math.max(6, Math.round(size / 6));

  const frameStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    border: "1px solid rgba(28, 27, 25, 0.14)",
    flexShrink: 0,
    display: "block",
    boxSizing: "border-box",
    overflow: "hidden",
    ...style,
  };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="clinic-logo-frame"
        src={url}
        alt={alt}
        width={size}
        height={size}
        style={{
          ...frameStyle,
          objectFit: "cover",
          background: "#fff",
        }}
      />
    );
  }

  if (!placeholder) return null;

  return (
    <div
      className="clinic-logo-frame clinic-logo-placeholder"
      role="img"
      aria-label={alt}
      title={alt}
      style={{
        ...frameStyle,
        ...logoPlaceholderBackground(cell),
      }}
    />
  );
}
