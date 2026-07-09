"use client"

import { useState } from "react"
import Link from "next/link"
import { updateOwnName, changeOwnPassword } from "@/app/actions/profile"
import { Icon } from "@/components/ui/Icon"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"

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

  const label = { fontSize: 11, fontWeight: 600, color: "var(--ink-500)", letterSpacing: "0.08em", display: "block", marginBottom: 6 } as const
  const input = { width: "100%", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", fontSize: 14, outline: "none", boxSizing: "border-box" } as const

  async function saveName() {
    setNameSaving(true); setNameMsg("")
    const res = await updateOwnName(name)
    setNameSaving(false)
    if ("error" in res) { setNameMsg(res.error ?? "Something went wrong."); return }
    setNameMsg("Saved")
    setTimeout(() => setNameMsg(""), 2500)
  }

  async function savePassword() {
    if (pw.next !== pw.confirm) { setPwError(true); setPwMsg("New passwords do not match."); return }
    setPwSaving(true); setPwMsg(""); setPwError(false)
    const res = await changeOwnPassword(pw.current, pw.next)
    setPwSaving(false)
    if ("error" in res) { setPwError(true); setPwMsg(res.error ?? "Something went wrong."); return }
    setPwMsg("Password updated"); setPw({ current: "", next: "", confirm: "" })
    setTimeout(() => setPwMsg(""), 2500)
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-subtle)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: "var(--green-700)", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" style={{ color: "var(--text-on-dark-muted)", fontSize: 13, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="arrow-left" size={13} /> Dashboard
          </Link>
          <span style={{ color: "var(--green-600)" }}>|</span>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>My Profile</span>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--green-700)", margin: "0 0 24px", fontWeight: 600 }}>My Profile</h1>

        <Card padding="24px 26px" style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-900)", margin: "0 0 16px", fontWeight: 600 }}>Account Details</h2>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={input} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <Button size="sm" onClick={saveName} disabled={nameSaving || !name.trim()}>
              {nameSaving ? "Saving…" : "Save Name"}
            </Button>
            {nameMsg && <span style={{ fontSize: 13, color: "var(--success-700)" }}>{nameMsg}</span>}
          </div>

          <div style={{ borderTop: "1px solid var(--surface-sunken)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", marginBottom: 3 }}>EMAIL</div>
              <div style={{ fontSize: 14, color: "var(--ink-700)" }}>{email}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", marginBottom: 3 }}>ROLE</div>
              <div style={{ fontSize: 14, color: "var(--ink-700)" }}>{roleLabel}</div>
            </div>
            {studentIdNumber !== null && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-400)", letterSpacing: "0.08em", marginBottom: 3 }}>STUDENT ID / ROLL NUMBER</div>
                <div style={{ fontSize: 14, color: "var(--ink-700)" }}>{studentIdNumber || <span style={{ color: "var(--ink-400)" }}>Not set — contact your School Administrator</span>}</div>
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-400)", margin: "14px 0 0" }}>Email, role, and student ID are managed by your School Administrator.</p>
        </Card>

        <Card padding="24px 26px">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-900)", margin: "0 0 16px", fontWeight: 600 }}>Change Password</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={label}>CURRENT PASSWORD</label>
            <input type="password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} style={input} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>NEW PASSWORD</label>
            <input type="password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} minLength={8} style={input} />
            <p style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 4 }}>At least 8 characters.</p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={label}>CONFIRM NEW PASSWORD</label>
            <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} minLength={8} style={input} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Button size="sm" onClick={savePassword} disabled={pwSaving || !pw.current || !pw.next || !pw.confirm}>
              {pwSaving ? "Saving…" : "Update Password"}
            </Button>
            {pwMsg && <span style={{ fontSize: 13, color: pwError ? "var(--error-700)" : "var(--success-700)" }}>{pwMsg}</span>}
          </div>
        </Card>
      </main>
    </div>
  )
}
