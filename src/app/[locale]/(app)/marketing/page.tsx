import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { marketingPlays } from "@/lib/marketing-plays";
import { vocabLabels } from "@/lib/niches";

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const { organization } = await requireOwner(locale);
  const plays = marketingPlays(organization.niche, locale);
  const V = vocabLabels(organization.niche, locale);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={t("marketingTitle")}
        subtitle={t("marketingSubtitle", { business: V.business })}
      />

      <div className="fluid-grid">
        {plays.map((play) => (
          <section key={play.id} className="surface" style={{ padding: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>{play.title}</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {play.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
