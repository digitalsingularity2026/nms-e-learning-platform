import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

const MOD_ICON: Record<string, string> = {
  "ENG-101": "📖", "CHEM-101": "⚗️", "PHYS-101": "⚡",
  "BIO-101": "🧬", "STUDY-101": "📚", "ETH-101": "⚖️",
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
    <div className="min-h-screen" style={{ background: "#F7F3ED" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 64 }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <div>
            <div className="text-white font-semibold" style={{ fontFamily: "serif", fontSize: 17, lineHeight: 1.2 }}>Northern Medical School</div>
            <div style={{ color: "#7DB899", fontSize: 10, letterSpacing: "0.14em" }}>FACULTY — CONTENT MANAGEMENT</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-medium" style={{ fontSize: 13 }}>{session.user.name}</div>
            <div style={{ color: "#7DB899", fontSize: 11 }}>Faculty Member</div>
          </div>
          <div className="flex items-center justify-center rounded-full text-white font-bold text-sm shrink-0" style={{ width: 34, height: 34, background: "#1A3A6B" }}>
            {(session.user.name ?? "F")[0]}
          </div>
          <Link href="/profile" className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", textDecoration: "none" }}>Profile</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button type="submit" className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", border: "none", cursor: "pointer" }}>Sign out</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-7 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: 24, color: "#0C3D26", fontFamily: "serif" }}>My Modules</h1>
            <p style={{ color: "#6B7280", fontSize: 13 }}>Click a module to manage its lessons, videos, and quiz questions.</p>
          </div>
          <Link href="/dashboard/faculty/students" style={{ fontSize: 13, color: "#1A3A6B", fontWeight: 600, textDecoration: "none", background: "#EEF2F8", padding: "8px 16px", borderRadius: 8 }}>👥 All Students</Link>
        </div>

        <div className="flex flex-col gap-3">
          {assignments.length === 0 && (
            <div className="bg-white rounded-xl p-6" style={{ border: "1px solid #E2D9CC" }}>
              <p style={{ color: "#6B7280" }}>No modules assigned yet. Contact your administrator.</p>
            </div>
          )}
          {assignments.map(({ module }) => (
            <Link key={module.id} href={`/dashboard/faculty/module/${module.id}`} style={{ textDecoration: "none" }}>
              <div className="bg-white rounded-xl px-6 py-5 flex items-center justify-between transition-all duration-150 hover:shadow-md" style={{ border: "1px solid #E2D9CC", cursor: "pointer" }}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center rounded-lg text-2xl" style={{ width: 48, height: 48, background: "#F7F3ED" }}>
                    {MOD_ICON[module.code] ?? "📄"}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ fontFamily: "serif", fontSize: 17, color: "#1A1A1A" }}>{module.title}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, letterSpacing: "0.05em" }}>{module.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm shrink-0">
                  <div className="text-center">
                    <div className="font-bold" style={{ fontSize: 18, color: "#0C3D26" }}>{module._count.lessons}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>lessons</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold" style={{ fontSize: 18, color: "#0C3D26" }}>{module.quiz?._count.questions ?? 0}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>questions</div>
                  </div>
                  <span style={{ background: module.isPublished ? "#E3F0E9" : "#F3F4F6", color: module.isPublished ? "#0C3D26" : "#6B7280", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>
                    {module.isPublished ? "PUBLISHED" : "DRAFT"}
                  </span>
                  <span style={{ color: "#9CA3AF", fontSize: 18 }}>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
