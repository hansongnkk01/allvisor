"use client";

import { useEffect, useRef } from "react";

/** Uncontrolled barcode input; digit keys anywhere on the page type into this field. */
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
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!/^[0-9]$/.test(e.key)) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;
      const isBarcode = ref.current === target;

      // Don't steal digits from qty / search / other fields
      if (isEditable && !isBarcode) return;
      if (isBarcode) return;

      e.preventDefault();
      const el = ref.current;
      if (!el) return;
      el.focus();
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + e.key + el.value.slice(end);
      el.value = next;
      const caret = start + 1;
      el.setSelectionRange(caret, caret);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="field">
      <label>{label}</label>
      <input
        ref={ref}
        name={name}
        className="input"
        placeholder={placeholder}
        defaultValue={defaultValue}
        autoComplete="off"
      />
    </div>
  );
}
