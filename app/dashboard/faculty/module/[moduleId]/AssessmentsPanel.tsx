"use client"

import { useState } from "react"
import { createAssessment, updateAssessment, deleteAssessment, submitGradeForReview, reviewGrade } from "@/app/actions/assessments"

type AuditEntry = { id: string; actorName: string; fromStatus: string | null; toStatus: string; note: string | null; timestamp: string }
type GradeInfo = {
  id: string; status: string; mark: number | null; feedback: string | null; reviewerNote: string | null
  primaryMarker: { id: string; name: string } | null
  reviewer: { id: string; name: string } | null
  registrar: { id: string; name: string } | null
  audit: AuditEntry[]
}
type SubmissionInfo = {
  id: string; textContent: string | null; submittedAt: string
  student: { id: string; name: string; email: string; studentIdNumber: string | null }
  grade: GradeInfo | null
}
export type AssessmentInfo = {
  id: string; title: string; description: string; maxMark: number; passMark: number
  dueDate: string | null; isPublished: boolean; submissions: SubmissionInfo[]
}

const EMPTY_FORM = { title: "", description: "", maxMark: 100, passMark: 50, dueDate: "", isPublished: false }

const GRADE_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  NONE:      { bg: "#F3F4F6", color: "#6B7280", label: "Not graded"           },
  DRAFT:     { bg: "#F3F4F6", color: "#6B7280", label: "Draft"                },
  IN_REVIEW: { bg: "#FBF4E3", color: "#B47E2A", label: "Awaiting review"      },
  RETURNED:  { bg: "#FEE2E2", color: "#B91C1C", label: "Returned to marker"   },
  APPROVED:  { bg: "#EEF2F8", color: "#1A3A6B", label: "Awaiting publication" },
  PUBLISHED: { bg: "#E3F0E9", color: "#0C3D26", label: "Published ✓"          },
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null
}

export default function AssessmentsPanel({ moduleId, currentUserId, assessments, onUpdate }: {
  moduleId: string; currentUserId: string; assessments: AssessmentInfo[]; onUpdate: () => void
}) {
  const [formOpen, setFormOpen]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [openSubId, setOpenSubId]   = useState<string | null>(null)
  const [gradeForm, setGradeForm]   = useState({ mark: "", feedback: "" })
  const [reviewNote, setReviewNote] = useState("")
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState("")

  function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setFormOpen(true); setErr("") }
  function openEdit(a: AssessmentInfo) {
    setForm({ title: a.title, description: a.description, maxMark: a.maxMark, passMark: a.passMark, dueDate: a.dueDate ? a.dueDate.slice(0, 10) : "", isPublished: a.isPublished })
    setEditingId(a.id); setFormOpen(true); setErr("")
  }

  async function saveAssessment() {
    setSaving(true); setErr("")
    const payload = { title: form.title, description: form.description, maxMark: Number(form.maxMark), passMark: Number(form.passMark), dueDate: form.dueDate || null, isPublished: form.isPublished }
    const res = editingId ? await updateAssessment(editingId, moduleId, payload) : await createAssessment(moduleId, payload)
    setSaving(false)
    if ("error" in res) { setErr(res.error ?? "Something went wrong."); return }
    setFormOpen(false); setForm(EMPTY_FORM); setEditingId(null); onUpdate()
  }

  async function handleDelete(a: AssessmentInfo) {
    if (!window.confirm(`Delete assessment "${a.title}"?`)) return
    const res = await deleteAssessment(a.id, moduleId)
    if ("error" in res) { alert(res.error); return }
    onUpdate()
  }

  async function handleGrade(subId: string, maxMark: number) {
    const mark = parseInt(gradeForm.mark, 10)
    if (isNaN(mark)) { setErr("Enter a mark."); return }
    setSaving(true); setErr("")
    const res = await submitGradeForReview(subId, moduleId, mark, gradeForm.feedback)
    setSaving(false)
    if ("error" in res) { setErr(res.error ?? "Something went wrong."); return }
    setOpenSubId(null); setGradeForm({ mark: "", feedback: "" }); onUpdate()
  }

  async function handleReview(gradeId: string, decision: "approve" | "return") {
    setSaving(true); setErr("")
    const res = await reviewGrade(gradeId, moduleId, decision, reviewNote)
    setSaving(false)
    if ("error" in res) { setErr(res.error ?? "Something went wrong."); return }
    setOpenSubId(null); setReviewNote(""); onUpdate()
  }

  const label = { fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 5 } as const
  const input = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" } as const

  return (
    <div style={{ padding: "28px 36px", maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontFamily: "serif", fontSize: 20, color: "#0C3D26", margin: "0 0 4px", fontWeight: 600 }}>Assessments</h2>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Written assignments with formal grading: you mark, a colleague reviews, the School Admin publishes to the student.</p>
        </div>
        <button onClick={openCreate} style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>+ New Assessment</button>
      </div>

      {err && <p style={{ fontSize: 13, color: "#B91C1C", background: "#FEF2F2", padding: "8px 14px", borderRadius: 8, margin: "12px 0" }}>{err}</p>}

      {formOpen && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", border: "1.5px solid #0C3D26", margin: "16px 0" }}>
          <h3 style={{ fontFamily: "serif", fontSize: 17, color: "#0C3D26", margin: "0 0 16px", fontWeight: 600 }}>{editingId ? "Edit Assessment" : "New Assessment"}</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>TITLE</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Reflective essay: patient communication" style={input} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>INSTRUCTIONS FOR STUDENTS</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="What should the student write? Word count, structure, topics to cover…" style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={label}>MAX MARK</label>
              <input type="number" min={1} value={form.maxMark} onChange={e => setForm(p => ({ ...p, maxMark: parseInt(e.target.value) || 0 }))} style={input} />
            </div>
            <div>
              <label style={label}>PASS MARK</label>
              <input type="number" min={0} value={form.passMark} onChange={e => setForm(p => ({ ...p, passMark: parseInt(e.target.value) || 0 }))} style={input} />
            </div>
            <div>
              <label style={label}>DUE DATE (OPTIONAL)</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} style={input} />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#0C3D26" }} />
            <span style={{ fontSize: 14, color: "#374151" }}>Published — visible to students</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setFormOpen(false); setEditingId(null) }} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveAssessment} disabled={saving || !form.title.trim()} style={{ background: saving || !form.title.trim() ? "#E5E7EB" : "#0C3D26", color: saving || !form.title.trim() ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Assessment"}</button>
          </div>
        </div>
      )}

      {assessments.length === 0 && !formOpen && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "32px", border: "1px dashed #E2D9CC", textAlign: "center", color: "#9CA3AF", marginTop: 16 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
          <p style={{ fontSize: 14 }}>No assessments yet. Create one to collect written work from students.</p>
        </div>
      )}

      {assessments.map(a => {
        const expanded = expandedId === a.id
        const pendingCount = a.submissions.filter(s => !s.grade || s.grade.status === "RETURNED").length
        return (
          <div key={a.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", marginTop: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: expanded ? "#F7F3ED" : "#fff", borderBottom: expanded ? "1px solid #E2D9CC" : "none", cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : a.id)}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "#1A1A1A" }}>{a.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 100, background: a.isPublished ? "#E3F0E9" : "#F3F4F6", color: a.isPublished ? "#0C3D26" : "#9CA3AF" }}>{a.isPublished ? "PUBLISHED" : "DRAFT"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Pass {a.passMark}/{a.maxMark}{a.dueDate ? ` · Due ${fmtDate(a.dueDate)}` : ""} · {a.submissions.length} submission{a.submissions.length !== 1 ? "s" : ""}
                  {pendingCount > 0 && <span style={{ color: "#B47E2A", fontWeight: 600 }}> · {pendingCount} to mark</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(a)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid #E2D9CC", background: "#fff", cursor: "pointer", color: "#374151" }}>Edit</button>
                {a.submissions.length === 0 && (
                  <button onClick={() => handleDelete(a)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "none", background: "#FEE2E2", color: "#B91C1C", cursor: "pointer" }}>Delete</button>
                )}
                <span style={{ color: "#9CA3AF", fontSize: 13, marginLeft: 4 }}>{expanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {expanded && (
              <div style={{ padding: "16px 20px" }}>
                {a.submissions.length === 0 && <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>No submissions yet.</p>}
                {a.submissions.map(sub => {
                  const st = GRADE_CHIP[sub.grade?.status ?? "NONE"]
                  const open = openSubId === sub.id
                  const canMark = !sub.grade || sub.grade.status === "RETURNED" || sub.grade.status === "DRAFT"
                  const canReview = sub.grade?.status === "IN_REVIEW" && sub.grade.primaryMarker?.id !== currentUserId
                  const waitingOnOthers = sub.grade?.status === "IN_REVIEW" && sub.grade.primaryMarker?.id === currentUserId
                  return (
                    <div key={sub.id} style={{ border: "1px solid #F0EAE0", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFAF8", cursor: "pointer" }}
                        onClick={() => { setOpenSubId(open ? null : sub.id); setGradeForm({ mark: sub.grade?.mark?.toString() ?? "", feedback: sub.grade?.feedback ?? "" }); setReviewNote(""); setErr("") }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#1A1A1A" }}>{sub.student.name}</span>
                          {sub.student.studentIdNumber && <span style={{ fontSize: 11, color: "#B47E2A", fontWeight: 600, marginLeft: 8 }}>ID: {sub.student.studentIdNumber}</span>}
                          <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 8 }}>Submitted {fmtDate(sub.submittedAt)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {sub.grade?.mark != null && <span style={{ fontSize: 12, fontWeight: 600, color: "#1A3A6B" }}>{sub.grade.mark}/{a.maxMark}</span>}
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                      </div>

                      {open && (
                        <div style={{ padding: "14px 16px" }}>
                          <div style={{ background: "#F7F3ED", borderRadius: 8, padding: "14px 16px", fontSize: 14, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
                            {sub.textContent || <span style={{ color: "#C5BAB0" }}>No text submitted.</span>}
                          </div>

                          {sub.grade?.status === "RETURNED" && sub.grade.reviewerNote && (
                            <div style={{ background: "#FEF2F2", borderLeft: "3px solid #B91C1C", padding: "10px 14px", borderRadius: "0 8px 8px 0", marginBottom: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", marginBottom: 4 }}>RETURNED BY {sub.grade.reviewer?.name?.toUpperCase() ?? "REVIEWER"}</div>
                              <div style={{ fontSize: 13, color: "#7F1D1D" }}>{sub.grade.reviewerNote}</div>
                            </div>
                          )}

                          {canMark && (
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 10 }}>
                                <div>
                                  <label style={label}>MARK (OUT OF {a.maxMark})</label>
                                  <input type="number" min={0} max={a.maxMark} value={gradeForm.mark} onChange={e => setGradeForm(p => ({ ...p, mark: e.target.value }))} style={{ ...input, width: 110 }} />
                                </div>
                              </div>
                              <label style={label}>FEEDBACK FOR THE STUDENT</label>
                              <textarea value={gradeForm.feedback} onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))} rows={4} placeholder="What was done well, what to improve — the student sees this once the grade is published." style={{ ...input, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }} />
                              <button onClick={() => handleGrade(sub.id, a.maxMark)} disabled={saving}
                                style={{ background: saving ? "#E5E7EB" : "#0C3D26", color: saving ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                                {saving ? "Submitting…" : "Submit for Review →"}
                              </button>
                            </div>
                          )}

                          {canReview && sub.grade && (
                            <div style={{ background: "#FBF4E3", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>
                                REVIEW — marked {sub.grade.mark}/{a.maxMark} by {sub.grade.primaryMarker?.name}
                              </div>
                              {sub.grade.feedback && <div style={{ fontSize: 13, color: "#374151", background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 10, lineHeight: 1.6 }}>{sub.grade.feedback}</div>}
                              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Optional note if approving — required if returning." style={{ ...input, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }} />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => handleReview(sub.grade!.id, "approve")} disabled={saving} style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✓ Approve</button>
                                <button onClick={() => handleReview(sub.grade!.id, "return")} disabled={saving} style={{ background: "#FEE2E2", color: "#B91C1C", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↩ Return to Marker</button>
                              </div>
                            </div>
                          )}

                          {waitingOnOthers && (
                            <p style={{ fontSize: 12, color: "#92400E", background: "#FBF4E3", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
                              You marked this — a colleague assigned to this module (or the School Admin) must now review it.
                            </p>
                          )}
                          {sub.grade?.status === "APPROVED" && (
                            <p style={{ fontSize: 12, color: "#1A3A6B", background: "#EEF2F8", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
                              Approved by {sub.grade.reviewer?.name} — awaiting publication by the School Admin. The student cannot see the grade yet.
                            </p>
                          )}
                          {sub.grade?.status === "PUBLISHED" && (
                            <p style={{ fontSize: 12, color: "#0C3D26", background: "#E3F0E9", padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
                              Published to the student{sub.grade.registrar ? ` by ${sub.grade.registrar.name}` : ""}. Feedback: {sub.grade.feedback || "—"}
                            </p>
                          )}

                          {sub.grade && sub.grade.audit.length > 0 && (
                            <div style={{ borderTop: "1px solid #F0EAE0", paddingTop: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#B0A090", letterSpacing: "0.1em", marginBottom: 6 }}>GRADING HISTORY</div>
                              {sub.grade.audit.map(e => (
                                <div key={e.id} style={{ fontSize: 11.5, color: "#6B7280", marginBottom: 4 }}>
                                  <span style={{ color: "#374151", fontWeight: 500 }}>{e.actorName}</span> — {e.fromStatus ? `${e.fromStatus} → ` : ""}{e.toStatus}
                                  {e.note ? ` · “${e.note}”` : ""} · {new Date(e.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
