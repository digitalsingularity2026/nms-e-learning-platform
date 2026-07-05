"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { createLesson, updateLesson, deleteLesson, ensureQuiz, createQuestion, deleteQuestion, gradeShortAnswers } from "@/app/actions/faculty"
import VideoUploader from "@/components/VideoUploader"
import AttachmentUploader from "@/components/AttachmentUploader"
import AssessmentsPanel, { type AssessmentInfo } from "./AssessmentsPanel"

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false, loading: () => <div style={{ height: 200, background: "#F9F9F9", borderRadius: 10, border: "1.5px solid #E2D9CC", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", fontSize: 13 }}>Loading editor…</div> })

type Video    = { id: string; title: string; url: string; type: string }
type Attachment = { id: string; title: string; url: string; mimeType: string | null; fileSizeBytes: number | null }
type Lesson   = { id: string; title: string; content: string; isPublished: boolean; videos: Video[]; files: Attachment[] }
type Option   = { id: string; text: string; isCorrect: boolean; matchText?: string | null }
type Question = { id: string; text: string; type: string; hintText?: string | null; points: number; options: Option[] }
type Quiz     = { id: string; instructions: string; questions: Question[] }
type PendingAttempt = { id: string; score: number | null; submittedAt: string | null; student: { id: string; name: string; email: string; studentIdNumber: string | null }; shortAnswers: Array<{ questionId: string; questionText: string; points: number; textAnswer: string | null }> }

const EMPTY_LESSON = { title: "", content: "", isPublished: false }
const ALL_TYPES = [
  { value: "MCQ",                 label: "Multiple Choice (MCQ)"   },
  { value: "TRUE_FALSE",          label: "True / False"            },
  { value: "MSQ",                 label: "Multiple Select (MSQ)"   },
  { value: "CLOZE",               label: "Fill in the Blank"       },
  { value: "SENTENCE_COMPLETION", label: "Sentence Completion"     },
  { value: "MATCHING",            label: "Matching Pairs"          },
  { value: "SHORT_ANSWER",        label: "Short Answer"            },
  { value: "PASSAGE",             label: "Reading Passage"         },
]
const TYPE_LABEL: Record<string, string> = Object.fromEntries(ALL_TYPES.map(t => [t.value, t.label]))

function emptyQForm() {
  return { type: "MCQ", text: "", options: ["", "", "", ""], optionCorrect: [false, false, false, false] as boolean[], correctTF: "True" as "True" | "False", correctAnswer: "", hintText: "", pairs: [{ left: "", right: "" }, { left: "", right: "" }], points: 2, explanation: "", passageContent: "" }
}

export default function FacultyModuleView({ module, lessons: initialLessons, quiz: initialQuiz, pendingAttempts, assessments, currentUserId }: {
  module: { id: string; code: string; title: string; isPublished: boolean }
  lessons: Lesson[]; quiz: Quiz | null; pendingAttempts: PendingAttempt[]
  assessments: AssessmentInfo[]; currentUserId: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [tab, setTab]             = useState<"lessons" | "quiz" | "assessments" | "grading">("lessons")
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm]           = useState(EMPTY_LESSON)
  const [qForm, setQForm]         = useState(emptyQForm())
  const [addingQ, setAddingQ]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [gradingId, setGradingId]         = useState<string | null>(null)
  const [grades, setGrades]               = useState<Record<string, boolean>>({})
  const [gradingResult, setGradingResult] = useState<{ score: number; passed: boolean } | null>(null)

  const refresh = () => startTransition(() => router.refresh())

  function openNew() { setForm(EMPTY_LESSON); setEditingId("new") }
  function openEdit(l: Lesson) { setForm({ title: l.title, content: l.content, isPublished: l.isPublished }); setEditingId(l.id) }

  async function saveLesson() {
    setSaving(true)
    if (editingId === "new") await createLesson(module.id, form)
    else if (editingId) await updateLesson(editingId, module.id, form)
    setSaving(false); setEditingId(null); setForm(EMPTY_LESSON); refresh()
  }

  async function handleDeleteLesson(id: string) {
    if (!window.confirm("Delete this lesson?")) return
    await deleteLesson(id, module.id); refresh()
  }

  async function handleAddQuestion() {
    setSaving(true)
    let qId = initialQuiz?.id ?? null
    if (!qId) {
      const res = await ensureQuiz(module.id)
      if ("error" in res) { setSaving(false); return }
      qId = res.quizId
    }
    await createQuestion(module.id, qId, { type: qForm.type, text: qForm.text, options: qForm.options.map((t, i) => ({ text: t, isCorrect: qForm.optionCorrect[i] })), correctAnswer: qForm.correctAnswer, hintText: qForm.hintText, correctTF: qForm.correctTF, pairs: qForm.pairs, points: qForm.points, explanation: qForm.explanation, passageContent: qForm.passageContent })
    setSaving(false); setAddingQ(false); setQForm(emptyQForm()); refresh()
  }

  async function handleDeleteQ(qId: string) {
    if (!window.confirm("Delete this question?")) return
    await deleteQuestion(qId, module.id); refresh()
  }

  async function handleSubmitGrade(attemptId: string) {
    const attempt = pendingAttempts.find(a => a.id === attemptId)
    if (!attempt) return
    if (attempt.shortAnswers.some(sa => grades[sa.questionId] === undefined)) {
      alert("Please mark all short answer questions before submitting."); return
    }
    setSaving(true)
    const res = await gradeShortAnswers(module.id, attemptId, grades)
    setSaving(false)
    if ("error" in res) { alert(res.error); return }
    setGradingResult({ score: res.score!, passed: res.passed! })
    setGradingId(null); setGrades({})
    setTimeout(() => { setGradingResult(null); refresh() }, 3000)
  }

  const editingLesson = editingId && editingId !== "new" ? initialLessons.find(l => l.id === editingId) : null
  const Q = qForm

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Tab bar */}
        <div style={{ borderBottom: "1px solid #E2D9CC", background: "#fff", display: "flex", paddingLeft: 28, flexShrink: 0 }}>
          {(["lessons", "quiz", "assessments", "grading"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setEditingId(null); setAddingQ(false); setGradingId(null) }}
              style={{ padding: "14px 22px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? (t === "grading" && pendingAttempts.length > 0 ? "#B47E2A" : "#0C3D26") : "#6B7280", background: "none", borderBottom: tab === t ? `2px solid ${t === "grading" && pendingAttempts.length > 0 ? "#B47E2A" : "#0C3D26"}` : "2px solid transparent" }}>
              {t === "lessons" ? `📄 Lessons (${initialLessons.length})` : t === "quiz" ? `📝 Quiz (${initialQuiz?.questions.length ?? 0})` : t === "assessments" ? `📋 Assessments (${assessments.length})` : `✏️ Pending Grading${pendingAttempts.length > 0 ? ` (${pendingAttempts.length})` : ""}`}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "#F7F3ED" }}>

          {/* ── LESSONS TAB ────────────────────────────────────────────── */}
          {tab === "lessons" && (
            <div style={{ display: "grid", gridTemplateColumns: editingId ? "300px 1fr" : "1fr", height: "100%" }}>

              {/* Sidebar */}
              <div style={{ background: "#fff", borderRight: "1px solid #E2D9CC", overflowY: "auto", padding: "20px 0" }}>
                <div style={{ padding: "0 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em" }}>LESSONS</span>
                  <button onClick={openNew} style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New</button>
                </div>
                {initialLessons.length === 0 && <p style={{ fontSize: 13, color: "#9CA3AF", padding: "8px 20px" }}>No lessons yet.</p>}
                {initialLessons.map(l => (
                  <div key={l.id} onClick={() => openEdit(l)} style={{ padding: "11px 20px", borderLeft: editingId === l.id ? "3px solid #0C3D26" : "3px solid transparent", background: editingId === l.id ? "#F0FAF5" : "none", cursor: "pointer" }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: "#1A1A1A", marginBottom: 3 }}>{l.title}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: l.isPublished ? "#E3F0E9" : "#F3F4F6", color: l.isPublished ? "#0C3D26" : "#9CA3AF" }}>{l.isPublished ? "PUBLISHED" : "DRAFT"}</span>
                      {l.videos.length > 0 && <span style={{ fontSize: 10, color: "#B47E2A" }}>▶ {l.videos.length}v</span>}
                      {l.files.length > 0 && <span style={{ fontSize: 10, color: "#1A3A6B" }}>📎 {l.files.length}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Editor panel */}
              {editingId ? (
                <div style={{ overflowY: "auto", padding: "28px 36px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ fontFamily: "serif", fontSize: 20, color: "#0C3D26", margin: 0, fontWeight: 600 }}>{editingId === "new" ? "New Lesson" : "Edit Lesson"}</h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      {editingId !== "new" && (
                        <button onClick={() => handleDeleteLesson(editingId)} style={{ background: "#FEE2E2", color: "#B91C1C", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                      )}
                      <button onClick={() => setEditingId(null)} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      <button onClick={saveLesson} disabled={saving || !form.title.trim()} style={{ background: saving || !form.title.trim() ? "#E5E7EB" : "#0C3D26", color: saving || !form.title.trim() ? "#9CA3AF" : "#fff", border: "none", borderRadius: 7, padding: "7px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>TITLE</label>
                    <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Lesson title" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", display: "block", marginBottom: 5, letterSpacing: "0.08em" }}>CONTENT</label>
                    <RichTextEditor content={form.content} onChange={html => setForm(p => ({ ...p, content: html }))} />
                    <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5 }}>Tip: Use H2 for sections, the Table button for vocabulary tables.</p>
                  </div>

                  <VideoUploader
                    lessonId={editingId !== "new" ? editingId : null}
                    moduleId={module.id}
                    existingVideos={editingLesson?.videos ?? []}
                    onUpdate={refresh}
                  />

                  <AttachmentUploader
                    lessonId={editingId !== "new" ? editingId : null}
                    moduleId={module.id}
                    existingFiles={editingLesson?.files ?? []}
                    onUpdate={refresh}
                  />

                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#0C3D26" }} />
                    <span style={{ fontSize: 14, color: "#374151" }}>Published — visible to students</span>
                  </label>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 36 }}>📝</div>
                  <p style={{ fontSize: 14 }}>Select a lesson or click New.</p>
                </div>
              )}
            </div>
          )}

          {/* ── QUIZ TAB ───────────────────────────────────────────────── */}
          {tab === "quiz" && (
            <div style={{ padding: "28px 36px", maxWidth: 800 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: "serif", fontSize: 20, color: "#0C3D26", margin: "0 0 4px", fontWeight: 600 }}>Module Quiz</h2>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>Questions are shown to students in the order listed below.</p>
                </div>
                <button onClick={() => setAddingQ(true)} style={{ background: "#0C3D26", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Question</button>
              </div>

              {(initialQuiz?.questions.length ?? 0) === 0 && !addingQ && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "28px", border: "1px dashed #E2D9CC", textAlign: "center", color: "#9CA3AF", marginBottom: 16 }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
                  <p style={{ fontSize: 14 }}>No questions yet. Click Add Question to build the quiz.</p>
                </div>
              )}

              {initialQuiz?.questions.map((q, i) => (
                <div key={q.id} style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", marginBottom: 10, border: "1px solid #E2D9CC" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, background: "#EEF2F8", color: "#1A3A6B", fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{TYPE_LABEL[q.type] ?? q.type}</span>
                        {q.type !== "PASSAGE" && <span style={{ fontSize: 10, color: "#9CA3AF" }}>{q.points} pt{q.points !== 1 ? "s" : ""}</span>}
                      </div>
                      <p style={{ fontWeight: q.type === "PASSAGE" ? 400 : 600, color: q.type === "PASSAGE" ? "#6B7280" : "#111", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                        {q.type === "PASSAGE" ? `📖 Reading passage (${q.text.length} chars)` : `${i + 1}. ${q.text}`}
                      </p>
                      {q.type === "MATCHING" && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {q.options.map(o => <span key={o.id} style={{ fontSize: 11, background: "#F3F4F6", padding: "2px 8px", borderRadius: 6, color: "#374151" }}>{o.text} → {o.matchText}</span>)}
                        </div>
                      )}
                      {(q.type === "MCQ" || q.type === "MSQ" || q.type === "TRUE_FALSE") && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {q.options.map(o => <span key={o.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: o.isCorrect ? "#E3F0E9" : "#F3F4F6", color: o.isCorrect ? "#0C3D26" : "#6B7280", fontWeight: o.isCorrect ? 600 : 400 }}>{o.isCorrect && "✓ "}{o.text}</span>)}
                        </div>
                      )}
                      {(q.type === "CLOZE" || q.type === "SENTENCE_COMPLETION") && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                          Correct: <strong style={{ color: "#0C3D26" }}>{q.options[0]?.text}</strong>
                          {q.hintText && <span style={{ marginLeft: 8 }}>· Hint: ({q.hintText})</span>}
                        </div>
                      )}
                      {q.type === "SHORT_ANSWER" && <div style={{ marginTop: 4, fontSize: 11, color: "#B47E2A" }}>⚠ Requires manual grading</div>}
                    </div>
                    <button onClick={() => handleDeleteQ(q.id)} style={{ background: "none", border: "none", color: "#B91C1C", fontSize: 13, cursor: "pointer", flexShrink: 0, padding: "0 4px" }}>✕</button>
                  </div>
                </div>
              ))}

              {addingQ && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "22px 24px", border: "1.5px solid #0C3D26", marginTop: 12 }}>
                  <h3 style={{ fontFamily: "serif", fontSize: 17, color: "#0C3D26", margin: "0 0 16px", fontWeight: 600 }}>New Question</h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>QUESTION TYPE</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ALL_TYPES.map(t => (
                        <button key={t.value} type="button" onClick={() => setQForm(p => ({ ...emptyQForm(), type: t.value }))}
                          style={{ padding: "5px 13px", borderRadius: 8, border: `1.5px solid ${Q.type === t.value ? "#0C3D26" : "#E2D9CC"}`, background: Q.type === t.value ? "#E3F0E9" : "#fff", color: Q.type === t.value ? "#0C3D26" : "#6B7280", fontSize: 12, fontWeight: Q.type === t.value ? 600 : 400, cursor: "pointer" }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {Q.type === "PASSAGE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>PASSAGE CONTENT</label>
                      <RichTextEditor content={Q.passageContent} onChange={html => setQForm(p => ({ ...p, passageContent: html }))} />
                    </div>
                  )}

                  {Q.type !== "PASSAGE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>
                        QUESTION TEXT{(Q.type === "CLOZE" || Q.type === "SENTENCE_COMPLETION") && <span style={{ fontWeight: 400 }}> — use _____ to mark the blank</span>}
                      </label>
                      <textarea value={Q.text} onChange={e => setQForm(p => ({ ...p, text: e.target.value }))} rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit" }} />
                    </div>
                  )}

                  {Q.type === "MCQ" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>OPTIONS — select the ONE correct answer</label>
                      {Q.options.map((opt, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <input type="radio" name="mcq_correct" checked={Q.optionCorrect[i]} onChange={() => setQForm(p => ({ ...p, optionCorrect: p.options.map((_, j) => j === i) }))} style={{ accentColor: "#0C3D26", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                          <input value={opt} onChange={e => { const o = [...Q.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })) }} placeholder={`Option ${String.fromCharCode(65 + i)}`} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${Q.optionCorrect[i] ? "#0C3D26" : "#E2D9CC"}`, fontSize: 13, outline: "none", background: Q.optionCorrect[i] ? "#E3F0E9" : "#fff" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {Q.type === "MSQ" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>OPTIONS — check ALL correct answers</label>
                      {Q.options.map((opt, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <input type="checkbox" checked={Q.optionCorrect[i]} onChange={() => { const c = [...Q.optionCorrect]; c[i] = !c[i]; setQForm(p => ({ ...p, optionCorrect: c })) }} style={{ accentColor: "#0C3D26", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                          <input value={opt} onChange={e => { const o = [...Q.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })) }} placeholder={`Option ${String.fromCharCode(65 + i)}`} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${Q.optionCorrect[i] ? "#0C3D26" : "#E2D9CC"}`, fontSize: 13, outline: "none", background: Q.optionCorrect[i] ? "#E3F0E9" : "#fff" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {Q.type === "TRUE_FALSE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>CORRECT ANSWER</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {(["True", "False"] as const).map(tf => (
                          <button key={tf} type="button" onClick={() => setQForm(p => ({ ...p, correctTF: tf }))} style={{ padding: "8px 24px", borderRadius: 8, border: `1.5px solid ${Q.correctTF === tf ? "#0C3D26" : "#E2D9CC"}`, background: Q.correctTF === tf ? "#E3F0E9" : "#fff", color: Q.correctTF === tf ? "#0C3D26" : "#6B7280", fontSize: 14, fontWeight: Q.correctTF === tf ? 600 : 400, cursor: "pointer" }}>{tf}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {Q.type === "CLOZE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>CORRECT ANSWER</label>
                      <input value={Q.correctAnswer} onChange={e => setQForm(p => ({ ...p, correctAnswer: e.target.value }))} placeholder="Exact word or phrase" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                    </div>
                  )}

                  {Q.type === "SENTENCE_COMPLETION" && (
                    <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>HINT (in brackets)</label>
                        <input value={Q.hintText} onChange={e => setQForm(p => ({ ...p, hintText: e.target.value }))} placeholder="e.g. suffer" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>CORRECT ANSWER</label>
                        <input value={Q.correctAnswer} onChange={e => setQForm(p => ({ ...p, correctAnswer: e.target.value }))} placeholder="e.g. had been suffering" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" }} />
                      </div>
                    </div>
                  )}

                  {Q.type === "MATCHING" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>PAIRS — term on left, correct match on right</label>
                      {Q.pairs.map((pair, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                          <input value={pair.left} onChange={e => { const p = [...Q.pairs]; p[i] = { ...p[i], left: e.target.value }; setQForm(f => ({ ...f, pairs: p })) }} placeholder={`Term ${i + 1}`} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
                          <span style={{ color: "#9CA3AF", fontSize: 16, flexShrink: 0 }}>→</span>
                          <input value={pair.right} onChange={e => { const p = [...Q.pairs]; p[i] = { ...p[i], right: e.target.value }; setQForm(f => ({ ...f, pairs: p })) }} placeholder={`Definition ${i + 1}`} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
                          {Q.pairs.length > 2 && <button type="button" onClick={() => setQForm(f => ({ ...f, pairs: f.pairs.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", color: "#B91C1C", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>✕</button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => setQForm(p => ({ ...p, pairs: [...p.pairs, { left: "", right: "" }] }))} style={{ background: "#E3F0E9", color: "#0C3D26", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>+ Add Pair</button>
                    </div>
                  )}

                  {Q.type === "SHORT_ANSWER" && (
                    <div style={{ marginBottom: 14, background: "#FBF4E3", borderLeft: "3px solid #B47E2A", padding: "12px 16px", borderRadius: "0 8px 8px 0" }}>
                      <p style={{ fontSize: 13, color: "#92400E", margin: "0 0 8px", fontWeight: 500 }}>⚠ This question requires manual grading</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <label style={{ fontSize: 12, color: "#92400E", fontWeight: 600 }}>Points available:</label>
                        <input type="number" min={1} max={20} value={Q.points} onChange={e => setQForm(p => ({ ...p, points: parseInt(e.target.value) || 1 }))} style={{ width: 60, padding: "5px 8px", borderRadius: 6, border: "1px solid #E2D9CC", fontSize: 13, outline: "none" }} />
                      </div>
                    </div>
                  )}

                  {Q.type !== "PASSAGE" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 5 }}>EXPLANATION (optional)</label>
                      <input value={Q.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} placeholder="Shown to student after answering" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setAddingQ(false); setQForm(emptyQForm()) }} style={{ background: "#F3F4F6", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleAddQuestion} disabled={saving || (Q.type !== "PASSAGE" && !Q.text.trim())} style={{ background: saving || (Q.type !== "PASSAGE" && !Q.text.trim()) ? "#E5E7EB" : "#0C3D26", color: saving || (Q.type !== "PASSAGE" && !Q.text.trim()) ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Save Question"}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ASSESSMENTS TAB ────────────────────────────────────────── */}
          {tab === "assessments" && (
            <AssessmentsPanel moduleId={module.id} currentUserId={currentUserId} assessments={assessments} onUpdate={refresh} />
          )}

          {/* ── PENDING GRADING TAB ────────────────────────────────────── */}
          {tab === "grading" && (
            <div style={{ padding: "28px 36px", maxWidth: 760 }}>
              <h2 style={{ fontFamily: "serif", fontSize: 20, color: "#0C3D26", margin: "0 0 6px", fontWeight: 600 }}>Pending Grading</h2>
              <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 22 }}>These students submitted short answer questions that require your review.</p>

              {gradingResult && (
                <div style={{ background: gradingResult.passed ? "#F0FBF4" : "#FEF2F2", border: `1px solid ${gradingResult.passed ? "#86C49B" : "#FCA5A5"}`, borderRadius: 10, padding: "14px 18px", marginBottom: 18 }}>
                  <span style={{ fontWeight: 600, color: gradingResult.passed ? "#15803D" : "#B91C1C" }}>
                    {gradingResult.passed ? "✓ Grade submitted — student passed!" : "Grade submitted — student did not pass."} Final score: {gradingResult.score}%
                  </span>
                </div>
              )}

              {pendingAttempts.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 12, padding: "36px", border: "1px dashed #E2D9CC", textAlign: "center", color: "#9CA3AF" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                  <p style={{ fontSize: 14 }}>No pending submissions. All short answer responses have been graded.</p>
                </div>
              ) : (
                pendingAttempts.map(attempt => (
                  <div key={attempt.id} style={{ background: "#fff", borderRadius: 12, border: gradingId === attempt.id ? "1.5px solid #B47E2A" : "1px solid #E2D9CC", marginBottom: 16, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", background: "#F7F3ED", borderBottom: "1px solid #E2D9CC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "#1A1A1A" }}>{attempt.student.name}</span>
                        {attempt.student.studentIdNumber && <span style={{ fontSize: 11, color: "#B47E2A", fontWeight: 600, marginLeft: 8 }}>ID: {attempt.student.studentIdNumber}</span>}
                        <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: 8 }}>{attempt.student.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {attempt.submittedAt && (
                          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                            Submitted {new Date(attempt.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {attempt.score !== null && <span style={{ fontSize: 12, color: "#1A3A6B", fontWeight: 500 }}>Auto-score: {attempt.score}%</span>}
                        <button onClick={() => { setGradingId(gradingId === attempt.id ? null : attempt.id); setGrades({}) }}
                          style={{ background: gradingId === attempt.id ? "#FBF4E3" : "#E3F0E9", color: gradingId === attempt.id ? "#92400E" : "#0C3D26", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          {gradingId === attempt.id ? "Cancel" : "Grade →"}
                        </button>
                      </div>
                    </div>

                    {gradingId === attempt.id && (
                      <div style={{ padding: "20px 22px" }}>
                        {attempt.shortAnswers.map(sa => (
                          <div key={sa.questionId} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #F0EAE0" }}>
                            <p style={{ fontWeight: 600, color: "#111", margin: "0 0 8px", fontSize: 14, lineHeight: 1.5 }}>
                              {sa.questionText}
                              <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 400, marginLeft: 8 }}>{sa.points} pts</span>
                            </p>
                            <div style={{ background: "#F7F3ED", borderRadius: 8, padding: "12px 16px", marginBottom: 12, fontSize: 14, color: "#374151", lineHeight: 1.7, fontStyle: "italic" }}>
                              {sa.textAnswer || <span style={{ color: "#C5BAB0" }}>No response provided</span>}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <span style={{ fontSize: 13, color: "#6B7280", alignSelf: "center", marginRight: 4 }}>Mark as:</span>
                              <button onClick={() => setGrades(p => ({ ...p, [sa.questionId]: true }))}
                                style={{ padding: "6px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: grades[sa.questionId] === true ? "#DCFCE7" : "#F3F4F6", color: grades[sa.questionId] === true ? "#15803D" : "#374151" }}>
                                ✓ Award {sa.points} pt{sa.points !== 1 ? "s" : ""}
                              </button>
                              <button onClick={() => setGrades(p => ({ ...p, [sa.questionId]: false }))}
                                style={{ padding: "6px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: grades[sa.questionId] === false ? "#FEE2E2" : "#F3F4F6", color: grades[sa.questionId] === false ? "#B91C1C" : "#374151" }}>
                                ✗ No points
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => handleSubmitGrade(attempt.id)} disabled={saving || attempt.shortAnswers.some(sa => grades[sa.questionId] === undefined)}
                          style={{ background: saving || attempt.shortAnswers.some(sa => grades[sa.questionId] === undefined) ? "#E5E7EB" : "#0C3D26", color: saving || attempt.shortAnswers.some(sa => grades[sa.questionId] === undefined) ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          {saving ? "Submitting…" : "Submit Final Grade"}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
