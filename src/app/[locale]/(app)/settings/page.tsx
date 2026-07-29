import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { updateOrgSettingsAction } from "@/app/actions";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Settings");
  const ctx = await requireOrg(locale);
  const org = ctx.organization;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <ActionForm action={updateOrgSettingsAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input name="name" className="input" defaultValue={org.name} required />
            </div>
            <div className="field">
              <label>{t("phone")}</label>
              <input name="phone" className="input" defaultValue={org.phone || ""} />
            </div>
            <div className="field">
              <label>{t("tin")}</label>
              <input name="tin" className="input" defaultValue={org.tin || ""} />
            </div>
            <div className="field">
              <label>{t("sst")}</label>
              <input name="sst_number" className="input" defaultValue={org.sst_number || ""} />
            </div>
          </div>
          <div className="field">
            <label>{t("address")}</label>
            <textarea name="address" className="textarea" defaultValue={org.address || ""} />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
