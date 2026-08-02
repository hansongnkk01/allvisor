"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { lockAdminZoneAction } from "@/app/actions";
import { Lock } from "lucide-react";

export function ExitAdminZoneButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      style={{
        width: "100%",
        justifyContent: "flex-start",
        color: "var(--danger)",
        border: "1px solid rgba(220, 38, 38, 0.25)",
        background: "rgba(220, 38, 38, 0.06)",
      }}
      onClick={() => {
        startTransition(async () => {
          await lockAdminZoneAction();
          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      <Lock size={16} />
      {pending ? "…" : label}
    </button>
  );
}
