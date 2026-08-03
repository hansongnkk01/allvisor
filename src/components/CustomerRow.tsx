"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { PatientName } from "@/components/PatientName";
import { PatientSafetyBanner } from "@/components/PatientSafetyBanner";
import {
  PatientTimelineButton,
  type TimelineLabels,
} from "@/components/PatientTimelinePanel";
import { deleteCustomerAction, upsertCustomerAction } from "@/app/actions";
import type { Customer } from "@/lib/types";

type Labels = {
  name: string;
  email: string;
  phone: string;
  ic: string;
  address: string;
  notes: string;
  save: string;
  delete: string;
  edit: string;
  cancel: string;
  addedBy: string;
  risk: string;
  allergies: string;
  timeline: TimelineLabels;
};

export function CustomerRow({
  customer,
  labels,
  showAllergies = true,
  showRisk = true,
}: {
  customer: Customer;
  labels: Labels;
  showAllergies?: boolean;
  showRisk?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const allergies = showAllergies ? customer.allergies : null;
  const risk = showRisk ? customer.risk_level : null;
  const colSpan = showRisk ? 8 : 7;

  if (editing) {
    return (
      <tr>
        <td colSpan={colSpan}>
          <ActionForm
            action={upsertCustomerAction}
            onSuccess={() => setEditing(false)}
            className="stack"
            style={{ padding: "0.5rem 0" }}
          >
            <input type="hidden" name="id" value={customer.id} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.5rem",
              }}
            >
              <div className="field">
                <label>{labels.name}</label>
                <input name="name" required className="input" defaultValue={customer.name} />
              </div>
              {showRisk ? (
                <div className="field">
                  <label>{labels.risk}</label>
                  <select
                    name="risk_level"
                    className="select"
                    defaultValue={customer.risk_level || ""}
                  >
                    <option value="">—</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </div>
              ) : null}
              <div className="field">
                <label>{labels.ic}</label>
                <input
                  name="ic_number"
                  className="input"
                  defaultValue={customer.ic_number || ""}
                />
              </div>
              <div className="field">
                <label>{labels.email}</label>
                <input
                  name="email"
                  type="email"
                  className="input"
                  defaultValue={customer.email || ""}
                />
              </div>
              <div className="field">
                <label>{labels.phone}</label>
                <input name="phone" className="input" defaultValue={customer.phone || ""} />
              </div>
            </div>
            <div className="field">
              <label>{labels.address}</label>
              <input
                name="address"
                required
                className="input"
                defaultValue={customer.address || ""}
                placeholder="Street, city, postcode, state"
              />
            </div>
            {showAllergies ? (
              <div className="field">
                <label>{labels.allergies}</label>
                <input
                  name="allergies"
                  className="input"
                  defaultValue={customer.allergies || ""}
                  placeholder="Penicillin, seafood…"
                />
              </div>
            ) : null}
            <div className="field">
              <label>{labels.notes}</label>
              <textarea name="notes" className="textarea" defaultValue={customer.notes || ""} />
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary">
                {labels.save}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(false)}
              >
                {labels.cancel}
              </button>
            </div>
          </ActionForm>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <PatientName
          name={customer.name}
          risk={risk}
          allergies={allergies}
        />
        <PatientSafetyBanner
          risk={risk}
          allergies={allergies}
          showAllergies={showAllergies}
          compact
        />
        {customer.notes ? (
          <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
            {customer.notes}
          </div>
        ) : null}
      </td>
      {showRisk ? <td>{customer.risk_level || "—"}</td> : null}
      <td>{customer.ic_number || "—"}</td>
      <td style={{ maxWidth: 180, whiteSpace: "normal" }}>{customer.address || "—"}</td>
      <td>{customer.phone || "—"}</td>
      <td>{customer.email || "—"}</td>
      <td>
        <div>{customer.created_by_name || "—"}</div>
        <div className="muted" style={{ fontSize: "0.75rem" }}>
          {labels.addedBy}
        </div>
      </td>
      <td>
        <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
          <PatientTimelineButton customer={customer} labels={labels.timeline} />
          <button
            type="button"
            className="btn btn-soft"
            style={{ padding: "0.35rem 0.7rem" }}
            onClick={() => setEditing(true)}
          >
            {labels.edit}
          </button>
          <form
            action={async () => {
              await deleteCustomerAction(customer.id);
            }}
          >
            <button type="submit" className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem" }}>
              {labels.delete}
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
