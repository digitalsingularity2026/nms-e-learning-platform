import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getStudentRoster } from "@/lib/studentRoster"
import StudentRosterView from "@/components/StudentRosterView"
import { Icon } from "@/components/ui/Icon"

export default async function TutorStudentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "TUTOR") redirect("/login")

  const students = await getStudentRoster()

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--green-700)", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard/tutor" style={{ color: "var(--text-on-dark-muted)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="arrow-left" size={13} /> My Group
          </Link>
          <span style={{ color: "var(--green-600)" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>All Students</span>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-900)", margin: "0 0 4px", fontWeight: 600 }}>All Students</h1>
          <p style={{ color: "var(--ink-500)", fontSize: 13, margin: 0 }}>School-wide progress overview, read-only — beyond your own group. For detail on your own group's students, click their name on your group dashboard.</p>
        </div>
        <StudentRosterView students={students} />
      </main>
    </div>
  )
}
