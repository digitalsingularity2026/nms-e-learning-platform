import { auth } from "@/auth"
import { signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import AdminView from "./AdminView"

export default async function AdminPage() {
  const session = await auth()
  if (!session || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "IT_ADMIN")) redirect("/login")

  const [users, groups, modulesData, assignmentsData, gradesData] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { groupMembership: { include: { group: true } } },
    }),
    prisma.tutorGroup.findMany({
      include: { tutor: true, members: { include: { student: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.module.findMany({
      where: { course: { year: "YEAR_1" } },
      orderBy: { orderIndex: "asc" },
      include: {
        _count: { select: { lessons: { where: { isPublished: true } } } },
        quiz: { include: { _count: { select: { questions: true } } } },
      },
    }),
    prisma.moduleFacultyAssignment.findMany(),
    prisma.grade.findMany({
      where: { status: { in: ["IN_REVIEW", "APPROVED"] } },
      orderBy: { draftedAt: "asc" },
      include: {
        primaryMarker: { select: { id: true, name: true } },
        reviewer:      { select: { id: true, name: true } },
        submission: {
          include: {
            student: { select: { name: true, studentIdNumber: true } },
            assessment: { select: { title: true, maxMark: true, module: { select: { id: true, code: true } } } },
          },
        },
      },
    }),
  ])

  const stats = {
    students: users.filter(u => u.role === "STUDENT").length,
    faculty:  users.filter(u => u.role === "FACULTY").length,
    tutors:   users.filter(u => u.role === "TUTOR").length,
    admins:   users.filter(u => u.role === "SCHOOL_ADMIN" || u.role === "IT_ADMIN").length,
  }

  const facultyAssignments: Record<string, string[]> = {}
  for (const a of assignmentsData) {
    if (!facultyAssignments[a.facultyId]) facultyAssignments[a.facultyId] = []
    facultyAssignments[a.facultyId].push(a.moduleId)
  }

  const tutors = users.filter(u => u.role === "TUTOR")

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 64, flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🏥</span>
          <div>
            <div className="text-white font-semibold" style={{ fontFamily: "serif", fontSize: 17, lineHeight: 1.2 }}>Northern Medical School</div>
            <div style={{ color: "#7DB899", fontSize: 10, letterSpacing: "0.14em" }}>SCHOOL ADMINISTRATION</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-white font-medium" style={{ fontSize: 13 }}>{session.user.name}</div>
            <div style={{ color: "#7DB899", fontSize: 11 }}>{session.user.role === "IT_ADMIN" ? "IT Admin" : "School Admin"}</div>
          </div>
          <div className="flex items-center justify-center rounded-full text-white font-bold text-sm shrink-0" style={{ width: 34, height: 34, background: "#2D4A1A" }}>
            {(session.user.name ?? "A")[0]}
          </div>
          <Link href="/profile" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", borderRadius: 20, padding: "4px 12px", fontSize: 11, textDecoration: "none" }}>Profile</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
            <button type="submit" style={{ background: "rgba(255,255,255,0.1)", color: "#A8D4BE", border: "none", borderRadius: 20, padding: "4px 12px", fontSize: 11, cursor: "pointer" }}>Sign out</button>
          </form>
        </div>
      </header>

      <AdminView
        users={users.map(u => ({
          id: u.id, name: u.name ?? "", email: u.email, role: u.role,
          studentIdNumber: u.studentIdNumber,
          isActive: u.isActive, createdAt: u.createdAt.toISOString(),
          group: u.groupMembership ? { id: u.groupMembership.groupId, name: u.groupMembership.group.name } : null,
        }))}
        groups={groups.map(g => ({
          id: g.id, name: g.name,
          tutor: { id: g.tutor.id, name: g.tutor.name ?? "" },
          members: g.members.map(m => ({ id: m.student.id, name: m.student.name ?? "", email: m.student.email })),
        }))}
        modules={modulesData.map(m => ({
          id: m.id, code: m.code, title: m.title,
          lessons: m._count.lessons, questions: m.quiz?._count.questions ?? 0,
          isPublished: m.isPublished,
        }))}
        tutors={tutors.map(t => ({ id: t.id, name: t.name ?? "" }))}
        facultyAssignments={facultyAssignments}
        stats={stats}
        gradeQueue={gradesData.map(g => ({
          gradeId: g.id,
          status: g.status,
          mark: g.mark,
          feedback: g.feedback,
          markerId: g.primaryMarkerId,
          markerName: g.primaryMarker?.name ?? "—",
          reviewerName: g.reviewer?.name ?? null,
          studentName: g.submission.student.name ?? "",
          studentIdNumber: g.submission.student.studentIdNumber,
          assessmentTitle: g.submission.assessment.title,
          maxMark: g.submission.assessment.maxMark,
          moduleId: g.submission.assessment.module.id,
          moduleCode: g.submission.assessment.module.code,
          draftedAt: g.draftedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  )
}
