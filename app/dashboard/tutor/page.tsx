import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

type Status = "NOT_STARTED" | "ON_TRACK" | "STRUGGLING" | "COMPLETED"

function getStatus(
  progress: Array<{ isCompleted: boolean }>,
  attempts: Array<{ passed: boolean | null; quizId: string }>
): Status {
  const total     = progress.length
  const completed = progress.filter(p => p.isCompleted).length
  if (total > 0 && completed === total) return "COMPLETED"
  if (attempts.length === 0) return "NOT_STARTED"
  const latestPassed = new Map<string, boolean | null>()
  for (const a of attempts) {
    if (!latestPassed.has(a.quizId)) latestPassed.set(a.quizId, a.passed)
  }
  if ([...latestPassed.values()].some(v => v === false)) return "STRUGGLING"
  return "ON_TRACK"
}

const STATUS_STYLE: Record<Status, { bg: string; color: string; label: string }> = {
  COMPLETED:   { bg: "#0C3D26", color: "#fff",    label: "✓ Completed" },
  ON_TRACK:    { bg: "#E3F0E9", color: "#0C3D26", label: "On Track"    },
  STRUGGLING:  { bg: "#FEF3C7", color: "#92400E", label: "Needs Help"  },
  NOT_STARTED: { bg: "#F3F4F6", color: "#9CA3AF", label: "Not Started" },
}

export default async function TutorDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "TUTOR") redirect("/login")

  const tutorId   = session.user.id
  const tutorName = session.user.name

  const group = await prisma.tutorGroup.findFirst({
    where: { tutorId },
    include: {
      members: {
        include: {
          student: {
            include: {
              moduleProgress: {
                include: { module: { select: { id: true, code: true, title: true, orderIndex: true, credits: true } } },
                orderBy: { module: { orderIndex: "asc" } },
              },
              quizAttempts: {
                where: { status: "SUBMITTED" },
                orderBy: { submittedAt: "desc" },
                take: 30,
              },
            },
          },
        },
      },
      announcements: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { name: true } } },
      },
    },
  })

  const groupId = group?.id ?? null

  async function postAnnouncement(formData: FormData) {
    "use server"
    const content = (formData.get("content") as string)?.trim()
    if (!content || !groupId) return
    await prisma.announcement.create({
      data: {
        authorId: tutorId,
        scope: "GROUP",
        groupId,
        title: "Message from your tutor",
        content,
      },
    })
    revalidatePath("/dashboard/tutor")
  }

  const students = group?.members.map(m => {
    const progress    = m.student.moduleProgress
    const attempts    = m.student.quizAttempts
    const completed   = progress.filter(p => p.isCompleted).length
    const current     = progress.find(p => p.isUnlocked && !p.isCompleted)
    const lastAttempt = attempts[0]
    const status      = getStatus(progress, attempts)
    const earnedCredits = progress.filter(p => p.isCompleted).reduce((s, p) => s + p.creditsAwarded, 0)
    return { ...m.student, progress, attempts, completed, current, lastAttempt, status, earnedCredits }
  }) ?? []

  const onTrack    = students.filter(s => s.status === "ON_TRACK" || s.status === "COMPLETED").length
  const struggling = students.filter(s => s.status === "STRUGGLING").length

  return (
    <div className="min-h-screen" style={{ background: "#F7F3ED" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 64 }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <div>
            <div className="text-white font-semibold" style={{ fontFamily: "serif", fontSize: 17, lineHeight: 1.2 }}>Northern Medical School</div>
            <div style={{ color: "#7DB899", fontSize: 10, letterSpacing: "0.14em" }}>TUTOR — STUDENT SUPERVISION</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-medium" style={{ fontSize: 13 }}>{tutorName}</div>
            <div style={{ color: "#7DB899", fontSize: 11 }}>{group ? group.name : "No group assigned"}</div>
          </div>
          <div className="flex items-center justify-center rounded-full text-white font-bold text-sm shrink-0"
            style={{ width: 34, height: 34, background: "#5A2800" }}>
            {(tutorName ?? "T")[0]}
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button type="submit" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>Sign out</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-7 py-8">
        {!group && (
          <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid #E2D9CC" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🏫</div>
            <h1 style={{ fontFamily: "serif", fontSize: 22, color: "#0C3D26", margin: "0 0 8px", fontWeight: 600 }}>No group assigned yet</h1>
            <p style={{ color: "#6B7280", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>Contact the School Administrator to get set up.</p>
          </div>
        )}

        {group && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 26 }}>
              {[
                { icon: "👥", value: students.length, label: "Students in group" },
                { icon: "✅", value: onTrack,          label: "On track"          },
                { icon: "⚠️", value: struggling,       label: "Need attention"    },
                { icon: "📚", value: "Year 1",         label: group.name          },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: i === 2 && struggling > 0 ? "1.5px solid #FCA5A5" : "1px solid #E2D9CC", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: i === 2 && struggling > 0 ? "#B91C1C" : "#0C3D26", fontFamily: "serif", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ fontFamily: "serif", fontSize: 18, color: "#1A1A1A", margin: "0 0 14px", fontWeight: 600 }}>Student Progress</h2>

            {students.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 12, padding: "28px", border: "1px dashed #E2D9CC", textAlign: "center", color: "#9CA3AF", marginBottom: 28 }}>
                <p style={{ fontSize: 14 }}>No students assigned yet. Contact the Administrator.</p>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden", marginBottom: 28 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#0C3D26" }}>
                      {["Student", "Progress", "Current Module", "Last Activity", "Status"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const st  = STATUS_STYLE[s.status]
                      const pct = s.progress.length > 0 ? Math.round((s.completed / s.progress.length) * 100) : 0
                      const lastDate  = s.lastAttempt?.submittedAt
                      const lastLabel = lastDate
                        ? new Date(lastDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "No activity"
                      return (
                        <tr key={s.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAF8", borderBottom: "1px solid #F0EAE0" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 500, color: "#1A1A1A" }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "#9CA3AF" }}>{s.email}</div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ width: 100, height: 5, background: "#EDE8E0", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #0C3D26, #2D7A50)", borderRadius: 3 }} />
                            </div>
                            <div style={{ fontSize: 11, color: "#6B7280" }}>{s.completed}/{s.progress.length} modules · {s.earnedCredits} credits</div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#374151", fontSize: 12 }}>
                            {s.current ? `${s.current.module.code}: ${s.current.module.title}`
                              : s.completed === s.progress.length && s.progress.length > 0
                              ? <span style={{ color: "#0C3D26", fontWeight: 500 }}>All complete ✓</span>
                              : <span style={{ color: "#C5BAB0" }}>Not enrolled</span>}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>{lastLabel}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: st.bg, color: st.color }}>{st.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {struggling > 0 && (
              <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 12, padding: "16px 20px", marginBottom: 28 }}>
                <div style={{ fontWeight: 600, color: "#92400E", fontSize: 14, marginBottom: 6 }}>⚠ {struggling} student{struggling > 1 ? "s" : ""} need{struggling === 1 ? "s" : ""} attention</div>
                <div style={{ fontSize: 13, color: "#78350F" }}>{students.filter(s => s.status === "STRUGGLING").map(s => s.name).join(", ")} — failed their latest quiz attempt.</div>
              </div>
            )}

            <h2 style={{ fontFamily: "serif", fontSize: 18, color: "#1A1A1A", margin: "0 0 14px", fontWeight: 600 }}>Group Announcements</h2>

            <form action={postAnnouncement} style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #E2D9CC", marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 8, letterSpacing: "0.08em" }}>POST TO {group.name.toUpperCase()}</label>
              <textarea name="content" rows={3} placeholder="Write a message, reminder, or update for your students…" required
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", marginBottom: 10 }} />
              <button type="submit" style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Post to Group</button>
            </form>

            {group.announcements.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {group.announcements.map(a => (
                  <div key={a.id} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", border: "1px solid #E2D9CC" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0C3D26" }}>{a.author.name}</span>
                      <span style={{ fontSize: 11, color: "#9CA3AF" }}>{new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.6 }}>{a.content}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
