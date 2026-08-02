"use client";

import { ActionForm } from "@/components/ActionForm";
import {
  updateClinicHoursAction,
  updateServiceChargeAction,
} from "@/app/actions";
import { ExpandSection } from "@/components/BranchGroup";

export function BranchClinicSettings({
  branchId,
  settings,
  labels,
}: {
  branchId: string;
  settings: {
    serviceChargePercent: number;
    openHour: number;
    closeHour: number;
    closedWeekdays: number[];
  };
  labels: {
    title: string;
    hint: string;
    serviceChargePercent: string;
    serviceChargeHint: string;
    saveServiceCharge: string;
    openHour: string;
    closeHour: string;
    weeklyOff: string;
    mon: string;
    tue: string;
    wed: string;
    thu: string;
    fri: string;
    sat: string;
    sun: string;
    holidayNote: string;
    saveHours: string;
  };
}) {
  const weekdays = [
    [1, labels.mon],
    [2, labels.tue],
    [3, labels.wed],
    [4, labels.thu],
    [5, labels.fri],
    [6, labels.sat],
    [0, labels.sun],
  ] as const;

  return (
    <ExpandSection title={labels.title} defaultOpen>
      <p className="muted" style={{ marginTop: 0 }}>
        {labels.hint}
      </p>
      <ActionForm
        action={updateServiceChargeAction}
        className="stack"
        style={{ marginBottom: "1.25rem" }}
      >
        <input type="hidden" name="target_org_id" value={branchId} />
        <div className="field" style={{ maxWidth: 260 }}>
          <label>{labels.serviceChargePercent}</label>
          <input
            name="service_charge_percent"
            type="number"
            step="0.01"
            min={0}
            max={100}
            className="input"
            defaultValue={String(settings.serviceChargePercent)}
          />
        </div>
        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
          {labels.serviceChargeHint}
        </p>
        <button type="submit" className="btn btn-soft">
          {labels.saveServiceCharge}
        </button>
      </ActionForm>
      <ActionForm action={updateClinicHoursAction} className="stack">
        <input type="hidden" name="target_org_id" value={branchId} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div className="field">
            <label>{labels.openHour}</label>
            <select
              name="clinic_open_hour"
              className="select"
              defaultValue={String(settings.openHour)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{labels.closeHour}</label>
            <select
              name="clinic_close_hour"
              className="select"
              defaultValue={String(settings.closeHour)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <strong style={{ fontSize: "0.9rem" }}>{labels.weeklyOff}</strong>
          <div className="row" style={{ marginTop: 8 }}>
            {weekdays.map(([day, label]) => (
              <label key={day} className="row" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  name="closed_weekdays"
                  value={day}
                  defaultChecked={settings.closedWeekdays.includes(day)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
          {labels.holidayNote}
        </p>
        <button type="submit" className="btn btn-primary">
          {labels.saveHours}
        </button>
      </ActionForm>
    </ExpandSection>
  );
}
