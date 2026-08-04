"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
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
  const router = useRouter();
  const [preview, setPreview] = useState<Niche | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  function onHvcoSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("full_name") || "").trim();
    const q = new URLSearchParams();
    if (email) q.set("email", email);
    if (name) q.set("name", name);
    q.set("source", "hvco");
    router.push(`/register?${q.toString()}`);
  }

  return (
    <div className="landing-shell">
      <div className="landing-chrome" data-niche={themeAttr}>
        <header
          className="row landing-header"
          style={{
            justifyContent: "space-between",
            padding: "1.25rem clamp(1rem, 4vw, 3rem)",
            position: "sticky",
            top: 0,
            zIndex: 40,
            backdropFilter: "blur(12px)",
            background: "color-mix(in srgb, var(--bg-elevated) 88%, transparent)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="display landing-brand" style={{ fontSize: "1.55rem" }}>
            {brand("name")}
          </div>
          <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <LanguageSwitcher />
            <a href="#hvco" className="btn btn-soft" style={{ padding: "0.55rem 0.9rem" }}>
              {t("ctaHvco")}
            </a>
            <Link href="/login" className="btn btn-ghost" style={{ padding: "0.55rem 0.9rem" }}>
              {t("ctaLogin")}
            </Link>
          </div>
        </header>

        {/* HVCO headline hero — Sell Like Crazy Phase 2 */}
        <section className="landing-section landing-hero">
          <p className="landing-eyebrow">{t("eyebrow")}</p>
          <h1 className="display landing-hero-title">{t("heroTitle")}</h1>
          <p className="muted landing-lead">{t("heroSubtitle")}</p>
          <div className="row landing-fade" style={{ flexWrap: "wrap", gap: "0.65rem", marginBottom: "1.25rem" }}>
            <a href="#hvco" className="btn btn-primary">
              {t("ctaHvco")}
            </a>
            <a href="#godfather" className="btn btn-ghost">
              {t("ctaSecondary")}
            </a>
            <Link href="/register" className="btn btn-soft">
              {t("ctaStart")}
            </Link>
          </div>
          <p className="muted" style={{ fontSize: "0.9rem", margin: 0 }}>
            {t("proofLine")}
          </p>

          <aside className="landing-why">
            <h2 className="landing-why__title">{t("whyBoxTitle")}</h2>
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
              {t("whyBoxBody")}
            </p>
          </aside>
        </section>

        {/* Dream buyer pain — Phase 1 Halo / hair-on-fire */}
        <section className="landing-section">
          <h2 className="page-title">{t("painTitle")}</h2>
          <ul className="landing-pain-list">
            <li>{t("pain1")}</li>
            <li>{t("pain2")}</li>
            <li>{t("pain3")}</li>
            <li>{t("pain4")}</li>
          </ul>
        </section>

        {/* Perfect bait / HVCO capture — Phase 2 + 3 */}
        <section id="hvco" className="landing-section landing-hvco">
          <p className="landing-eyebrow">{t("hvcoTitle")}</p>
          <h2 className="page-title" style={{ maxWidth: 720 }}>
            {t("hvcoName")}
          </h2>
          <p className="display" style={{ fontSize: "1.35rem", marginTop: 0 }}>
            {t("hvcoHook")}
          </p>
          <p className="muted" style={{ fontWeight: 600 }}>
            {t("hvcoBulletsTitle")}
          </p>
          <ul className="landing-pain-list">
            <li>{t("hvcoB1")}</li>
            <li>{t("hvcoB2")}</li>
            <li>{t("hvcoB3")}</li>
            <li>{t("hvcoB4")}</li>
          </ul>

          <form className="landing-lead-form surface" onSubmit={onHvcoSubmit}>
            <h3 style={{ marginTop: 0 }}>{t("hvcoFormTitle")}</h3>
            <div className="field">
              <label htmlFor="hvco-name">{t("hvcoNameLabel")}</label>
              <input id="hvco-name" name="full_name" className="input" required autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="hvco-email">{t("hvcoEmailLabel")}</label>
              <input id="hvco-email" name="email" type="email" className="input" required autoComplete="email" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              {t("hvcoSubmit")}
            </button>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
              {t("hvcoMicro")}
            </p>
          </form>
        </section>

        {/* Larger Market Formula — educate 97% */}
        <section className="landing-section">
          <h2 className="page-title">{t("educateTitle")}</h2>
          <p className="muted landing-lead">{t("educateBody")}</p>
        </section>

        {/* Godfather Offer — Phase 4 (7 parts) */}
        <section id="godfather" className="landing-section">
          <h2 className="page-title">{t("godfatherTitle")}</h2>
          <div className="landing-offer-stack">
            <article>
              <h3>{t("godfatherRationaleTitle")}</h3>
              <p className="muted">{t("godfatherRationale")}</p>
            </article>
            <article>
              <h3>{t("godfatherValueTitle")}</h3>
              <ul className="landing-pain-list">
                <li>{t("godfatherV1")}</li>
                <li>{t("godfatherV2")}</li>
                <li>{t("godfatherV3")}</li>
                <li>{t("godfatherV4")}</li>
                <li>{t("godfatherV5")}</li>
              </ul>
            </article>
            <article>
              <h3>{t("godfatherPriceTitle")}</h3>
              <p className="muted">{t("godfatherPrice")}</p>
            </article>
            <article>
              <h3>{t("godfatherPayTitle")}</h3>
              <p className="muted">{t("godfatherPay")}</p>
            </article>
            <article>
              <h3>{t("godfatherPremiumTitle")}</h3>
              <ul className="landing-pain-list">
                <li>{t("godfatherP1")}</li>
                <li>{t("godfatherP2")}</li>
                <li>{t("godfatherP3")}</li>
              </ul>
            </article>
            <article className="landing-guarantee">
              <h3>{t("godfatherGuaranteeTitle")}</h3>
              <p style={{ marginBottom: 0, lineHeight: 1.55 }}>{t("godfatherGuarantee")}</p>
            </article>
            <article>
              <h3>{t("godfatherScarcityTitle")}</h3>
              <p className="muted">{t("godfatherScarcity")}</p>
            </article>
          </div>
          <Link href="/register" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
            {t("godfatherCta")}
          </Link>
        </section>

        <section className="landing-section">
          <h2 className="page-title">{t("socialTitle")}</h2>
          <div className="landing-quotes">
            <blockquote>{t("social1")}</blockquote>
            <blockquote>{t("social2")}</blockquote>
            <blockquote>{t("social3")}</blockquote>
          </div>
        </section>

        <section className="landing-section" style={{ paddingBottom: "0.5rem" }}>
          <h2 className="page-title">{t("chooseBusiness")}</h2>
          <p className="muted landing-lead">{t("chooseBusinessHint")}</p>
        </section>
      </div>

      {/* Niche grid — own themes */}
      <section
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
            const niches = nichesInGroup(group.id);
            if (!niches.length) return null;
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
                  {t(group.labelKey as "groupCare")}
                </h3>
                <div
                  className="landing-niche-cards"
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
      </section>

      <div className="landing-chrome" data-niche={themeAttr}>
        {/* Magic Lantern — objections */}
        <section className="landing-section">
          <h2 className="page-title">{t("faqTitle")}</h2>
          <div className="landing-faq">
            {[1, 2, 3, 4, 5].map((n) => (
              <details key={n} className="landing-faq__item">
                <summary>{t(`faq${n}q` as "faq1q")}</summary>
                <p className="muted">{t(`faq${n}a` as "faq1a")}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-section landing-final">
          <h2 className="page-title">{t("finalTitle")}</h2>
          <p className="muted landing-lead">{t("finalBody")}</p>
          <div className="row" style={{ flexWrap: "wrap", gap: "0.65rem" }}>
            <Link href="/register" className="btn btn-primary">
              {t("finalCta")}
            </Link>
            <a href="#hvco" className="btn btn-ghost">
              {t("ctaHvco")}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
