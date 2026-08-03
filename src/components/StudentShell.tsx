import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/app/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { ReactNode } from "react";

export function StudentShell({
  orgName,
  studentName,
  children,
}: {
  orgName: string;
  studentName: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        className="surface"
        style={{
          margin: "1rem",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div className="display" style={{ fontSize: "1.35rem" }}>
            Allvisor Student
          </div>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {orgName} · {studentName}
          </div>
        </div>
        <nav className="row" style={{ flexWrap: "wrap" }}>
          <Link href="/student" className="btn btn-ghost">
            Home
          </Link>
          <Link href="/student/timetable" className="btn btn-ghost">
            Timetable
          </Link>
          <Link href="/student/assessments" className="btn btn-ghost">
            Assessments
          </Link>
          <LanguageSwitcher />
          <form action={signOutAction}>
            <button type="submit" className="btn btn-soft">
              Log out
            </button>
          </form>
        </nav>
      </header>
      <main style={{ padding: "0 1rem 2rem", maxWidth: 960, margin: "0 auto" }}>{children}</main>
    </div>
  );
}
