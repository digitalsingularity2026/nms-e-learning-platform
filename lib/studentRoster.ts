import { prisma } from "@/lib/prisma"
import { getStudentStatus, type StudentStatus } from "@/lib/studentStatus"

export type RosterStudent = {
  id: string; name: string; email: string; studentIdNumber: string | null
  groupName: string | null; tutorName: string | null
  completedModules: number; totalModules: number
  earnedCredits: number; totalCredits: number
  status: StudentStatus
}

export async function getStudentRoster(): Promise<RosterStudent[]> {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    include: {
      groupMembership: { include: { group: { include: { tutor: { select: { name: true } } } } } },
      moduleProgress: { include: { module: { select: { credits: true } } } },
      quizAttempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 30,
        select: { passed: true, quizId: true },
      },
    },
  })

  return students.map(s => {
    const progress = s.moduleProgress
    const completedModules = progress.filter(p => p.isCompleted).length
    const totalCredits = progress.reduce((sum, p) => sum + p.module.credits, 0)
    const earnedCredits = progress.filter(p => p.isCompleted).reduce((sum, p) => sum + p.creditsAwarded, 0)
    return {
      id: s.id, name: s.name ?? "", email: s.email, studentIdNumber: s.studentIdNumber,
      groupName: s.groupMembership?.group.name ?? null,
      tutorName: s.groupMembership?.group.tutor.name ?? null,
      completedModules, totalModules: progress.length,
      earnedCredits, totalCredits,
      status: getStudentStatus(progress, s.quizAttempts),
    }
  })
}
