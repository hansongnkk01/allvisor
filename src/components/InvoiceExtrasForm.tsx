"use client";

import { ActionForm } from "@/components/ActionForm";
import { updateInvoiceExtrasAction } from "@/app/actions";

export function InvoiceExtrasForm({
  invoiceId,
  medicineDescription,
  medicineAmount,
  additionalDescription,
  additionalAmount,
  labels,
}: {
  invoiceId: string;
  medicineDescription: string | null;
  medicineAmount: number;
  additionalDescription: string | null;
  additionalAmount: number;
  labels: {
    medicine: string;
    medicineDesc: string;
    medicineAmount: string;
    additional: string;
    additionalDesc: string;
    additionalAmount: string;
    save: string;
  };
}) {
  return (
    <ActionForm action={updateInvoiceExtrasAction} className="stack">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <div className="field">
          <label>{labels.medicineDesc}</label>
          <input
            name="medicine_description"
            className="input"
            defaultValue={medicineDescription || ""}
            placeholder={labels.medicine}
          />
        </div>
        <div className="field">
          <label>{labels.medicineAmount}</label>
          <input
            name="medicine_amount"
            type="number"
            step="0.01"
            min={0}
            className="input"
            defaultValue={medicineAmount || 0}
          />
        </div>
        <div className="field">
          <label>{labels.additionalDesc}</label>
          <input
            name="additional_description"
            className="input"
            defaultValue={additionalDescription || ""}
            placeholder={labels.additional}
          />
        </div>
        <div className="field">
          <label>{labels.additionalAmount}</label>
          <input
            name="additional_amount"
            type="number"
            step="0.01"
            min={0}
            className="input"
            defaultValue={additionalAmount || 0}
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary">
        {labels.save}
      </button>
    </ActionForm>
  );
}
