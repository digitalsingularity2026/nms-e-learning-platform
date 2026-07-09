import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { getStudentStatus, STUDENT_STATUS_STYLE } from "@/lib/studentStatus"
import { Navbar } from "@/components/ui/Navbar"
import { Avatar } from "@/components/ui/Avatar"
import { Button } from "@/components/ui/Button"
import { Icon } from "@/components/ui/Icon"
import { StatCard } from "@/components/ui/StatCard"
import { Table, TableRow } from "@/components/ui/Table"
import { ProgressBar } from "@/components/ui/ProgressBar"

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
    const status      = getStudentStatus(progress, attempts)
    const earnedCredits = progress.filter(p => p.isCompleted).reduce((s, p) => s + p.creditsAwarded, 0)
    return { ...m.student, progress, attempts, completed, current, lastAttempt, status, earnedCredits }
  }) ?? []

  const onTrack    = students.filter(s => s.status === "ON_TRACK" || s.status === "COMPLETED").length
  const struggling = students.filter(s => s.status === "STRUGGLING").length

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <Navbar
        subtitle="TUTOR — STUDENT SUPERVISION"
        userName={tutorName}
        userSub={group ? group.name : "No group assigned"}
        right={
          <>
            <Avatar name={tutorName} bg="var(--brown-700)" />
            <Link href="/profile" style={{ textDecoration: "none" }}><Button variant="ghostDark" size="sm">Profile</Button></Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <Button type="submit" variant="ghostDark" size="sm">Sign out</Button>
            </form>
          </>
        }
      />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 28px" }}>
        {!group && (
          <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: 40, textAlign: "center", boxShadow: "var(--shadow-card)" }}>
            <Icon name="chalkboard-teacher" size={40} color="var(--ink-400)" style={{ marginBottom: 14 }} />
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--green-700)", margin: "0 0 8px", fontWeight: 600 }}>No group assigned yet</h1>
            <p style={{ color: "var(--ink-500)", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>Contact the School Administrator to get set up.</p>
          </div>
        )}

        {group && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 26 }}>
              <StatCard icon="users" value={students.length} label="Students in group" />
              <StatCard icon="check-circle" value={onTrack} label="On track" />
              <StatCard icon="warning" value={struggling} label="Need attention" emphasis={struggling > 0} />
              <StatCard icon="books" value="Year 1" label={group.name} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: 0, fontWeight: 600 }}>Student Progress</h2>
              <Link href="/dashboard/tutor/students" style={{ fontSize: 12, color: "var(--blue-700)", fontWeight: 600, textDecoration: "none", background: "var(--blue-100)", padding: "6px 14px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="users" size={14} /> View All Students (school-wide)
              </Link>
            </div>

            {students.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "28px", border: "1px dashed var(--border-strong)", textAlign: "center", color: "var(--ink-400)", marginBottom: 28 }}>
                <p style={{ fontSize: 14 }}>No students assigned yet. Contact the Administrator.</p>
              </div>
            ) : (
              <div style={{ marginBottom: 28 }}>
                <Table columns={["Student", "Progress", "Current Module", "Last Activity", "Status"]}>
                  {students.map((s, i) => {
                    const st  = STUDENT_STATUS_STYLE[s.status]
                    const pct = s.progress.length > 0 ? Math.round((s.completed / s.progress.length) * 100) : 0
                    const lastDate  = s.lastAttempt?.submittedAt
                    const lastLabel = lastDate
                      ? new Date(lastDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "No activity"
                    return (
                      <TableRow key={s.id} index={i}>
                        <td style={{ padding: "12px 16px" }}>
                          <Link href={`/dashboard/tutor/student/${s.id}`} style={{ textDecoration: "none" }}>
                            <div style={{ fontWeight: 500, color: "var(--green-700)" }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "var(--ink-400)" }}>{s.studentIdNumber ? `${s.studentIdNumber} · ` : ""}{s.email}</div>
                          </Link>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <ProgressBar percent={pct} width={100} height={5} />
                          <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 4 }}>{s.completed}/{s.progress.length} modules · {s.earnedCredits} credits</div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--ink-700)", fontSize: 12 }}>
                          {s.current ? `${s.current.module.code}: ${s.current.module.title}`
                            : s.completed === s.progress.length && s.progress.length > 0
                            ? <span style={{ color: "var(--green-700)", fontWeight: 500 }}>All complete</span>
                            : <span style={{ color: "var(--ink-400)" }}>Not enrolled</span>}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--ink-400)", fontSize: 12 }}>{lastLabel}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                      </TableRow>
                    )
                  })}
                </Table>
              </div>
            )}

            {struggling > 0 && (
              <div style={{ background: "var(--warning-100)", border: "1px solid var(--warning-700)", borderRadius: "var(--radius-xl)", padding: "16px 20px", marginBottom: 28, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Icon name="warning" size={18} color="var(--warning-700)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 600, color: "var(--warning-700)", fontSize: 14, marginBottom: 4 }}>{struggling} student{struggling > 1 ? "s" : ""} need{struggling === 1 ? "s" : ""} attention</div>
                  <div style={{ fontSize: 13, color: "var(--warning-700)" }}>{students.filter(s => s.status === "STRUGGLING").map(s => s.name).join(", ")} — failed their latest quiz attempt.</div>
                </div>
              </div>
            )}

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink-900)", margin: "0 0 14px", fontWeight: 600 }}>Group Announcements</h2>

            <form action={postAnnouncement} style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "20px 22px", boxShadow: "var(--shadow-card)", marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", display: "block", marginBottom: 8, letterSpacing: "0.08em" }}>POST TO {group.name.toUpperCase()}</label>
              <textarea name="content" rows={3} placeholder="Write a message, reminder, or update for your students…" required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", marginBottom: 10, boxSizing: "border-box" }} />
              <Button type="submit">Post to Group</Button>
            </form>

            {group.announcements.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {group.announcements.map(a => (
                  <div key={a.id} style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "14px 18px", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green-700)" }}>{a.author.name}</span>
                      <span style={{ fontSize: 11, color: "var(--ink-400)" }}>{new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--ink-700)", margin: 0, lineHeight: 1.6 }}>{a.content}</p>
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
