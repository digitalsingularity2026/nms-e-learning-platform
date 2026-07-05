"use server"

import { prisma } from "@/lib/prisma"
import { sendEmail, isEmailConfigured } from "@/lib/email"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const RESET_PREFIX = "reset:"

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export async function requestPasswordReset(email: string) {
  if (!isEmailConfigured()) {
    return { error: "Password reset by email is not set up yet. Please contact your School Administrator to reset your password." }
  }

  const trimmed = email.trim()
  if (!trimmed) return { error: "Enter your email address." }

  const user = await prisma.user.findUnique({ where: { email: trimmed } })

  // Respond identically whether or not the account exists — no user enumeration
  if (user && user.isActive && user.passwordHash) {
    const rawToken = crypto.randomBytes(32).toString("hex")
    const identifier = `${RESET_PREFIX}${trimmed}`

    await prisma.verificationToken.deleteMany({ where: { identifier } })
    await prisma.verificationToken.create({
      data: { identifier, token: hashToken(rawToken), expires: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    })

    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    const link = `${base}/reset-password?token=${rawToken}`

    try {
      await sendEmail(
        trimmed,
        "Reset your NMS Platform password",
        `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #2D2D2D;">
          <h2 style="color: #0C3D26;">Northern Medical School</h2>
          <p>Hello${user.name ? ` ${user.name}` : ""},</p>
          <p>We received a request to reset your password on the NMS Online Learning Platform.</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background: #0C3D26; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
          </p>
          <p style="font-size: 13px; color: #6B7280;">Or copy this link into your browser:<br>${link}</p>
          <p style="font-size: 13px; color: #6B7280;">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
        </div>`
      )
    } catch (err) {
      console.error("Password reset email failed:", err)
      return { error: "We could not send the reset email. Please try again later, or contact your School Administrator." }
    }
  }

  return { success: true }
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  if (!token) return { error: "This reset link is invalid. Please request a new one." }
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters." }

  const record = await prisma.verificationToken.findUnique({ where: { token: hashToken(token) } })
  if (!record || !record.identifier.startsWith(RESET_PREFIX)) {
    return { error: "This reset link is invalid or has already been used. Please request a new one." }
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } })
    return { error: "This reset link has expired. Please request a new one." }
  }

  const email = record.identifier.slice(RESET_PREFIX.length)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.isActive) {
    return { error: "This account is not available. Please contact your School Administrator." }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } })

  return { success: true }
}
