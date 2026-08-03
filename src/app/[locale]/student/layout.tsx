import { setRequestLocale } from "next-intl/server";
import { requireStudent } from "@/lib/tuition-student";
import { StudentShell } from "@/components/StudentShell";

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireStudent(locale);

  return (
    <StudentShell orgName={ctx.organization.name} studentName={ctx.customerName}>
      {children}
    </StudentShell>
  );
}
