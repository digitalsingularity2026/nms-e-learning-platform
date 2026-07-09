"use client"

import { useState } from "react"
import { createAssessment, updateAssessment, deleteAssessment, submitGradeForReview, reviewGrade } from "@/app/actions/assessments"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"

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
  NONE:      { bg: "var(--surface-sunken)", color: "var(--ink-500)",  label: "Not graded"           },
  DRAFT:     { bg: "var(--surface-sunken)", color: "var(--ink-500)",  label: "Draft"                },
  IN_REVIEW: { bg: "var(--gold-100)",       color: "var(--gold-700)", label: "Awaiting review"      },
  RETURNED:  { bg: "var(--error-100)",      color: "var(--error-700)", label: "Returned to marker"  },
  APPROVED:  { bg: "var(--blue-100)",       color: "var(--blue-700)", label: "Awaiting publication" },
  PUBLISHED: { bg: "var(--green-100)",      color: "var(--green-700)", label: "Published"           },
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

  const label = { fontSize: 11, fontWeight: 600, color: "var(--ink-500)", letterSpacing: "0.08em", display: "block", marginBottom: 5 } as const
  const input = { width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, outline: "none", boxSizing: "border-box" } as const

  return (
    <div style={{ padding: "28px 36px", maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 4px", fontWeight: 600 }}>Assessments</h2>
          <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0 }}>Written assignments with formal grading: you mark, a colleague reviews, the School Admin publishes to the student.</p>
        </div>
        <Button onClick={openCreate} style={{ flexShrink: 0 }}>+ New Assessment</Button>
      </div>

      {err && <p style={{ fontSize: 13, color: "var(--error-700)", background: "var(--error-100)", padding: "8px 14px", borderRadius: "var(--radius-sm)", margin: "12px 0" }}>{err}</p>}

      {formOpen && (
        <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "22px 24px", border: "1.5px solid var(--green-700)", margin: "16px 0" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--green-700)", margin: "0 0 16px", fontWeight: 600 }}>{editingId ? "Edit Assessment" : "New Assessment"}</h3>
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
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--green-700)" }} />
            <span style={{ fontSize: 14, color: "var(--ink-700)" }}>Published — visible to students</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => { setFormOpen(false); setEditingId(null) }}>Cancel</Button>
            <Button onClick={saveAssessment} disabled={saving || !form.title.trim()}>{saving ? "Saving…" : editingId ? "Save Changes" : "Create Assessment"}</Button>
          </div>
        </div>
      )}

      {assessments.length === 0 && !formOpen && (
        <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "32px", border: "1px dashed var(--border-strong)", textAlign: "center", color: "var(--ink-400)", marginTop: 16 }}>
          <Icon name="clipboard-text" size={30} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14 }}>No assessments yet. Create one to collect written work from students.</p>
        </div>
      )}

      {assessments.map(a => {
        const expanded = expandedId === a.id
        const pendingCount = a.submissions.filter(s => !s.grade || s.grade.status === "RETURNED").length
        return (
          <div key={a.id} style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", marginTop: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: expanded ? "var(--surface-subtle)" : "#fff", borderBottom: expanded ? "1px solid var(--border)" : "none", cursor: "pointer" }}
              onClick={() => setExpandedId(expanded ? null : a.id)}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>{a.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 9px", borderRadius: "var(--radius-pill)", background: a.isPublished ? "var(--green-100)" : "var(--surface-sunken)", color: a.isPublished ? "var(--green-700)" : "var(--ink-400)" }}>{a.isPublished ? "PUBLISHED" : "DRAFT"}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
                  Pass {a.passMark}/{a.maxMark}{a.dueDate ? ` · Due ${fmtDate(a.dueDate)}` : ""} · {a.submissions.length} submission{a.submissions.length !== 1 ? "s" : ""}
                  {pendingCount > 0 && <span style={{ color: "var(--gold-700)", fontWeight: 600 }}> · {pendingCount} to mark</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="secondary" onClick={() => openEdit(a)}>Edit</Button>
                {a.submissions.length === 0 && (
                  <Button size="sm" variant="danger" onClick={() => handleDelete(a)}>Delete</Button>
                )}
                <Icon name={expanded ? "caret-up" : "caret-down"} size={13} color="var(--ink-400)" style={{ marginLeft: 4 }} />
              </div>
            </div>

            {expanded && (
              <div style={{ padding: "16px 20px" }}>
                {a.submissions.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-400)", margin: 0 }}>No submissions yet.</p>}
                {a.submissions.map(sub => {
                  const st = GRADE_CHIP[sub.grade?.status ?? "NONE"]
                  const open = openSubId === sub.id
                  const canMark = !sub.grade || sub.grade.status === "RETURNED" || sub.grade.status === "DRAFT"
                  const canReview = sub.grade?.status === "IN_REVIEW" && sub.grade.primaryMarker?.id !== currentUserId
                  const waitingOnOthers = sub.grade?.status === "IN_REVIEW" && sub.grade.primaryMarker?.id === currentUserId
                  return (
                    <div key={sub.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-subtle)", cursor: "pointer" }}
                        onClick={() => { setOpenSubId(open ? null : sub.id); setGradeForm({ mark: sub.grade?.mark?.toString() ?? "", feedback: sub.grade?.feedback ?? "" }); setReviewNote(""); setErr("") }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink-900)" }}>{sub.student.name}</span>
                          {sub.student.studentIdNumber && <span style={{ fontSize: 11, color: "var(--gold-700)", fontWeight: 600, marginLeft: 8 }}>ID: {sub.student.studentIdNumber}</span>}
                          <span style={{ fontSize: 11, color: "var(--ink-400)", marginLeft: 8 }}>Submitted {fmtDate(sub.submittedAt)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {sub.grade?.mark != null && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--blue-700)" }}>{sub.grade.mark}/{a.maxMark}</span>}
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-pill)", background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                      </div>

                      {open && (
                        <div style={{ padding: "14px 16px" }}>
                          <div style={{ background: "var(--surface-subtle)", borderRadius: "var(--radius-md)", padding: "14px 16px", fontSize: 14, color: "var(--ink-700)", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
                            {sub.textContent || <span style={{ color: "var(--ink-400)" }}>No text submitted.</span>}
                          </div>

                          {sub.grade?.status === "RETURNED" && sub.grade.reviewerNote && (
                            <div style={{ background: "var(--error-100)", borderLeft: "3px solid var(--error-700)", padding: "10px 14px", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--error-700)", marginBottom: 4 }}>RETURNED BY {sub.grade.reviewer?.name?.toUpperCase() ?? "REVIEWER"}</div>
                              <div style={{ fontSize: 13, color: "var(--error-700)" }}>{sub.grade.reviewerNote}</div>
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
                              <Button onClick={() => handleGrade(sub.id, a.maxMark)} disabled={saving}>
                                {saving ? "Submitting…" : "Submit for Review"}
                              </Button>
                            </div>
                          )}

                          {canReview && sub.grade && (
                            <div style={{ background: "var(--gold-100)", borderRadius: "var(--radius-lg)", padding: "14px 16px", marginBottom: 14 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold-700)", marginBottom: 8 }}>
                                REVIEW — marked {sub.grade.mark}/{a.maxMark} by {sub.grade.primaryMarker?.name}
                              </div>
                              {sub.grade.feedback && <div style={{ fontSize: 13, color: "var(--ink-700)", background: "#fff", borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 10, lineHeight: 1.6 }}>{sub.grade.feedback}</div>}
                              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2} placeholder="Optional note if approving — required if returning." style={{ ...input, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }} />
                              <div style={{ display: "flex", gap: 8 }}>
                                <Button size="sm" onClick={() => handleReview(sub.grade!.id, "approve")} disabled={saving}>Approve</Button>
                                <Button size="sm" variant="danger" onClick={() => handleReview(sub.grade!.id, "return")} disabled={saving}>Return to Marker</Button>
                              </div>
                            </div>
                          )}

                          {waitingOnOthers && (
                            <p style={{ fontSize: 12, color: "var(--gold-700)", background: "var(--gold-100)", padding: "8px 12px", borderRadius: "var(--radius-md)", marginBottom: 14 }}>
                              You marked this — a colleague assigned to this module (or the School Admin) must now review it.
                            </p>
                          )}
                          {sub.grade?.status === "APPROVED" && (
                            <p style={{ fontSize: 12, color: "var(--blue-700)", background: "var(--blue-100)", padding: "8px 12px", borderRadius: "var(--radius-md)", marginBottom: 14 }}>
                              Approved by {sub.grade.reviewer?.name} — awaiting publication by the School Admin. The student cannot see the grade yet.
                            </p>
                          )}
                          {sub.grade?.status === "PUBLISHED" && (
                            <p style={{ fontSize: 12, color: "var(--green-700)", background: "var(--green-100)", padding: "8px 12px", borderRadius: "var(--radius-md)", marginBottom: 14 }}>
                              Published to the student{sub.grade.registrar ? ` by ${sub.grade.registrar.name}` : ""}. Feedback: {sub.grade.feedback || "—"}
                            </p>
                          )}

                          {sub.grade && sub.grade.audit.length > 0 && (
                            <div style={{ borderTop: "1px solid var(--surface-sunken)", paddingTop: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.1em", marginBottom: 6 }}>GRADING HISTORY</div>
                              {sub.grade.audit.map(e => (
                                <div key={e.id} style={{ fontSize: 11.5, color: "var(--ink-500)", marginBottom: 4 }}>
                                  <span style={{ color: "var(--ink-700)", fontWeight: 500 }}>{e.actorName}</span> — {e.fromStatus ? `${e.fromStatus} → ` : ""}{e.toStatus}
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
