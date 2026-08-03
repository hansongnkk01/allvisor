"use client";

import { useInventoryHid } from "@/components/InventoryHidProvider";

export function InventoryBarcodeInput({
  label,
  placeholder,
  name = "barcode",
  defaultValue = "",
}: {
  label: string;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
}) {
  const hid = useInventoryHid();

  return (
    <div className="field">
      <label>{label}</label>
      <input
        ref={(el) => {
          if (hid) hid.barcodeRef.current = el;
        }}
        name={name}
        className="input"
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete="off"
        data-inventory-barcode
      />
    </div>
  );
}
