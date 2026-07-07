import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

const MOD_STYLE: Record<string, { icon: string; color: string }> = {
  "ENG-101":   { icon: "📖", color: "#1B5E3B" },
  "CHEM-101":  { icon: "⚗️",  color: "#1A3A6B" },
  "PHYS-101":  { icon: "⚡",  color: "#4A1A6B" },
  "BIO-101":   { icon: "🧬",  color: "#5A2800" },
  "STUDY-101": { icon: "📚",  color: "#2D4A1A" },
  "ETH-101":   { icon: "⚖️",  color: "#1A1A5A" },
}

async function ensureEnrolled(studentId: string) {
  const course = await prisma.course.findUnique({
    where: { year: "YEAR_1" },
    include: { modules: { orderBy: { orderIndex: "asc" } } },
  })
  if (!course) return null

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
  })

  if (!existing) {
    await prisma.enrollment.create({ data: { studentId, courseId: course.id } })
    await Promise.all(
      course.modules.map((mod, i) =>
        prisma.moduleProgress.create({
          data: {
            studentId,
            moduleId: mod.id,
            isUnlocked: i === 0,
            isCompleted: false,
            creditsAwarded: 0,
          },
        })
      )
    )
  }

  return course
}

export default async function StudentDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "STUDENT") redirect("/login")

  const course = await ensureEnrolled(session.user.id)
  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F3ED" }}>
        <p style={{ color: "#6B7280" }}>No curriculum found. Please contact your administrator.</p>
      </div>
    )
  }

  const progress = await prisma.moduleProgress.findMany({
    where: { studentId: session.user.id },
    include: { module: true },
    orderBy: { module: { orderIndex: "asc" } },
  })

  const totalCredits = course.modules.reduce((s, m) => s + m.credits, 0)
  const earnedCredits = progress.filter(p => p.isCompleted).reduce((s, p) => s + p.creditsAwarded, 0)
  const pct = totalCredits > 0 ? Math.round((earnedCredits / totalCredits) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: "#F7F3ED" }}>
      <header
        className="flex items-center justify-between px-8 sticky top-0 z-10"
        style={{ background: "#0C3D26", height: 64 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <div>
            <div className="text-white font-semibold" style={{ fontFamily: "serif", fontSize: 17, lineHeight: 1.2 }}>
              Northern Medical School
            </div>
            <div style={{ color: "#7DB899", fontSize: 10, letterSpacing: "0.14em" }}>
              ONLINE LEARNING PLATFORM
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-medium" style={{ fontSize: 13 }}>{session.user.name}</div>
            <div style={{ color: "#7DB899", fontSize: 11 }}>Year 1 — Foundation Phase</div>
          </div>
          <div
            className="flex items-center justify-center rounded-full text-white font-bold text-sm shrink-0"
            style={{ width: 34, height: 34, background: "#B47E2A" }}
          >
            {(session.user.name ?? "S")[0]}
          </div>
          <Link href="/profile" className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", textDecoration: "none" }}>Profile</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-7 py-8">
        <div
          className="flex items-center justify-between rounded-2xl px-8 py-6 mb-7"
          style={{ background: "#fff", border: "1px solid #E2D9CC" }}
        >
          <div>
            <h1 className="font-semibold mb-1" style={{ fontSize: 24, color: "#0C3D26", fontFamily: "serif" }}>
              Year 1 — {course.title}
            </h1>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Complete all 6 modules to advance to Year 2: Basic Medical Sciences
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold" style={{ fontSize: 11, color: "#9CA3AF", letterSpacing: "0.08em", marginBottom: 6 }}>
              PROGRESS
            </div>
            <div className="font-bold" style={{ fontSize: 28, color: "#0C3D26", fontFamily: "serif", lineHeight: 1 }}>
              {earnedCredits}
              <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 400 }}>/{totalCredits} credits</span>
            </div>
            <div className="rounded-full overflow-hidden mt-2" style={{ width: 200, height: 6, background: "#EDE8E0" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0C3D26, #2D7A50)", transition: "width 0.5s ease" }}
              />
            </div>
            <div style={{ fontSize: 11, color: "#B0A090", marginTop: 3 }}>{pct}% complete</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold" style={{ fontSize: 18, color: "#1A1A1A", fontFamily: "serif" }}>
            Year 1 Modules
          </h2>
          <span
            className="font-bold rounded-full px-2 py-0.5"
            style={{ fontSize: 10, background: "#E3F0E9", color: "#0C3D26", letterSpacing: "0.08em" }}
          >
            FOUNDATION PHASE
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {progress.map(({ module, isUnlocked, isCompleted }) => {
            const cfg = MOD_STYLE[module.code] ?? { icon: "📄", color: "#374151" }
            const card = (
              <div
                className="rounded-xl p-5 relative h-full"
                style={{
                  background: "#fff",
                  border: isCompleted ? "1.5px solid #86BFA4" : "1.5px solid #E2D9CC",
                  opacity: isUnlocked ? 1 : 0.55,
                }}
              >
                {isCompleted && (
                  <span
                    className="absolute text-white font-bold rounded-full px-2 py-0.5"
                    style={{ top: 12, right: 12, background: "#0C3D26", fontSize: 10 }}
                  >
                    ✓ DONE
                  </span>
                )}
                {!isUnlocked && (
                  <span
                    className="absolute font-semibold rounded-full px-2 py-0.5"
                    style={{ top: 12, right: 12, background: "#F3F4F6", color: "#9CA3AF", fontSize: 10 }}
                  >
                    🔒 LOCKED
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="flex items-center justify-center rounded-lg text-xl"
                    style={{ width: 42, height: 42, background: `${cfg.color}14`, border: `1px solid ${cfg.color}22` }}
                  >
                    {cfg.icon}
                  </div>
                  <span className="font-bold" style={{ fontSize: 10, color: cfg.color, letterSpacing: "0.1em" }}>
                    {module.code}
                  </span>
                </div>
                <h3
                  className="font-semibold leading-snug mb-3"
                  style={{ fontFamily: "serif", fontSize: 16, color: "#1A1A1A", paddingRight: isCompleted || !isUnlocked ? 56 : 0 }}
                >
                  {module.title}
                </h3>
                {module.description && (
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: "#6B7280" }}>
                    {module.description}
                  </p>
                )}
                <div
                  className="flex gap-3 text-xs pt-3"
                  style={{ borderTop: "1px solid #F0EAE0", color: "#9CA3AF" }}
                >
                  <span>🎓 {module.credits} credits</span>
                  <span>📝 Pass: {module.passMark}%</span>
                </div>
              </div>
            )

            return isUnlocked ? (
              <Link
                key={module.id}
                href={`/dashboard/student/module/${module.id}`}
                className="block transition-all duration-150 hover:scale-[1.02] hover:shadow-lg"
                style={{ textDecoration: "none" }}
              >
                {card}
              </Link>
            ) : (
              <div key={module.id}>{card}</div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
