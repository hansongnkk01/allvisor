import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

/** Revalidate only the affected app routes (both locales) — avoids wiping whole cache. */
export function revalidateApp(...paths: string[]) {
  for (const locale of routing.locales) {
    for (const path of paths) {
      const normalized = path.startsWith("/") ? path : `/${path}`;
      revalidatePath(`/${locale}${normalized}`);
    }
  }
}

export function revalidateAppLayout() {
  for (const locale of routing.locales) {
    // Invalidate the whole locale app tree (nav shell reads org logo here).
    revalidatePath(`/${locale}`, "layout");
    revalidatePath(`/${locale}/dashboard`, "layout");
    revalidatePath(`/${locale}/admin`, "page");
    revalidatePath(`/${locale}/invoices`, "page");
  }
}
