"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";
import { HvcoForm } from "@/components/HvcoForm";
import { Reveal } from "@/components/Reveal";
import { Check, FileText, ListChecks, Table2, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Pricing is placeholder while the real plans are decided. Swap the amounts and
 * the plan copy before this goes in front of paying prospects.
 */
const PLANS = [
  { id: "management", price: "99", featured: false, features: 5 },
  { id: "growth", price: "199", featured: true, features: 6 },
  { id: "full", price: "349", featured: false, features: 6 },
] as const;

/** Placeholder social proof. Replace with real, named customers before launch. */
const VOICES = ["v1", "v2", "v3"] as const;

const AGITATE = [1, 2, 3, 4, 5] as const;
const EDU = [1, 2, 3, 4] as const;
const BULLETS = [1, 2, 3, 4, 5, 6] as const;
const STACK = [1, 2, 3, 4, 5] as const;
const FAQS = [1, 2, 3, 4, 5, 6] as const;

export function StartLandingClient() {
  const t = useTranslations("StartLanding");

  return (
    <div className="sl-shell">
      <header className="sl-nav">
        <Link href="/" aria-label="Allvisor" className="sl-nav__brand">
          <BrandLogo size="nav" />
        </Link>
        <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
          <LanguageSwitcher />
          <a href="#playbook" className="btn btn-primary sl-nav__cta">
            {t("navGet")}
          </a>
        </div>
      </header>

      {/* ── Above the fold: one job, sell the opt-in ── */}
      <section className="sl-hero">
        <div className="sl-hero__inner">
          <div className="sl-hero__copy">
            <p className="sl-warning">{t("warning")}</p>
            <h1 className="sl-hero__title">{t("hookTitle")}</h1>
            <p className="sl-hero__curiosity">{t("hookCuriosity")}</p>
            <p className="sl-hero__sub">{t("hookSub")}</p>
            <ul className="sl-hero__marks">
              <li>{t("heroMark1")}</li>
              <li>{t("heroMark2")}</li>
              <li>{t("heroMark3")}</li>
            </ul>
          </div>

          <div className="sl-hero__card" id="get">
            <div className="sl-mock" aria-hidden>
              <span className="sl-mock__tag">{t("mockTag")}</span>
              <span className="sl-mock__title">{t("mockTitle")}</span>
              <span className="sl-mock__lines">
                <i />
                <i />
                <i />
              </span>
              <span className="sl-mock__foot">{t("mockFoot")}</span>
            </div>
            <h2 className="sl-hero__cardTitle">{t("formTitle")}</h2>
            <p className="sl-hero__cardHint">{t("formHint")}</p>
            <HvcoForm source="hvco_start_hero" />
            <p className="sl-hero__privacy">{t("formPrivacy")}</p>
          </div>
        </div>
      </section>

      <article className="sl-body">
        {/* Kills the "what's the catch" question before it forms. */}
        <Reveal>
          <aside className="sl-why">
            <h2>{t("whyBoxTitle")}</h2>
            <p>{t("whyBoxBody")}</p>
          </aside>
        </Reveal>

        <Reveal>
          <h2 className="sl-h2">{t("problemTitle")}</h2>
          <p className="sl-lead">{t("problemBody")}</p>
          <p className="sl-p">{t("problemBody2")}</p>
        </Reveal>

        <Reveal>
          <h2 className="sl-h2">{t("agitateTitle")}</h2>
          <ul className="sl-cost">
            {AGITATE.map((n) => (
              <li key={n}>
                <span className="sl-cost__mark" aria-hidden />
                <span>
                  <strong>{t(`agitate${n}T` as "agitate1T")}</strong>
                  {t(`agitate${n}B` as "agitate1B")}
                </span>
              </li>
            ))}
          </ul>
          <p className="sl-p sl-p--tight">{t("agitateClose")}</p>
        </Reveal>

        <Reveal>
          <h2 className="sl-h2">{t("eduTitle")}</h2>
          <div className="sl-edu">
            {EDU.map((n) => (
              <div key={n} className="sl-edu__item">
                <span className="sl-edu__num" aria-hidden>
                  {n}
                </span>
                <div>
                  <h3>{t(`edu${n}Title` as "edu1Title")}</h3>
                  <p>{t(`edu${n}Body` as "edu1Body")}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Primary conversion for cold traffic ── */}
        <Reveal>
          <section id="playbook" className="sl-hvco">
            <div className="sl-hvco__copy">
              <p className="sl-kicker">{t("hvcoTitle")}</p>
              <h2 className="sl-hvco__name">{t("hvcoName")}</h2>
              <p className="sl-hvco__desc">{t("hvcoDesc")}</p>
              <ul className="sl-fascinate">
                {BULLETS.map((n) => (
                  <li key={n}>
                    <Check size={15} aria-hidden />
                    {t(`hvcoBullet${n}` as "hvcoBullet1")}
                  </li>
                ))}
              </ul>
              <div className="sl-spec">
                <span>
                  <FileText size={15} aria-hidden />
                  {t("spec1")}
                </span>
                <span>
                  <ListChecks size={15} aria-hidden />
                  {t("spec2")}
                </span>
                <span>
                  <Table2 size={15} aria-hidden />
                  {t("spec3")}
                </span>
              </div>
            </div>
            <div className="sl-hvco__form">
              <h3>{t("formTitle")}</h3>
              <p>{t("formHint")}</p>
              <HvcoForm source="hvco_start_mid" />
              <p className="sl-hero__privacy">{t("formPrivacy")}</p>
            </div>
          </section>
        </Reveal>

        {/* ── From here the page speaks to warmer traffic ── */}
        <Reveal>
          <div className="sl-turn">
            <p className="sl-kicker">{t("offerTitle")}</p>
            <h2 className="sl-h2 sl-h2--big">{t("offerHeadline")}</h2>
            <p className="sl-lead">{t("offerBody")}</p>
            <p className="sl-p">{t("offerBody2")}</p>
          </div>
        </Reveal>

        <Reveal>
          <h2 className="sl-h2">{t("stackTitle")}</h2>
          <div className="sl-stack">
            {STACK.map((n) => (
              <div key={n} className="sl-stack__row">
                <div className="sl-stack__f">{t(`stack${n}F` as "stack1F")}</div>
                <div className="sl-stack__b">{t(`stack${n}B` as "stack1B")}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <section className="sl-pricing">
            <p className="sl-kicker">{t("priceKicker")}</p>
            <h2 className="sl-h2 sl-h2--big">{t("priceTitle")}</h2>
            <p className="sl-lead">{t("priceLead")}</p>

            <div className="sl-plans">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="sl-plan"
                  data-featured={plan.featured ? "true" : undefined}
                >
                  {plan.featured ? (
                    <span className="sl-plan__flag">{t("planPopular")}</span>
                  ) : null}
                  <h3>{t(`plan_${plan.id}_name` as "plan_management_name")}</h3>
                  <p className="sl-plan__for">
                    {t(`plan_${plan.id}_for` as "plan_management_for")}
                  </p>
                  <p className="sl-plan__price">
                    <span className="sl-plan__cur">{t("priceCurrency")}</span>
                    {plan.price}
                    <span className="sl-plan__per">{t("pricePer")}</span>
                  </p>
                  <ul className="sl-plan__list">
                    {Array.from({ length: plan.features }, (_, i) => i + 1).map((i) => (
                      <li key={i}>
                        <Check size={14} aria-hidden />
                        {t(`plan_${plan.id}_f${i}` as "plan_management_f1")}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className={plan.featured ? "btn btn-primary" : "btn btn-soft"}>
                    {t("planCta")}
                  </Link>
                </div>
              ))}
            </div>
            <p className="sl-plans__note">{t("priceNote")}</p>
          </section>
        </Reveal>

        <Reveal>
          <section className="sl-risk">
            <span className="sl-risk__icon" aria-hidden>
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2>{t("riskTitle")}</h2>
              <p>{t("riskBody")}</p>
              <ul>
                <li>{t("risk1")}</li>
                <li>{t("risk2")}</li>
                <li>{t("risk3")}</li>
              </ul>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <h2 className="sl-h2">{t("proofTitle")}</h2>
          <p className="sl-note">{t("proofNote")}</p>
          <div className="sl-voices">
            {VOICES.map((v) => (
              <blockquote key={v} className="sl-voice" data-placeholder="true">
                <p>{t(`${v}Quote` as "v1Quote")}</p>
                <cite>
                  <strong>{t(`${v}Name` as "v1Name")}</strong>
                  {t(`${v}Biz` as "v1Biz")}
                </cite>
              </blockquote>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <h2 className="sl-h2">{t("faqTitle")}</h2>
          <div className="sl-faq">
            {FAQS.map((n) => (
              <details key={n} className="sl-faq__item">
                <summary>{t(`faq${n}Q` as "faq1Q")}</summary>
                <p>{t(`faq${n}A` as "faq1A")}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal>
          <section className="sl-final">
            <h2>{t("finalTitle")}</h2>
            <p>{t("finalBody")}</p>
            <div className="sl-final__grid">
              <div className="sl-final__card">
                <p className="sl-final__label">{t("finalColdLabel")}</p>
                <HvcoForm source="hvco_start_final" />
              </div>
              <div className="sl-final__card sl-final__card--warm">
                <p className="sl-final__label">{t("finalWarmLabel")}</p>
                <p className="sl-final__warmBody">{t("finalWarmBody")}</p>
                <Link href="/register" className="btn btn-primary">
                  {t("finalTrial")}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <p className="sl-ps">
              <strong>{t("psLabel")}</strong> {t("psBody")}
            </p>
          </section>
        </Reveal>
      </article>
    </div>
  );
}
