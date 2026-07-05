"use client"

import { useState } from "react"
import Link from "next/link"
import { resetPasswordWithToken } from "@/app/actions/password-reset"

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
    <main className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(150deg, #0A3020 0%, #082818 55%, #041510 100%)" }}>
      <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" style={{ background: "linear-gradient(135deg, #0C3D26, #1B5E3B)" }}>🔑</div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "#0C3D26" }}>Set a new password</h1>
          <p className="text-xs tracking-widest" style={{ color: "#9CA3AF" }}>NMS ONLINE LEARNING PLATFORM</p>
        </div>

        {!token ? (
          <div>
            <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "#FEF2F2", color: "#B91C1C", lineHeight: 1.6 }}>
              This reset link is invalid or incomplete. Please request a new one.
            </p>
            <p className="text-center mt-6">
              <Link href="/forgot-password" className="text-sm" style={{ color: "#0C3D26", fontWeight: 600 }}>Request a new link</Link>
            </p>
          </div>
        ) : done ? (
          <div>
            <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "#F0FBF4", color: "#166534", lineHeight: 1.6 }}>
              ✓ Your password has been updated. You can now sign in with your new password.
            </p>
            <p className="text-center mt-6">
              <Link href="/login" className="text-sm" style={{ color: "#0C3D26", fontWeight: 600 }}>Sign in →</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: "#6B7280" }}>NEW PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none" style={{ borderColor: "#E2D9CC", background: "#FAFAF8" }} />
              <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: "#6B7280" }}>CONFIRM NEW PASSWORD</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none" style={{ borderColor: "#E2D9CC", background: "#FAFAF8" }} />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm mt-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #0C3D26, #1B5E3B)", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Saving…" : "Set New Password →"}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
