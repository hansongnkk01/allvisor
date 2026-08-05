/** Allvisor wordmark / mark from public/brand. */
export const BRAND_LOGO_SRC = "/brand/allvisor-logo.svg";

type BrandLogoSize = "nav" | "hero" | "footer" | "lockup" | "auth";

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  nav: "brand-logo--nav",
  hero: "brand-logo--hero",
  footer: "brand-logo--footer",
  lockup: "brand-logo--lockup",
  auth: "brand-logo--auth",
};

export function BrandLogo({
  size = "nav",
  className,
  alt = "Allvisor",
}: {
  size?: BrandLogoSize;
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt={alt}
      className={["brand-logo", SIZE_CLASS[size], className].filter(Boolean).join(" ")}
      draggable={false}
    />
  );
}
