"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  appendToInput,
  attachHidBarcodeListener,
  isEditableTarget,
  setInputValue,
} from "@/lib/hid-barcode";

type InventoryHidContextValue = {
  barcodeRef: RefObject<HTMLInputElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  registerSearch: (el: HTMLInputElement | null, setQuery: (q: string) => void) => void;
};

const InventoryHidContext = createContext<InventoryHidContextValue | null>(null);

export function useInventoryHid() {
  return useContext(InventoryHidContext);
}

export function InventoryHidProvider({ children }: { children: ReactNode }) {
  const barcodeRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const setSearchQueryRef = useRef<((q: string) => void) | null>(null);

  function registerSearch(el: HTMLInputElement | null, setQuery: (q: string) => void) {
    searchRef.current = el;
    setSearchQueryRef.current = setQuery;
  }

  useEffect(() => {
    return attachHidBarcodeListener({
      minLength: 3,
      onScan(code) {
        const searchEl = searchRef.current;
        const searchFocused = searchEl && document.activeElement === searchEl;

        if (searchFocused && setSearchQueryRef.current) {
          setSearchQueryRef.current(code);
          return;
        }

        const barcodeEl = barcodeRef.current;
        if (barcodeEl) {
          setInputValue(barcodeEl, code);
        }
      },
      onManualDigit(digit) {
        const searchEl = searchRef.current;
        if (searchEl && document.activeElement === searchEl) {
          return false; // owned handler lets native typing work; shouldn't reach here
        }
        const barcodeEl = barcodeRef.current;
        if (!barcodeEl) return false;
        appendToInput(barcodeEl, digit);
        return true;
      },
      isOwnedInput(el) {
        return el === barcodeRef.current || el === searchRef.current;
      },
      isProtectedInput(el) {
        if (el === barcodeRef.current || el === searchRef.current) return false;
        if (!isEditableTarget(el)) return false;
        return true;
      },
    });
  }, []);

  return (
    <InventoryHidContext.Provider value={{ barcodeRef, searchRef, registerSearch }}>
      {children}
    </InventoryHidContext.Provider>
  );
}
