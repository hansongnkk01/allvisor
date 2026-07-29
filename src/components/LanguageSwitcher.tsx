"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: string) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="row" style={{ gap: "0.35rem" }}>
      {routing.locales.map((item) => (
        <button
          key={item}
          type="button"
          className={item === locale ? "btn btn-soft" : "btn btn-ghost"}
          style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
          onClick={() => switchTo(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
