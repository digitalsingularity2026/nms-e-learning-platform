import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import ModuleView from "./ModuleView"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "STUDENT") redirect("/login")

  const { moduleId } = await params
  const studentId = session.user.id

  const [module, progress] = await Promise.all([
    prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { orderIndex: "asc" },
          include: {
            videos: { orderBy: { orderIndex: "asc" } },
            files:  { orderBy: { orderIndex: "asc" } },
          },
        },
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              include: { options: { orderBy: { orderIndex: "asc" } } },
            },
          },
        },
        assessments: {
          where: { isPublished: true },
          orderBy: { createdAt: "asc" },
          include: {
            submissions: {
              where: { studentId },
              include: { grade: true },
            },
          },
        },
      },
    }),
    prisma.moduleProgress.findUnique({
      where: { studentId_moduleId: { studentId, moduleId } },
    }),
  ])

  if (!module) notFound()
  if (!progress?.isUnlocked) redirect("/dashboard/student")

  const hasPassedQuiz = module.quiz
    ? !!(await prisma.quizAttempt.findFirst({ where: { quizId: module.quiz.id, studentId, passed: true } }))
    : false

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--green-700)", height: 60, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard/student" style={{ color: "var(--text-on-dark-muted)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="arrow-left" size={13} /> Dashboard
          </Link>
          <span style={{ color: "var(--green-600)" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{module.code}: {module.title}</span>
          {progress.isCompleted && (
            <span style={{ background: "var(--gold-600)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 12px", borderRadius: "var(--radius-pill)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="check-circle" size={11} /> MODULE COMPLETE
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#fff", fontSize: 13 }}>{session.user.name}</span>
          <Link href="/profile" style={{ textDecoration: "none" }}><Button variant="ghostDark" size="sm">Profile</Button></Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <Button type="submit" variant="ghostDark" size="sm">Sign out</Button>
          </form>
        </div>
      </header>

      <ModuleView
        module={{ id: module.id, code: module.code, title: module.title, credits: module.credits, passMark: module.passMark, description: module.description, learningObjectives: module.learningObjectives }}
        lessons={module.lessons.map(l => ({
          id: l.id, title: l.title, content: l.content,
          videos: l.videos.map(v => ({ id: v.id, title: v.title, type: v.type, url: v.url })),
          files:  l.files.map(f => ({ id: f.id, title: f.title, url: f.url, mimeType: f.mimeType, fileSizeBytes: f.fileSizeBytes })),
        }))}
        quiz={module.quiz ? {
          id: module.quiz.id,
          title: module.quiz.title,
          instructions: module.quiz.instructions,
          questions: module.quiz.questions.map(q => ({
            id: q.id, text: q.text, type: q.type,
            hintText: q.hintText,
            points: q.points,
            explanation: q.explanation,
            options: q.options.map(o => ({ id: o.id, text: o.text, matchText: o.matchText })),
          })),
        } : null}
        hasPassedQuiz={hasPassedQuiz}
        assessments={module.assessments.map(a => {
          const sub = a.submissions[0] ?? null
          const grade = sub?.grade ?? null
          // only expose the grade once the registrar publishes it
          const published = grade?.status === "PUBLISHED"
          return {
            id: a.id, title: a.title, description: a.description,
            maxMark: a.maxMark, passMark: a.passMark,
            dueDate: a.dueDate?.toISOString() ?? null,
            submission: sub ? {
              textContent: sub.textContent ?? "",
              submittedAt: sub.submittedAt.toISOString(),
              inGrading: !!grade,
              grade: published && grade ? {
                mark: grade.mark ?? 0,
                feedback: grade.feedback,
                publishedAt: grade.publishedAt?.toISOString() ?? null,
              } : null,
            } : null,
          }
        })}
      />
    </div>
  )
}
