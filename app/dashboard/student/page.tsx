import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/ui/Navbar"
import { Avatar } from "@/components/ui/Avatar"
import { Button } from "@/components/ui/Button"
import { Icon } from "@/components/ui/Icon"
import { ProgressBar } from "@/components/ui/ProgressBar"

const MOD_STYLE: Record<string, { icon: string; color: string }> = {
  "ENG-101":   { icon: "book-open",  color: "#1F6B45" },
  "CHEM-101":  { icon: "flask",      color: "#1D4E89" },
  "PHYS-101":  { icon: "lightning",  color: "#5B3A94" },
  "BIO-101":   { icon: "dna",        color: "#7A4A21" },
  "STUDY-101": { icon: "books",      color: "#2E8659" },
  "ETH-101":   { icon: "scales",     color: "#33393C" },
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-subtle)" }}>
        <p style={{ color: "var(--ink-500)" }}>No curriculum found. Please contact your administrator.</p>
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
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
        <Navbar
          subtitle="ONLINE LEARNING PLATFORM"
          userName={session.user.name}
          userSub="Year 1 — Foundation Phase"
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
      </div>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: "var(--radius-lg)", padding: "24px 32px", marginBottom: 28, boxShadow: "var(--shadow-card)" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--ink-900)", margin: "0 0 4px", fontWeight: 600 }}>
              Year 1 — {course.title}
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0 }}>
              Complete all 6 modules to advance to Year 2: Basic Medical Sciences
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.05em", marginBottom: 6 }}>
              PROGRESS
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--green-700)", lineHeight: 1 }}>
              {earnedCredits}
              <span style={{ fontSize: 14, color: "var(--ink-400)", fontWeight: 400 }}>/{totalCredits} credits</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar percent={pct} width={200} />
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>{pct}% complete</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: 0, fontWeight: 600 }}>
            Year 1 Modules
          </h2>
          <span style={{ fontSize: 10, fontWeight: 600, background: "var(--green-100)", color: "var(--green-700)", padding: "3px 10px", borderRadius: "var(--radius-pill)", letterSpacing: "0.04em" }}>
            FOUNDATION PHASE
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {progress.map(({ module, isUnlocked, isCompleted }) => {
            const cfg = MOD_STYLE[module.code] ?? { icon: "file-text", color: "var(--ink-700)" }
            const card = (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                  position: "relative",
                  height: "100%",
                  boxShadow: "var(--shadow-card)",
                  border: isCompleted ? "1.5px solid var(--green-500)" : "1px solid var(--border)",
                  opacity: isUnlocked ? 1 : 0.5,
                }}
              >
                {isCompleted && (
                  <span style={{ position: "absolute", top: 12, right: 12, background: "var(--green-700)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--radius-pill)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon name="check-circle" size={11} /> DONE
                  </span>
                )}
                {!isUnlocked && (
                  <span style={{ position: "absolute", top: 12, right: 12, background: "var(--surface-subtle)", color: "var(--ink-400)", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: "var(--radius-pill)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon name="lock-key" size={11} /> LOCKED
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: `${cfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={cfg.icon} size={19} color={cfg.color} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color, letterSpacing: "0.08em" }}>{module.code}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-900)", margin: "0 0 10px", fontWeight: 600, lineHeight: 1.3, paddingRight: isCompleted || !isUnlocked ? 56 : 0 }}>
                  {module.title}
                </h3>
                {module.description && (
                  <p style={{ fontSize: 12, color: "var(--ink-500)", margin: "0 0 14px", lineHeight: 1.55 }}>
                    {module.description}
                  </p>
                )}
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-400)", paddingTop: 12, borderTop: "1px solid var(--surface-sunken)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="graduation-cap" size={13} /> {module.credits} credits</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Icon name="note-pencil" size={13} /> Pass: {module.passMark}%</span>
                </div>
              </div>
            )

            return isUnlocked ? (
              <Link
                key={module.id}
                href={`/dashboard/student/module/${module.id}`}
                className="card-hover"
                style={{ textDecoration: "none", display: "block", borderRadius: "var(--radius-lg)" }}
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
