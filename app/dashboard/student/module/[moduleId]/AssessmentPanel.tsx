"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitEssay } from "@/app/actions/assessments"

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
      <h1 style={{ fontFamily: "serif", fontSize: 26, color: "#0C3D26", margin: "0 0 8px", fontWeight: 600 }}>{assessment.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <span style={{ fontSize: 10, background: "#F0F0FF", color: "#2D1A6B", padding: "3px 10px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.05em" }}>WRITTEN ASSIGNMENT</span>
        <span style={{ fontSize: 12, color: "#6B7280" }}>Pass mark: {assessment.passMark}/{assessment.maxMark}</span>
        {assessment.dueDate && (
          <span style={{ fontSize: 12, color: "#B47E2A", fontWeight: 600 }}>
            Due {new Date(assessment.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {assessment.description && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #E2D9CC", lineHeight: 1.7, fontSize: 14, color: "#374151", whiteSpace: "pre-wrap", marginBottom: 20 }}>
          {assessment.description}
        </div>
      )}

      {grade && (
        <div style={{ background: passed ? "#F0FBF4" : "#FEF2F2", border: `1px solid ${passed ? "#86C49B" : "#FCA5A5"}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: grade.feedback ? 12 : 0 }}>
            <span style={{ fontFamily: "serif", fontSize: 30, fontWeight: 700, color: passed ? "#15803D" : "#B91C1C" }}>{grade.mark}/{assessment.maxMark}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: passed ? "#15803D" : "#B91C1C" }}>{passed ? "✓ PASSED" : "NOT PASSED"}</span>
            {grade.publishedAt && (
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                Graded {new Date(grade.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
          {grade.feedback && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#B0A090", letterSpacing: "0.12em", marginBottom: 6 }}>FEEDBACK FROM YOUR MARKER</div>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{grade.feedback}</p>
            </div>
          )}
        </div>
      )}

      {sub && !editing ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", background: "#F7F3ED", borderBottom: "1px solid #E2D9CC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0C3D26" }}>
              ✓ Your submission · {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            {!sub.inGrading ? (
              <button onClick={() => setEditing(true)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #E2D9CC", background: "#fff", cursor: "pointer", color: "#374151" }}>
                Edit & resubmit
              </button>
            ) : !grade ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: "#FBF4E3", color: "#B47E2A" }}>BEING GRADED</span>
            ) : null}
          </div>
          <div style={{ padding: "18px 22px", fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{sub.textContent}</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", padding: "20px 24px" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>YOUR ANSWER</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={12}
            placeholder="Write your answer here. You can edit and resubmit until grading begins."
            style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.7 }} />
          {error && <p style={{ fontSize: 13, color: "#B91C1C", background: "#FEF2F2", padding: "8px 12px", borderRadius: 8, margin: "10px 0 0" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
            {sub && <button onClick={() => { setEditing(false); setText(sub.textContent) }} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>}
            <button onClick={handleSubmit} disabled={saving || !text.trim()}
              style={{ background: saving || !text.trim() ? "#E5E7EB" : "#0C3D26", color: saving || !text.trim() ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Submitting…" : sub ? "Resubmit →" : "Submit →"}
            </button>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>Tip: draft offline and paste here, in case your connection drops.</span>
          </div>
        </div>
      )}
    </div>
  )
}
