import { Suspense } from "react";
import RegisterPage from "./RegisterClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="muted" style={{ padding: "2rem" }}>…</div>}>
      <RegisterPage />
    </Suspense>
  );
}
