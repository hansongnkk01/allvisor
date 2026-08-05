import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Visual size preset */
  size?: "nav" | "hero" | "lockup" | "auth" | "footer";
  className?: string;
  /** When true, wraps link-friendly inline (default) */
  priority?: boolean;
};

const HEIGHT: Record<NonNullable<BrandLogoProps["size"]>, number> = {
  nav: 28,
  hero: 52,
  lockup: 22,
  auth: 32,
  footer: 30,
};

/** Official Allvisor wordmark — use instead of text "Allvisor" in brand UI. */
export function BrandLogo({ size = "nav", className, priority }: BrandLogoProps) {
  const h = HEIGHT[size];
  return (
    <span className={cn("brand-logo", `brand-logo--${size}`, className)} data-brand-logo="">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/allvisor-logo.png"
        alt="Allvisor"
        height={h}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </span>
  );
}
