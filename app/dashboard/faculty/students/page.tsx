import { auth } from "@/auth"
import { signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getStudentRoster } from "@/lib/studentRoster"
import StudentRosterView from "@/components/StudentRosterView"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"

export default async function FacultyStudentsPage() {
  const session = await auth()
  if (!session || session.user.role !== "FACULTY") redirect("/login")

  const students = await getStudentRoster()

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--green-700)", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
          <Link href="/dashboard/faculty" style={{ color: "var(--text-on-dark-muted)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <Icon name="arrow-left" size={13} /> My Modules
          </Link>
          <span style={{ color: "var(--green-600)", flexShrink: 0 }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>All Students</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span className="hidden sm:inline" style={{ color: "#fff", fontSize: 13, whiteSpace: "nowrap" }}>{session.user.name}</span>
          <Link href="/profile" style={{ textDecoration: "none" }}><Button variant="ghostDark" size="sm">Profile</Button></Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <Button type="submit" variant="ghostDark" size="sm">Sign out</Button>
          </form>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-900)", margin: "0 0 4px", fontWeight: 600 }}>All Students</h1>
          <p style={{ color: "var(--ink-500)", fontSize: 13, margin: 0 }}>School-wide progress overview, read-only — across all modules and years.</p>
        </div>
        <StudentRosterView students={students} />
      </main>
    </div>
  )
}
