import { setRequestLocale } from "next-intl/server";
import { NicheModulePage } from "@/components/NicheModulePage";
import { GymWalkInPanel } from "@/components/GymWalkInPanel";
import { PageHeader } from "@/components/PageHeader";
import { createCheckinAction } from "@/app/niche-actions";
import { gymPresenceSnapshotAction, type WalkInPackage } from "@/app/gym-actions";
import { requireCapability } from "@/lib/require-capability";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "class_checkin");
  const supabase = await createClient();

  const [initial, { data: packages }] = await Promise.all([
    gymPresenceSnapshotAction(),
    supabase
      .from("gym_walkin_packages")
      .select("id, name, minutes, price, is_active")
      .eq("organization_id", ctx.organization.id)
      .eq("is_active", true)
      .order("price", { ascending: true }),
  ]);

  const checkInModule = await NicheModulePage({
    params,
    capability: "class_checkin",
    title: "Member check-ins",
    subtitle: "Gym member check-ins.",
    table: "gym_checkins",
    columns: ["customer_id", "checked_in_at"],
    fields: [
      {
        name: "customer_id",
        label: "Member ID",
        required: true,
      },
    ],
    action: createCheckinAction,
  });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Walk-in & check-in" subtitle="Counter walk-ins with timed sessions, plus member check-ins." />
      <GymWalkInPanel
        initial={initial}
        packages={(packages || []) as WalkInPackage[]}
        locale={locale}
      />
      {checkInModule}
    </div>
  );
}
