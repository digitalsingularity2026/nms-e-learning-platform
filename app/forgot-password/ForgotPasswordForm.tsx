"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/app/actions/password-reset"
import { Icon } from "@/components/ui/Icon"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export default function ForgotPasswordForm({ emailEnabled }: { emailEnabled: boolean }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    const res = await requestPasswordReset(email)
    setLoading(false)
    if ("error" in res) { setError(res.error ?? "Something went wrong."); return }
    setSent(true)
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gradient-header)" }}>
      <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: 48, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-login-card)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--radius-xl)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", background: "var(--green-700)" }}>
            <Icon name="key" size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--green-700)", margin: "0 0 4px" }}>Forgot your password?</h1>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--ink-400)", margin: 0, textTransform: "uppercase" }}>NMS Online Learning Platform</p>
        </div>

        {!emailEnabled ? (
          <div>
            <p style={{ fontSize: 13, padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--gold-100)", color: "var(--gold-700)", lineHeight: 1.6 }}>
              Self-service password reset is not available yet. Please contact your <strong>School Administrator</strong>, who can reset your password for you.
            </p>
            <p style={{ textAlign: "center", marginTop: 24 }}>
              <Link href="/login" style={{ fontSize: 13, color: "var(--green-700)", fontWeight: 600, textDecoration: "none" }}>← Back to sign in</Link>
            </p>
          </div>
        ) : sent ? (
          <div>
            <p style={{ fontSize: 13, padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--success-100)", color: "var(--success-700)", lineHeight: 1.6 }}>
              If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a reset link. Check your inbox — the link expires in 1 hour.
            </p>
            <p style={{ textAlign: "center", marginTop: 24 }}>
              <Link href="/login" style={{ fontSize: 13, color: "var(--green-700)", fontWeight: 600, textDecoration: "none" }}>← Back to sign in</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.6, margin: 0 }}>
              Enter the email address you use to sign in, and we&apos;ll send you a link to set a new password.
            </p>
            <Input label="EMAIL ADDRESS" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: "11px 14px" }} />
            {error && <p style={{ fontSize: 13, color: "var(--error-700)", background: "var(--error-100)", padding: "8px 16px", borderRadius: "var(--radius-sm)", margin: 0 }}>{error}</p>}
            <Button type="submit" disabled={loading} style={{ width: "100%", padding: 12 }}>
              {loading ? "Sending…" : "Send Reset Link"}
            </Button>
            <p style={{ textAlign: "center", margin: 0 }}>
              <Link href="/login" style={{ fontSize: 12, color: "var(--ink-400)", textDecoration: "none" }}>← Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
