"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/app/actions/password-reset"

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
    <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(150deg, #0A3020 0%, #082818 55%, #041510 100%)" }}>
      <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{ background: "linear-gradient(135deg, #0C3D26, #1B5E3B)" }}>🔑</div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "#0C3D26" }}>Forgot your password?</h1>
          <p className="text-xs tracking-widest" style={{ color: "#9CA3AF" }}>NMS ONLINE LEARNING PLATFORM</p>
        </div>

        {!emailEnabled ? (
          <div>
            <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "#FBF4E3", color: "#92400E", lineHeight: 1.6 }}>
              Self-service password reset is not available yet. Please contact your <strong>School Administrator</strong>, who can reset your password for you.
            </p>
            <p className="text-center mt-6">
              <Link href="/login" className="text-sm" style={{ color: "#0C3D26", fontWeight: 600 }}>← Back to sign in</Link>
            </p>
          </div>
        ) : sent ? (
          <div>
            <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "#F0FBF4", color: "#166534", lineHeight: 1.6 }}>
              ✓ If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a reset link. Check your inbox — the link expires in 1 hour.
            </p>
            <p className="text-center mt-6">
              <Link href="/login" className="text-sm" style={{ color: "#0C3D26", fontWeight: 600 }}>← Back to sign in</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm" style={{ color: "#6B7280", lineHeight: 1.6 }}>
              Enter the email address you use to sign in, and we&apos;ll send you a link to set a new password.
            </p>
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: "#6B7280" }}>EMAIL ADDRESS</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none" style={{ borderColor: "#E2D9CC", background: "#FAFAF8" }} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm mt-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #0C3D26, #1B5E3B)", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Sending…" : "Send Reset Link →"}
            </button>
            <p className="text-center">
              <Link href="/login" className="text-xs" style={{ color: "#9CA3AF" }}>← Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
