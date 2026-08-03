"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const AppointmentBoard = dynamic(
  () => import("@/components/AppointmentBoard").then((m) => m.AppointmentBoard),
  { ssr: false, loading: () => <p className="muted">Loading appointments…</p> }
);

export function AppointmentBoardLazy(props: ComponentProps<typeof AppointmentBoard>) {
  return <AppointmentBoard {...props} />;
}
