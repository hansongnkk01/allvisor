"use client";

import { useTranslations } from "next-intl";
import {
  ShieldAlert,
  Gauge,
  PackageSearch,
  Sparkles,
  Check,
  X,
  CreditCard,
  Lock,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/Reveal";

/**
 * The dark centrepiece of the homepage: what the operator gets watching the shop
 * when they are not in it. Every line here maps to something the dashboard
 * already computes.
 */
export function HomeAiBand() {
  const t = useTranslations("Home");

  const capabilities: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: ShieldAlert, title: t("aiCap1T"), body: t("aiCap1B") },
    { icon: Gauge, title: t("aiCap2T"), body: t("aiCap2B") },
    { icon: PackageSearch, title: t("aiCap3T"), body: t("aiCap3B") },
    { icon: Sparkles, title: t("aiCap4T"), body: t("aiCap4B") },
  ];

  const briefing: Array<{ tone: "alert" | "watch" | "good"; chip: string; text: string }> = [
    { tone: "alert", chip: t("aiChipAct"), text: t("aiLine1") },
    { tone: "watch", chip: t("aiChipWatch"), text: t("aiLine2") },
    { tone: "good", chip: t("aiChipGood"), text: t("aiLine3") },
  ];

  return (
    <section className="home-band home-band--ai">
      <div className="home-band__inner home-ai">
        <Reveal className="home-ai__copy">
          <p className="home-band__label home-ai__label">
            <span className="home-ai__pulse" aria-hidden />
            {t("aiLabel")}
          </p>
          <h2 className="home-ai__title">{t("aiTitle")}</h2>
          <p className="home-ai__lead">{t("aiLead")}</p>

          <ul className="home-ai__list">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <li key={title} className="home-ai__item">
                <span className="home-ai__icon" aria-hidden>
                  <Icon size={17} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="home-ai__cta">
            <Link href="/register" className="btn btn-primary">
              {t("aiCta")}
            </Link>
            <span className="home-ai__note">{t("aiNote")}</span>
          </div>
        </Reveal>

        <Reveal delay={120} className="home-ai__side">
          <figure className="home-console">
            <figcaption className="home-console__bar">
              <span className="home-console__dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="home-console__title">{t("aiConsoleTitle")}</span>
            </figcaption>
            <div className="home-console__body">
              {briefing.map((line) => (
                <p key={line.text} className="home-console__line" data-tone={line.tone}>
                  <span className="home-console__chip">{line.chip}</span>
                  {line.text}
                </p>
              ))}
              <p className="home-console__foot">{t("aiConsoleFoot")}</p>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/** The cost of the status quo, next to the version of the day they could have. */
export function HomeCompareBand() {
  const t = useTranslations("Home");
  const before = [t("cmpB1"), t("cmpB2"), t("cmpB3"), t("cmpB4")];
  const after = [t("cmpA1"), t("cmpA2"), t("cmpA3"), t("cmpA4")];

  return (
    <section className="home-band home-band--compare">
      <div className="home-band__inner">
        <Reveal>
          <p className="home-band__label">{t("cmpLabel")}</p>
          <h2 className="home-section__title">{t("cmpTitle")}</h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="home-compare">
            <div className="home-compare__col home-compare__col--before">
              <h3>{t("cmpBeforeTitle")}</h3>
              <ul>
                {before.map((line) => (
                  <li key={line}>
                    <X size={15} aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className="home-compare__col home-compare__col--after">
              <h3>{t("cmpAfterTitle")}</h3>
              <ul>
                {after.map((line) => (
                  <li key={line}>
                    <Check size={15} aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Removes the last three reasons to close the tab. */
export function HomeAssuranceBand() {
  const t = useTranslations("Home");
  const cards: Array<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: CreditCard, title: t("assure1T"), body: t("assure1B") },
    { icon: Lock, title: t("assure2T"), body: t("assure2B") },
    { icon: Timer, title: t("assure3T"), body: t("assure3B") },
  ];

  return (
    <section className="home-band home-band--assure">
      <div className="home-band__inner">
        <Reveal>
          <p className="home-band__label">{t("assureLabel")}</p>
          <h2 className="home-section__title">{t("assureTitle")}</h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="home-assure">
            {cards.map(({ icon: Icon, title, body }) => (
              <div key={title} className="home-assure__card">
                <span className="home-assure__icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
