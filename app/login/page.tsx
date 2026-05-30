'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Invalid email or password. Please try again.")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(150deg, #0A3020 0%, #082818 55%, #041510 100%)" }}
    >
      <div className="bg-white rounded-2xl p-12 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: "linear-gradient(135deg, #0C3D26, #1B5E3B)" }}
          >
            🏥
          </div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: "#0C3D26" }}>
            Northern Medical School
          </h1>
          <p className="text-xs tracking-widest" style={{ color: "#9CA3AF" }}>
            ONLINE LEARNING PLATFORM
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5 tracking-wide"
              style={{ color: "#6B7280" }}
            >
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
              style={{ borderColor: "#E2D9CC", background: "#FAFAF8" }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5 tracking-wide"
              style={{ color: "#6B7280" }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
              style={{ borderColor: "#E2D9CC", background: "#FAFAF8" }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm mt-2 transition-opacity"
            style={{
              background: "linear-gradient(135deg, #0C3D26, #1B5E3B)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </div>
    </main>
  )
}
