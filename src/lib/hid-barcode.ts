/**
 * Distinguish USB/HID barcode-scanner keystrokes from human typing.
 *
 * - Digits typed within `continueWindowMs` (default 1s) belong to the same entry.
 * - After `idleMs` (default 1s) with no new digit, that entry is settled.
 * - Gaps ≤ `scanSpeedMs` mark the entry as a scanner burst → `onScan`.
 * - Enter settles immediately.
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
  /** Fired when a barcode scan is detected (fast digit burst) and settled. */
  onScan: (code: string) => void;
  /**
   * Manual digit while focus is not on an owned/protected field.
   * Return true if handled (listener will preventDefault).
   */
  onManualDigit?: (digit: string, e: KeyboardEvent) => boolean;
  /** Optional: fired when a manual digit entry settles (1s idle / complete). */
  onManualSettle?: (code: string) => void;
  /** Search / barcode inputs that may receive both scan and manual typing. */
  isOwnedInput?: (el: HTMLElement) => boolean;
  /** Qty/price fields — never intercept digits here. */
  isProtectedInput?: (el: HTMLElement) => boolean;
  /** Minimum code length to treat as a complete code (default 3). */
  minLength?: number;
  /** Gap ≤ this = scanner speed (default 50ms). */
  scanSpeedMs?: number;
  /**
   * Digits within this window continue the same number entry (default 1000ms).
   * After this much silence, the previous number is settled.
   */
  continueWindowMs?: number;
  /** Alias kept for callers; same as continueWindowMs settle idle (default 1000ms). */
  idleMs?: number;
  /** @deprecated use scanSpeedMs */
  maxIntervalMs?: number;
};

export function attachHidBarcodeListener(opts: HidBarcodeOptions): () => void {
  const minLength = opts.minLength ?? 3;
  const scanSpeedMs = opts.scanSpeedMs ?? opts.maxIntervalMs ?? 50;
  const continueWindowMs = opts.continueWindowMs ?? opts.idleMs ?? 1000;
  const idleMs = opts.idleMs ?? continueWindowMs;

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

  /** Mark previous number as settled (keyed-in complete). */
  function settle() {
    const code = buffer.trim();
    const wasScan = scanMode;
    reset();
    if (code.length < minLength) return;
    if (wasScan) {
      opts.onScan(code);
    } else {
      opts.onManualSettle?.(code);
    }
  }

  function scheduleIdle() {
    clearIdle();
    idleTimer = setTimeout(() => {
      settle();
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
      // Only capture Enter for scanner bursts; manual Enter stays with the focused field
      if (scanMode && buffer.length >= minLength) {
        e.preventDefault();
        e.stopPropagation();
        settle();
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

    // Continue same number if next digit arrives within 1s
    if (buffer && gap <= continueWindowMs) {
      const isFast = gap <= scanSpeedMs;
      if (isFast) scanMode = true;
      buffer += e.key;
      lastTs = now;

      if (isFast) {
        // Scanner burst — don't leak digits into random fields
        e.preventDefault();
        e.stopPropagation();
      } else if (!editable || !owned) {
        if (opts.onManualDigit?.(e.key, e)) {
          e.preventDefault();
        }
      }
      // owned + slow: let search/barcode receive the digit natively

      scheduleIdle();
      return;
    }

    // Gap > 1s (or first digit): previous entry already settled via idle;
    // start a new number.
    buffer = e.key;
    lastTs = now;
    scanMode = false;

    if (editable && owned) {
      scheduleIdle();
      return;
    }

    if (editable && !owned) {
      reset();
      return;
    }

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
