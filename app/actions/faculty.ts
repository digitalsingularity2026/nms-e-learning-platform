"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { r2, R2_BUCKET } from "@/lib/r2"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"

async function checkFacultyAccess(moduleId: string) {
  const session = await auth()
  if (!session || session.user.role !== "FACULTY") return null
  const assignment = await prisma.moduleFacultyAssignment.findUnique({
    where: { moduleId_facultyId: { moduleId, facultyId: session.user.id } },
  })
  return assignment ? session.user.id : null
}

async function lessonBelongsToModule(lessonId: string, moduleId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { moduleId: true } })
  return lesson?.moduleId === moduleId
}

// Best-effort cleanup — a failed R2 delete should never block the DB operation
async function deleteFromR2(r2Key: string | null | undefined) {
  if (!r2Key) return
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }))
  } catch (err) {
    console.error("R2 delete failed for key:", r2Key, err)
  }
}

export async function createLesson(moduleId: string, data: { title: string; content: string; isPublished: boolean }) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  const count = await prisma.lesson.count({ where: { moduleId } })
  await prisma.lesson.create({ data: { moduleId, ...data, orderIndex: count + 1 } })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function updateLesson(lessonId: string, moduleId: string, data: { title: string; content: string; isPublished: boolean }) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  if (!await lessonBelongsToModule(lessonId, moduleId)) return { error: "Lesson not found in this module" }
  await prisma.lesson.update({ where: { id: lessonId }, data })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  revalidatePath(`/dashboard/student/module/${moduleId}`)
  return { success: true }
}

export async function deleteLesson(lessonId: string, moduleId: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, videos: { select: { r2Key: true } }, files: { select: { r2Key: true } } },
  })
  if (!lesson || lesson.moduleId !== moduleId) return { error: "Lesson not found in this module" }
  await prisma.lesson.delete({ where: { id: lessonId } })
  for (const v of lesson.videos) await deleteFromR2(v.r2Key)
  for (const f of lesson.files) await deleteFromR2(f.r2Key)
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function addYouTubeVideo(lessonId: string, moduleId: string, title: string, url: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  if (!await lessonBelongsToModule(lessonId, moduleId)) return { error: "Lesson not found in this module" }
  const count = await prisma.videoResource.count({ where: { lessonId } })
  await prisma.videoResource.create({ data: { lessonId, title, url, type: "YOUTUBE", orderIndex: count } })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function removeVideo(videoId: string, moduleId: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  const video = await prisma.videoResource.findUnique({
    where: { id: videoId },
    select: { r2Key: true, lesson: { select: { moduleId: true } } },
  })
  if (!video || video.lesson.moduleId !== moduleId) return { error: "Video not found in this module" }
  await prisma.videoResource.delete({ where: { id: videoId } })
  await deleteFromR2(video.r2Key)
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function addLessonFile(lessonId: string, moduleId: string, data: {
  title: string; url: string; r2Key: string; fileSizeBytes?: number; mimeType?: string
}) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  if (!await lessonBelongsToModule(lessonId, moduleId)) return { error: "Lesson not found in this module" }
  const count = await prisma.fileResource.count({ where: { lessonId } })
  await prisma.fileResource.create({
    data: {
      lessonId,
      title: data.title,
      url: data.url,
      r2Key: data.r2Key,
      fileSizeBytes: data.fileSizeBytes ?? null,
      mimeType: data.mimeType ?? null,
      orderIndex: count,
    },
  })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  revalidatePath(`/dashboard/student/module/${moduleId}`)
  return { success: true }
}

export async function removeLessonFile(fileId: string, moduleId: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  const file = await prisma.fileResource.findUnique({
    where: { id: fileId },
    select: { r2Key: true, lesson: { select: { moduleId: true } } },
  })
  if (!file || file.lesson.moduleId !== moduleId) return { error: "File not found in this module" }
  await prisma.fileResource.delete({ where: { id: fileId } })
  await deleteFromR2(file.r2Key)
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  revalidatePath(`/dashboard/student/module/${moduleId}`)
  return { success: true }
}

export async function ensureQuiz(moduleId: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  const existing = await prisma.quiz.findUnique({ where: { moduleId } })
  if (existing) return { quizId: existing.id }
  const mod = await prisma.module.findUnique({ where: { id: moduleId } })
  const quiz = await prisma.quiz.create({
    data: { moduleId, title: `${mod?.code ?? "Module"} Quiz`, instructions: "Answer all questions. A score of 60% or above is required to pass." },
  })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { quizId: quiz.id }
}

export async function createQuestion(moduleId: string, quizId: string, data: {
  type: string; text?: string; options?: Array<{ text: string; isCorrect: boolean }>;
  correctAnswer?: string; hintText?: string; correctTF?: string;
  pairs?: Array<{ left: string; right: string }>; points?: number;
  explanation?: string; passageContent?: string;
}) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  const count = await prisma.quizQuestion.count({ where: { quizId } })
  const order = count + 1

  if (data.type === "PASSAGE") {
    await prisma.quizQuestion.create({ data: { quizId, type: "PASSAGE", text: data.passageContent ?? "", orderIndex: order, points: 0 } })
  } else if (data.type === "MCQ") {
    await prisma.quizQuestion.create({ data: { quizId, type: "MCQ", text: data.text ?? "", explanation: data.explanation ?? null, orderIndex: order, points: 1, options: { create: (data.options ?? []).map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, orderIndex: i + 1 })) } } })
  } else if (data.type === "MSQ") {
    await prisma.quizQuestion.create({ data: { quizId, type: "MSQ", text: data.text ?? "", explanation: data.explanation ?? null, orderIndex: order, points: 1, options: { create: (data.options ?? []).map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, orderIndex: i + 1 })) } } })
  } else if (data.type === "TRUE_FALSE") {
    await prisma.quizQuestion.create({ data: { quizId, type: "TRUE_FALSE", text: data.text ?? "", explanation: data.explanation ?? null, orderIndex: order, points: 1, options: { create: [{ text: "True", isCorrect: data.correctTF === "True", orderIndex: 1 }, { text: "False", isCorrect: data.correctTF === "False", orderIndex: 2 }] } } })
  } else if (data.type === "CLOZE") {
    await prisma.quizQuestion.create({ data: { quizId, type: "CLOZE", text: data.text ?? "", explanation: data.explanation ?? null, orderIndex: order, points: 1, options: { create: [{ text: data.correctAnswer ?? "", isCorrect: true, orderIndex: 1 }] } } })
  } else if (data.type === "SENTENCE_COMPLETION") {
    await prisma.quizQuestion.create({ data: { quizId, type: "SENTENCE_COMPLETION", text: data.text ?? "", hintText: data.hintText ?? null, explanation: data.explanation ?? null, orderIndex: order, points: 1, options: { create: [{ text: data.correctAnswer ?? "", isCorrect: true, orderIndex: 1 }] } } })
  } else if (data.type === "MATCHING") {
    const pairs = data.pairs ?? []
    await prisma.quizQuestion.create({ data: { quizId, type: "MATCHING", text: data.text ?? "Match each term to its correct definition.", explanation: data.explanation ?? null, orderIndex: order, points: pairs.length, options: { create: pairs.map((p, i) => ({ text: p.left, matchText: p.right, isCorrect: true, orderIndex: i + 1 })) } } })
  } else if (data.type === "SHORT_ANSWER") {
    await prisma.quizQuestion.create({ data: { quizId, type: "SHORT_ANSWER", text: data.text ?? "", explanation: data.explanation ?? null, orderIndex: order, points: data.points ?? 2 } })
  }

  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function deleteQuestion(questionId: string, moduleId: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  await prisma.quizQuestion.delete({ where: { id: questionId } })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function updateQuizInstructions(moduleId: string, quizId: string, instructions: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  await prisma.quiz.update({ where: { id: quizId }, data: { instructions } })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}

export async function gradeShortAnswers(
  moduleId: string,
  attemptId: string,
  grades: Record<string, boolean>
) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }

  for (const [questionId, correct] of Object.entries(grades)) {
    await prisma.quizAnswer.updateMany({
      where: { attemptId, questionId },
      data: { isCorrect: correct },
    })
  }

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: { include: { question: true } },
      quiz: {
        include: {
          module: {
            include: { course: { include: { modules: { orderBy: { orderIndex: "asc" } } } } },
          },
        },
      },
    },
  })
  if (!attempt) return { error: "Attempt not found" }

  const mod = attempt.quiz.module
  let earnedPoints = 0
  let totalPoints  = 0

  for (const a of attempt.answers) {
    if (a.question.type === "PASSAGE") continue
    totalPoints += a.question.points
    if (a.isCorrect) earnedPoints += a.question.points
  }

  const score  = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const passed = score >= mod.passMark

  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { status: "SUBMITTED", score, passed },
  })

  if (passed) {
    await prisma.moduleProgress.updateMany({
      where: { studentId: attempt.studentId, moduleId },
      data: { isCompleted: true, completedAt: new Date(), creditsAwarded: mod.credits },
    })
    const nextMod = mod.course.modules.find(m => m.orderIndex === mod.orderIndex + 1)
    if (nextMod) {
      await prisma.moduleProgress.upsert({
        where: { studentId_moduleId: { studentId: attempt.studentId, moduleId: nextMod.id } },
        update: { isUnlocked: true },
        create: { studentId: attempt.studentId, moduleId: nextMod.id, isUnlocked: true, isCompleted: false, creditsAwarded: 0 },
      })
    }
  }

  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true, score, passed }
}

export async function addSelfHostedVideo(lessonId: string, moduleId: string, title: string, url: string, r2Key: string) {
  if (!await checkFacultyAccess(moduleId)) return { error: "Unauthorized" }
  if (!await lessonBelongsToModule(lessonId, moduleId)) return { error: "Lesson not found in this module" }
  const count = await prisma.videoResource.count({ where: { lessonId } })
  await prisma.videoResource.create({
    data: { lessonId, title, url, type: "SELF_HOSTED", r2Key, orderIndex: count },
  })
  revalidatePath(`/dashboard/faculty/module/${moduleId}`)
  return { success: true }
}
