"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function updateOwnName(name: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  const trimmed = name.trim()
  if (!trimmed) return { error: "Name cannot be empty." }
  await prisma.user.update({ where: { id: session.user.id }, data: { name: trimmed } })
  revalidatePath("/profile")
  return { success: true }
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.passwordHash) return { error: "Account not found." }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return { error: "Current password is incorrect." }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } })
  return { success: true }
}
