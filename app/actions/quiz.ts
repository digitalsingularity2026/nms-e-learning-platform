"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function submitQuizAction(
  quizId: string,
  moduleId: string,
  answers: Record<string, string>
) {
  const session = await auth()
  if (!session || session.user.role !== "STUDENT") return { error: "Unauthorized" }

  const studentId = session.user.id

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      module: { include: { course: { include: { modules: { orderBy: { orderIndex: "asc" } } } } } },
      questions: { include: { options: true } },
    },
  })
  if (!quiz) return { error: "Quiz not found" }

  const module = quiz.module
  let earnedPoints = 0
  let totalScorable = 0
  let hasPendingReview = false
  const results: Record<string, { correct: boolean | null; correctOptionId?: string; correctText?: string; matchResults?: Record<string, boolean> }> = {}
  const answersToSave: Array<{ questionId: string; selectedOptionId: string | null; textAnswer: string | null; isCorrect: boolean | null }> = []

  for (const q of quiz.questions) {
    if (q.type === "PASSAGE") continue

    const raw = answers[q.id] ?? ""

    if (q.type === "SHORT_ANSWER") {
      hasPendingReview = true
      results[q.id] = { correct: null }
      answersToSave.push({ questionId: q.id, selectedOptionId: null, textAnswer: raw, isCorrect: null })
      continue
    }

    totalScorable += q.points

    if (q.type === "MCQ" || q.type === "BEST_ANSWER" || q.type === "TRUE_FALSE") {
      const correctOpt = q.options.find(o => o.isCorrect)
      const isCorrect = !!raw && raw === correctOpt?.id
      if (isCorrect) earnedPoints += q.points
      results[q.id] = { correct: isCorrect, correctOptionId: correctOpt?.id }
      answersToSave.push({ questionId: q.id, selectedOptionId: raw || null, textAnswer: null, isCorrect })
    }

    else if (q.type === "MSQ") {
      let selected: string[] = []
      try { selected = JSON.parse(raw) } catch { selected = [] }
      const correctIds = new Set(q.options.filter(o => o.isCorrect).map(o => o.id))
      const wrongIds   = new Set(q.options.filter(o => !o.isCorrect).map(o => o.id))
      const allCorrectChosen = [...correctIds].every(id => selected.includes(id))
      const noWrongChosen    = !selected.some(id => wrongIds.has(id))
      const isCorrect = allCorrectChosen && noWrongChosen
      if (isCorrect) earnedPoints += q.points
      results[q.id] = { correct: isCorrect, correctOptionId: q.options.find(o => o.isCorrect)?.id }
      answersToSave.push({ questionId: q.id, selectedOptionId: null, textAnswer: raw, isCorrect })
    }

    else if (q.type === "CLOZE" || q.type === "SENTENCE_COMPLETION") {
      const correctOpt = q.options.find(o => o.isCorrect)
      const isCorrect  = raw.trim().toLowerCase() === (correctOpt?.text ?? "").trim().toLowerCase()
      if (isCorrect) earnedPoints += q.points
      results[q.id] = { correct: isCorrect, correctText: correctOpt?.text }
      answersToSave.push({ questionId: q.id, selectedOptionId: null, textAnswer: raw, isCorrect })
    }

    else if (q.type === "MATCHING") {
      let submitted: Record<string, string> = {}
      try { submitted = JSON.parse(raw) } catch { submitted = {} }
      let pairsCorrect = 0
      const matchResults: Record<string, boolean> = {}
      for (const opt of q.options) {
        const given   = (submitted[opt.id] ?? "").trim().toLowerCase()
        const correct = (opt.matchText ?? "").trim().toLowerCase()
        const ok = given !== "" && given === correct
        if (ok) pairsCorrect++
        matchResults[opt.id] = ok
      }
      earnedPoints += pairsCorrect
      const isCorrect = pairsCorrect === q.options.length
      results[q.id] = { correct: isCorrect, matchResults }
      answersToSave.push({ questionId: q.id, selectedOptionId: null, textAnswer: raw, isCorrect })
    }
  }

  const score = totalScorable > 0 ? Math.round((earnedPoints / totalScorable) * 100) : 0
  const status = hasPendingReview ? "PENDING_REVIEW" : "SUBMITTED"
  const passed = hasPendingReview ? null : score >= module.passMark

  await prisma.quizAttempt.create({
    data: {
      quizId, studentId, status, score, passed,
      submittedAt: new Date(),
      answers: { create: answersToSave },
    },
  })

  if (passed) {
    await prisma.moduleProgress.updateMany({
      where: { studentId, moduleId },
      data: { isCompleted: true, completedAt: new Date(), creditsAwarded: module.credits },
    })
    const nextMod = module.course.modules.find(m => m.orderIndex === module.orderIndex + 1)
    if (nextMod) {
      await prisma.moduleProgress.upsert({
        where: { studentId_moduleId: { studentId, moduleId: nextMod.id } },
        update: { isUnlocked: true },
        create: { studentId, moduleId: nextMod.id, isUnlocked: true, isCompleted: false, creditsAwarded: 0 },
      })
    }
    revalidatePath("/dashboard/student")
    revalidatePath(`/dashboard/student/module/${moduleId}`)
  }

  return { passed, score, earnedPoints, totalScorable, hasPendingReview, results }
}
