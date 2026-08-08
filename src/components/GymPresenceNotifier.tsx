"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ackWalkInSessionAction,
  gymPresenceSnapshotAction,
} from "@/app/gym-actions";

type PopupItem = {
  key: string;
  kind: "walkin" | "membership";
  name: string;
  detail: string;
  walkInId?: string;
};

const SEEN_KEY = "gym-presence-seen";

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
  } catch {
    // storage full/blocked — popups simply reappear next poll
  }
}

/**
 * Bottom-right popup stack for the gym: fires when a walk-in's paid time runs
 * out or a member's membership expires. Polls the server; a per-device seen
 * list in localStorage means each device pops every alert exactly once.
 */
export function GymPresenceNotifier() {
  const t = useTranslations("Gym");
  const [items, setItems] = useState<PopupItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const snap = await gymPresenceSnapshotAction();
      if (cancelled || snap.error) return;

      const seen = loadSeen();
      const fresh: PopupItem[] = [];

      for (const w of snap.expiredWalkIns) {
        const key = `w:${w.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fresh.push({
          key,
          kind: "walkin",
          name: w.customer_name,
          detail: `RM ${Number(w.amount).toFixed(2)} · ${Math.round(w.minutes / 60 * 10) / 10}h · ${new Date(w.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          walkInId: w.id,
        });
      }
      for (const m of snap.expiredMemberships) {
        const key = `m:${m.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fresh.push({
          key,
          kind: "membership",
          name: m.customer_name,
          detail: `${m.plan_name}${m.ends_on ? ` · ${m.ends_on}` : ""}`,
        });
      }

      if (fresh.length > 0) {
        saveSeen(seen);
        setItems((prev) => [...prev, ...fresh].slice(-5));
      }
    };

    void poll();
    const id = setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (items.length === 0) return null;

  const dismiss = (key: string) =>
    setItems((prev) => prev.filter((item) => item.key !== key));

  return (
    <div
      style={{
        position: "fixed",
        right: "1.1rem",
        bottom: "5rem",
        zIndex: 65,
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
        width: "min(340px, calc(100vw - 2rem))",
      }}
      role="alert"
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="surface"
          style={{
            padding: "0.85rem 1rem",
            borderLeft: `3px solid ${item.kind === "walkin" ? "var(--danger, #dc2626)" : "var(--warning, #d97706)"}`,
            boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <strong style={{ fontSize: "0.9rem" }}>
              {item.kind === "walkin" ? t("notifyWalkInTitle") : t("notifyMembershipTitle")}
            </strong>
            <button
              type="button"
              onClick={() => dismiss(item.key)}
              className="btn btn-ghost"
              style={{ padding: "0 0.35rem", lineHeight: 1 }}
              aria-label={t("notifyDismiss")}
            >
              ×
            </button>
          </div>
          <div style={{ marginTop: "0.2rem" }}>
            <strong>{item.name}</strong>{" "}
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {item.detail}
            </span>
          </div>
          {item.walkInId ? (
            <button
              type="button"
              className="btn btn-soft"
              style={{ marginTop: "0.5rem", padding: "0.25rem 0.75rem", fontSize: "0.85rem" }}
              onClick={async () => {
                await ackWalkInSessionAction(item.walkInId!);
                dismiss(item.key);
              }}
            >
              {t("walkInAck")}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
