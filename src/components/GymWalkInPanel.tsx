"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/ActionForm";
import {
  ackWalkInSessionAction,
  createWalkInSessionAction,
  gymPresenceSnapshotAction,
  type GymPresenceSnapshot,
} from "@/app/gym-actions";

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
  locale,
}: {
  initial: GymPresenceSnapshot;
  locale: string;
}) {
  const t = useTranslations("Gym");
  const [snapshot, setSnapshot] = useState(initial);
  const [amount, setAmount] = useState("1");
  const [rate, setRate] = useState("60");
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

  const amountNum = Number(amount) || 0;
  const rateNum = Number(rate) || 60;
  const minutes = Math.max(1, Math.round(amountNum * rateNum));
  const expiryPreview = now !== null ? new Date(now + minutes * 60_000) : null;

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{t("walkInTitle")}</h3>
      <p className="muted" style={{ marginTop: "-0.35rem" }}>
        {t("walkInSubtitle")}
      </p>

      <ActionForm action={createWalkInSessionAction} className="stack">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "0.75rem",
            alignItems: "end",
          }}
        >
          <label className="stack" style={{ gap: "0.25rem" }}>
            <span className="muted">{t("walkInName")}</span>
            <input name="customer_name" required maxLength={80} placeholder="Ali" />
          </label>
          <label className="stack" style={{ gap: "0.25rem" }}>
            <span className="muted">{t("walkInAmount")}</span>
            <input
              name="amount"
              type="number"
              min="0.5"
              step="0.5"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="stack" style={{ gap: "0.25rem" }}>
            <span className="muted">{t("walkInRate")}</span>
            <input
              name="minutes_per_rm"
              type="number"
              min="1"
              max="1440"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            {t("walkInSubmit")}
          </button>
        </div>
        <p className="muted" style={{ margin: "0.5rem 0 0" }}>
          {t("walkInDuration")}: <strong>{formatRemaining(minutes * 60_000)}</strong>
          {expiryPreview
            ? ` · ${t("walkInExpiresAt")} ${formatClock(expiryPreview.toISOString(), locale)}`
            : ""}
        </p>
      </ActionForm>

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
                    RM {Number(s.amount).toFixed(2)} · {formatRemaining(s.minutes * 60_000)}
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
