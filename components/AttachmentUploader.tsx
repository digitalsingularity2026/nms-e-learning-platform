"use client"

import { useState } from "react"
import { addLessonFile, removeLessonFile } from "@/app/actions/faculty"
import { fileIcon, fileKindLabel, formatFileSize } from "@/lib/files"

type Attachment = { id: string; title: string; url: string; mimeType: string | null; fileSizeBytes: number | null }

interface Props {
  lessonId: string | null
  moduleId: string
  existingFiles: Attachment[]
  onUpdate: () => void
}

const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,audio/*,.mp3,.m4a,.wav,.ogg"

export default function AttachmentUploader({ lessonId, moduleId, existingFiles, onUpdate }: Props) {
  const [file, setFile]           = useState<File | null>(null)
  const [fileTitle, setFileTitle] = useState("")
  const [progress, setProgress]   = useState(0)
  const [uploading, setUploading] = useState(false)

  async function handleUpload() {
    if (!lessonId || !file) return
    setUploading(true); setProgress(0)
    try {
      const res = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "application/octet-stream", lessonId }),
      })
      if (!res.ok) throw new Error("Failed to get upload URL")
      const { presignedUrl, publicUrl, key } = await res.json()

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) }
        xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`${xhr.status}`))
        xhr.onerror = () => reject(new Error("Network error"))
        xhr.open("PUT", presignedUrl)
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.send(file)
      })

      await addLessonFile(lessonId, moduleId, {
        title: fileTitle || file.name,
        url: publicUrl,
        r2Key: key,
        fileSizeBytes: file.size,
        mimeType: file.type || undefined,
      })
      setFile(null); setFileTitle(""); setProgress(0); onUpdate()
    } catch (err) {
      console.error(err)
      alert("Upload failed — check your connection and try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(fileId: string) {
    if (!window.confirm("Remove this attachment?")) return
    await removeLessonFile(fileId, moduleId); onUpdate()
  }

  return (
    <div style={{ marginBottom: 16, background: "#fff", borderRadius: 10, padding: "16px 18px", border: "1px solid #E2D9CC" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 10, letterSpacing: "0.08em" }}>ATTACHMENTS — PDF, AUDIO & DOCUMENTS (OPTIONAL)</div>

      {!lessonId ? (
        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Save the lesson first, then add attachments.</p>
      ) : (
        <>
          {existingFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {existingFiles.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F7F3ED", borderRadius: 8, padding: "8px 12px" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{fileIcon(f.mimeType, f.url)} {f.title}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                      {fileKindLabel(f.mimeType, f.url)}{f.fileSizeBytes ? ` · ${formatFileSize(f.fileSizeBytes)}` : ""}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(f.id)} style={{ background: "none", border: "none", color: "#B91C1C", fontSize: 13, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={fileTitle} onChange={e => setFileTitle(e.target.value)} placeholder="Attachment title (e.g. Chapter 1 Handout, Pronunciation Drill 1)" style={{ padding: "8px 12px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 13, outline: "none" }} />
            <label style={{ padding: "10px 14px", borderRadius: 8, border: "1.5px dashed #E2D9CC", fontSize: 13, color: file ? "#0C3D26" : "#9CA3AF", cursor: "pointer", background: "#FAFAF8", textAlign: "center" as const, display: "block" }}>
              {file ? `${file.name}  (${formatFileSize(file.size)})` : "Click to select a file (PDF, audio, Word, slides…)"}
              <input type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
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
              Audio files play inside the lesson; PDFs and documents appear as downloads for students.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
