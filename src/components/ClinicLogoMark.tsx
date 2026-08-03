import type { CSSProperties } from "react";

export type LogoShape = "round" | "square";

/** Clinic logo mark used in nav + invoices. */
export function ClinicLogoMark({
  url,
  shape = "round",
  size = 40,
  alt = "Logo",
  style,
}: {
  url?: string | null;
  shape?: LogoShape | null;
  size?: number;
  alt?: string;
  style?: CSSProperties;
}) {
  if (!url) return null;
  const frame = shape === "square" ? 10 : 999;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: frame,
        border: "1px solid rgba(28, 27, 25, 0.12)",
        background: "#fff",
        flexShrink: 0,
        display: "block",
        ...style,
      }}
    />
  );
}
