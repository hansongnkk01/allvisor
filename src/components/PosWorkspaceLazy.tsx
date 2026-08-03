"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const PosWorkspace = dynamic(
  () => import("@/components/PosWorkspace").then((m) => m.PosWorkspace),
  { ssr: false, loading: () => <p className="muted">Loading POS…</p> }
);

export function PosWorkspaceLazy(props: ComponentProps<typeof PosWorkspace>) {
  return <PosWorkspace {...props} />;
}
