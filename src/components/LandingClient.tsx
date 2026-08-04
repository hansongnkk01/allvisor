"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
import { isNiche } from "@/lib/niches";
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

function readCookieNiche(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)allvisor_niche=([^;]+)/);
  const value = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return value && isNiche(value) ? value : undefined;
}

export function LandingClient() {
  const t = useTranslations("Landing");
  const brand = useTranslations("Brand");
  const [preview, setPreview] = useState<Niche | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.landing = "true";

    if (preview) {
      html.dataset.niche = nicheThemeAttr(preview);
      html.dataset.landingPreview = "true";
    } else {
      const cookieNiche = readCookieNiche();
      if (cookieNiche) html.dataset.niche = nicheThemeAttr(cookieNiche);
      else delete html.dataset.niche;
      delete html.dataset.landingPreview;
    }

    return () => {
      html.dataset.landing = "";
      delete html.dataset.landing;
      delete html.dataset.landingPreview;
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  function enterNiche(niche: Niche) {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setPreview(niche);
  }

  function leaveNiche() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setPreview(null), 140);
  }

  return (
    <div
      className="landing-shell"
      data-niche={preview ? nicheThemeAttr(preview) : undefined}
      data-landing-preview={preview ? "true" : undefined}
    >
      <header
        className="row landing-header"
        style={{
          justifyContent: "space-between",
          padding: "1.25rem clamp(1rem, 4vw, 3rem)",
        }}
      >
        <div className="display landing-brand" style={{ fontSize: "1.8rem" }}>
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
        <p className="muted landing-fade" style={{ marginBottom: "0.75rem" }}>
          {brand("tagline")}
        </p>
        <h1
          className="display landing-hero-title"
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
          className="muted landing-fade"
          style={{
            fontSize: "1.1rem",
            maxWidth: 680,
            lineHeight: 1.6,
            marginBottom: "1.75rem",
          }}
        >
          {t("heroSubtitle")}
        </p>

        <div className="row landing-fade" style={{ marginBottom: "2.5rem", flexWrap: "wrap" }}>
          <span className="badge">{t("featureCrm")}</span>
          <span className="badge">{t("featureBilling")}</span>
          <span className="badge">{t("featureLhdn")}</span>
          <span className="badge">{t("featureBilingual")}</span>
        </div>

        <h2 className="page-title landing-fade" style={{ marginBottom: "0.5rem" }}>
          {t("chooseBusiness")}
        </h2>
        <p className="muted landing-fade" style={{ marginTop: 0, marginBottom: "1.75rem", maxWidth: 640 }}>
          {t("chooseBusinessHint")}
        </p>

        <div className="stack" style={{ gap: "2rem" }}>
          {GROUPS.map((group) => {
            const niches = nichesInGroup(group.id);
            if (!niches.length) return null;
            return (
              <div key={group.id}>
                <h3
                  className="landing-fade"
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
                    const active = preview === niche;
                    return (
                      <Link
                        key={niche}
                        href={`/register?niche=${niche}`}
                        className="surface landing-niche-card"
                        data-niche={nicheThemeAttr(niche)}
                        data-previewed={active ? "true" : undefined}
                        onMouseEnter={() => enterNiche(niche)}
                        onMouseLeave={leaveNiche}
                        onFocus={() => enterNiche(niche)}
                        onBlur={leaveNiche}
                      >
                        <div className="landing-niche-icon">
                          <Icon size={20} />
                        </div>
                        <h4 className="landing-niche-title">{t(TITLE_KEYS[niche] as "clinicTitle")}</h4>
                        <p className="muted landing-niche-desc">
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

        <div className="landing-fade" style={{ marginTop: "2.5rem" }}>
          <Link href="/register" className="btn btn-primary">
            {t("ctaStart")}
          </Link>
        </div>
      </section>
    </div>
  );
}
