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
  COMPLETED:   { bg: "var(--green-700)",   color: "#fff",              label: "Completed"   },
  ON_TRACK:    { bg: "var(--green-100)",   color: "var(--green-700)",  label: "On Track"     },
  STRUGGLING:  { bg: "var(--warning-100)", color: "var(--warning-700)", label: "Needs Help"  },
  NOT_STARTED: { bg: "var(--surface-sunken)", color: "var(--ink-400)", label: "Not Started"  },
}
