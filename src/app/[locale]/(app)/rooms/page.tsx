import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { ActionForm } from "@/components/ActionForm";
import { createHotelRoomAction } from "@/app/niche-actions";
import {
  hotelCheckInAction,
  hotelCheckOutAction,
  updateRoomStatusAction,
} from "@/app/pipeline-actions";
import { ROOM_STATUSES } from "@/lib/status-pipelines";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "rooms");
  const supabase = await createClient();

  const [{ data: rooms }, { data: customers }] = await Promise.all([
    supabase
      .from("hotel_rooms")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("room_number")
      .limit(200),
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const vacantRooms = (rooms || []).filter((r) =>
    ["vacant", "dirty"].includes(r.status || "vacant")
  );
  const occupied = (rooms || []).filter((r) => r.status === "occupied");

  const items = (rooms || []).map((row) => ({
    id: row.id,
    title: `Room ${row.room_number}`,
    status: row.status || "vacant",
    subtitle: [row.room_type, row.current_guest_name].filter(Boolean).join(" · "),
    meta: [
      row.check_out_on ? `Out ${row.check_out_on}` : null,
      Number(row.folio_balance || 0) > 0
        ? `Folio ${formatCurrency(Number(row.folio_balance))}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined,
    amountLabel: Number(row.rate || 0) > 0 ? formatCurrency(Number(row.rate)) : undefined,
    invoiceId: row.invoice_id,
    tone: row.status === "ooo" || row.status === "dirty" ? ("alert" as const) : undefined,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Rooms"
        subtitle="Vacant → occupied → dirty. Check-in / check-out for resthouse MVP."
      />
      <PipelineCreateForm
        action={createHotelRoomAction}
        fields={[
          { name: "room_number", label: "Room #", required: true },
          {
            name: "room_type",
            label: "Type",
            type: "select",
            options: [
              { value: "standard", label: "Standard" },
              { value: "deluxe", label: "Deluxe" },
              { value: "family", label: "Family" },
            ],
            defaultValue: "standard",
          },
          { name: "rate", label: "Nightly rate (MYR)", type: "number", defaultValue: 0 },
        ]}
      />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Check in</h3>
        <ActionForm action={hotelCheckInAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>Room</label>
              <select name="room_id" className="select" required defaultValue="">
                <option value="">—</option>
                {vacantRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_number} ({r.room_type}) · {formatCurrency(Number(r.rate || 0))}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Guest name</label>
              <input name="guest_name" className="input" required />
            </div>
            <div className="field">
              <label>Customer</label>
              <select name="customer_id" className="select" defaultValue="">
                <option value="">—</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Departure</label>
              <input name="departure_on" className="input" type="date" required />
            </div>
            <div className="field">
              <label>Rate (MYR)</label>
              <input name="rate" className="input" type="number" defaultValue={0} />
            </div>
            <div className="field">
              <label>Deposit (MYR)</label>
              <input name="deposit_amount" className="input" type="number" defaultValue={0} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Check in
          </button>
        </ActionForm>
      </div>

      {occupied.length ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>In-house check-out</h3>
          <div className="stack" style={{ gap: "0.65rem" }}>
            {occupied.map((room) => (
              <div
                key={room.id}
                className="row"
                style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}
              >
                <div>
                  <strong>Room {room.room_number}</strong>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {[room.current_guest_name, room.check_out_on ? `Out ${room.check_out_on}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                    {Number(room.folio_balance || 0) > 0
                      ? ` · ${formatCurrency(Number(room.folio_balance))}`
                      : ""}
                  </div>
                </div>
                <ActionForm action={hotelCheckOutAction}>
                  <input type="hidden" name="room_id" value={room.id} />
                  <button type="submit" className="btn btn-soft">
                    Check out & bill
                  </button>
                </ActionForm>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <StatusPipelineBoard
        statuses={ROOM_STATUSES}
        items={items}
        updateAction={updateRoomStatusAction}
        showInvoice={false}
      />
    </div>
  );
}
