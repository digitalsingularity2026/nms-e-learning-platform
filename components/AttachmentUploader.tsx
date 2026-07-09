"use client"

import { useState } from "react"
import { addLessonFile, removeLessonFile } from "@/app/actions/faculty"
import { fileIcon, fileKindLabel, formatFileSize } from "@/lib/files"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"

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
    <div style={{ marginBottom: 16, background: "#fff", borderRadius: "var(--radius-lg)", padding: "16px 18px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-500)", marginBottom: 10, letterSpacing: "0.08em" }}>ATTACHMENTS — PDF, AUDIO & DOCUMENTS (OPTIONAL)</div>

      {!lessonId ? (
        <p style={{ fontSize: 11, color: "var(--ink-400)", margin: 0 }}>Save the lesson first, then add attachments.</p>
      ) : (
        <>
          {existingFiles.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {existingFiles.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-subtle)", borderRadius: "var(--radius-md)", padding: "8px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={fileIcon(f.mimeType, f.url)} size={15} color="var(--green-700)" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{f.title}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-400)" }}>
                        {fileKindLabel(f.mimeType, f.url)}{f.fileSizeBytes ? ` · ${formatFileSize(f.fileSizeBytes)}` : ""}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(f.id)} style={{ background: "none", border: "none", color: "var(--error-700)", cursor: "pointer" }}><Icon name="x" size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={fileTitle} onChange={e => setFileTitle(e.target.value)} placeholder="Attachment title (e.g. Chapter 1 Handout, Pronunciation Drill 1)" style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--border)", fontSize: 13, outline: "none" }} />
            <label style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--border-strong)", fontSize: 13, color: file ? "var(--green-700)" : "var(--ink-400)", cursor: "pointer", background: "var(--surface-subtle)", textAlign: "center" as const, display: "block" }}>
              {file ? `${file.name}  (${formatFileSize(file.size)})` : "Click to select a file (PDF, audio, Word, slides…)"}
              <input type="file" accept={ACCEPT} onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
            </label>
            {file && (
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? `Uploading… ${progress}%` : "Upload to Platform"}
              </Button>
            )}
            {uploading && (
              <div style={{ height: 5, background: "var(--surface-sunken)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "var(--gradient-primary)", transition: "width 0.4s ease" }} />
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--ink-400)", margin: 0 }}>
              Audio files play inside the lesson; PDFs and documents appear as downloads for students.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
