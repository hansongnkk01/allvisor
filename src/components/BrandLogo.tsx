import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/brand/allvisor-logo.png";

type BrandLogoSize = "nav" | "hero" | "auth" | "sidebar" | "footer";

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  nav: "brand-logo--nav",
  hero: "brand-logo--hero",
  auth: "brand-logo--auth",
  sidebar: "brand-logo--sidebar",
  footer: "brand-logo--footer",
};

/** Allvisor wordmark logo — use for UI brand lockups (not body copy). */
export function BrandLogo({
  size = "nav",
  className,
  priority = false,
}: {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public brand asset
    <img
      src={BRAND_LOGO_SRC}
      alt="Allvisor"
      className={cn("brand-logo", SIZE_CLASS[size], className)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      draggable={false}
    />
  );
}
