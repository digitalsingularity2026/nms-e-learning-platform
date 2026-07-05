"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

async function facultySession(moduleId: string) {
  const session = await auth()
  if (!session || session.user.role !== "FACULTY") return null
  const assignment = await prisma.moduleFacultyAssignment.findUnique({
    where: { moduleId_facultyId: { moduleId, facultyId: session.user.id } },
  })
  return assignment ? session : null
}

function isAdminRole(role: string) {
  return role === "SCHOOL_ADMIN" || role === "IT_ADMIN"
}

function revalidateModule(moduleId: string) {
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  revalidatePath(`/dashboard/student/module/${moduleId}`)
  revalidatePath("/dashboard/admin")
}

// ── Faculty: assessment management ─────────────────────────────────────────

type AssessmentInput = {
  title: string; description: string; maxMark: number; passMark: number
  dueDate?: string | null; isPublished: boolean
}

function validateAssessmentInput(data: AssessmentInput): string | null {
  if (!data.title.trim()) return "Title is required."
  if (!Number.isInteger(data.maxMark) || data.maxMark < 1) return "Max mark must be a whole number of at least 1."
  if (!Number.isInteger(data.passMark) || data.passMark < 0 || data.passMark > data.maxMark) return "Pass mark must be between 0 and the max mark."
  return null
}

export async function createAssessment(moduleId: string, data: AssessmentInput) {
  if (!await facultySession(moduleId)) return { error: "Unauthorized" }
  const invalid = validateAssessmentInput(data)
  if (invalid) return { error: invalid }
  await prisma.assessment.create({
    data: {
      moduleId,
      title: data.title.trim(),
      description: data.description,
      type: "ESSAY",
      maxMark: data.maxMark,
      passMark: data.passMark,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      isPublished: data.isPublished,
    },
  })
  revalidateModule(moduleId)
  return { success: true }
}

export async function updateAssessment(assessmentId: string, moduleId: string, data: AssessmentInput) {
  if (!await facultySession(moduleId)) return { error: "Unauthorized" }
  const invalid = validateAssessmentInput(data)
  if (invalid) return { error: invalid }
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, select: { moduleId: true } })
  if (!assessment || assessment.moduleId !== moduleId) return { error: "Assessment not found in this module" }
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      title: data.title.trim(),
      description: data.description,
      maxMark: data.maxMark,
      passMark: data.passMark,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      isPublished: data.isPublished,
    },
  })
  revalidateModule(moduleId)
  return { success: true }
}

export async function deleteAssessment(assessmentId: string, moduleId: string) {
  if (!await facultySession(moduleId)) return { error: "Unauthorized" }
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { moduleId: true, _count: { select: { submissions: true } } },
  })
  if (!assessment || assessment.moduleId !== moduleId) return { error: "Assessment not found in this module" }
  if (assessment._count.submissions > 0) return { error: "Students have already submitted work — this assessment can no longer be deleted. Unpublish it instead." }
  await prisma.assessment.delete({ where: { id: assessmentId } })
  revalidateModule(moduleId)
  return { success: true }
}

// ── Student: essay submission ───────────────────────────────────────────────

export async function submitEssay(assessmentId: string, moduleId: string, text: string) {
  const session = await auth()
  if (!session || session.user.role !== "STUDENT") return { error: "Unauthorized" }
  const content = text.trim()
  if (!content) return { error: "Your submission is empty." }
  if (content.length > 50000) return { error: "Your submission is too long (max 50,000 characters)." }

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } })
  if (!assessment || assessment.moduleId !== moduleId || !assessment.isPublished) return { error: "Assessment not found" }

  const progress = await prisma.moduleProgress.findUnique({
    where: { studentId_moduleId: { studentId: session.user.id, moduleId } },
  })
  if (!progress?.isUnlocked) return { error: "This module is locked." }

  const existing = await prisma.submission.findUnique({
    where: { assessmentId_studentId: { assessmentId, studentId: session.user.id } },
    include: { grade: { select: { id: true } } },
  })
  if (existing?.grade) return { error: "Your submission has already entered grading and can no longer be changed." }

  if (existing) {
    await prisma.submission.update({ where: { id: existing.id }, data: { textContent: content, submittedAt: new Date() } })
  } else {
    await prisma.submission.create({ data: { assessmentId, studentId: session.user.id, textContent: content } })
  }
  revalidateModule(moduleId)
  return { success: true }
}

// ── Grading chain: Primary Marker → Reviewer → Registrar ───────────────────

export async function submitGradeForReview(submissionId: string, moduleId: string, mark: number, feedback: string) {
  const session = await facultySession(moduleId)
  if (!session) return { error: "Unauthorized" }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { assessment: { select: { moduleId: true, maxMark: true } }, grade: true },
  })
  if (!submission || submission.assessment.moduleId !== moduleId) return { error: "Submission not found in this module" }
  if (!Number.isInteger(mark) || mark < 0 || mark > submission.assessment.maxMark) {
    return { error: `Mark must be a whole number between 0 and ${submission.assessment.maxMark}.` }
  }

  const existing = submission.grade
  if (existing && existing.status !== "DRAFT" && existing.status !== "RETURNED") {
    return { error: "This grade is already in review or finalized." }
  }

  const grade = existing
    ? await prisma.grade.update({
        where: { id: existing.id },
        data: { mark, feedback, status: "IN_REVIEW", primaryMarkerId: session.user.id, draftedAt: new Date() },
      })
    : await prisma.grade.create({
        data: { submissionId, mark, feedback, status: "IN_REVIEW", primaryMarkerId: session.user.id, draftedAt: new Date() },
      })

  await prisma.gradeAudit.create({
    data: {
      gradeId: grade.id,
      actorId: session.user.id,
      fromStatus: existing?.status ?? null,
      toStatus: "IN_REVIEW",
      note: existing?.status === "RETURNED" ? "Re-marked after return" : "Marked and sent for review",
    },
  })
  revalidateModule(moduleId)
  return { success: true }
}

export async function reviewGrade(gradeId: string, moduleId: string, decision: "approve" | "return", note: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  if (session.user.role === "FACULTY") {
    const assignment = await prisma.moduleFacultyAssignment.findUnique({
      where: { moduleId_facultyId: { moduleId, facultyId: session.user.id } },
    })
    if (!assignment) return { error: "Unauthorized" }
  } else if (!isAdminRole(session.user.role)) {
    return { error: "Unauthorized" }
  }

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    include: { submission: { select: { assessment: { select: { moduleId: true } } } } },
  })
  if (!grade || grade.submission.assessment.moduleId !== moduleId) return { error: "Grade not found" }
  if (grade.status !== "IN_REVIEW") return { error: "This grade is not awaiting review." }
  if (grade.primaryMarkerId === session.user.id) return { error: "The reviewer must be a different person from the primary marker." }

  const trimmedNote = note.trim()
  if (decision === "return" && !trimmedNote) return { error: "Add a note explaining what the marker should reconsider." }

  const toStatus = decision === "approve" ? "APPROVED" : "RETURNED"
  await prisma.grade.update({
    where: { id: gradeId },
    data: { status: toStatus, reviewerId: session.user.id, reviewerNote: trimmedNote || null, reviewedAt: new Date() },
  })
  await prisma.gradeAudit.create({
    data: { gradeId, actorId: session.user.id, fromStatus: "IN_REVIEW", toStatus, note: trimmedNote || null },
  })
  revalidateModule(moduleId)
  return { success: true }
}

export async function publishGrade(gradeId: string) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) return { error: "Unauthorized" }

  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
    include: { submission: { select: { assessment: { select: { moduleId: true } } } } },
  })
  if (!grade) return { error: "Grade not found" }
  if (grade.status !== "APPROVED") return { error: "Only approved grades can be published." }

  await prisma.grade.update({
    where: { id: gradeId },
    data: { status: "PUBLISHED", registrarId: session.user.id, publishedAt: new Date() },
  })
  await prisma.gradeAudit.create({
    data: { gradeId, actorId: session.user.id, fromStatus: "APPROVED", toStatus: "PUBLISHED", note: null },
  })
  revalidateModule(grade.submission.assessment.moduleId)
  return { success: true }
}
