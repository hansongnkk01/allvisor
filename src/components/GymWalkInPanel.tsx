"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/ActionForm";
import {
  ackWalkInSessionAction,
  createWalkInSessionAction,
  gymPresenceSnapshotAction,
  type GymPresenceSnapshot,
  type WalkInPackage,
} from "@/app/gym-actions";
import { formatCurrency } from "@/lib/utils";

function formatRemaining(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatClock(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "ms" ? "ms-MY" : "en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GymWalkInPanel({
  initial,
  packages,
  locale,
}: {
  initial: GymPresenceSnapshot;
  packages: WalkInPackage[];
  locale: string;
}) {
  const t = useTranslations("Gym");
  const [snapshot, setSnapshot] = useState(initial);
  const [packageId, setPackageId] = useState(packages[0]?.id || "");
  // null until the first client tick — keeps server and first client render identical.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const next = await gymPresenceSnapshotAction();
      if (!cancelled && !next.error) setSnapshot(next);
    };
    const id = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const selected = packages.find((p) => p.id === packageId) || null;
  const expiryPreview =
    selected && now !== null ? new Date(now + selected.minutes * 60_000) : null;

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{t("walkInTitle")}</h3>
      <p className="muted" style={{ marginTop: "-0.35rem" }}>
        {t("walkInSubtitle")}
      </p>

      {packages.length === 0 ? (
        <p className="muted">{t("walkInNoPackages")}</p>
      ) : (
        <ActionForm action={createWalkInSessionAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "0.75rem",
              alignItems: "end",
            }}
          >
            <label className="stack" style={{ gap: "0.25rem" }}>
              <span className="muted">{t("walkInName")}</span>
              <input name="customer_name" required maxLength={80} placeholder="Ali bin Abu" />
            </label>
            <label className="stack" style={{ gap: "0.25rem" }}>
              <span className="muted">{t("walkInIc")}</span>
              <input name="ic_number" required maxLength={20} placeholder="900101-14-1234" />
            </label>
            <label className="stack" style={{ gap: "0.25rem" }}>
              <span className="muted">{t("walkInAddress")}</span>
              <input name="address" required maxLength={300} placeholder="Taman ..." />
            </label>
            <label className="stack" style={{ gap: "0.25rem" }}>
              <span className="muted">{t("walkInPackage")}</span>
              <select
                name="package_id"
                className="select"
                required
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatCurrency(Number(p.price))} · {formatRemaining(p.minutes * 60_000)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              {t("walkInSubmit")}
            </button>
          </div>
          {selected ? (
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              {t("walkInDuration")}: <strong>{formatRemaining(selected.minutes * 60_000)}</strong>
              {" · "}
              {formatCurrency(Number(selected.price))}
              {expiryPreview
                ? ` · ${t("walkInExpiresAt")} ${formatClock(expiryPreview.toISOString(), locale)}`
                : ""}
            </p>
          ) : null}
        </ActionForm>
      )}

      {snapshot.activeWalkIns.length > 0 ? (
        <div className="stack" style={{ gap: "0.5rem", marginTop: "1rem" }}>
          <strong>{t("walkInActive")}</strong>
          {snapshot.activeWalkIns.map((s) => {
            const remaining = now !== null ? new Date(s.expires_at).getTime() - now : null;
            return (
              <div
                key={s.id}
                className="surface-soft"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.85rem",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <strong>{s.customer_name}</strong>{" "}
                  <span className="muted">
                    {s.package_name ? `${s.package_name} · ` : ""}RM {Number(s.amount).toFixed(2)} · {formatRemaining(s.minutes * 60_000)}
                  </span>
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {remaining !== null ? (
                    <>
                      {formatRemaining(remaining)}{" "}
                      <span className="muted">
                        · {t("walkInExpiresAt")} {formatClock(s.expires_at, locale)}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted" style={{ marginTop: "1rem" }}>
          {t("walkInNone")}
        </p>
      )}

      {snapshot.expiredWalkIns.length > 0 ? (
        <div className="stack" style={{ gap: "0.5rem", marginTop: "1rem" }}>
          <strong style={{ color: "var(--danger, #dc2626)" }}>{t("walkInExpired")}</strong>
          {snapshot.expiredWalkIns.map((s) => (
            <div
              key={s.id}
              className="surface-soft"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.85rem",
                flexWrap: "wrap",
                borderLeft: "3px solid var(--danger, #dc2626)",
              }}
            >
              <span>
                <strong>{s.customer_name}</strong>{" "}
                <span className="muted">
                  {t("walkInExpiredAt")} {formatClock(s.expires_at, locale)}
                </span>
              </span>
              <form
                action={async () => {
                  await ackWalkInSessionAction(s.id);
                  const next = await gymPresenceSnapshotAction();
                  if (!next.error) setSnapshot(next);
                }}
              >
                <button type="submit" className="btn btn-soft">
                  {t("walkInAck")}
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

