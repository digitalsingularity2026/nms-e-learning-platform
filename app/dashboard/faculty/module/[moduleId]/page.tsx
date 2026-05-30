import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import FacultyModuleView from "./FacultyModuleView"

export default async function FacultyModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "FACULTY") redirect("/login")

  const { moduleId } = await params

  const assignment = await prisma.moduleFacultyAssignment.findUnique({
    where: { moduleId_facultyId: { moduleId, facultyId: session.user.id } },
  })
  if (!assignment) redirect("/dashboard/faculty")

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        include: { videos: { orderBy: { orderIndex: "asc" } } },
      },
      quiz: {
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: { options: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  })
  if (!module) notFound()

  const pendingAttempts = module.quiz ? await prisma.quizAttempt.findMany({
    where: { quizId: module.quiz.id, status: "PENDING_REVIEW" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      answers: {
        include: { question: { select: { id: true, type: true, text: true, points: true } } },
      },
    },
    orderBy: { submittedAt: "desc" },
  }) : []

  const pending = pendingAttempts.map(a => ({
    id: a.id,
    score: a.score,
    submittedAt: a.submittedAt?.toISOString() ?? null,
    student: { id: a.student.id, name: a.student.name ?? "", email: a.student.email },
    shortAnswers: a.answers
      .filter(ans => ans.question.type === "SHORT_ANSWER")
      .map(ans => ({
        questionId: ans.question.id,
        questionText: ans.question.text,
        points: ans.question.points,
        textAnswer: ans.textAnswer,
      })),
  }))

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 60, flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/faculty" style={{ color: "#7DB899", fontSize: 13, textDecoration: "none" }}>← My Modules</Link>
          <span style={{ color: "#2D5E40" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{module.code}: {module.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: "#fff", fontSize: 13 }}>{session.user.name}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button type="submit" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>Sign out</button>
          </form>
        </div>
      </header>

      <FacultyModuleView
        module={{ id: module.id, code: module.code, title: module.title, isPublished: module.isPublished }}
        lessons={module.lessons.map(l => ({
          id: l.id, title: l.title, content: l.content, isPublished: l.isPublished,
          videos: l.videos.map(v => ({ id: v.id, title: v.title, url: v.url, type: v.type })),
        }))}
        quiz={module.quiz ? {
          id: module.quiz.id,
          instructions: module.quiz.instructions ?? "",
          questions: module.quiz.questions.map(q => ({
            id: q.id, text: q.text, type: q.type,
            hintText: q.hintText, points: q.points,
            options: q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, matchText: o.matchText })),
          })),
        } : null}
        pendingAttempts={pending}
      />
    </div>
  )
}
