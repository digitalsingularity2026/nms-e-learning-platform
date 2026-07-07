import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

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
    <div style={{ minHeight: "100vh", background: "#F7F3ED" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 60 }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/tutor" style={{ color: "#7DB899", fontSize: 13, textDecoration: "none" }}>← My Group</Link>
          <span style={{ color: "#2D5E40" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{student.name}</span>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontFamily: "serif", fontSize: 22, color: "#0C3D26", margin: "0 0 4px", fontWeight: 600 }}>{student.name}</h1>
            <div style={{ fontSize: 13, color: "#6B7280" }}>
              {student.email}
              {student.studentIdNumber && <span style={{ color: "#B47E2A", fontWeight: 600, marginLeft: 8 }}>ID: {student.studentIdNumber}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "serif", fontSize: 24, fontWeight: 700, color: "#0C3D26" }}>{earnedCredits}<span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 400 }}>/{totalCredits} credits</span></div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{completed}/{student.moduleProgress.length} modules complete</div>
          </div>
        </div>

        <h2 style={{ fontFamily: "serif", fontSize: 17, color: "#1A1A1A", margin: "0 0 12px", fontWeight: 600 }}>Module Progress</h2>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden", marginBottom: 26 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0C3D26" }}>
                {["Module", "Status", "Credits"].map(h => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {student.moduleProgress.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #F0EAE0" }}>
                  <td style={{ padding: "10px 16px", color: "#1A1A1A", fontWeight: 500 }}>{p.module.code}: {p.module.title}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: p.isCompleted ? "#E3F0E9" : p.isUnlocked ? "#FEF3C7" : "#F3F4F6", color: p.isCompleted ? "#0C3D26" : p.isUnlocked ? "#92400E" : "#9CA3AF" }}>
                      {p.isCompleted ? "✓ Complete" : p.isUnlocked ? "In Progress" : "🔒 Locked"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#6B7280" }}>{p.creditsAwarded}/{p.module.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontFamily: "serif", fontSize: 17, color: "#1A1A1A", margin: "0 0 12px", fontWeight: 600 }}>Quiz Attempts</h2>
        {student.quizAttempts.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 26 }}>No quiz attempts yet.</p>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden", marginBottom: 26 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0C3D26" }}>
                  {["Module", "Score", "Result", "Submitted"].map(h => (
                    <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {student.quizAttempts.map((a, i) => (
                  <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #F0EAE0" }}>
                    <td style={{ padding: "10px 16px", color: "#1A1A1A", fontWeight: 500 }}>{a.quiz.module.code}: {a.quiz.module.title}</td>
                    <td style={{ padding: "10px 16px", color: "#374151" }}>{a.score != null ? `${a.score}%` : "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {a.status === "PENDING_REVIEW" ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "#FBF4E3", color: "#B47E2A" }}>Pending Review</span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: a.passed ? "#E3F0E9" : "#FEE2E2", color: a.passed ? "#0C3D26" : "#B91C1C" }}>{a.passed ? "Passed" : "Not Passed"}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#9CA3AF" }}>{a.submittedAt ? new Date(a.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 style={{ fontFamily: "serif", fontSize: 17, color: "#1A1A1A", margin: "0 0 12px", fontWeight: 600 }}>Written Assignments</h2>
        {student.submissions.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>No assignment submissions yet.</p>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#0C3D26" }}>
                  {["Assignment", "Status", "Mark"].map(h => (
                    <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {student.submissions.map((s, i) => {
                  const published = s.grade?.status === "PUBLISHED"
                  return (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #F0EAE0" }}>
                      <td style={{ padding: "10px 16px", color: "#1A1A1A", fontWeight: 500 }}>{s.assessment.module.code}: {s.assessment.title}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: published ? "#E3F0E9" : "#F3F4F6", color: published ? "#0C3D26" : "#9CA3AF" }}>
                          {published ? "Graded" : "In progress"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: "#374151" }}>{published ? `${s.grade!.mark}/${s.assessment.maxMark}` : "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
