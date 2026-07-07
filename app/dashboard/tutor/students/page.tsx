import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getStudentRoster } from "@/lib/studentRoster"
import StudentRosterView from "@/components/StudentRosterView"

export default async function TutorStudentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "TUTOR") redirect("/login")

  const students = await getStudentRoster()

  return (
    <div className="min-h-screen" style={{ background: "#F7F3ED" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 60 }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tutor" style={{ color: "#7DB899", fontSize: 13, textDecoration: "none" }}>← My Group</Link>
          <span style={{ color: "#2D5E40" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>All Students</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-7 py-8">
        <div className="mb-6">
          <h1 className="font-semibold mb-1" style={{ fontSize: 22, color: "#0C3D26", fontFamily: "serif" }}>All Students</h1>
          <p style={{ color: "#6B7280", fontSize: 13 }}>School-wide progress overview, read-only — beyond your own group. For detail on your own group's students, click their name on your group dashboard.</p>
        </div>
        <StudentRosterView students={students} />
      </main>
    </div>
  )
}
