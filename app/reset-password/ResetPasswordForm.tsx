"use client"

import { useState } from "react"
import Link from "next/link"
import { resetPasswordWithToken } from "@/app/actions/password-reset"
import { Icon } from "@/components/ui/Icon"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) { setError("Passwords do not match."); return }
    setLoading(true)
    const res = await resetPasswordWithToken(token, password)
    setLoading(false)
    if ("error" in res) { setError(res.error ?? "Something went wrong."); return }
    setDone(true)
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gradient-header)" }}>
      <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: 48, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-login-card)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--radius-xl)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", background: "var(--green-700)" }}>
            <Icon name="key" size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--green-700)", margin: "0 0 4px" }}>Set a new password</h1>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--ink-400)", margin: 0, textTransform: "uppercase" }}>NMS Online Learning Platform</p>
        </div>

        {!token ? (
          <div>
            <p style={{ fontSize: 13, padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--error-100)", color: "var(--error-700)", lineHeight: 1.6 }}>
              This reset link is invalid or incomplete. Please request a new one.
            </p>
            <p style={{ textAlign: "center", marginTop: 24 }}>
              <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--green-700)", fontWeight: 600, textDecoration: "none" }}>Request a new link</Link>
            </p>
          </div>
        ) : done ? (
          <div>
            <p style={{ fontSize: 13, padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--success-100)", color: "var(--success-700)", lineHeight: 1.6 }}>
              Your password has been updated. You can now sign in with your new password.
            </p>
            <p style={{ textAlign: "center", marginTop: 24 }}>
              <Link href="/login" style={{ fontSize: 13, color: "var(--green-700)", fontWeight: 600, textDecoration: "none" }}>Sign in →</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Input label="NEW PASSWORD" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={{ padding: "11px 14px" }} />
              <p style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 4 }}>At least 8 characters.</p>
            </div>
            <Input label="CONFIRM NEW PASSWORD" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} style={{ padding: "11px 14px" }} />
            {error && <p style={{ fontSize: 13, color: "var(--error-700)", background: "var(--error-100)", padding: "8px 16px", borderRadius: "var(--radius-sm)", margin: 0 }}>{error}</p>}
            <Button type="submit" disabled={loading} style={{ width: "100%", padding: 12 }}>
              {loading ? "Saving…" : "Set New Password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
