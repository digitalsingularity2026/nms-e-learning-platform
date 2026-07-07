export type StudentStatus = "NOT_STARTED" | "ON_TRACK" | "STRUGGLING" | "COMPLETED"

export function getStudentStatus(
  progress: Array<{ isCompleted: boolean }>,
  attempts: Array<{ passed: boolean | null; quizId: string }>
): StudentStatus {
  const total = progress.length
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

export const STUDENT_STATUS_STYLE: Record<StudentStatus, { bg: string; color: string; label: string }> = {
  COMPLETED:   { bg: "#0C3D26", color: "#fff",    label: "✓ Completed" },
  ON_TRACK:    { bg: "#E3F0E9", color: "#0C3D26", label: "On Track"    },
  STRUGGLING:  { bg: "#FEF3C7", color: "#92400E", label: "Needs Help"  },
  NOT_STARTED: { bg: "#F3F4F6", color: "#9CA3AF", label: "Not Started" },
}
