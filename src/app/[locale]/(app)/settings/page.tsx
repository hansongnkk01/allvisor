import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "@/i18n/navigation";
import { canAccessAdmin } from "@/lib/roles";

/** Business settings moved to Admin. Settings page keeps a pointer. */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Settings");
  const ctx = await requireOrg(locale);
  const isAdmin = canAccessAdmin(ctx.membership.role);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <p style={{ marginTop: 0 }}>
          Business settings (name, phone, TIN, address), custom invoice format, branches, and
          staff are managed in Admin.
        </p>
        {isAdmin ? (
          <Link href="/admin" className="btn btn-primary">
            Open Admin
          </Link>
        ) : (
          <p className="muted">Ask an admin to update business settings.</p>
        )}
      </div>
    </div>
  );
}
