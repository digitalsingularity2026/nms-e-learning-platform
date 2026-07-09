export function isAudioFile(mimeType: string | null, url: string): boolean {
  if (mimeType?.startsWith("audio/")) return true
  return /\.(mp3|m4a|ogg|wav|aac|oga)$/i.test(url)
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ""
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function fileKindLabel(mimeType: string | null, url: string): string {
  if (isAudioFile(mimeType, url)) return "Audio"
  if (mimeType === "application/pdf" || /\.pdf$/i.test(url)) return "PDF"
  if (/\.(doc|docx)$/i.test(url)) return "Word document"
  if (/\.(ppt|pptx)$/i.test(url)) return "Slides"
  if (/\.(xls|xlsx)$/i.test(url)) return "Spreadsheet"
  return "File"
}

/** Phosphor icon name (fill weight) for this file's kind. */
export function fileIcon(mimeType: string | null, url: string): string {
  if (isAudioFile(mimeType, url)) return "headphones"
  if (mimeType === "application/pdf" || /\.pdf$/i.test(url)) return "file-text"
  return "paperclip"
}
