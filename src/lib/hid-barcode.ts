/**
 * Distinguish USB/HID barcode-scanner keystrokes from human typing.
 *
 * Scanners type digits very fast (typically &lt;50ms apart) and often end with Enter.
 * Humans type slower with irregular gaps.
 */

export function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export type HidBarcodeOptions = {
  /** Fired when a barcode scan is detected (fast digit burst, optional Enter). */
  onScan: (code: string) => void;
  /**
   * Manual digit while focus is not on an owned/protected field.
   * Return true if handled (listener will preventDefault).
   */
  onManualDigit?: (digit: string, e: KeyboardEvent) => boolean;
  /** Search / barcode inputs that may receive both scan and manual typing. */
  isOwnedInput?: (el: HTMLElement) => boolean;
  /** Qty/price fields — never intercept digits here. */
  isProtectedInput?: (el: HTMLElement) => boolean;
  /** Minimum code length to treat as a scan (default 4). */
  minLength?: number;
  /** Max gap between keys still considered scanner speed (default 50ms). */
  maxIntervalMs?: number;
  /** After this idle in scan mode, flush as scan even without Enter (default 120ms). */
  idleMs?: number;
};

export function attachHidBarcodeListener(opts: HidBarcodeOptions): () => void {
  const minLength = opts.minLength ?? 4;
  const maxIntervalMs = opts.maxIntervalMs ?? 50;
  const idleMs = opts.idleMs ?? 120;

  let buffer = "";
  let lastTs = 0;
  let scanMode = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function clearIdle() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function reset() {
    buffer = "";
    lastTs = 0;
    scanMode = false;
    clearIdle();
  }

  function emitScan() {
    const code = buffer;
    const ok = scanMode && code.length >= minLength;
    reset();
    if (ok) opts.onScan(code);
  }

  function scheduleIdle() {
    clearIdle();
    idleTimer = setTimeout(() => {
      if (scanMode && buffer.length >= minLength) {
        emitScan();
      } else {
        reset();
      }
    }, idleMs);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;

    const target = e.target instanceof HTMLElement ? e.target : null;

    if (target && opts.isProtectedInput?.(target)) {
      if (buffer) reset();
      return;
    }

    if (e.key === "Enter") {
      if (scanMode && buffer.length >= minLength) {
        e.preventDefault();
        e.stopPropagation();
        emitScan();
      } else {
        reset();
      }
      return;
    }

    if (!/^[0-9]$/.test(e.key)) {
      if (buffer) reset();
      return;
    }

    const now = performance.now();
    const gap = lastTs ? now - lastTs : Number.POSITIVE_INFINITY;
    const owned = !!(target && opts.isOwnedInput?.(target));
    const editable = isEditableTarget(target);

    // Fast continuation → scanner
    if (buffer && gap <= maxIntervalMs) {
      scanMode = true;
      buffer += e.key;
      lastTs = now;
      e.preventDefault();
      e.stopPropagation();
      scheduleIdle();
      return;
    }

    // Slow gap or first digit → start / continue as manual candidate
    buffer = e.key;
    lastTs = now;
    scanMode = false;

    if (editable && owned) {
      // Let the focused search/barcode input receive the digit normally
      scheduleIdle();
      return;
    }

    if (editable && !owned) {
      // Name / other fields — leave alone
      reset();
      return;
    }

    // Nothing focused (or body) — route manual digit
    if (opts.onManualDigit?.(e.key, e)) {
      e.preventDefault();
    }
    scheduleIdle();
  }

  window.addEventListener("keydown", onKeyDown, true);
  return () => {
    window.removeEventListener("keydown", onKeyDown, true);
    reset();
  };
}

/** Append a digit into an uncontrolled input. */
export function appendToInput(el: HTMLInputElement, digit: string) {
  el.focus();
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + digit + el.value.slice(end);
  const caret = start + 1;
  el.setSelectionRange(caret, caret);
}

/** Replace an uncontrolled input value (e.g. after a scan). */
export function setInputValue(el: HTMLInputElement, value: string) {
  el.focus();
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const caret = value.length;
  el.setSelectionRange(caret, caret);
}
