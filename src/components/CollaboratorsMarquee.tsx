"use client";

import { useTranslations } from "next-intl";

/** Platforms Allvisor integrates / collaborates with for e-invoice. */
export const HOME_COLLABORATORS = [
  { id: "lhdn", name: "LHDN", detail: "Lembaga Hasil Dalam Negeri" },
  { id: "myinvois", name: "MyInvois", detail: "National e-Invoice" },
] as const;

export function CollaboratorsMarquee() {
  const t = useTranslations("Home");
  const loop = Array.from({ length: 6 }, () => HOME_COLLABORATORS).flat();

  return (
    <section className="home-band home-band--partners" aria-label={t("partnersTitle")}>
      <div className="home-band__inner home-partners">
        <div className="home-partners__head">
          <p className="home-band__label">{t("partnersLabel")}</p>
          <h2 className="home-partners__title">{t("partnersTitle")}</h2>
          <p className="home-partners__hint">{t("partnersHint")}</p>
        </div>

        <div className="home-partners__viewport">
          <div className="home-partners__fade home-partners__fade--left" aria-hidden />
          <div className="home-partners__fade home-partners__fade--right" aria-hidden />
          <div className="home-partners__track" aria-hidden>
            {loop.map((item, i) => (
              <div key={`${item.id}-${i}`} className="home-partners__logo">
                <span className="home-partners__mark">{item.name}</span>
                <span className="home-partners__detail">{item.detail}</span>
              </div>
            ))}
          </div>
          <ul className="sr-only">
            {HOME_COLLABORATORS.map((item) => (
              <li key={item.id}>
                {item.name} — {item.detail}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
