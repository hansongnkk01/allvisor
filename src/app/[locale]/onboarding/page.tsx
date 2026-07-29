import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="muted" style={{ padding: "2rem" }}>…</div>}>
      <OnboardingClient />
    </Suspense>
  );
}
