'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/Icon"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

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
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gradient-header)" }}
    >
      <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: 48, width: "100%", maxWidth: 400, boxShadow: "var(--shadow-login-card)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: "var(--radius-xl)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", background: "var(--green-700)" }}>
            <Icon name="first-aid-kit" size={26} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--green-700)", margin: "0 0 4px" }}>Northern Medical School</h1>
          <p style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--ink-400)", margin: 0, textTransform: "uppercase" }}>Online Learning Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input
            label="EMAIL ADDRESS"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: "11px 14px" }}
          />

          <Input
            label="PASSWORD"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: "11px 14px" }}
          />

          {error && (
            <p style={{ fontSize: 13, color: "var(--error-700)", background: "var(--error-100)", padding: "8px 16px", borderRadius: "var(--radius-sm)", margin: 0 }}>
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={loading} style={{ width: "100%", padding: 12 }}>
            {loading ? "Signing in…" : <>Sign In <Icon name="arrow-right" size={14} /></>}
          </Button>

          <p style={{ textAlign: "center", margin: 0 }}>
            <a href="/forgot-password" style={{ fontSize: 12, color: "var(--ink-500)", textDecoration: "none" }}>Forgot your password?</a>
          </p>
        </form>
      </div>
    </main>
  )
}
