import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Stethoscope,
  Store,
  Scissors,
  Pill,
  Glasses,
  GraduationCap,
  Wrench,
  Dumbbell,
  PawPrint,
  Shirt,
  Cpu,
  Layers,
  Droplets,
  Activity,
  FlaskConical,
  UtensilsCrossed,
  BedDouble,
  Building2,
  Truck,
  HardHat,
  Factory,
  Scale,
  PartyPopper,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import type { Niche } from "@/lib/types";
import { nichesInGroup } from "@/lib/niche-capabilities";
import { nicheThemeAttr } from "@/lib/utils";

type GroupId = "care" | "shop" | "hybrid" | "hospitality" | "specialty";

const GROUPS: Array<{ id: GroupId; labelKey: string }> = [
  { id: "care", labelKey: "groupCare" },
  { id: "shop", labelKey: "groupShop" },
  { id: "hybrid", labelKey: "groupHybrid" },
  { id: "hospitality", labelKey: "groupHospitality" },
  { id: "specialty", labelKey: "groupSpecialty" },
];

const ICONS: Record<Niche, LucideIcon> = {
  clinic: Stethoscope,
  retail: Store,
  salon: Scissors,
  pharmacy: Pill,
  optical: Glasses,
  tuition: GraduationCap,
  workshop: Wrench,
  gym: Dumbbell,
  vet: PawPrint,
  fashion: Shirt,
  electronics: Cpu,
  wholesale: Layers,
  laundry: Droplets,
  physio: Activity,
  lab: FlaskConical,
  fnb: UtensilsCrossed,
  hotel: BedDouble,
  property: Building2,
  courier: Truck,
  contractor: HardHat,
  manufacturing: Factory,
  legal: Scale,
  events: PartyPopper,
  farm: Sprout,
};

const TITLE_KEYS: Record<Niche, string> = {
  clinic: "clinicTitle",
  retail: "retailTitle",
  salon: "salonTitle",
  pharmacy: "pharmacyTitle",
  optical: "opticalTitle",
  tuition: "tuitionTitle",
  workshop: "workshopTitle",
  gym: "gymTitle",
  vet: "vetTitle",
  fashion: "fashionTitle",
  electronics: "electronicsTitle",
  wholesale: "wholesaleTitle",
  laundry: "laundryTitle",
  physio: "physioTitle",
  lab: "labTitle",
  fnb: "fnbTitle",
  hotel: "hotelTitle",
  property: "propertyTitle",
  courier: "courierTitle",
  contractor: "contractorTitle",
  manufacturing: "manufacturingTitle",
  legal: "legalTitle",
  events: "eventsTitle",
  farm: "farmTitle",
};

const DESC_KEYS: Record<Niche, string> = {
  clinic: "clinicDesc",
  retail: "retailDesc",
  salon: "salonDesc",
  pharmacy: "pharmacyDesc",
  optical: "opticalDesc",
  tuition: "tuitionDesc",
  workshop: "workshopDesc",
  gym: "gymDesc",
  vet: "vetDesc",
  fashion: "fashionDesc",
  electronics: "electronicsDesc",
  wholesale: "wholesaleDesc",
  laundry: "laundryDesc",
  physio: "physioDesc",
  lab: "labDesc",
  fnb: "fnbDesc",
  hotel: "hotelDesc",
  property: "propertyDesc",
  courier: "courierDesc",
  contractor: "contractorDesc",
  manufacturing: "manufacturingDesc",
  legal: "legalDesc",
  events: "eventsDesc",
  farm: "farmDesc",
};

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const brand = await getTranslations("Brand");

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        className="row"
        style={{
          justifyContent: "space-between",
          padding: "1.25rem clamp(1rem, 4vw, 3rem)",
        }}
      >
        <div className="display" style={{ fontSize: "1.8rem" }}>
          {brand("name")}
        </div>
        <div className="row">
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-ghost">
            {t("ctaLogin")}
          </Link>
        </div>
      </header>

      <section
        style={{
          padding: "3rem clamp(1rem, 4vw, 3rem) 4rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          {brand("tagline")}
        </p>
        <h1
          className="display"
          style={{
            fontSize: "clamp(2.2rem, 5.5vw, 3.8rem)",
            lineHeight: 1.05,
            margin: "0 0 1rem",
            maxWidth: 900,
          }}
        >
          {t("heroTitle")}
        </h1>
        <p
          className="muted"
          style={{
            fontSize: "1.1rem",
            maxWidth: 680,
            lineHeight: 1.6,
            marginBottom: "1.75rem",
          }}
        >
          {t("heroSubtitle")}
        </p>

        <div className="row" style={{ marginBottom: "2.5rem", flexWrap: "wrap" }}>
          <span className="badge">{t("featureCrm")}</span>
          <span className="badge">{t("featureBilling")}</span>
          <span className="badge">{t("featureLhdn")}</span>
          <span className="badge">{t("featureBilingual")}</span>
        </div>

        <h2 className="page-title" style={{ marginBottom: "0.5rem" }}>
          {t("chooseBusiness")}
        </h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: "1.75rem", maxWidth: 640 }}>
          {t("chooseBusinessHint")}
        </p>

        <div className="stack" style={{ gap: "2rem" }}>
          {GROUPS.map((group) => {
            const niches = nichesInGroup(group.id);
            if (!niches.length) return null;
            return (
              <div key={group.id}>
                <h3
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.95rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  {t(group.labelKey as "groupCare")}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "0.85rem",
                  }}
                >
                  {niches.map((niche) => {
                    const Icon = ICONS[niche];
                    return (
                      <Link
                        key={niche}
                        href={`/register?niche=${niche}`}
                        className="surface"
                        data-niche={nicheThemeAttr(niche)}
                        style={{ padding: "1.15rem", display: "block" }}
                      >
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: "var(--accent-soft)",
                            color: "var(--accent-ink)",
                            display: "grid",
                            placeItems: "center",
                            marginBottom: "0.85rem",
                          }}
                        >
                          <Icon size={20} />
                        </div>
                        <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>
                          {t(TITLE_KEYS[niche] as "clinicTitle")}
                        </h4>
                        <p className="muted" style={{ margin: 0, lineHeight: 1.45, fontSize: "0.92rem" }}>
                          {t(DESC_KEYS[niche] as "clinicDesc")}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "2.5rem" }}>
          <Link href="/register" className="btn btn-primary">
            {t("ctaStart")}
          </Link>
        </div>
      </section>
    </div>
  );
}
