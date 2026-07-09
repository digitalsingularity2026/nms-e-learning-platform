"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitEssay } from "@/app/actions/assessments"
import { Icon } from "@/components/ui/Icon"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

export type StudentAssessment = {
  id: string; title: string; description: string; maxMark: number; passMark: number; dueDate: string | null
  submission: {
    textContent: string; submittedAt: string; inGrading: boolean
    grade: { mark: number; feedback: string | null; publishedAt: string | null } | null
  } | null
}

export default function AssessmentPanel({ assessment, moduleId }: { assessment: StudentAssessment; moduleId: string }) {
  const router = useRouter()
  const sub = assessment.submission
  const [text, setText]       = useState(sub?.textContent ?? "")
  const [editing, setEditing] = useState(!sub)
  const [error, setError]     = useState("")
  const [saving, setSaving]   = useState(false)

  const grade = sub?.grade ?? null
  const passed = grade ? grade.mark >= assessment.passMark : null

  async function handleSubmit() {
    setSaving(true); setError("")
    const res = await submitEssay(assessment.id, moduleId, text)
    setSaving(false)
    if ("error" in res) { setError(res.error ?? "Something went wrong."); return }
    setEditing(false)
    router.refresh()
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--green-700)", margin: "0 0 8px", fontWeight: 600 }}>{assessment.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <Badge bg="var(--violet-100)" color="var(--violet-700)">Written Assignment</Badge>
        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>Pass mark: {assessment.passMark}/{assessment.maxMark}</span>
        {assessment.dueDate && (
          <span style={{ fontSize: 12, color: "var(--gold-700)", fontWeight: 600 }}>
            Due {new Date(assessment.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {assessment.description && (
        <div style={{ background: "#fff", borderRadius: "var(--radius-md)", padding: "20px 24px", boxShadow: "var(--shadow-card)", lineHeight: 1.7, fontSize: 14, color: "var(--ink-700)", whiteSpace: "pre-wrap", marginBottom: 20 }}>
          {assessment.description}
        </div>
      )}

      {grade && (
        <div style={{ background: passed ? "var(--success-100)" : "var(--error-100)", border: `1px solid ${passed ? "var(--success-700)" : "#E39A94"}`, borderRadius: "var(--radius-md)", padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: grade.feedback ? 12 : 0 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, color: passed ? "var(--success-700)" : "var(--error-700)" }}>{grade.mark}/{assessment.maxMark}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: passed ? "var(--success-700)" : "var(--error-700)", display: "flex", alignItems: "center", gap: 4 }}>
              {passed && <Icon name="check-circle" size={14} />} {passed ? "PASSED" : "NOT PASSED"}
            </span>
            {grade.publishedAt && (
              <span style={{ fontSize: 11, color: "var(--ink-400)" }}>
                Graded {new Date(grade.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          {grade.feedback && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.12em", marginBottom: 6 }}>FEEDBACK FROM YOUR MARKER</div>
              <p style={{ fontSize: 14, color: "var(--ink-700)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{grade.feedback}</p>
            </div>
          )}
        </div>
      )}

      {sub && !editing ? (
        <div style={{ background: "#fff", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "var(--surface-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green-700)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="check-circle" size={13} /> Your submission · {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            {!sub.inGrading ? (
              <button onClick={() => setEditing(true)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "#fff", cursor: "pointer", color: "var(--ink-700)" }}>
                Edit & resubmit
              </button>
            ) : !grade ? (
              <Badge bg="var(--gold-100)" color="var(--gold-700)">Being Graded</Badge>
            ) : null}
          </div>
          <div style={{ padding: "18px 22px", fontSize: 14, color: "var(--ink-700)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sub.textContent}</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", padding: "20px 24px" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>YOUR ANSWER</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={12}
            placeholder="Write your answer here. You can edit and resubmit until grading begins."
            style={{ width: "100%", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.7, boxSizing: "border-box" }} />
          {error && <p style={{ fontSize: 13, color: "var(--error-700)", background: "var(--error-100)", padding: "8px 12px", borderRadius: "var(--radius-sm)", margin: "10px 0 0" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            {sub && <Button variant="secondary" onClick={() => { setEditing(false); setText(sub.textContent) }}>Cancel</Button>}
            <Button onClick={handleSubmit} disabled={saving || !text.trim()}>
              {saving ? "Submitting…" : sub ? "Resubmit" : "Submit"}
            </Button>
            <span style={{ fontSize: 11, color: "var(--ink-400)" }}>Tip: draft offline and paste here, in case your connection drops.</span>
          </div>
        </div>
      )}
    </div>
  )
}
