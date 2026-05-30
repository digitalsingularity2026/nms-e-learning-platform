"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableCell } from "@tiptap/extension-table-cell"
import { useEffect } from "react"

interface Props {
  content: string
  onChange: (html: string) => void
}

export default function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "lesson-prose",
        style: "min-height:280px;padding:20px 24px;outline:none;cursor:text;",
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) editor.commands.setContent(content || "")
  }, [content, editor])

  if (!editor) return null

  const Btn = ({ onClick, active, label }: { onClick: () => void; active?: boolean; label: string }) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ padding: "4px 9px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500, background: active ? "#E3F0E9" : "transparent", color: active ? "#0C3D26" : "#374151" }}
    >{label}</button>
  )

  return (
    <div style={{ border: "1.5px solid #E2D9CC", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "7px 10px", borderBottom: "1px solid #F0EAE0", background: "#FAFAF8" }}>
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="B" />
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="I" />
        <span style={{ width: 1, background: "#E2D9CC", margin: "2px 3px" }} />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3" />
        <span style={{ width: 1, background: "#E2D9CC", margin: "2px 3px" }} />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="• List" />
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="1. List" />
        <span style={{ width: 1, background: "#E2D9CC", margin: "2px 3px" }} />
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="❝ Quote" />
        <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={false} label="⊞ Table" />
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} label="— Rule" />
        <span style={{ width: 1, background: "#E2D9CC", margin: "2px 3px" }} />
        <Btn onClick={() => editor.chain().focus().undo().run()} active={false} label="↩" />
        <Btn onClick={() => editor.chain().focus().redo().run()} active={false} label="↪" />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
