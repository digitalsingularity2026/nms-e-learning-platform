import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/ui/Icon"
import { Badge } from "@/components/ui/Badge"
import { Table, TableRow } from "@/components/ui/Table"
import { Button } from "@/components/ui/Button"

export default async function TutorStudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "TUTOR") redirect("/login")

  const { studentId } = await params

  const membership = await prisma.groupMembership.findUnique({
    where: { studentId },
    include: { group: true },
  })
  if (!membership || membership.group.tutorId !== session.user.id) notFound()

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      moduleProgress: {
        include: { module: { select: { id: true, code: true, title: true, orderIndex: true, credits: true, passMark: true } } },
        orderBy: { module: { orderIndex: "asc" } },
      },
      quizAttempts: {
        where: { status: { in: ["SUBMITTED", "PENDING_REVIEW"] } },
        orderBy: { submittedAt: "desc" },
        include: { quiz: { select: { module: { select: { code: true, title: true } } } } },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          assessment: { select: { title: true, maxMark: true, passMark: true, module: { select: { code: true } } } },
          grade: { select: { status: true, mark: true } },
        },
      },
    },
  })
  if (!student) notFound()

  const completed = student.moduleProgress.filter(p => p.isCompleted).length
  const totalCredits = student.moduleProgress.reduce((s, p) => s + p.module.credits, 0)
  const earnedCredits = student.moduleProgress.filter(p => p.isCompleted).reduce((s, p) => s + p.creditsAwarded, 0)

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--green-700)", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
          <Link href="/dashboard/tutor" style={{ color: "var(--text-on-dark-muted)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <Icon name="arrow-left" size={13} /> My Group
          </Link>
          <span style={{ color: "var(--green-600)", flexShrink: 0 }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{student.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <span className="hidden sm:inline" style={{ color: "#fff", fontSize: 13, whiteSpace: "nowrap" }}>{session.user.name}</span>
          <Link href="/profile" style={{ textDecoration: "none" }}><Button variant="ghostDark" size="sm">Profile</Button></Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <Button type="submit" variant="ghostDark" size="sm">Sign out</Button>
          </form>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--green-700)", margin: "0 0 4px", fontWeight: 600 }}>{student.name}</h1>
            <div style={{ fontSize: 13, color: "var(--ink-500)" }}>
              {student.email}
              {student.studentIdNumber && <span style={{ color: "var(--gold-700)", fontWeight: 600, marginLeft: 8 }}>ID: {student.studentIdNumber}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, color: "var(--green-700)" }}>{earnedCredits}<span style={{ fontSize: 13, color: "var(--ink-400)", fontWeight: 400 }}>/{totalCredits} credits</span></div>
            <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{completed}/{student.moduleProgress.length} modules complete</div>
          </div>
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: "0 0 12px", fontWeight: 600 }}>Module Progress</h2>
        <div style={{ marginBottom: 26 }}>
          <Table columns={["Module", "Status", "Credits"]}>
            {student.moduleProgress.map((p, i) => (
              <TableRow key={p.id} index={i}>
                <td style={{ padding: "10px 16px", color: "var(--ink-900)", fontWeight: 500 }}>{p.module.code}: {p.module.title}</td>
                <td style={{ padding: "10px 16px" }}>
                  {p.isCompleted ? <Badge status="active">Complete</Badge> : p.isUnlocked ? <Badge status="warning">In Progress</Badge> : <Badge status="inactive">Locked</Badge>}
                </td>
                <td style={{ padding: "10px 16px", color: "var(--ink-500)" }}>{p.creditsAwarded}/{p.module.credits}</td>
              </TableRow>
            ))}
          </Table>
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: "0 0 12px", fontWeight: 600 }}>Quiz Attempts</h2>
        {student.quizAttempts.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-400)", marginBottom: 26 }}>No quiz attempts yet.</p>
        ) : (
          <div style={{ marginBottom: 26 }}>
            <Table columns={["Module", "Score", "Result", "Submitted"]}>
              {student.quizAttempts.map((a, i) => (
                <TableRow key={a.id} index={i}>
                  <td style={{ padding: "10px 16px", color: "var(--ink-900)", fontWeight: 500 }}>{a.quiz.module.code}: {a.quiz.module.title}</td>
                  <td style={{ padding: "10px 16px", color: "var(--ink-700)" }}>{a.score != null ? `${a.score}%` : "—"}</td>
                  <td style={{ padding: "10px 16px" }}>
                    {a.status === "PENDING_REVIEW" ? <Badge status="warning">Pending Review</Badge> : <Badge status={a.passed ? "active" : "error"}>{a.passed ? "Passed" : "Not Passed"}</Badge>}
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--ink-400)" }}>{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</td>
                </TableRow>
              ))}
            </Table>
          </div>
        )}

        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: "0 0 12px", fontWeight: 600 }}>Written Assignments</h2>
        {student.submissions.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-400)" }}>No assignment submissions yet.</p>
        ) : (
          <Table columns={["Assignment", "Status", "Mark"]}>
            {student.submissions.map((s, i) => {
              const published = s.grade?.status === "PUBLISHED"
              return (
                <TableRow key={s.id} index={i}>
                  <td style={{ padding: "10px 16px", color: "var(--ink-900)", fontWeight: 500 }}>{s.assessment.module.code}: {s.assessment.title}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <Badge status={published ? "active" : "inactive"}>{published ? "Graded" : "In progress"}</Badge>
                  </td>
                  <td style={{ padding: "10px 16px", color: "var(--ink-700)" }}>{published ? `${s.grade!.mark}/${s.assessment.maxMark}` : "—"}</td>
                </TableRow>
              )
            })}
          </Table>
        )}
      </main>
    </div>
  )
}
