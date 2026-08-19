import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/ui/Navbar"
import { Avatar } from "@/components/ui/Avatar"
import { Button } from "@/components/ui/Button"
import { Icon } from "@/components/ui/Icon"
import { Badge } from "@/components/ui/Badge"

const MOD_ICON: Record<string, string> = {
  "ENG-101": "book-open", "CHEM-101": "flask", "PHYS-101": "lightning",
  "BIO-101": "dna", "STUDY-101": "books", "ETH-101": "scales",
}

export default async function FacultyDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "FACULTY") redirect("/login")

  const assignments = await prisma.moduleFacultyAssignment.findMany({
    where: { facultyId: session.user.id },
    include: {
      module: {
        include: {
          _count: { select: { lessons: { where: { isPublished: true } } } },
          quiz: { include: { _count: { select: { questions: true } } } },
        },
      },
    },
    orderBy: { module: { orderIndex: "asc" } },
  })

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <Navbar
        subtitle="FACULTY — CONTENT MANAGEMENT"
        userName={session.user.name}
        userSub="Faculty Member"
        right={
          <>
            <Avatar name={session.user.name} bg="var(--gold-600)" />
            <Link href="/profile" style={{ textDecoration: "none" }}><Button variant="ghostDark" size="sm">Profile</Button></Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <Button type="submit" variant="ghostDark" size="sm">Sign out</Button>
            </form>
          </>
        }
      />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-900)", margin: "0 0 4px", fontWeight: 600 }}>My Modules</h1>
            <p style={{ color: "var(--ink-500)", fontSize: 13, margin: 0 }}>Click a module to manage its lessons, videos, and quiz questions.</p>
          </div>
          <Link href="/dashboard/faculty/students" style={{ fontSize: 13, color: "var(--blue-700)", fontWeight: 600, textDecoration: "none", background: "var(--blue-100)", padding: "8px 16px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="users" size={15} /> All Students
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {assignments.length === 0 && (
            <div style={{ background: "#fff", borderRadius: "var(--radius-md)", padding: 24, boxShadow: "var(--shadow-card)" }}>
              <p style={{ color: "var(--ink-500)", margin: 0 }}>No modules assigned yet. Contact your administrator.</p>
            </div>
          )}
          {assignments.map(({ module }) => (
            <Link key={module.id} href={`/dashboard/faculty/module/${module.id}`} className="card-hover" style={{ textDecoration: "none", borderRadius: "var(--radius-md)" }}>
              <div style={{ background: "#fff", borderRadius: "var(--radius-md)", padding: "20px 24px", display: "flex", flexWrap: "wrap", rowGap: 12, alignItems: "center", justifyContent: "space-between", boxShadow: "var(--shadow-card)", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "var(--surface-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={MOD_ICON[module.code] ?? "file-text"} size={21} color="var(--green-700)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-900)", fontWeight: 600 }}>{module.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 2, letterSpacing: "0.04em" }}>{module.code}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 13, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: 17, color: "var(--green-700)" }}>{module._count.lessons}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)" }}>lessons</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: 17, color: "var(--green-700)" }}>{module.quiz?._count.questions ?? 0}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)" }}>questions</div>
                  </div>
                  <Badge status={module.isPublished ? "published" : "draft"}>{module.isPublished ? "Published" : "Draft"}</Badge>
                  <Icon name="arrow-right" size={16} color="var(--ink-400)" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
