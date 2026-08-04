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

/** Homepage — brand + social proof + niche entry (not the long-form sales letter). */
export function HomeClient() {
  const t = useTranslations("Home");
  const niches = useTranslations("Landing");
  const brand = useTranslations("Brand");
  const [preview, setPreview] = useState<Niche | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nicheGridRef = useRef<HTMLElement | null>(null);
  const themeAttr = preview ? nicheThemeAttr(preview) : undefined;

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
    leaveTimer.current = setTimeout(() => setPreview(null), 80);
  }

  return (
    <div className="landing-shell">
      <div className="landing-chrome" data-niche={themeAttr}>
        <header
          className="row landing-header"
          style={{
            justifyContent: "space-between",
            padding: "1.25rem clamp(1rem, 4vw, 3rem)",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <div className="display landing-brand" style={{ fontSize: "1.8rem" }}>
            {brand("name")}
          </div>
          <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <Link href="/start" className="btn btn-soft" style={{ padding: "0.55rem 1rem" }}>
              {t("navOffer")}
            </Link>
            <LanguageSwitcher />
            <Link href="/login" className="btn btn-ghost">
              {t("ctaLogin")}
            </Link>
          </div>
        </header>

        <section
          style={{
            padding: "2.5rem clamp(1rem, 4vw, 3rem) 0",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <p className="muted landing-fade" style={{ marginBottom: "0.65rem", fontWeight: 600 }}>
            {t("heroEyebrow")}
          </p>
          <h1
            className="display landing-hero-title"
            style={{
              fontSize: "clamp(2.1rem, 5vw, 3.4rem)",
              lineHeight: 1.08,
              margin: "0 0 1rem",
              maxWidth: 920,
            }}
          >
            {t("heroTitle")}
          </h1>
          <p
            className="muted landing-fade"
            style={{
              fontSize: "1.08rem",
              maxWidth: 720,
              lineHeight: 1.6,
              marginBottom: "1.5rem",
            }}
          >
            {t("heroSubtitle")}
          </p>

          <div className="row landing-fade" style={{ marginBottom: "2rem", flexWrap: "wrap", gap: "0.65rem" }}>
            <Link href="/start" className="btn btn-primary">
              {t("ctaPlaybook")}
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => nicheGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {t("ctaSeeNiches")}
            </button>
            <Link href="/register" className="btn btn-soft">
              {t("ctaStartTrial")}
            </Link>
          </div>

          <div className="surface landing-fade" style={{ padding: "1.25rem 1.35rem", marginBottom: "1.75rem" }}>
            <h2 className="page-title" style={{ marginBottom: "0.85rem", fontSize: "1.15rem" }}>
              {t("proofTitle")}
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {[
                ["proofNiches", "proofNichesHint"],
                ["proofLhdn", "proofLhdnHint"],
                ["proofBilingual", "proofBilingualHint"],
                ["proofIsolation", "proofIsolationHint"],
              ].map(([title, hint]) => (
                <div key={title}>
                  <div style={{ fontWeight: 700 }}>{t(title as "proofNiches")}</div>
                  <div className="muted" style={{ fontSize: "0.88rem", marginTop: "0.2rem" }}>
                    {t(hint as "proofNichesHint")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="muted landing-fade" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
            {t("testimonialNote")}
          </p>
          <div
            className="landing-fade"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.85rem",
              marginBottom: "2rem",
            }}
          >
            {(
              [
                ["quote1", "quote1By"],
                ["quote2", "quote2By"],
                ["quote3", "quote3By"],
              ] as const
            ).map(([q, by]) => (
              <div key={q} className="surface" style={{ padding: "1rem 1.1rem" }}>
                <p style={{ margin: "0 0 0.65rem", lineHeight: 1.5 }}>{t(q)}</p>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {t(by)}
                </p>
              </div>
            ))}
          </div>

          <div className="surface landing-fade" style={{ padding: "1.2rem 1.35rem", marginBottom: "2rem" }}>
            <h3 style={{ margin: "0 0 0.4rem" }}>{t("bridgeTitle")}</h3>
            <p className="muted" style={{ margin: "0 0 0.85rem", lineHeight: 1.5 }}>
              {t("bridgeBody")}
            </p>
            <Link href="/start" className="btn btn-primary">
              {t("ctaPlaybook")}
            </Link>
          </div>

          <h2 className="page-title landing-fade" style={{ marginBottom: "0.5rem" }}>
            {t("chooseBusiness")}
          </h2>
          <p className="muted landing-fade" style={{ marginTop: 0, marginBottom: "0.85rem", maxWidth: 640 }}>
            {t("chooseBusinessHint")}
          </p>
          <p className="landing-fade" style={{ marginBottom: "1.5rem" }}>
            <Link href="/start" style={{ color: "var(--accent-ink)", fontWeight: 600 }}>
              {t("unsureBanner")}
            </Link>
          </p>
        </section>
      </div>

      <section
        ref={nicheGridRef}
        id="niches"
        className="landing-niche-grid"
        style={{
          padding: "0 clamp(1rem, 4vw, 3rem) 2rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="stack" style={{ gap: "2rem" }}>
          {GROUPS.map((group) => {
            const list = nichesInGroup(group.id);
            if (!list.length) return null;
            return (
              <div key={group.id}>
                <h3
                  className="landing-chrome landing-group-label"
                  data-niche={themeAttr}
                  style={{
                    margin: "0 0 0.85rem",
                    fontSize: "0.95rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    fontWeight: 700,
                  }}
                >
                  {niches(group.labelKey as "groupCare")}
                </h3>
                <div
                  className="landing-niche-cards"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "0.85rem",
                  }}
                >
                  {list.map((niche) => {
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
                        <h4 className="landing-niche-title">
                          {niches(TITLE_KEYS[niche] as "clinicTitle")}
                        </h4>
                        <p className="muted landing-niche-desc">
                          {niches(DESC_KEYS[niche] as "clinicDesc")}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer
        className="landing-chrome"
        data-niche={themeAttr}
        style={{
          padding: "0 clamp(1rem, 4vw, 3rem) 3.5rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div className="row landing-fade" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
          <Link href="/start" className="btn btn-primary">
            {t("footerOffer")}
          </Link>
          <Link href="/register" className="btn btn-ghost">
            {t("footerTrial")}
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** @deprecated Use HomeClient — kept for any stale imports */
export const LandingClient = HomeClient;
