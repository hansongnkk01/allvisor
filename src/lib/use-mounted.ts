"use client";

import { useSyncExternalStore } from "react";

const subscribeNone = () => () => {};

/**
 * Hydration-safe "are we on the client yet" flag: false during SSR and the
 * first client render (so markup matches), true immediately after. Uses
 * useSyncExternalStore so no setState-in-effect is needed.
 */
export function useMounted() {
  return useSyncExternalStore(subscribeNone, () => true, () => false);
}
