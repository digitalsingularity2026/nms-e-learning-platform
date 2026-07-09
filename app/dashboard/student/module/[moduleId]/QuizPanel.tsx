"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { submitQuizAction } from "@/app/actions/quiz"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"

type QOption  = { id: string; text: string; matchText?: string | null }
type Question = { id: string; text: string; type: string; hintText?: string | null; points: number; explanation?: string | null; options: QOption[] }
type QuizType = { id: string; title: string; instructions: string | null; questions: Question[] }
type QResult  = { correct: boolean | null; correctOptionId?: string; correctText?: string; matchResults?: Record<string, boolean> }
type SubmitResult = { passed: boolean | null; score: number; earnedPoints: number; totalScorable: number; hasPendingReview: boolean; results: Record<string, QResult> }

interface Props { quiz: QuizType; moduleId: string; passMark: number; hasPassedQuiz: boolean }

const tryArr = (s: string): string[] => { try { return JSON.parse(s) } catch { return [] } }
const tryObj = (s: string): Record<string, string> => { try { return JSON.parse(s) } catch { return {} } }

const TYPE_BADGE: Record<string, string> = {
  MCQ: "Multiple Choice", BEST_ANSWER: "Best Answer", TRUE_FALSE: "True / False", MSQ: "Multiple Select (all that apply)",
  CLOZE: "Fill in the Blank", SENTENCE_COMPLETION: "Sentence Completion",
  MATCHING: "Matching Pairs", SHORT_ANSWER: "Short Answer — faculty graded",
}

export default function QuizPanel({ quiz, moduleId, passMark, hasPassedQuiz }: Props) {
  const router = useRouter()
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState<SubmitResult | null>(null)

  const matchRights = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const q of quiz.questions) {
      if (q.type === "MATCHING") out[q.id] = [...q.options.map(o => o.matchText ?? "")].sort()
    }
    return out
  }, [quiz.id])

  const answerableQs = quiz.questions.filter(q => q.type !== "PASSAGE")

  const answeredCount = answerableQs.filter(q => {
    const a = answers[q.id] ?? ""
    if (q.type === "MSQ") return tryArr(a).length > 0
    if (q.type === "MATCHING") return q.options.every(o => (tryObj(a)[o.id] ?? "").trim() !== "")
    return a.trim() !== ""
  }).length

  const allAnswered = answeredCount === answerableQs.length

  async function handleSubmit() {
    if (!allAnswered || submitting) return
    setSubmitting(true)
    const res = await submitQuizAction(quiz.id, moduleId, answers)
    setSubmitting(false)
    if ("error" in res) { alert(res.error); return }
    setResult(res as SubmitResult)
    if ((res as SubmitResult).passed) router.refresh()
  }

  const showResults = result !== null
  let qNum = 0

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--green-700)", margin: "0 0 6px", fontWeight: 600 }}>{quiz.title}</h1>
      <p style={{ color: "var(--ink-500)", fontSize: 13, marginBottom: 16 }}>
        {answerableQs.length} question{answerableQs.length !== 1 ? "s" : ""} · Pass mark: {passMark}%
        {hasPassedQuiz && !showResults && <span style={{ color: "var(--success-700)", fontWeight: 600 }}> · Already passed</span>}
      </p>

      {quiz.instructions && (
        <div style={{ background: "var(--green-100)", borderLeft: "3px solid var(--green-700)", padding: "12px 16px", borderRadius: "0 var(--radius-md) var(--radius-md) 0", marginBottom: 22, fontSize: 13, color: "var(--green-900)", lineHeight: 1.6 }}>
          {quiz.instructions}
        </div>
      )}

      {quiz.questions.map(q => {
        if (q.type !== "PASSAGE") qNum++
        const n    = qNum
        const res  = showResults ? result!.results[q.id] : null
        const bdr  = showResults ? (res?.correct === true ? "var(--green-500)" : res?.correct === false ? "#F5A3A3" : "var(--border)") : "var(--border)"

        // ── PASSAGE ──────────────────────────────────────────────────────────
        if (q.type === "PASSAGE") {
          return (
            <div key={q.id} style={{ background: "var(--green-100)", border: "1.5px solid var(--green-500)", borderRadius: "var(--radius-md)", padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--green-700)", letterSpacing: "0.1em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="book-open" size={13} /> READING PASSAGE — read before answering the questions below
              </div>
              <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: q.text }} />
            </div>
          )
        }

        return (
          <div key={q.id} style={{ background: "#fff", borderRadius: "var(--radius-md)", padding: "18px 22px", marginBottom: 14, border: `1.5px solid ${bdr}`, boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, background: "var(--blue-100)", color: "var(--blue-700)", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>
                {TYPE_BADGE[q.type] ?? q.type}
              </span>
              <span style={{ fontSize: 10, color: "var(--ink-400)" }}>{q.points} pt{q.points !== 1 ? "s" : ""}</span>
            </div>

            <p style={{ fontWeight: 600, color: "var(--ink-900)", margin: "0 0 14px", fontSize: 15, lineHeight: 1.5 }}>{n}. {q.text}</p>

            {q.type === "SENTENCE_COMPLETION" && q.hintText && (
              <p style={{ fontSize: 13, color: "var(--ink-400)", margin: "-8px 0 12px", fontStyle: "italic" }}>Hint: ({q.hintText})</p>
            )}

            {q.type === "BEST_ANSWER" && (
              <p style={{ fontSize: 12, color: "var(--ink-400)", margin: "-8px 0 12px" }}>Several options may seem plausible — choose the single best answer.</p>
            )}

            {/* MCQ / BEST_ANSWER / TRUE_FALSE */}
            {(q.type === "MCQ" || q.type === "BEST_ANSWER" || q.type === "TRUE_FALSE") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt, oi) => {
                  const sel = answers[q.id] === opt.id
                  const isCorrectOpt = showResults && res?.correctOptionId === opt.id
                  let bg = "var(--surface-subtle)", border = "1.5px solid var(--border)", col = "var(--ink-700)"
                  if (!showResults && sel)                    { bg = "var(--green-100)"; border = "1.5px solid var(--green-700)"; col = "var(--green-700)" }
                  if (showResults && sel && res?.correct)     { bg = "var(--success-100)"; border = "1.5px solid var(--success-700)"; col = "var(--success-700)" }
                  if (showResults && sel && !res?.correct)    { bg = "var(--error-100)"; border = "1.5px solid var(--error-700)"; col = "var(--error-700)" }
                  if (showResults && !sel && isCorrectOpt)    { bg = "var(--success-100)"; border = "1.5px solid var(--success-700)"; col = "var(--success-700)" }
                  return (
                    <button key={opt.id} disabled={showResults} onClick={() => !showResults && setAnswers(p => ({ ...p, [q.id]: opt.id }))}
                      style={{ textAlign: "left", padding: "9px 14px", borderRadius: "var(--radius-sm)", background: bg, border, color: col, cursor: showResults ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                        {showResults && isCorrectOpt ? <Icon name="check" size={11} /> : showResults && sel && !res?.correct ? <Icon name="x" size={11} /> : String.fromCharCode(65 + oi)}
                      </span>
                      {opt.text}
                    </button>
                  )
                })}
              </div>
            )}

            {/* MSQ */}
            {q.type === "MSQ" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt, oi) => {
                  const selected  = tryArr(answers[q.id] ?? "[]")
                  const isChosen  = selected.includes(opt.id)
                  let bg = "var(--surface-subtle)", border = "1.5px solid var(--border)", col = "var(--ink-700)"
                  if (!showResults && isChosen)                   { bg = "var(--green-100)"; border = "1.5px solid var(--green-700)"; col = "var(--green-700)" }
                  if (showResults && isChosen && res?.correct)    { bg = "var(--success-100)"; border = "1.5px solid var(--success-700)"; col = "var(--success-700)" }
                  if (showResults && isChosen && !res?.correct)   { bg = "var(--error-100)"; border = "1.5px solid var(--error-700)"; col = "var(--error-700)" }
                  return (
                    <button key={opt.id} disabled={showResults}
                      onClick={() => { if (showResults) return; const cur = tryArr(answers[q.id] ?? "[]"); const next = cur.includes(opt.id) ? cur.filter(id => id !== opt.id) : [...cur, opt.id]; setAnswers(p => ({ ...p, [q.id]: JSON.stringify(next) })) }}
                      style={{ textAlign: "left", padding: "9px 14px", borderRadius: "var(--radius-sm)", background: bg, border, color: col, cursor: showResults ? "default" : "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 4, border: `1.5px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: col }}>
                        {isChosen && <Icon name="check" size={12} />}
                      </span>
                      {opt.text}
                    </button>
                  )
                })}
                {showResults && <p style={{ fontSize: 12, color: res?.correct ? "var(--success-700)" : "var(--error-700)", margin: "4px 0 0", fontWeight: 500 }}>{res?.correct ? "All correct answers selected" : "Not all correct — review and retry"}</p>}
              </div>
            )}

            {/* CLOZE / SENTENCE_COMPLETION */}
            {(q.type === "CLOZE" || q.type === "SENTENCE_COMPLETION") && (
              <div>
                <input value={answers[q.id] ?? ""} onChange={e => !showResults && setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  disabled={showResults} placeholder="Type your answer here…"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 14, outline: "none", fontFamily: "inherit",
                    border: showResults ? (res?.correct ? "1.5px solid var(--success-700)" : "1.5px solid var(--error-700)") : "1.5px solid var(--border)",
                    background: showResults ? (res?.correct ? "var(--success-100)" : "var(--error-100)") : "#fff",
                    color: showResults ? (res?.correct ? "var(--success-700)" : "var(--error-700)") : "var(--ink-900)" }} />
                {showResults && res?.correct && <p style={{ fontSize: 13, color: "var(--success-700)", marginTop: 5, fontWeight: 500 }}>Correct</p>}
                {showResults && !res?.correct && res?.correctText && (
                  <p style={{ fontSize: 13, color: "var(--success-700)", marginTop: 5 }}>Correct answer: <strong>{res.correctText}</strong></p>
                )}
              </div>
            )}

            {/* MATCHING */}
            {q.type === "MATCHING" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map(opt => {
                  const matches     = tryObj(answers[q.id] ?? "{}")
                  const studentAns  = matches[opt.id] ?? ""
                  const pairCorrect = showResults ? (result!.results[q.id]?.matchResults?.[opt.id] ?? false) : null
                  return (
                    <div key={opt.id} style={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 8, alignItems: "center" }}>
                      <div style={{ padding: "9px 14px", borderRadius: "var(--radius-sm)", background: "var(--surface-subtle)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
                        {opt.text}
                      </div>
                      <Icon name="arrow-right" size={14} color="var(--ink-400)" style={{ textAlign: "center" }} />
                      {showResults ? (
                        <div style={{ padding: "9px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, background: pairCorrect ? "var(--success-100)" : "var(--error-100)", border: `1.5px solid ${pairCorrect ? "var(--success-700)" : "var(--error-700)"}`, color: pairCorrect ? "var(--success-700)" : "var(--error-700)" }}>
                          {studentAns || "—"}
                          {!pairCorrect && opt.matchText && <div style={{ fontSize: 11, marginTop: 3, color: "var(--success-700)", fontWeight: 600 }}>Correct: {opt.matchText}</div>}
                        </div>
                      ) : (
                        <select value={studentAns}
                          onChange={e => { const cur = tryObj(answers[q.id] ?? "{}"); setAnswers(p => ({ ...p, [q.id]: JSON.stringify({ ...cur, [opt.id]: e.target.value }) })) }}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: `1.5px solid ${studentAns ? "var(--green-700)" : "var(--border)"}`, fontSize: 13, outline: "none", background: studentAns ? "var(--green-100)" : "#fff", cursor: "pointer" }}>
                          <option value="">Select a match…</option>
                          {(matchRights[q.id] ?? []).map((r, i) => <option key={i} value={r}>{r}</option>)}
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* SHORT ANSWER */}
            {q.type === "SHORT_ANSWER" && (
              showResults ? (
                <div style={{ background: "var(--gold-100)", border: "1px solid var(--gold-600)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--gold-700)", margin: "0 0 5px" }}>Response submitted — awaiting faculty review</p>
                  <p style={{ fontSize: 13, color: "var(--ink-700)", margin: "0 0 5px", fontStyle: "italic", lineHeight: 1.6 }}>{answers[q.id]}</p>
                  <p style={{ fontSize: 11, color: "var(--gold-700)", margin: 0 }}>Your score for this question will be added once graded.</p>
                </div>
              ) : (
                <div>
                  <textarea value={answers[q.id] ?? ""} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))} rows={3}
                    placeholder="Write your answer in 1–3 sentences…"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6 }} />
                  <p style={{ fontSize: 11, color: "var(--gold-700)", marginTop: 4 }}>This response will be read and graded by faculty.</p>
                </div>
              )
            )}

            {/* Explanation */}
            {showResults && q.explanation && res?.correct !== null && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--surface-subtle)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--ink-700)", borderLeft: "3px solid var(--ink-400)", lineHeight: 1.6 }}>
                <strong>Explanation: </strong>{q.explanation}
              </div>
            )}
          </div>
        )
      })}

      {/* Submit */}
      {!showResults && (
        <Button onClick={handleSubmit} disabled={!allAnswered || submitting} style={{ padding: "12px 32px", fontSize: 14 }}>
          {submitting ? "Submitting…" : `Submit Quiz (${answeredCount}/${answerableQs.length} answered)`}
        </Button>
      )}

      {/* Result summary */}
      {showResults && (
        <div style={{ background: result.passed ? "var(--success-100)" : result.hasPendingReview ? "var(--gold-100)" : "var(--error-100)", border: `1.5px solid ${result.passed ? "var(--success-700)" : result.hasPendingReview ? "var(--gold-600)" : "#F5A3A3"}`, borderRadius: "var(--radius-xl)", padding: "22px 26px", marginTop: 8 }}>
          <Icon name={result.passed ? "confetti" : result.hasPendingReview ? "hourglass-medium" : "book-open"} size={28} color={result.passed ? "var(--success-700)" : result.hasPendingReview ? "var(--gold-700)" : "var(--error-700)"} style={{ marginBottom: 8 }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: result.passed ? "var(--success-700)" : result.hasPendingReview ? "var(--gold-700)" : "var(--error-700)", margin: "0 0 6px", fontWeight: 600 }}>
            {result.passed ? "Module passed!" : result.hasPendingReview ? "Submitted — pending review" : "Keep reviewing — you can do it"}
          </h3>
          <p style={{ fontWeight: 600, color: "var(--ink-900)", fontSize: 15, margin: "0 0 6px" }}>
            Auto-marked score: {result.score}% ({result.earnedPoints}/{result.totalScorable} points)
          </p>
          <p style={{ color: "var(--ink-500)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {result.passed
              ? "The next module is now unlocked — return to your dashboard to continue."
              : result.hasPendingReview
              ? "Your short answer response is awaiting faculty review. Your final result will be confirmed once grading is complete."
              : `You need ${passMark}% to pass. Review the lessons and try again.`}
          </p>
          {result.passed && (
            <a href="/dashboard/student" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--green-700)", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              Back to Dashboard <Icon name="arrow-right" size={13} color="#fff" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
