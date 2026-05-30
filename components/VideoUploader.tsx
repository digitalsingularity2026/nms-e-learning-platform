"use client"

import { useState } from "react"
import { addYouTubeVideo, addSelfHostedVideo, removeVideo } from "@/app/actions/faculty"

type Video = { id: string; title: string; url: string; type: string }

interface Props {
  lessonId: string | null
  moduleId: string
  existingVideos: Video[]
  onUpdate: () => void
}

export default function VideoUploader({ lessonId, moduleId, existingVideos, onUpdate }: Props) {
  const [mode, setMode]         = useState<"youtube" | "upload">("youtube")
  const [ytTitle, setYtTitle]   = useState("")
  const [ytUrl, setYtUrl]       = useState("")
  const [file, setFile]         = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState("")
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)

  const existing = existingVideos[0] ?? null

  async function handleAddYouTube() {
    if (!lessonId || !ytUrl.trim()) return
    setSaving(true)
    await addYouTubeVideo(lessonId, moduleId, ytTitle || "Video", ytUrl.trim())
    setSaving(false); setYtTitle(""); setYtUrl(""); onUpdate()
  }

  async function handleUpload() {
    if (!lessonId || !file) return
    setUploading(true); setProgress(0)
    try {
      const res = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, lessonId }),
      })
      if (!res.ok) throw new Error("Failed to get upload URL")
      const { presignedUrl, publicUrl, key } = await res.json()

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) }
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`))
        xhr.onerror = () => reject(new Error("Network error"))
        xhr.open("PUT", presignedUrl)
        xhr.setRequestHeader("Content-Type", file.type)
        xhr.send(file)
      })

      await addSelfHostedVideo(lessonId, moduleId, fileTitle || file.name, publicUrl, key)
      setFile(null); setFileTitle(""); setProgress(0); onUpdate()
    } catch (err) {
      console.error(err)
      alert("Upload failed — check your connection and try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(videoId: string) {
    if (!window.confirm("Remove this video?")) return
    await removeVideo(videoId, moduleId); onUpdate()
  }

  return (
    <div style={{ marginBottom: 16, background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #E2D9CC" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 10, letterSpacing: "0.08em" }}>VIDEO (OPTIONAL)</div>

      {existing ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F7F3ED", borderRadius: 8, padding: "8px 12px" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{existing.title}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
              {existing.type === "YOUTUBE" ? "▶ YouTube" : "📁 Hosted on R2"} · {existing.url.slice(0, 50)}…
            </div>
          </div>
          <button onClick={() => handleRemove(existing.id)} style={{ background: "none", border: "none", color: "#B91C1C", fontSize: 13, cursor: "pointer" }}>✕</button>
        </div>
      ) : !lessonId ? (
        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Save the lesson first, then add a video.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["youtube", "upload"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                style={{ padding: "5px 14px", borderRadius: 8, border: `1.5px solid ${mode === m ? "#0C3D26" : "#E2D9CC"}`, background: mode === m ? "#E3F0E9" : "#fff", color: mode === m ? "#0C3D26" : "#6B7280", fontSize: 12, fontWeight: mode === m ? 600 : 400, cursor: "pointer" }}>
                {m === "youtube" ? "▶ YouTube Link" : "📁 Upload Video File"}
              </button>
            ))}
          </div>

          {mode === "youtube" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={ytTitle} onChange={e => setYtTitle(e.target.value)} placeholder="Video title (e.g. Lecture 1 — Introduction)" style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
                <button onClick={handleAddYouTube} disabled={saving || !ytUrl.trim()}
                  style={{ background: saving || !ytUrl.trim() ? "#E5E7EB" : "#E3F0E9", color: saving || !ytUrl.trim() ? "#9CA3AF" : "#0C3D26", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {saving ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input value={fileTitle} onChange={e => setFileTitle(e.target.value)} placeholder="Video title (e.g. Lecture 1 — Organic Chemistry Intro)" style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
              <label style={{ padding: "10px 14px", borderRadius: 8, border: "1.5px dashed #E2D9CC", fontSize: 13, color: file ? "#0C3D26" : "#9CA3AF", cursor: "pointer", background: "#FAFAF8", textAlign: "center" as const, display: "block" }}>
                {file ? `${file.name}  (${(file.size / 1024 / 1024).toFixed(1)} MB)` : "Click to select a video file (MP4, MOV, WebM…)"}
                <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
              </label>
              {file && (
                <button onClick={handleUpload} disabled={uploading}
                  style={{ background: uploading ? "#E5E7EB" : "#0C3D26", color: uploading ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: uploading ? "default" : "pointer" }}>
                  {uploading ? `Uploading… ${progress}%` : "Upload to Platform"}
                </button>
              )}
              {uploading && (
                <div style={{ height: 5, background: "#EDE8E0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0C3D26, #2D7A50)", transition: "width 0.2s ease" }} />
                </div>
              )}
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                Files are stored on Cloudflare R2. Large files (100MB+) may take several minutes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
