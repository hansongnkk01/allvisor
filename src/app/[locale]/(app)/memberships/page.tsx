import { setRequestLocale } from "next-intl/server";
import { NicheModulePage } from "@/components/NicheModulePage";
import { GymWalkInPanel } from "@/components/GymWalkInPanel";
import { createMembershipAction } from "@/app/niche-actions";
import { gymPresenceSnapshotAction } from "@/app/gym-actions";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Initial data for the walk-in panel; the panel re-polls itself afterwards.
  // The snapshot also flips overdue rows to `expired`, so it doubles as the
  // gym's housekeeping pass.
  const initial = await gymPresenceSnapshotAction();

  const membershipModule = await NicheModulePage({
    params,
    capability: "memberships",
    title: "Memberships",
    subtitle: "Gym membership plans.",
    table: "gym_memberships",
    columns: ["customer_id", "plan_name", "starts_on", "ends_on", "status"],
    fields: [
      {
        name: "customer_id",
        label: "Member ID",
        required: true,
      },
      {
        name: "plan_name",
        label: "Plan",
        required: true,
      },
      {
        name: "starts_on",
        label: "Starts",
        type: "date",
      },
      {
        name: "ends_on",
        label: "Ends",
        type: "date",
      },
    ],
    action: createMembershipAction,
  });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <GymWalkInPanel initial={initial} locale={locale} />
      {membershipModule}
    </div>
  );
}
