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
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { CollaboratorsMarquee } from "@/components/CollaboratorsMarquee";
import { HomeDashboardPreview } from "@/components/HomeDashboardPreview";
import {
  HomeAiBand,
  HomeAssuranceBand,
  HomeCompareBand,
} from "@/components/HomeSections";
import { Reveal } from "@/components/Reveal";
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

/** Homepage — minimal brand + proof + niche entry. */
export function HomeClient() {
  const t = useTranslations("Home");
  const tAuth = useTranslations("Auth");
  const nichesT = useTranslations("Landing");
  const [preview, setPreview] = useState<Niche | null>(null);
  const [demoNiche, setDemoNiche] = useState<Niche>("clinic");
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nicheGridRef = useRef<HTMLElement | null>(null);
  /** Page chrome: brand "home" by default; niche grid hover only. Demo carousel never drives this. */
  const themeAttr = preview ? nicheThemeAttr(preview) : "home";

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.landing = "true";

    if (preview) {
      html.dataset.niche = nicheThemeAttr(preview);
      html.dataset.landingPreview = "true";
    } else {
      html.dataset.niche = "home";
      delete html.dataset.landingPreview;
    }

    return () => {
      delete html.dataset.landing;
      delete html.dataset.landingPreview;
      if (html.dataset.niche === "home") {
        delete html.dataset.niche;
      }
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
    <div className="home-shell landing-shell">
      <div className="landing-chrome" data-niche={themeAttr}>
        <header className="home-nav">
          <Link href="/" className="home-nav__brand" aria-label="Allvisor">
            <BrandLogo size="nav" />
          </Link>
          <nav className="home-nav__actions">
            <Link href="/start" className="home-nav__link">
              {t("navOffer")}
            </Link>
            <LanguageSwitcher />
            <div className="home-nav__menu">
              {/* Only a trigger: the two links below are the real destinations. */}
              <button
                type="button"
                className="btn btn-ghost home-nav__login"
                aria-haspopup="menu"
              >
                {t("ctaLogin")}
                <ChevronDown size={15} aria-hidden />
              </button>
              <div className="home-nav__dropdown" role="menu">
                <Link href="/staff/login" className="home-nav__dropdown-item" role="menuitem">
                  {tAuth("asStaff")}
                </Link>
                <Link href="/admin/login" className="home-nav__dropdown-item" role="menuitem">
                  {tAuth("asAdmin")}
                </Link>
              </div>
            </div>
            <Link href="/register" className="btn btn-soft home-nav__login">
              {t("ctaSignupOwner")}
            </Link>
          </nav>
        </header>

        <section className="home-hero">
          <div className="home-hero__copy">
            <p className="home-hero__brand">
              <BrandLogo size="hero" />
            </p>
            <p className="home-hero__badge">
              <span className="home-hero__badge-dot" aria-hidden />
              {t("heroBadge")}
            </p>
            <h1 className="home-hero__title">{t("heroTitle")}</h1>
            <p className="home-hero__lead">{t("heroSubtitle")}</p>
            <div className="home-hero__cta">
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
            </div>
            <Link href="/register" className="home-hero__trial">
              {t("ctaStartTrial")}
            </Link>
            <ul className="home-hero__chips">
              {(["heroChip1", "heroChip2", "heroChip3", "heroChip4"] as const).map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
          <div className="home-hero__feature">
            <HomeDashboardPreview niche={demoNiche} onNicheChange={setDemoNiche} />
          </div>
        </section>
      </div>

      <CollaboratorsMarquee />

      <section className="home-band home-band--proof">
        <div className="home-band__inner landing-chrome" data-niche={themeAttr}>
          <p className="home-band__label">{t("proofTitle")}</p>
          <Reveal className="home-proof__grid">
            {(
              [
                ["proofNiches", "proofNichesHint"],
                ["proofLhdn", "proofLhdnHint"],
                ["proofBilingual", "proofBilingualHint"],
                ["proofIsolation", "proofIsolationHint"],
              ] as const
            ).map(([title, hint]) => (
              <div key={title} className="home-proof__item">
                <div className="home-proof__value">{t(title)}</div>
                <div className="home-proof__hint">{t(hint)}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <HomeAiBand />

      <section className="home-band home-band--flow">
        <div className="home-band__inner landing-chrome" data-niche={themeAttr}>
          <p className="home-band__label">{t("flowLabel")}</p>
          <h2 className="home-section__title">{t("flowTitle")}</h2>
          <ol className="home-flow">
            {(
              [
                ["flow1Title", "flow1Body"],
                ["flow2Title", "flow2Body"],
                ["flow3Title", "flow3Body"],
              ] as const
            ).map(([title, body], i) => (
              <li key={title} className="home-flow__step">
                <span className="home-flow__num" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="home-flow__title">{t(title)}</h3>
                  <p className="home-flow__body">{t(body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-band home-band--stack">
        <div className="home-band__inner landing-chrome" data-niche={themeAttr}>
          <p className="home-band__label">{t("stackLabel")}</p>
          <h2 className="home-section__title">{t("stackTitle")}</h2>
          <dl className="home-stack">
            {(
              [
                ["stack1F", "stack1B"],
                ["stack2F", "stack2B"],
                ["stack3F", "stack3B"],
                ["stack4F", "stack4B"],
                ["stack5F", "stack5B"],
              ] as const
            ).map(([feature, benefit]) => (
              <div key={feature} className="home-stack__row">
                <dt>{t(feature)}</dt>
                <dd>{t(benefit)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <HomeCompareBand />

      <section className="home-band home-band--voices">
        <div className="home-band__inner landing-chrome" data-niche={themeAttr}>
          <p className="home-band__label">{t("testimonialNote")}</p>
          <h2 className="home-section__title">{t("voicesTitle")}</h2>
          <div className="home-voices">
            {(
              [
                ["quote1", "quote1By"],
                ["quote2", "quote2By"],
                ["quote3", "quote3By"],
              ] as const
            ).map(([q, by]) => (
              <blockquote key={q} className="home-voice">
                <p>{t(q)}</p>
                <cite>{t(by)}</cite>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section ref={nicheGridRef} id="niches" className="home-band home-band--niches landing-niche-grid">
        <div className="home-band__inner">
          <div className="landing-chrome home-niches__head" data-niche={themeAttr}>
            <p className="home-band__label">{t("nichesLabel")}</p>
            <h2 className="home-niches__title">{t("chooseBusiness")}</h2>
            <p className="home-niches__hint">{t("chooseBusinessHint")}</p>
            <Link href="/start" className="home-niches__unsure">
              {t("unsureBanner")}
            </Link>
          </div>

          <div className="home-niches__groups">
            {GROUPS.map((group) => {
              const list = nichesInGroup(group.id);
              if (!list.length) return null;
              return (
                <div key={group.id} className="home-niche-group">
                  <h3 className="landing-chrome home-niche-group__label" data-niche={themeAttr}>
                    {nichesT(group.labelKey as "groupCare")}
                  </h3>
                  <div className="landing-niche-cards home-niche-group__grid">
                    {list.map((niche) => {
                      const Icon = ICONS[niche];
                      const active = preview === niche;
                      return (
                        <Link
                          key={niche}
                          href={`/register?niche=${niche}`}
                          className="landing-niche-card"
                          data-niche={nicheThemeAttr(niche)}
                          data-previewed={active ? "true" : undefined}
                          onMouseEnter={() => enterNiche(niche)}
                          onMouseLeave={leaveNiche}
                          onFocus={() => enterNiche(niche)}
                          onBlur={leaveNiche}
                        >
                          <div className="landing-niche-icon">
                            <Icon size={18} />
                          </div>
                          <h4 className="landing-niche-title">
                            {nichesT(TITLE_KEYS[niche] as "clinicTitle")}
                          </h4>
                          <p className="muted landing-niche-desc">
                            {nichesT(DESC_KEYS[niche] as "clinicDesc")}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <HomeAssuranceBand />

      <section className="home-band home-band--faq">
        <div className="home-band__inner landing-chrome" data-niche={themeAttr}>
          <p className="home-band__label">{t("faqLabel")}</p>
          <h2 className="home-section__title">{t("faqTitle")}</h2>
          <div className="home-faq">
            {(
              [
                ["faq1Q", "faq1A"],
                ["faq2Q", "faq2A"],
                ["faq3Q", "faq3A"],
                ["faq4Q", "faq4A"],
                ["faq5Q", "faq5A"],
                ["faq6Q", "faq6A"],
              ] as const
            ).map(([q, a]) => (
              <details key={q} className="home-faq__item">
                <summary>{t(q)}</summary>
                <p>{t(a)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-band home-band--bridge">
        <div className="home-band__inner landing-chrome home-bridge" data-niche={themeAttr}>
          <div className="home-bridge__copy">
            <h2 className="home-section__title">{t("bridgeTitle")}</h2>
            <p className="home-bridge__body">{t("bridgeBody")}</p>
          </div>
          <div className="home-bridge__cta">
            <Link href="/start" className="btn btn-primary">
              {t("bridgeCta")}
            </Link>
            <Link href="/register" className="btn btn-ghost">
              {t("bridgeTrial")}
            </Link>
          </div>
        </div>
      </section>

      <footer className="home-footer landing-chrome" data-niche={themeAttr}>
        <div className="home-footer__inner">
          <span className="home-footer__brand" aria-label="Allvisor">
            <BrandLogo size="footer" />
          </span>
          <div className="home-footer__cta">
            <Link href="/start" className="btn btn-primary">
              {t("footerOffer")}
            </Link>
            <Link href="/register" className="btn btn-ghost">
              {t("footerTrial")}
            </Link>
          </div>
        </div>
      </footer>

      {/* Phone-only: the trial stays one thumb away no matter how far they scroll. */}
      <div className="home-sticky-cta landing-chrome" data-niche={themeAttr}>
        <Link href="/register" className="btn btn-primary">
          {t("ctaStartTrial")}
        </Link>
        <Link href="/start" className="btn btn-ghost">
          {t("navOffer")}
        </Link>
      </div>
    </div>
  );
}

export const LandingClient = HomeClient;
