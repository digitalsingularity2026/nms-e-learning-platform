"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { createLesson, updateLesson, deleteLesson, ensureQuiz, createQuestion, deleteQuestion, gradeShortAnswers, updateModuleSettings } from "@/app/actions/faculty"
import VideoUploader from "@/components/VideoUploader"
import AttachmentUploader from "@/components/AttachmentUploader"
import AssessmentsPanel, { type AssessmentInfo } from "./AssessmentsPanel"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { Tabs } from "@/components/ui/Tabs"

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false, loading: () => <div style={{ height: 200, background: "var(--surface-subtle)", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13 }}>Loading editor…</div> })

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
  { value: "BEST_ANSWER",         label: "Best Answer"             },
  { value: "TRUE_FALSE",          label: "True / False"            },
  { value: "MSQ",                 label: "Multiple Select (MSQ)"   },
  { value: "CLOZE",               label: "Fill in the Blank"       },
  { value: "SENTENCE_COMPLETION", label: "Sentence Completion"     },
  { value: "MATCHING",            label: "Matching Pairs"          },
  { value: "PASSAGE",             label: "Reading Passage"         },
]
// SHORT_ANSWER is retired from new-question creation — the Assessment system
// now handles manually-graded written answers. Existing SHORT_ANSWER
// questions and the Pending Grading tab keep working unchanged.
const TYPE_LABEL: Record<string, string> = { ...Object.fromEntries(ALL_TYPES.map(t => [t.value, t.label])), SHORT_ANSWER: "Short Answer" }

const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--ink-500)", letterSpacing: "0.08em", display: "block", marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, outline: "none", boxSizing: "border-box" }

function emptyQForm() {
  return { type: "MCQ", text: "", options: ["", "", "", ""], optionCorrect: [false, false, false, false] as boolean[], correctTF: "True" as "True" | "False", correctAnswer: "", hintText: "", pairs: [{ left: "", right: "" }, { left: "", right: "" }], points: 2, explanation: "", passageContent: "" }
}

export default function FacultyModuleView({ module, lessons: initialLessons, quiz: initialQuiz, pendingAttempts, assessments, currentUserId }: {
  module: { id: string; code: string; title: string; isPublished: boolean; passMark: number; learningObjectives: string[] }
  lessons: Lesson[]; quiz: Quiz | null; pendingAttempts: PendingAttempt[]
  assessments: AssessmentInfo[]; currentUserId: string
}) {
  const router = useRouter()
  const [isRefreshing, startTransition] = useTransition()
  const [tab, setTab]             = useState<"lessons" | "quiz" | "assessments" | "grading" | "settings">("lessons")
  const [passMarkForm, setPassMarkForm] = useState(module.passMark)
  const [objectivesForm, setObjectivesForm] = useState<string[]>(module.learningObjectives.length > 0 ? module.learningObjectives : [""])
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved]   = useState(false)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm]           = useState(EMPTY_LESSON)
  const [qForm, setQForm]         = useState(emptyQForm())
  const [addingQ, setAddingQ]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [gradingId, setGradingId]         = useState<string | null>(null)
  const [grades, setGrades]               = useState<Record<string, boolean>>({})
  const [gradingResult, setGradingResult] = useState<{ score: number; passed: boolean } | null>(null)
  const bottomOfQuestionsRef = useRef<HTMLDivElement>(null)
  const [pendingQuestionScroll, setPendingQuestionScroll] = useState(false)

  // Scroll to the newest question once the post-add refresh has actually landed
  useEffect(() => {
    if (!isRefreshing && pendingQuestionScroll) {
      bottomOfQuestionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      setPendingQuestionScroll(false)
    }
  }, [isRefreshing, pendingQuestionScroll])

  const refresh = () => startTransition(() => router.refresh())
  const refreshAndScrollToNewQuestion = () => {
    setPendingQuestionScroll(true)
    startTransition(() => router.refresh())
  }

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
    setSaving(false); setAddingQ(false); setQForm(emptyQForm()); refreshAndScrollToNewQuestion()
  }

  function addOption() {
    setQForm(p => ({ ...p, options: [...p.options, ""], optionCorrect: [...p.optionCorrect, false] }))
  }
  function removeOption(i: number) {
    setQForm(p => ({ ...p, options: p.options.filter((_, j) => j !== i), optionCorrect: p.optionCorrect.filter((_, j) => j !== i) }))
  }

  async function handleSaveSettings() {
    setSettingsSaving(true); setSettingsSaved(false)
    const res = await updateModuleSettings(module.id, { passMark: passMarkForm, learningObjectives: objectivesForm })
    setSettingsSaving(false)
    if ("error" in res) { alert(res.error); return }
    setSettingsSaved(true); refresh()
    setTimeout(() => setSettingsSaved(false), 2500)
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

        <Tabs
          tabs={[
            { key: "lessons", icon: "file-text", label: `Lessons (${initialLessons.length})` },
            { key: "quiz", icon: "note-pencil", label: `Quiz (${initialQuiz?.questions.length ?? 0})` },
            { key: "assessments", icon: "clipboard-text", label: `Assessments (${assessments.length})` },
            { key: "grading", icon: "pencil-simple-line", label: `Pending Grading${pendingAttempts.length > 0 ? ` (${pendingAttempts.length})` : ""}` },
            { key: "settings", icon: "gear-six", label: "Settings" },
          ]}
          active={tab}
          onChange={k => { setTab(k as typeof tab); setEditingId(null); setAddingQ(false); setGradingId(null) }}
          activeColor={tab === "grading" && pendingAttempts.length > 0 ? "var(--gold-700)" : "var(--green-700)"}
        />

        <div style={{ flex: 1, overflowY: "auto", background: "var(--surface-subtle)" }}>

          {/* ── LESSONS TAB ────────────────────────────────────────────── */}
          {tab === "lessons" && (
            <div style={{ display: "grid", gridTemplateColumns: editingId ? "300px 1fr" : "1fr", height: "100%" }}>

              {/* Sidebar */}
              <div style={{ background: "#fff", borderRight: "1px solid var(--border)", overflowY: "auto", padding: "20px 0" }}>
                <div style={{ padding: "0 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.1em" }}>LESSONS</span>
                  <Button size="sm" onClick={openNew}>+ New</Button>
                </div>
                {initialLessons.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-400)", padding: "8px 20px" }}>No lessons yet.</p>}
                {initialLessons.map(l => (
                  <div key={l.id} onClick={() => openEdit(l)} style={{ padding: "11px 20px", borderLeft: editingId === l.id ? "3px solid var(--green-700)" : "3px solid transparent", background: editingId === l.id ? "var(--green-50)" : "none", cursor: "pointer" }}>
                    <div style={{ fontWeight: 500, fontSize: 13, color: "var(--ink-900)", marginBottom: 3 }}>{l.title}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: l.isPublished ? "var(--green-100)" : "var(--surface-sunken)", color: l.isPublished ? "var(--green-700)" : "var(--ink-400)" }}>{l.isPublished ? "PUBLISHED" : "DRAFT"}</span>
                      {l.videos.length > 0 && <span style={{ fontSize: 10, color: "var(--gold-700)", display: "flex", alignItems: "center", gap: 2 }}><Icon name="play-circle" size={11} /> {l.videos.length}</span>}
                      {l.files.length > 0 && <span style={{ fontSize: 10, color: "var(--blue-700)", display: "flex", alignItems: "center", gap: 2 }}><Icon name="paperclip" size={11} /> {l.files.length}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Editor panel */}
              {editingId ? (
                <div style={{ overflowY: "auto", padding: "28px 36px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: 0, fontWeight: 600 }}>{editingId === "new" ? "New Lesson" : "Edit Lesson"}</h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      {editingId !== "new" && (
                        <Button variant="danger" size="sm" onClick={() => handleDeleteLesson(editingId)}>Delete</Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button size="sm" onClick={saveLesson} disabled={saving || !form.title.trim()}>{saving ? "Saving…" : "Save"}</Button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={label}>TITLE</label>
                    <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Lesson title" style={inputStyle} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={label}>CONTENT</label>
                    <RichTextEditor content={form.content} onChange={html => setForm(p => ({ ...p, content: html }))} />
                    <p style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 5 }}>Tip: Use H2 for sections, the Table button for vocabulary tables.</p>
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
                    <input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--green-700)" }} />
                    <span style={{ fontSize: 14, color: "var(--ink-700)" }}>Published — visible to students</span>
                  </label>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", flexDirection: "column", gap: 10 }}>
                  <Icon name="note-pencil" size={36} />
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
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 4px", fontWeight: 600 }}>Module Quiz</h2>
                  <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0 }}>Questions are shown to students in the order listed below.</p>
                </div>
                <Button onClick={() => setAddingQ(true)}>+ Add Question</Button>
              </div>

              {(initialQuiz?.questions.length ?? 0) === 0 && !addingQ && (
                <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "28px", border: "1px dashed var(--border-strong)", textAlign: "center", color: "var(--ink-400)", marginBottom: 16 }}>
                  <Icon name="clipboard-text" size={30} style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 14 }}>No questions yet. Click Add Question to build the quiz.</p>
                </div>
              )}

              {initialQuiz?.questions.map((q, i) => (
                <div key={q.id} style={{ background: "#fff", borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: 10, boxShadow: "var(--shadow-card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, background: "var(--blue-100)", color: "var(--blue-700)", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>{TYPE_LABEL[q.type] ?? q.type}</span>
                        {q.type !== "PASSAGE" && <span style={{ fontSize: 10, color: "var(--ink-400)" }}>{q.points} pt{q.points !== 1 ? "s" : ""}</span>}
                      </div>
                      <p style={{ fontWeight: q.type === "PASSAGE" ? 400 : 600, color: q.type === "PASSAGE" ? "var(--ink-500)" : "var(--ink-900)", margin: 0, fontSize: 13, lineHeight: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
                        {q.type === "PASSAGE" ? <><Icon name="book-open" size={13} /> Reading passage ({q.text.length} chars)</> : `${i + 1}. ${q.text}`}
                      </p>
                      {q.type === "MATCHING" && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {q.options.map(o => <span key={o.id} style={{ fontSize: 11, background: "var(--surface-sunken)", padding: "2px 8px", borderRadius: "var(--radius-sm)", color: "var(--ink-700)" }}>{o.text} → {o.matchText}</span>)}
                        </div>
                      )}
                      {(q.type === "MCQ" || q.type === "BEST_ANSWER" || q.type === "MSQ" || q.type === "TRUE_FALSE") && (
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {q.options.map(o => <span key={o.id} style={{ fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-pill)", background: o.isCorrect ? "var(--green-100)" : "var(--surface-sunken)", color: o.isCorrect ? "var(--green-700)" : "var(--ink-500)", fontWeight: o.isCorrect ? 600 : 400, display: "inline-flex", alignItems: "center", gap: 3 }}>{o.isCorrect && <Icon name="check" size={10} />}{o.text}</span>)}
                        </div>
                      )}
                      {(q.type === "CLOZE" || q.type === "SENTENCE_COMPLETION") && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-500)" }}>
                          Correct: <strong style={{ color: "var(--green-700)" }}>{q.options[0]?.text}</strong>
                          {q.hintText && <span style={{ marginLeft: 8 }}>· Hint: ({q.hintText})</span>}
                        </div>
                      )}
                      {q.type === "SHORT_ANSWER" && <div style={{ marginTop: 4, fontSize: 11, color: "var(--gold-700)" }}>Requires manual grading</div>}
                    </div>
                    <button onClick={() => handleDeleteQ(q.id)} style={{ background: "none", border: "none", color: "var(--error-700)", cursor: "pointer", flexShrink: 0, padding: "0 4px" }}><Icon name="x" size={14} /></button>
                  </div>
                </div>
              ))}
              <div ref={bottomOfQuestionsRef} />

              {addingQ && (
                <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "22px 24px", border: "1.5px solid var(--green-700)", marginTop: 12 }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--green-700)", margin: "0 0 16px", fontWeight: 600 }}>New Question</h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ ...label, marginBottom: 8 }}>QUESTION TYPE</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ALL_TYPES.map(t => (
                        <button key={t.value} type="button" onClick={() => setQForm(p => ({ ...emptyQForm(), type: t.value }))}
                          style={{ padding: "5px 13px", borderRadius: "var(--radius-md)", border: `1.5px solid ${Q.type === t.value ? "var(--green-700)" : "var(--border)"}`, background: Q.type === t.value ? "var(--green-100)" : "#fff", color: Q.type === t.value ? "var(--green-700)" : "var(--ink-500)", fontSize: 12, fontWeight: Q.type === t.value ? 600 : 400, cursor: "pointer" }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {Q.type === "PASSAGE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...label, marginBottom: 6 }}>PASSAGE CONTENT</label>
                      <RichTextEditor content={Q.passageContent} onChange={html => setQForm(p => ({ ...p, passageContent: html }))} />
                    </div>
                  )}

                  {Q.type !== "PASSAGE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={label}>
                        QUESTION TEXT{(Q.type === "CLOZE" || Q.type === "SENTENCE_COMPLETION") && <span style={{ fontWeight: 400 }}> — use _____ to mark the blank</span>}
                      </label>
                      <textarea value={Q.text} onChange={e => setQForm(p => ({ ...p, text: e.target.value }))} rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                  )}

                  {Q.type === "MCQ" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...label, marginBottom: 8 }}>OPTIONS — select the ONE correct answer</label>
                      {Q.options.map((opt, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <input type="radio" name="mcq_correct" checked={Q.optionCorrect[i]} onChange={() => setQForm(p => ({ ...p, optionCorrect: p.options.map((_, j) => j === i) }))} style={{ accentColor: "var(--green-700)", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                          <input value={opt} onChange={e => { const o = [...Q.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })) }} placeholder={`Option ${String.fromCharCode(65 + i)}`} style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${Q.optionCorrect[i] ? "var(--green-700)" : "var(--border)"}`, fontSize: 13, outline: "none", background: Q.optionCorrect[i] ? "var(--green-100)" : "#fff" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {Q.type === "BEST_ANSWER" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...label, marginBottom: 4 }}>OPTIONS — select the ONE best answer</label>
                      <p style={{ fontSize: 11.5, color: "var(--ink-400)", margin: "0 0 8px" }}>Use when several options are plausible but only one is the best choice — e.g. a clinical vignette.</p>
                      {Q.options.map((opt, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <input type="radio" name="best_correct" checked={Q.optionCorrect[i]} onChange={() => setQForm(p => ({ ...p, optionCorrect: p.options.map((_, j) => j === i) }))} style={{ accentColor: "var(--green-700)", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                          <input value={opt} onChange={e => { const o = [...Q.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })) }} placeholder={`Option ${String.fromCharCode(65 + i)}`} style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${Q.optionCorrect[i] ? "var(--green-700)" : "var(--border)"}`, fontSize: 13, outline: "none", background: Q.optionCorrect[i] ? "var(--green-100)" : "#fff" }} />
                          {Q.options.length > 3 && <button type="button" onClick={() => removeOption(i)} style={{ background: "none", border: "none", color: "var(--error-700)", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={14} /></button>}
                        </div>
                      ))}
                      {Q.options.length < 6 && <Button variant="secondary" size="sm" type="button" onClick={addOption} style={{ marginTop: 4 }}>+ Add Option</Button>}
                    </div>
                  )}

                  {Q.type === "MSQ" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...label, marginBottom: 8 }}>OPTIONS — check ALL correct answers</label>
                      {Q.options.map((opt, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <input type="checkbox" checked={Q.optionCorrect[i]} onChange={() => { const c = [...Q.optionCorrect]; c[i] = !c[i]; setQForm(p => ({ ...p, optionCorrect: c })) }} style={{ accentColor: "var(--green-700)", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                          <input value={opt} onChange={e => { const o = [...Q.options]; o[i] = e.target.value; setQForm(p => ({ ...p, options: o })) }} placeholder={`Option ${String.fromCharCode(65 + i)}`} style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${Q.optionCorrect[i] ? "var(--green-700)" : "var(--border)"}`, fontSize: 13, outline: "none", background: Q.optionCorrect[i] ? "var(--green-100)" : "#fff" }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {Q.type === "TRUE_FALSE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...label, marginBottom: 8 }}>CORRECT ANSWER</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {(["True", "False"] as const).map(tf => (
                          <button key={tf} type="button" onClick={() => setQForm(p => ({ ...p, correctTF: tf }))} style={{ padding: "8px 24px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${Q.correctTF === tf ? "var(--green-700)" : "var(--border)"}`, background: Q.correctTF === tf ? "var(--green-100)" : "#fff", color: Q.correctTF === tf ? "var(--green-700)" : "var(--ink-500)", fontSize: 14, fontWeight: Q.correctTF === tf ? 600 : 400, cursor: "pointer" }}>{tf}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {Q.type === "CLOZE" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={label}>CORRECT ANSWER</label>
                      <input value={Q.correctAnswer} onChange={e => setQForm(p => ({ ...p, correctAnswer: e.target.value }))} placeholder="Exact word or phrase" style={inputStyle} />
                    </div>
                  )}

                  {Q.type === "SENTENCE_COMPLETION" && (
                    <div style={{ marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={label}>HINT (in brackets)</label>
                        <input value={Q.hintText} onChange={e => setQForm(p => ({ ...p, hintText: e.target.value }))} placeholder="e.g. suffer" style={inputStyle} />
                      </div>
                      <div>
                        <label style={label}>CORRECT ANSWER</label>
                        <input value={Q.correctAnswer} onChange={e => setQForm(p => ({ ...p, correctAnswer: e.target.value }))} placeholder="e.g. had been suffering" style={inputStyle} />
                      </div>
                    </div>
                  )}

                  {Q.type === "MATCHING" && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ ...label, marginBottom: 8 }}>PAIRS — term on left, correct match on right</label>
                      {Q.pairs.map((pair, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                          <input value={pair.left} onChange={e => { const p = [...Q.pairs]; p[i] = { ...p[i], left: e.target.value }; setQForm(f => ({ ...f, pairs: p })) }} placeholder={`Term ${i + 1}`} style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13, outline: "none" }} />
                          <Icon name="arrow-right" size={16} color="var(--ink-400)" />
                          <input value={pair.right} onChange={e => { const p = [...Q.pairs]; p[i] = { ...p[i], right: e.target.value }; setQForm(f => ({ ...f, pairs: p })) }} placeholder={`Definition ${i + 1}`} style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13, outline: "none" }} />
                          {Q.pairs.length > 2 && <button type="button" onClick={() => setQForm(f => ({ ...f, pairs: f.pairs.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", color: "var(--error-700)", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={14} /></button>}
                        </div>
                      ))}
                      <Button variant="secondary" size="sm" type="button" onClick={() => setQForm(p => ({ ...p, pairs: [...p.pairs, { left: "", right: "" }] }))} style={{ marginTop: 4 }}>+ Add Pair</Button>
                    </div>
                  )}

                  {Q.type === "SHORT_ANSWER" && (
                    <div style={{ marginBottom: 14, background: "var(--gold-100)", borderLeft: "3px solid var(--gold-600)", padding: "12px 16px", borderRadius: "0 var(--radius-md) var(--radius-md) 0" }}>
                      <p style={{ fontSize: 13, color: "var(--gold-700)", margin: "0 0 8px", fontWeight: 500 }}>This question requires manual grading</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <label style={{ fontSize: 12, color: "var(--gold-700)", fontWeight: 600 }}>Points available:</label>
                        <input type="number" min={1} max={20} value={Q.points} onChange={e => setQForm(p => ({ ...p, points: parseInt(e.target.value) || 1 }))} style={{ width: 60, padding: "5px 8px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", fontSize: 13, outline: "none" }} />
                      </div>
                    </div>
                  )}

                  {Q.type !== "PASSAGE" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={label}>EXPLANATION (optional)</label>
                      <input value={Q.explanation} onChange={e => setQForm(p => ({ ...p, explanation: e.target.value }))} placeholder="Shown to student after answering" style={inputStyle} />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="secondary" onClick={() => { setAddingQ(false); setQForm(emptyQForm()) }}>Cancel</Button>
                    <Button onClick={handleAddQuestion} disabled={saving || (Q.type !== "PASSAGE" && !Q.text.trim())}>{saving ? "Saving…" : "Save Question"}</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ───────────────────────────────────────────── */}
          {tab === "settings" && (
            <div style={{ padding: "28px 36px", maxWidth: 700 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 4px", fontWeight: 600 }}>Module Settings</h2>
              <p style={{ fontSize: 13, color: "var(--ink-500)", margin: "0 0 22px" }}>These control what students see on the module overview and how the quiz is scored.</p>

              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", padding: "22px 24px", marginBottom: 20 }}>
                <label style={{ ...label, marginBottom: 8 }}>QUIZ PASS MARK (%)</label>
                <input type="number" min={0} max={100} value={passMarkForm} onChange={e => setPassMarkForm(parseInt(e.target.value) || 0)}
                  style={{ width: 100, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, outline: "none" }} />
                <p style={{ fontSize: 11.5, color: "var(--ink-400)", margin: "8px 0 0" }}>Students need this percentage on the module quiz to complete the module and unlock the next one.</p>
              </div>

              <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", padding: "22px 24px", marginBottom: 20 }}>
                <label style={{ ...label, marginBottom: 8 }}>LEARNING OBJECTIVES</label>
                <p style={{ fontSize: 11.5, color: "var(--ink-400)", margin: "0 0 10px" }}>Shown to students in the module sidebar. Add as many as you like.</p>
                {objectivesForm.map((obj, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input value={obj} onChange={e => { const o = [...objectivesForm]; o[i] = e.target.value; setObjectivesForm(o) }}
                      placeholder={`Objective ${i + 1}`}
                      style={{ flex: 1, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 13, outline: "none" }} />
                    {objectivesForm.length > 1 && (
                      <button type="button" onClick={() => setObjectivesForm(objectivesForm.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "var(--error-700)", cursor: "pointer", flexShrink: 0 }}><Icon name="x" size={14} /></button>
                    )}
                  </div>
                ))}
                <Button variant="secondary" size="sm" type="button" onClick={() => setObjectivesForm([...objectivesForm, ""])} style={{ marginTop: 4 }}>+ Add Objective</Button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button onClick={handleSaveSettings} disabled={settingsSaving}>{settingsSaving ? "Saving…" : "Save Settings"}</Button>
                {settingsSaved && <span style={{ fontSize: 13, color: "var(--success-700)", fontWeight: 500 }}>Saved</span>}
              </div>
            </div>
          )}

          {/* ── ASSESSMENTS TAB ────────────────────────────────────────── */}
          {tab === "assessments" && (
            <AssessmentsPanel moduleId={module.id} currentUserId={currentUserId} assessments={assessments} onUpdate={refresh} />
          )}

          {/* ── PENDING GRADING TAB ────────────────────────────────────── */}
          {tab === "grading" && (
            <div style={{ padding: "28px 36px", maxWidth: 760 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green-700)", margin: "0 0 6px", fontWeight: 600 }}>Pending Grading</h2>
              <p style={{ fontSize: 13, color: "var(--ink-500)", marginBottom: 22 }}>These students submitted short answer questions that require your review.</p>

              {gradingResult && (
                <div style={{ background: gradingResult.passed ? "var(--success-100)" : "var(--error-100)", border: `1px solid ${gradingResult.passed ? "var(--success-700)" : "#E39A94"}`, borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: 18 }}>
                  <span style={{ fontWeight: 600, color: gradingResult.passed ? "var(--success-700)" : "var(--error-700)" }}>
                    {gradingResult.passed ? "Grade submitted — student passed!" : "Grade submitted — student did not pass."} Final score: {gradingResult.score}%
                  </span>
                </div>
              )}

              {pendingAttempts.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", padding: "36px", border: "1px dashed var(--border-strong)", textAlign: "center", color: "var(--ink-400)" }}>
                  <Icon name="check-circle" size={32} style={{ marginBottom: 10 }} />
                  <p style={{ fontSize: 14 }}>No pending submissions. All short answer responses have been graded.</p>
                </div>
              ) : (
                pendingAttempts.map(attempt => (
                  <div key={attempt.id} style={{ background: "#fff", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", border: gradingId === attempt.id ? "1.5px solid var(--gold-600)" : "none", marginBottom: 16, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", background: "var(--surface-subtle)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--ink-900)" }}>{attempt.student.name}</span>
                        {attempt.student.studentIdNumber && <span style={{ fontSize: 11, color: "var(--gold-700)", fontWeight: 600, marginLeft: 8 }}>ID: {attempt.student.studentIdNumber}</span>}
                        <span style={{ fontSize: 12, color: "var(--ink-400)", marginLeft: 8 }}>{attempt.student.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {attempt.submittedAt && (
                          <span style={{ fontSize: 11, color: "var(--ink-400)" }}>
                            Submitted {new Date(attempt.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {attempt.score !== null && <span style={{ fontSize: 12, color: "var(--blue-700)", fontWeight: 500 }}>Auto-score: {attempt.score}%</span>}
                        <Button size="sm" variant={gradingId === attempt.id ? "outline" : "secondary"} onClick={() => { setGradingId(gradingId === attempt.id ? null : attempt.id); setGrades({}) }}>
                          {gradingId === attempt.id ? "Cancel" : "Grade"}
                        </Button>
                      </div>
                    </div>

                    {gradingId === attempt.id && (
                      <div style={{ padding: "20px 22px" }}>
                        {attempt.shortAnswers.map(sa => (
                          <div key={sa.questionId} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--surface-sunken)" }}>
                            <p style={{ fontWeight: 600, color: "var(--ink-900)", margin: "0 0 8px", fontSize: 14, lineHeight: 1.5 }}>
                              {sa.questionText}
                              <span style={{ fontSize: 11, color: "var(--ink-400)", fontWeight: 400, marginLeft: 8 }}>{sa.points} pts</span>
                            </p>
                            <div style={{ background: "var(--surface-subtle)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: 12, fontSize: 14, color: "var(--ink-700)", lineHeight: 1.7, fontStyle: "italic" }}>
                              {sa.textAnswer || <span style={{ color: "var(--ink-400)" }}>No response provided</span>}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <span style={{ fontSize: 13, color: "var(--ink-500)", alignSelf: "center", marginRight: 4 }}>Mark as:</span>
                              <button onClick={() => setGrades(p => ({ ...p, [sa.questionId]: true }))}
                                style={{ padding: "6px 18px", borderRadius: "var(--radius-sm)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: grades[sa.questionId] === true ? "var(--success-100)" : "var(--surface-sunken)", color: grades[sa.questionId] === true ? "var(--success-700)" : "var(--ink-700)" }}>
                                Award {sa.points} pt{sa.points !== 1 ? "s" : ""}
                              </button>
                              <button onClick={() => setGrades(p => ({ ...p, [sa.questionId]: false }))}
                                style={{ padding: "6px 18px", borderRadius: "var(--radius-sm)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: grades[sa.questionId] === false ? "var(--error-100)" : "var(--surface-sunken)", color: grades[sa.questionId] === false ? "var(--error-700)" : "var(--ink-700)" }}>
                                No points
                              </button>
                            </div>
                          </div>
                        ))}
                        <Button onClick={() => handleSubmitGrade(attempt.id)} disabled={saving || attempt.shortAnswers.some(sa => grades[sa.questionId] === undefined)} style={{ padding: "10px 24px" }}>
                          {saving ? "Submitting…" : "Submit Final Grade"}
                        </Button>
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
