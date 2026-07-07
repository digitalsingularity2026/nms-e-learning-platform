"use client"

import { useState } from "react"
import Link from "next/link"
import { updateOwnName, changeOwnPassword } from "@/app/actions/profile"

export default function ProfileForm({ name: initialName, email, roleLabel, studentIdNumber }: {
  name: string; email: string; roleLabel: string; studentIdNumber: string | null
}) {
  const [name, setName]         = useState(initialName)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg]   = useState("")

  const [pw, setPw]             = useState({ current: "", next: "", confirm: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg]       = useState("")
  const [pwError, setPwError]   = useState(false)

  const label = { fontSize: 11, fontWeight: 700, color: "#6B7280", letterSpacing: "0.08em", display: "block", marginBottom: 6 } as const
  const input = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #E2D9CC", fontSize: 14, outline: "none" } as const

  async function saveName() {
    setNameSaving(true); setNameMsg("")
    const res = await updateOwnName(name)
    setNameSaving(false)
    if ("error" in res) { setNameMsg(res.error ?? "Something went wrong."); return }
    setNameMsg("✓ Saved")
    setTimeout(() => setNameMsg(""), 2500)
  }

  async function savePassword() {
    if (pw.next !== pw.confirm) { setPwError(true); setPwMsg("New passwords do not match."); return }
    setPwSaving(true); setPwMsg(""); setPwError(false)
    const res = await changeOwnPassword(pw.current, pw.next)
    setPwSaving(false)
    if ("error" in res) { setPwError(true); setPwMsg(res.error ?? "Something went wrong."); return }
    setPwMsg("✓ Password updated"); setPw({ current: "", next: "", confirm: "" })
    setTimeout(() => setPwMsg(""), 2500)
  }

  return (
    <div className="min-h-screen" style={{ background: "#F7F3ED" }}>
      <header className="flex items-center justify-between px-8" style={{ background: "#0C3D26", height: 60 }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" style={{ color: "#7DB899", fontSize: 13, textDecoration: "none" }}>← Dashboard</Link>
          <span style={{ color: "#2D5E40" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>My Profile</span>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontFamily: "serif", fontSize: 24, color: "#0C3D26", margin: "0 0 24px", fontWeight: 600 }}>My Profile</h1>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", padding: "24px 26px", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "serif", fontSize: 16, color: "#1A1A1A", margin: "0 0 16px", fontWeight: 600 }}>Account Details</h2>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={input} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <button onClick={saveName} disabled={nameSaving || !name.trim()}
              style={{ background: nameSaving || !name.trim() ? "#E5E7EB" : "#0C3D26", color: nameSaving || !name.trim() ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {nameSaving ? "Saving…" : "Save Name"}
            </button>
            {nameMsg && <span style={{ fontSize: 13, color: nameMsg.startsWith("✓") ? "#15803D" : "#B91C1C" }}>{nameMsg}</span>}
          </div>

          <div style={{ borderTop: "1px solid #F0EAE0", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0A090", letterSpacing: "0.08em", marginBottom: 3 }}>EMAIL</div>
              <div style={{ fontSize: 14, color: "#374151" }}>{email}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#B0A090", letterSpacing: "0.08em", marginBottom: 3 }}>ROLE</div>
              <div style={{ fontSize: 14, color: "#374151" }}>{roleLabel}</div>
            </div>
            {studentIdNumber !== null && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#B0A090", letterSpacing: "0.08em", marginBottom: 3 }}>STUDENT ID / ROLL NUMBER</div>
                <div style={{ fontSize: 14, color: "#374151" }}>{studentIdNumber || <span style={{ color: "#C5BAB0" }}>Not set — contact your School Administrator</span>}</div>
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: "#9CA3AF", margin: "14px 0 0" }}>Email, role, and student ID are managed by your School Administrator.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2D9CC", padding: "24px 26px" }}>
          <h2 style={{ fontFamily: "serif", fontSize: 16, color: "#1A1A1A", margin: "0 0 16px", fontWeight: 600 }}>Change Password</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>CURRENT PASSWORD</label>
            <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} style={input} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>NEW PASSWORD</label>
            <input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} minLength={8} style={input} />
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>At least 8 characters.</p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} minLength={8} style={input} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={savePassword} disabled={pwSaving || !pw.current || !pw.next || !pw.confirm}
              style={{ background: pwSaving || !pw.current || !pw.next || !pw.confirm ? "#E5E7EB" : "#0C3D26", color: pwSaving || !pw.current || !pw.next || !pw.confirm ? "#9CA3AF" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {pwSaving ? "Saving…" : "Update Password"}
            </button>
            {pwMsg && <span style={{ fontSize: 13, color: pwError ? "#B91C1C" : "#15803D" }}>{pwMsg}</span>}
          </div>
        </div>
      </main>
    </div>
  )
}
