"use client"

import { useState } from "react"
import QuizPanel from "./QuizPanel"
import AssessmentPanel, { type StudentAssessment } from "./AssessmentPanel"
import { fileIcon, fileKindLabel, formatFileSize, isAudioFile } from "@/lib/files"

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

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)
  return m ? m[1] : null
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
      <aside style={{ width: 268, background: "#fff", borderRight: "1px solid #E2D9CC", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid #F0EAE0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#B0A090", letterSpacing: "0.12em", marginBottom: 8 }}>LEARNING OBJECTIVES</div>
          {objectives.length === 0 ? (
            <p style={{ fontSize: 11.5, color: "#C5BAB0", margin: 0 }}>Not set yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {objectives.map((obj, i) => <li key={i} style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.55, marginBottom: 6 }}>{obj}</li>)}
            </ul>
          )}
        </div>

        <div style={{ paddingTop: 16, flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#B0A090", letterSpacing: "0.12em", padding: "0 18px", marginBottom: 6 }}>LESSONS</div>
          {lessons.length === 0 && <p style={{ fontSize: 12, color: "#C5BAB0", padding: "6px 18px" }}>No lessons published yet.</p>}
          {lessons.map(l => {
            const active = !showQuiz && l.id === activeLessonId
            return (
              <button key={l.id} onClick={() => { setActiveLessonId(l.id); setShowQuiz(false); setActiveAssessmentId(null); setVideoOpen(false) }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: "inherit", background: active ? "#E8F3EC" : "none", borderLeft: active ? "3px solid #0C3D26" : "3px solid transparent" }}>
                <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? "#0C3D26" : "#374151", lineHeight: 1.4 }}>{l.title}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>Reading{l.videos.length > 0 ? " + Video" : ""}{l.files.length > 0 ? " + Materials" : ""}</div>
              </button>
            )
          })}

          {quiz && (
            <>
              <div style={{ height: 1, background: "#F0EAE0", margin: "10px 18px" }} />
              <button onClick={() => { setShowQuiz(true); setActiveAssessmentId(null) }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: "inherit", background: showQuiz ? "#FBF4E3" : "none", borderLeft: showQuiz ? "3px solid #B47E2A" : "3px solid transparent" }}>
                <div style={{ fontSize: 12.5, fontWeight: showQuiz ? 600 : 500, color: "#B47E2A" }}>
                  📝 Module Quiz{hasPassedQuiz ? " ✓" : ""}
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                  {quiz.questions.filter(q => q.type !== "PASSAGE").length} questions · Pass: {module.passMark}%{hasPassedQuiz ? " · Passed" : ""}
                </div>
              </button>
            </>
          )}

          {assessments.length > 0 && (
            <>
              <div style={{ height: 1, background: "#F0EAE0", margin: "10px 18px" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: "#B0A090", letterSpacing: "0.12em", padding: "0 18px", marginBottom: 6 }}>ASSIGNMENTS</div>
              {assessments.map(a => {
                const active = a.id === activeAssessmentId
                const grade = a.submission?.grade ?? null
                const statusLine = grade
                  ? `Graded: ${grade.mark}/${a.maxMark}`
                  : a.submission
                  ? (a.submission.inGrading ? "Submitted · being graded" : "Submitted ✓")
                  : "Not submitted"
                return (
                  <button key={a.id} onClick={() => { setActiveAssessmentId(a.id); setShowQuiz(false); setVideoOpen(false) }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: "inherit", background: active ? "#F0F0FF" : "none", borderLeft: active ? "3px solid #2D1A6B" : "3px solid transparent" }}>
                    <div style={{ fontSize: 12.5, fontWeight: active ? 600 : 500, color: "#2D1A6B", lineHeight: 1.4 }}>✍️ {a.title}</div>
                    <div style={{ fontSize: 10, color: grade ? (grade.mark >= a.passMark ? "#0C3D26" : "#B91C1C") : "#9CA3AF", marginTop: 2 }}>{statusLine}</div>
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
          <div style={{ textAlign: "center", marginTop: 80, color: "#9CA3AF" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
            <p style={{ fontSize: 14 }}>No lessons available yet for this module.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function LessonView({ lesson, videoOpen, setVideoOpen }: { lesson: any; videoOpen: boolean; setVideoOpen: (v: boolean) => void }) {
  const video = lesson.videos[0]
  const ytId  = video?.type === "YOUTUBE" ? (video.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] ?? null) : null

  return (
    <div>
      <h1 style={{ fontFamily: "serif", fontSize: 26, color: "#0C3D26", margin: "0 0 8px", fontWeight: 600 }}>{lesson.title}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <span style={{ fontSize: 10, background: "#E3F0E9", color: "#0C3D26", padding: "3px 10px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.05em" }}>READING</span>
        {video && <span style={{ fontSize: 10, background: "#FBF4E3", color: "#B47E2A", padding: "3px 10px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.05em" }}>VIDEO</span>}
        {lesson.files.some((f: any) => isAudioFile(f.mimeType, f.url)) && <span style={{ fontSize: 10, background: "#EEF2F8", color: "#1A3A6B", padding: "3px 10px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.05em" }}>AUDIO</span>}
        {lesson.files.some((f: any) => !isAudioFile(f.mimeType, f.url)) && <span style={{ fontSize: 10, background: "#F0F0FF", color: "#2D1A6B", padding: "3px 10px", borderRadius: 100, fontWeight: 700, letterSpacing: "0.05em" }}>MATERIALS</span>}
      </div>

      {video && (
        <div style={{ background: "#111827", borderRadius: 12, marginBottom: 28, overflow: "hidden" }}>
          {video.type === "SELF_HOSTED" ? (
            <video controls preload="metadata" style={{ width: "100%", height: 340, display: "block", background: "#000" }}>
              <source src={video.url} />
              <p style={{ color: "#fff", padding: 20, margin: 0 }}>Your browser does not support this video format.</p>
            </video>
          ) : videoOpen && ytId ? (
            <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} style={{ width: "100%", height: 340, border: "none", display: "block" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (
            <div onClick={() => setVideoOpen(true)} style={{ height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", marginBottom: 12 }}>▶</div>
              <div style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{video.title}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>Click to play · Requires internet</div>
            </div>
          )}
        </div>
      )}

      <div className="lesson-prose" style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", border: "1px solid #E2D9CC", lineHeight: 1.75, fontSize: 15, color: "#2D2D2D" }} dangerouslySetInnerHTML={{ __html: lesson.content }} />

      {lesson.files.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B0A090", letterSpacing: "0.12em", marginBottom: 10 }}>LESSON MATERIALS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lesson.files.map((f: Attachment) => isAudioFile(f.mimeType, f.url) ? (
              <div key={f.id} style={{ background: "#fff", border: "1px solid #E2D9CC", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0C3D26", marginBottom: 10 }}>🎧 {f.title}</div>
                <audio controls preload="none" src={f.url} style={{ width: "100%" }} />
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
                  Audio{f.fileSizeBytes ? ` · ${formatFileSize(f.fileSizeBytes)}` : ""} · Requires internet to play
                </div>
              </div>
            ) : (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #E2D9CC", borderRadius: 10, padding: "14px 18px", textDecoration: "none" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0C3D26" }}>{fileIcon(f.mimeType, f.url)} {f.title}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>
                    {fileKindLabel(f.mimeType, f.url)}{f.fileSizeBytes ? ` · ${formatFileSize(f.fileSizeBytes)}` : ""} · Opens in a new tab
                  </div>
                </div>
                <span style={{ color: "#0C3D26", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>⬇ Download</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
