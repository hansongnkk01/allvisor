import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { ActionForm } from "@/components/ActionForm";
import { createMembershipAction } from "@/app/niche-actions";
import {
  freezeMembershipAction,
  renewMembershipAction,
} from "@/app/pipeline-actions";
import { MEMBERSHIP_STATUSES } from "@/lib/status-pipelines";
import { membershipRenewMsg } from "@/lib/whatsapp";
import { WhatsAppCopyButton } from "@/components/WhatsAppCopyButton";
import { createClient } from "@/lib/supabase/server";

function computeMembershipStatus(row: {
  status?: string | null;
  ends_on?: string | null;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  if (row.status === "cancelled" || row.status === "frozen") return row.status;
  if (row.ends_on && row.ends_on < today) return "expired";
  if (row.ends_on) {
    const ends = new Date(row.ends_on);
    const limit = new Date();
    limit.setDate(limit.getDate() + 14);
    if (ends.getTime() <= limit.getTime() && row.ends_on >= today) return "expiring";
  }
  return row.status || "active";
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "memberships");
  const supabase = await createClient();

  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase
      .from("gym_memberships")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));
  const enriched = (rows || []).map((row) => ({
    ...row,
    boardStatus: computeMembershipStatus(row),
    customer: row.customer_id ? customerMap.get(row.customer_id) : null,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Memberships"
        subtitle="Active / expiring / frozen. Renew or freeze from each card."
      />
      <PipelineCreateForm
        action={createMembershipAction}
        fields={[
          {
            name: "customer_id",
            label: "Member",
            type: "select",
            required: true,
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "plan_name", label: "Plan", required: true },
          { name: "starts_on", label: "Starts", type: "date" },
          { name: "ends_on", label: "Ends", type: "date" },
        ]}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          alignItems: "start",
        }}
      >
        {MEMBERSHIP_STATUSES.map((status) => {
          const cards = enriched.filter((r) => r.boardStatus === status.value);
          return (
            <div key={status.value} className="surface" style={{ padding: "0.75rem", minHeight: 160 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <strong style={{ fontSize: "0.9rem" }}>{status.label}</strong>
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  {cards.length}
                </span>
              </div>
              <div className="stack" style={{ gap: "0.5rem" }}>
                {cards.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      padding: "0.65rem 0.7rem",
                      background:
                        status.value === "expiring" || status.value === "expired"
                          ? "rgba(185,28,28,0.06)"
                          : "rgba(255,255,255,0.7)",
                    }}
                  >
                    <div style={{ fontWeight: 650, fontSize: "0.9rem" }}>
                      {row.customer?.name || "Member"}
                    </div>
                    <div className="muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                      {[row.plan_name, row.ends_on ? `Ends ${row.ends_on}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {row.freeze_reason ? (
                      <div className="muted" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                        {row.freeze_reason}
                        {row.frozen_until ? ` · until ${row.frozen_until}` : ""}
                      </div>
                    ) : null}
                    <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                      <ActionForm action={renewMembershipAction} className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          name="days"
                          className="input"
                          type="number"
                          defaultValue={30}
                          style={{ width: 72 }}
                          aria-label="Renew days"
                        />
                        <button type="submit" className="btn btn-soft" style={{ fontSize: "0.8rem" }}>
                          Renew
                        </button>
                      </ActionForm>
                      {status.value !== "frozen" ? (
                        <ActionForm action={freezeMembershipAction} className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            name="reason"
                            className="input"
                            placeholder="Reason"
                            defaultValue="Paused"
                            style={{ minWidth: 90, flex: 1 }}
                          />
                          <input name="frozen_until" className="input" type="date" style={{ width: 130 }} />
                          <button type="submit" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
                            Freeze
                          </button>
                        </ActionForm>
                      ) : null}
                      {status.value === "expiring" && row.ends_on && row.customer ? (
                        <WhatsAppCopyButton
                          phone={row.customer.phone}
                          message={membershipRenewMsg(ctx.organization.name, row.ends_on)}
                          label="WA renew"
                          className="btn btn-ghost"
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
                {!cards.length ? (
                  <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                    No members
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
