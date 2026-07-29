"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "@/i18n/navigation";

/** Instant visual feedback on route changes (feels faster than waiting for RSC). */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setActive(true);
    const t = setTimeout(() => setActive(false), 280);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      startTransition(() => setActive(true));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [startTransition]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: active ? 1 : 0,
        transition: "opacity 120ms ease",
        background:
          "linear-gradient(90deg, transparent, var(--accent), transparent)",
        backgroundSize: "200% 100%",
        animation: active ? "allvisor-progress 0.9s linear infinite" : "none",
      }}
    />
  );
}
