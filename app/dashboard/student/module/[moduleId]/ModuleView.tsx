"use client"

import { useState } from "react"
import QuizPanel from "./QuizPanel"
import AssessmentPanel, { type StudentAssessment } from "./AssessmentPanel"
import { fileIcon, fileKindLabel, formatFileSize, isAudioFile } from "@/lib/files"
import { Icon } from "@/components/ui/Icon"
import { Badge } from "@/components/ui/Badge"

type Video  = { id: string; title: string; type: string; url: string }
type Attachment = { id: string; title: string; url: string; mimeType: string | null; fileSizeBytes: number | null }
type Lesson = { id: string; title: string; content: string; videos: Video[]; files: Attachment[] }
type Option = { id: string; text: string; matchText?: string | null }
type Question = { id: string; text: string; type: string; hintText?: string | null; points: number; explanation?: string | null; options: Option[] }
type Quiz  = { id: string; title: string; instructions: string | null; questions: Question[] }

interface Props {
  module: { id: string; code: string; title: string; credits: number; passMark: number; description: string | null; learningObjectives: string[] }
  lessons: Lesson[]
  quiz: Quiz | null
  hasPassedQuiz: boolean
  assessments: StudentAssessment[]
}

export default function ModuleView({ module, lessons, quiz, hasPassedQuiz, assessments }: Props) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(lessons[0]?.id ?? null)
  const [showQuiz, setShowQuiz]   = useState(false)
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)

  const activeLesson     = lessons.find(l => l.id === activeLessonId)
  const activeAssessment = assessments.find(a => a.id === activeAssessmentId)
  const objectives       = module.learningObjectives

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: 268, background: "#fff", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid var(--surface-sunken)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", marginBottom: 8 }}>LEARNING OBJECTIVES</div>
          {objectives.length === 0 ? (
            <p style={{ fontSize: 11.5, color: "var(--ink-400)", margin: 0 }}>Not set yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {objectives.map((obj, i) => <li key={i} style={{ fontSize: 11.5, color: "var(--ink-700)", lineHeight: 1.55, marginBottom: 6 }}>{obj}</li>)}
            </ul>
          )}
        </div>

        <div style={{ paddingTop: 16, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", padding: "0 18px", marginBottom: 6 }}>LESSONS</div>
          {lessons.length === 0 && <p style={{ fontSize: 12, color: "var(--ink-400)", padding: "6px 18px" }}>No lessons published yet.</p>}
          {lessons.map(l => {
            const active = !showQuiz && !activeAssessmentId && l.id === activeLessonId
            return (
              <button key={l.id} onClick={() => { setActiveLessonId(l.id); setShowQuiz(false); setActiveAssessmentId(null); setVideoOpen(false) }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: "inherit", background: active ? "var(--green-100)" : "none", borderLeft: active ? "3px solid var(--green-700)" : "3px solid transparent" }}>
                <Icon name={l.videos.length > 0 ? "play-circle" : "book-open"} size={15} color={active ? "var(--green-700)" : "var(--ink-400)"} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? "var(--green-700)" : "var(--ink-700)", lineHeight: 1.4 }}>{l.title}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-400)", marginTop: 2 }}>Reading{l.videos.length > 0 ? " + Video" : ""}{l.files.length > 0 ? " + Materials" : ""}</div>
                </div>
              </button>
            )
          })}

          {quiz && (
            <>
              <div style={{ height: 1, background: "var(--surface-sunken)", margin: "10px 18px" }} />
              <button onClick={() => { setShowQuiz(true); setActiveAssessmentId(null) }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: "inherit", background: showQuiz ? "var(--gold-100)" : "none", borderLeft: showQuiz ? "3px solid var(--gold-600)" : "3px solid transparent" }}>
                <Icon name="note-pencil" size={15} color="var(--gold-700)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: showQuiz ? 600 : 500, color: "var(--gold-700)", display: "flex", alignItems: "center", gap: 4 }}>
                    Module Quiz{hasPassedQuiz && <Icon name="check-circle" size={12} />}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-400)", marginTop: 2 }}>
                    {quiz.questions.filter(q => q.type !== "PASSAGE").length} questions · Pass: {module.passMark}%{hasPassedQuiz ? " · Passed" : ""}
                  </div>
                </div>
              </button>
            </>
          )}

          {assessments.length > 0 && (
            <>
              <div style={{ height: 1, background: "var(--surface-sunken)", margin: "10px 18px" }} />
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", padding: "0 18px", marginBottom: 6 }}>ASSIGNMENTS</div>
              {assessments.map(a => {
                const active = a.id === activeAssessmentId
                const grade = a.submission?.grade ?? null
                const statusLine = grade
                  ? `Graded: ${grade.mark}/${a.maxMark}`
                  : a.submission
                  ? (a.submission.inGrading ? "Submitted · being graded" : "Submitted")
                  : "Not submitted"
                return (
                  <button key={a.id} onClick={() => { setActiveAssessmentId(a.id); setShowQuiz(false); setVideoOpen(false) }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: "inherit", background: active ? "var(--violet-100)" : "none", borderLeft: active ? "3px solid var(--violet-700)" : "3px solid transparent" }}>
                    <Icon name="pencil-simple-line" size={15} color="var(--violet-700)" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 500, color: "var(--violet-700)", lineHeight: 1.4 }}>{a.title}</div>
                      <div style={{ fontSize: 10, color: grade ? (grade.mark >= a.passMark ? "var(--green-700)" : "var(--error-700)") : "var(--ink-400)", marginTop: 2 }}>{statusLine}</div>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "36px 52px" }}>
        {showQuiz && quiz ? (
          <QuizPanel quiz={quiz} moduleId={module.id} passMark={module.passMark} hasPassedQuiz={hasPassedQuiz} />
        ) : activeAssessment ? (
          <AssessmentPanel key={activeAssessment.id} assessment={activeAssessment} moduleId={module.id} />
        ) : activeLesson ? (
          <LessonView lesson={activeLesson} videoOpen={videoOpen} setVideoOpen={setVideoOpen} />
        ) : (
          <div style={{ textAlign: "center", marginTop: 80, color: "var(--ink-400)" }}>
            <Icon name="books" size={36} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>No lessons available yet for this module.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function LessonView({ lesson, videoOpen, setVideoOpen }: { lesson: Lesson; videoOpen: boolean; setVideoOpen: (v: boolean) => void }) {
  const video = lesson.videos[0]
  const ytId  = video?.type === "YOUTUBE" ? (video.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] ?? null) : null
  const hasAudio     = lesson.files.some(f => isAudioFile(f.mimeType, f.url))
  const hasMaterials = lesson.files.some(f => !isAudioFile(f.mimeType, f.url))

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--green-700)", margin: "0 0 8px", fontWeight: 600 }}>{lesson.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Badge status="success">Reading</Badge>
        {video && <Badge bg="var(--gold-100)" color="var(--gold-700)">Video</Badge>}
        {hasAudio && <Badge bg="var(--blue-100)" color="var(--blue-700)">Audio</Badge>}
        {hasMaterials && <Badge bg="var(--violet-100)" color="var(--violet-700)">Materials</Badge>}
      </div>

      {video && (
        <div style={{ background: "var(--ink-900)", borderRadius: "var(--radius-md)", marginBottom: 28, overflow: "hidden" }}>
          {video.type === "SELF_HOSTED" ? (
            <video controls preload="metadata" style={{ width: "100%", height: 340, display: "block", background: "#000" }}>
              <source src={video.url} />
              <p style={{ color: "#fff", padding: 20, margin: 0 }}>Your browser does not support this video format.</p>
            </video>
          ) : videoOpen && ytId ? (
            <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} style={{ width: "100%", height: 340, border: "none", display: "block" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <div onClick={() => setVideoOpen(true)} style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Icon name="play" size={20} color="#fff" />
              </div>
              <div style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{video.title}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 4 }}>Click to play · Requires internet</div>
            </div>
          )}
        </div>
      )}

      <div className="lesson-prose" style={{ background: "#fff", borderRadius: "var(--radius-md)", padding: "28px 32px", boxShadow: "var(--shadow-card)", lineHeight: 1.75, fontSize: 15, color: "var(--ink-700)" }} dangerouslySetInnerHTML={{ __html: lesson.content }} />

      {lesson.files.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", marginBottom: 10 }}>LESSON MATERIALS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lesson.files.map((f: Attachment) => isAudioFile(f.mimeType, f.url) ? (
              <div key={f.id} style={{ background: "#fff", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", padding: "14px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green-700)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="headphones" size={15} /> {f.title}
                </div>
                <audio controls preload="none" src={f.url} style={{ width: "100%" }} />
                <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 8 }}>
                  Audio{f.fileSizeBytes ? ` · ${formatFileSize(f.fileSizeBytes)}` : ""} · Requires internet to play
                </div>
              </div>
            ) : (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="card-hover"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-card)", padding: "14px 18px", textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={fileIcon(f.mimeType, f.url)} size={16} color="var(--green-700)" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--green-700)" }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 3 }}>
                      {fileKindLabel(f.mimeType, f.url)}{f.fileSizeBytes ? ` · ${formatFileSize(f.fileSizeBytes)}` : ""} · Opens in a new tab
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--green-700)", fontSize: 12, fontWeight: 600, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="download-simple" size={13} /> Download
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
